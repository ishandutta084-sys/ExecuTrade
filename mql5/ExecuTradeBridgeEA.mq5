//+------------------------------------------------------------------+
//|                                         ExecuTradeBridgeEA.mq5   |
//|                        Copyright 2026, ExecuTrade Technologies   |
//|                                  https://github.com/executrade   |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, ExecuTrade"
#property link      "https://github.com/executrade"
#property version   "2.20"
#property description "High-Throughput Non-Blocking TCP Bridge between MT5 and Node.js"

#include <Trade\Trade.mqh>
#include <Trade\SymbolInfo.mqh>
#include <Trade\PositionInfo.mqh>
#include <Trade\OrderInfo.mqh>

//--- INPUT PARAMETERS
input group "=== Network Configuration ==="
input string   InpHost           = "127.0.0.1"; // Node.js Localhost Host
input int      InpPort           = 8282;        // Local TCP Socket Port
input string   InpAuthKey        = "mt5_bridge_secret_auth_token_99"; // Secret Key

input group "=== Trading Safety ==="
input ulong    InpDefaultMagic   = 101001;      // Default Magic Number
input ulong    InpMaxDeviation   = 30;          // Max Slippage (points)
input bool     InpAutoSyncSpecs  = true;        // Sync MarketWatch specs on connect

input group "=== Symbol Resolution ==="
input string   InpSymbolOverride = "";          // Optional pins, e.g. XAUUSD=GOLD (separate multiple with ;)

//--- GLOBAL VARIABLES
CTrade         g_trade;
CPositionInfo  g_position;
CSymbolInfo    g_symInfo;

int            g_socket          = INVALID_HANDLE;
ulong          g_lastHeartbeat   = 0;
ulong          g_lastAccountSync = 0;
string         g_rxBuffer        = "";
bool           g_isConnected     = false;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("[ExecuTrade] Bridge EA initializing in MONITOR-ONLY mode...");
   Print("[ExecuTrade] NOTE: Order execution is DISABLED on main branch. System is running as a signal receiver & monitor only.");

   g_trade.SetExpertMagicNumber(InpDefaultMagic);
   g_trade.SetDeviationInPoints(InpMaxDeviation);
   g_trade.SetTypeFilling(ORDER_FILLING_IOC);

   if(!MQLInfoInteger(MQL_TRADE_ALLOWED))
   {
      Print("[ExecuTrade] WARNING: Algo Trading is DISABLED in MT5 toolbar. Please click the 'Algo Trading' button.");
   }

   if(!EventSetMillisecondTimer(10))
   {
      Print("[ExecuTrade] Error: Failed to set millisecond timer!");
      return(INIT_FAILED);
   }

   ConnectToNodeServer();

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   CloseSocketConnection();
   Comment("");
   Print("[ExecuTrade] Bridge EA deinitialized.");
}

//+------------------------------------------------------------------+
//| High-Frequency Non-Blocking Timer Function (Every 10ms)          |
//+------------------------------------------------------------------+
void OnTimer()
{
   ulong now = GetTickCount64();

   static ulong lastCommentUpdate = 0;
   if(now - lastCommentUpdate >= 500)
   {
      lastCommentUpdate = now;
      Comment(StringFormat("=== ExecuTrade Bridge v2.2 ===\n" +
                           "Status: %s\n" +
                           "Node Hub: %s:%d\n" +
                           "Account: %I64d | Balance: $%.2f | Equity: $%.2f\n" +
                           "Algo Trading: %s",
                           g_isConnected ? "CONNECTED (Active)" : "CONNECTING...",
                           InpHost, InpPort,
                           AccountInfoInteger(ACCOUNT_LOGIN),
                           AccountInfoDouble(ACCOUNT_BALANCE),
                           AccountInfoDouble(ACCOUNT_EQUITY),
                           MQLInfoInteger(MQL_TRADE_ALLOWED) ? "ENABLED" : "DISABLED (Click 'Algo Trading' in MT5 toolbar)"));
   }

   // 1. Maintain Socket Connection
   if(!g_isConnected || g_socket == INVALID_HANDLE)
   {
      static ulong lastReconnectAttempt = 0;
      if(now - lastReconnectAttempt >= 1000)
      {
         lastReconnectAttempt = now;
         ConnectToNodeServer();
      }
      return;
   }

   // 2. Heartbeat Watchdog
   if(now - g_lastHeartbeat > 5000)
   {
      Print("[ExecuTrade] Warning: No heartbeat from Node.js server for >5s. Forcing reconnect.");
      CloseSocketConnection();
      return;
   }

   // 3. Read Incoming Socket Packets
   ReadSocketData();

   // 4. Periodic Account Sync
   if(now - g_lastAccountSync >= 1000)
   {
      g_lastAccountSync = now;
      SendAccountSync();
   }
}

//+------------------------------------------------------------------+
//| Connect to Node.js Local TCP Socket                              |
//+------------------------------------------------------------------+
bool ConnectToNodeServer()
{
   CloseSocketConnection();

   g_socket = SocketCreate();
   if(g_socket == INVALID_HANDLE)
   {
      PrintFormat("[ExecuTrade] SocketCreate failed with error %d", GetLastError());
      return false;
   }

   if(!SocketConnect(g_socket, InpHost, InpPort, 1000))
   {
      int err = GetLastError();
      SocketClose(g_socket);
      g_socket = INVALID_HANDLE;
      PrintFormat("[ExecuTrade] SocketConnect to %s:%d failed with error %d. Retrying in 1s...", InpHost, InpPort, err);
      return false;
   }

   g_isConnected = true;
   g_lastHeartbeat = GetTickCount64();
   g_rxBuffer = "";
   PrintFormat("[ExecuTrade] Successfully connected to Node.js Server at %s:%d", InpHost, InpPort);

   if(InpAutoSyncSpecs)
   {
      SendBrokerSpecsSync();
   }

   return true;
}

//+------------------------------------------------------------------+
//| Safely Close Socket Handle                                       |
//+------------------------------------------------------------------+
void CloseSocketConnection()
{
   if(g_socket != INVALID_HANDLE)
   {
      SocketClose(g_socket);
      g_socket = INVALID_HANDLE;
   }
   g_isConnected = false;
   g_rxBuffer = "";
}

//+------------------------------------------------------------------+
//| Send Newline-Delimited JSON string over socket                   |
//+------------------------------------------------------------------+
bool SendSocketMessage(const string json)
{
   if(!g_isConnected || g_socket == INVALID_HANDLE) return false;

   string payload = json + "\n";
   uchar buffer[];
   StringToCharArray(payload, buffer, 0, WHOLE_ARRAY, CP_UTF8);
   int len = ArraySize(buffer) - 1;

   int sent = SocketSend(g_socket, buffer, len);
   return (sent == len);
}

//+------------------------------------------------------------------+
//| Read Non-Blocking Socket Buffer                                  |
//+------------------------------------------------------------------+
void ReadSocketData()
{
   uint readable = SocketIsReadable(g_socket);
   if(readable == 0) return;

   uchar buffer[];
   ArrayResize(buffer, (int)readable);
   int bytesRead = SocketRead(g_socket, buffer, readable, 5);

   if(bytesRead > 0)
   {
      string chunk = CharArrayToString(buffer, 0, bytesRead, CP_UTF8);
      g_rxBuffer += chunk;

      int newlinePos = StringFind(g_rxBuffer, "\n");
      while(newlinePos >= 0)
      {
         string line = StringSubstr(g_rxBuffer, 0, newlinePos);
         StringTrimLeft(line);
         StringTrimRight(line);

         g_rxBuffer = StringSubstr(g_rxBuffer, newlinePos + 1);

         if(StringLen(line) > 0)
         {
            ProcessCommandMessage(line);
         }
         newlinePos = StringFind(g_rxBuffer, "\n");
      }
   }
}

//+------------------------------------------------------------------+
//| Simple JSON Field Parser Helpers                                 |
//+------------------------------------------------------------------+
string GetJsonString(const string json, const string key)
{
   string needle = "\"" + key + "\":\"";
   int start = StringFind(json, needle);
   if(start == -1) return "";
   start += StringLen(needle);
   int end = StringFind(json, "\"", start);
   if(end == -1) return "";
   return StringSubstr(json, start, end - start);
}

double GetJsonNumber(const string json, const string key)
{
   string needle = "\"" + key + "\":";
   int start = StringFind(json, needle);
   if(start == -1) return 0;
   start += StringLen(needle);

   int len = StringLen(json);
   int end = start;
   while(end < len)
   {
      ushort ch = StringGetCharacter(json, end);
      if((ch >= '0' && ch <= '9') || ch == '.' || ch == '-')
         end++;
      else
         break;
   }
   return StringToDouble(StringSubstr(json, start, end - start));
}

string JsonEscape(const string s)
{
   string r = s;
   StringReplace(r, "\\", "\\\\");
   StringReplace(r, "\"", "\\\"");
   return r;
}

//+------------------------------------------------------------------+
//| ===================== SYMBOL RESOLUTION ======================== |
//+------------------------------------------------------------------+
bool IsGoldName(const string s)
{
   string up = s;
   StringToUpper(up);
   return (StringFind(up, "XAU") == 0 || StringFind(up, "GOLD") == 0);
}

string LookupOverride(const string requested)
{
   if(InpSymbolOverride == "") return "";

   string up = requested;
   StringToUpper(up);

   string pairs[];
   int np = StringSplit(InpSymbolOverride, ';', pairs);
   for(int i = 0; i < np; i++)
   {
      string kv[];
      if(StringSplit(pairs[i], '=', kv) != 2) continue;
      string key = kv[0];
      string val = kv[1];
      StringTrimLeft(key);  StringTrimRight(key);
      StringTrimLeft(val);  StringTrimRight(val);

      string keyUp = key;
      StringToUpper(keyUp);

      if(keyUp == up || (IsGoldName(requested) && IsGoldName(key)))
         return val;
   }
   return "";
}

// Fail-safe symbol resolution: guarantees a real tradable symbol is returned
string ResolveSymbol(const string requested)
{
   string req = requested;
   StringTrimLeft(req);
   StringTrimRight(req);
   if(req == "") return _Symbol;

   // 1. Explicit override if set by user
   string overrideVal = LookupOverride(req);
   if(overrideVal != "")
   {
      SymbolSelect(overrideVal, true);
      PrintFormat("[ExecuTrade] Symbol override used: '%s' -> '%s'", req, overrideVal);
      return overrideVal;
   }

   // 2. If signal is for Gold (XAUUSD / GOLD):
   if(IsGoldName(req))
   {
      // If EA is attached to a Gold chart, the chart's symbol IS the exact broker symbol!
      if(IsGoldName(_Symbol))
      {
         SymbolSelect(_Symbol, true);
         return _Symbol;
      }

      // Check XM spot Gold symbols in order of priority (avoiding futures with dots)
      string goldCandidates[] = {"GOLD", "GOLD#", "GOLDmicro", "XAUUSD", "XAUUSD#", "XAUUSD.m"};
      for(int i = 0; i < ArraySize(goldCandidates); i++)
      {
         if(SymbolSelect(goldCandidates[i], true))
         {
            PrintFormat("[ExecuTrade] Gold resolved: '%s' -> '%s'", req, goldCandidates[i]);
            return goldCandidates[i];
         }
      }
   }

   // 3. Direct match
   if(SymbolSelect(req, true))
      return req;

   // 4. Fallback to active chart symbol
   PrintFormat("[ExecuTrade] Symbol fallback to chart symbol: '%s' -> '%s'", req, _Symbol);
   return _Symbol;
}

//+------------------------------------------------------------------+
//| Lot normalisation to symbol step/min/max                         |
//+------------------------------------------------------------------+
double NormalizeLot(const string sym, double lot)
{
   double minLot = SymbolInfoDouble(sym, SYMBOL_VOLUME_MIN);
   double maxLot = SymbolInfoDouble(sym, SYMBOL_VOLUME_MAX);
   double step   = SymbolInfoDouble(sym, SYMBOL_VOLUME_STEP);
   if(step <= 0.0) step = 0.01;

   lot = MathFloor(lot / step + 1e-9) * step;
   if(lot < minLot) lot = minLot;
   if(lot > maxLot) lot = maxLot;

   int d = 0;
   while(d < 8 && MathAbs(step * MathPow(10, d) - MathRound(step * MathPow(10, d))) > 1e-9) d++;
   return NormalizeDouble(lot, d);
}

//+------------------------------------------------------------------+
//| Position helpers                                                 |
//+------------------------------------------------------------------+
ulong FindNewestPosition(const string symbol, const ulong magic)
{
   ulong best = 0;
   long bestTime = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong t = PositionGetTicket(i);
      if(t == 0) continue;
      if(PositionGetString(POSITION_SYMBOL) != symbol) continue;
      if((ulong)PositionGetInteger(POSITION_MAGIC) != magic) continue;
      long tm = PositionGetInteger(POSITION_TIME_MSC);
      if(best == 0 || tm >= bestTime)
      {
         best = t;
         bestTime = tm;
      }
   }
   return best;
}

//+------------------------------------------------------------------+
//| Dispatch Parsed JSON Command from Node.js                        |
//+------------------------------------------------------------------+
void ProcessCommandMessage(const string json)
{
   string action = GetJsonString(json, "action");
   if(action == "") return;

   if(action == "PING")
   {
      g_lastHeartbeat = GetTickCount64();
      SendSocketMessage("{\"event\":\"PONG\",\"timestamp\":" + IntegerToString(GetTickCount()) + "}");
      return;
   }

   string reqId = GetJsonString(json, "request_id");

   if(action == "ORDER_SEND")
   {
      // Main branch: Order execution disabled. Safe monitoring only.
      PrintFormat("ExecuTrade [MONITOR ONLY]: ORDER_SEND received for %s but execution is DISABLED on main branch.", GetJsonString(json, "symbol"));
      SendSocketMessage(StringFormat(
         "{\"event\":\"ORDER_RESULT\",\"request_id\":\"%s\",\"status\":\"DISABLED\",\"retcode\":10004,\"message\":\"Order execution disabled on main branch (Monitor-only mode)\"}",
         reqId));
      return;
   }

   if(action == "POSITION_CLOSE")
   {
      // Main branch: Position closing disabled. Safe monitoring only.
      PrintFormat("ExecuTrade [MONITOR ONLY]: POSITION_CLOSE received but execution is DISABLED on main branch.");
      SendSocketMessage(StringFormat(
         "{\"event\":\"ORDER_RESULT\",\"request_id\":\"%s\",\"status\":\"DISABLED\",\"message\":\"Position closing disabled on main branch (Monitor-only mode)\"}",
         reqId));
      return;
   }

   if(action == "FLATTEN_ALL")
   {
      // Main branch: Flattening disabled. Safe monitoring only.
      PrintFormat("ExecuTrade [MONITOR ONLY]: FLATTEN_ALL received but execution is DISABLED on main branch.");
      SendSocketMessage(StringFormat(
         "{\"event\":\"ORDER_RESULT\",\"request_id\":\"%s\",\"status\":\"DISABLED\",\"message\":\"Flatten all disabled on main branch (Monitor-only mode)\"}",
         reqId));
      return;
   }
}

//+------------------------------------------------------------------+
//| Dynamic Filling Mode Selection for a Symbol                      |
//+------------------------------------------------------------------+
ENUM_ORDER_TYPE_FILLING GetSymbolFillingMode(const string symbol)
{
   uint fillingMode = (uint)SymbolInfoInteger(symbol, SYMBOL_FILLING_MODE);
   if((fillingMode & SYMBOL_FILLING_IOC) != 0) return ORDER_FILLING_IOC;
   if((fillingMode & SYMBOL_FILLING_FOK) != 0) return ORDER_FILLING_FOK;
   return ORDER_FILLING_RETURN;
}

//+------------------------------------------------------------------+
//| Execute Market Order Send                                        |
//+------------------------------------------------------------------+
void ExecuteOrderSend(const string json, const string reqId)
{
   uint startTime = GetTickCount();

   string reqSymbol = GetJsonString(json, "symbol");
   string tradeType = GetJsonString(json, "trade_type");
   double lot       = GetJsonNumber(json, "lot");
   double sl        = GetJsonNumber(json, "sl");
   double tp        = GetJsonNumber(json, "tp");
   ulong  magic     = (ulong)GetJsonNumber(json, "magic");
   if(magic == 0) magic = InpDefaultMagic;

   string symbol = ResolveSymbol(reqSymbol);

   if(tradeType != "BUY" && tradeType != "SELL")
   {
      SendSocketMessage(StringFormat(
         "{\"event\":\"ORDER_RESULT\",\"request_id\":\"%s\",\"status\":\"FAILED\",\"retcode\":0,\"message\":\"Invalid trade_type '%s'\"}",
         reqId, JsonEscape(tradeType)));
      return;
   }

   lot = NormalizeLot(symbol, lot);
   if(lot <= 0.0)
   {
      SendSocketMessage(StringFormat(
         "{\"event\":\"ORDER_RESULT\",\"request_id\":\"%s\",\"status\":\"FAILED\",\"retcode\":10014,\"message\":\"Invalid volume\"}", reqId));
      return;
   }

   g_trade.SetExpertMagicNumber(magic);
   g_trade.SetTypeFilling(GetSymbolFillingMode(symbol));

   // Order execution is disabled on main branch (Monitor-only mode)
   PrintFormat("ExecuTrade [MONITOR ONLY]: Refusing to execute %s %s %.2f lot (Disabled on main)", tradeType, symbol, lot);
   SendSocketMessage(StringFormat(
      "{\"event\":\"ORDER_RESULT\",\"request_id\":\"%s\",\"status\":\"DISABLED\",\"retcode\":10004,\"message\":\"Order execution disabled on main branch\"}", reqId));
   return;

   uint retcode      = g_trade.ResultRetcode();
   ulong orderTicket = g_trade.ResultOrder();
   ulong dealTicket  = g_trade.ResultDeal();
   double price      = g_trade.ResultPrice();

   if(success && (retcode == 10009 || retcode == 10008))
   {
      ulong posTicket = 0;
      if(dealTicket > 0 && HistoryDealSelect(dealTicket))
         posTicket = (ulong)HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
      if(posTicket == 0 || !PositionSelectByTicket(posTicket))
      {
         ulong found = FindNewestPosition(symbol, magic);
         if(found > 0) posTicket = found;
      }
      if(posTicket == 0) posTicket = orderTicket;

      if((sl > 0.0 || tp > 0.0) && PositionSelectByTicket(posTicket))
      {
         int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
         g_trade.PositionModify(posTicket,
                                sl > 0.0 ? NormalizeDouble(sl, digits) : 0.0,
                                tp > 0.0 ? NormalizeDouble(tp, digits) : 0.0);
      }

      uint latency = GetTickCount() - startTime;
      string reply = StringFormat(
         "{\"event\":\"ORDER_RESULT\",\"request_id\":\"%s\",\"status\":\"EXECUTED\",\"retcode\":%u,\"order_ticket\":%I64u,\"deal_ticket\":%I64u,\"position_ticket\":%I64u,\"executed_price\":%.5f,\"symbol\":\"%s\",\"lot\":%.2f,\"latency_ms\":%u}",
         reqId, retcode, orderTicket, dealTicket, posTicket, price, JsonEscape(symbol), lot, latency
      );
      SendSocketMessage(reply);
   }
   else
   {
      uint latency = GetTickCount() - startTime;
      string errDesc = g_trade.ResultRetcodeDescription();
      string reply = StringFormat(
         "{\"event\":\"ORDER_RESULT\",\"request_id\":\"%s\",\"status\":\"FAILED\",\"retcode\":%u,\"message\":\"%s\",\"symbol\":\"%s\",\"latency_ms\":%u}",
         reqId, retcode, JsonEscape(errDesc), JsonEscape(symbol), latency
      );
      SendSocketMessage(reply);
   }
}

//+------------------------------------------------------------------+
//| Close one position by ticket                                     |
//+------------------------------------------------------------------+
bool ClosePositionTicket(const ulong ticket, uint &retcodeOut)
{
   retcodeOut = 0;
   if(!PositionSelectByTicket(ticket)) return false;

   string sym = PositionGetString(POSITION_SYMBOL);
   g_trade.SetTypeFilling(GetSymbolFillingMode(sym));

   // Position closing is disabled on main branch (Monitor-only mode)
   PrintFormat("ExecuTrade [MONITOR ONLY]: PositionClose for ticket %I64u skipped (Disabled on main)", ticket);
   return false;
}

//+------------------------------------------------------------------+
//| Execute Position Close (idempotent)                              |
//+------------------------------------------------------------------+
void ExecutePositionClose(const string json, const string reqId)
{
   ulong  ticket    = (ulong)GetJsonNumber(json, "position_ticket");
   string reqSymbol = GetJsonString(json, "symbol");
   ulong  magic     = (ulong)GetJsonNumber(json, "magic");
   if(magic == 0) magic = InpDefaultMagic;

   int  closed = 0, failed = 0;
   uint lastRet = 0;
   ulong lastTicket = ticket;

   // 1. Try exact ticket if valid
   if(ticket > 0 && PositionSelectByTicket(ticket))
   {
      uint rc = 0;
      if(ClosePositionTicket(ticket, rc)) closed++; else failed++;
      lastRet = rc;
   }
   // 2. Fallback: match by symbol + magic
   else if(reqSymbol != "")
   {
      string symbol = ResolveSymbol(reqSymbol);
      if(symbol != "")
      {
         for(int i = PositionsTotal() - 1; i >= 0; i--)
         {
            ulong t = PositionGetTicket(i);
            if(t == 0) continue;
            if(PositionGetString(POSITION_SYMBOL) != symbol) continue;
            if((ulong)PositionGetInteger(POSITION_MAGIC) != magic) continue;

            uint rc = 0;
            if(ClosePositionTicket(t, rc)) closed++; else failed++;
            lastRet = rc;
            lastTicket = t;
         }
      }
   }

   string status;
   string message;
   if(closed == 0 && failed == 0)
   {
      status  = "NO_POSITION";
      message = "No open position found (already closed or never opened)";
   }
   else if(failed == 0)
   {
      status  = "EXECUTED";
      message = "Closed successfully";
   }
   else
   {
      status  = "FAILED";
      message = g_trade.ResultRetcodeDescription();
   }

   SendSocketMessage(StringFormat(
      "{\"event\":\"CLOSE_RESULT\",\"request_id\":\"%s\",\"status\":\"%s\",\"position_ticket\":%I64u,\"closed\":%d,\"failed\":%d,\"retcode\":%u,\"message\":\"%s\"}",
      reqId, status, lastTicket, closed, failed, lastRet, JsonEscape(message)));
}

//+------------------------------------------------------------------+
//| Execute Emergency Flatten All Positions                          |
//+------------------------------------------------------------------+
void ExecuteFlattenAll(const string json, const string reqId)
{
   int closedCount = 0;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0)
      {
         uint rc = 0;
         if(ClosePositionTicket(ticket, rc))
            closedCount++;
      }
   }

   SendSocketMessage(StringFormat("{\"event\":\"FLATTEN_RESULT\",\"request_id\":\"%s\",\"status\":\"SUCCESS\",\"closed_positions\":%d}", reqId, closedCount));
}

//+------------------------------------------------------------------+
//| Listen for Trade Transactions                                    |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& req,
                        const MqlTradeResult& res)
{
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      string payload = StringFormat(
         "{\"event\":\"DEAL_UPDATE\",\"deal_ticket\":%I64u,\"order_ticket\":%I64u,\"position_ticket\":%I64u,\"symbol\":\"%s\",\"price\":%.5f,\"volume\":%.2f}",
         trans.deal, trans.order, trans.position, JsonEscape(trans.symbol), trans.price, trans.volume
      );
      SendSocketMessage(payload);
   }
}

//+------------------------------------------------------------------+
//| Send Real-Time Account & Active Positions Heartbeat              |
//+------------------------------------------------------------------+
void SendAccountSync()
{
   double balance    = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity     = AccountInfoDouble(ACCOUNT_EQUITY);
   double freeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   long   accNum     = AccountInfoInteger(ACCOUNT_LOGIN);

   string posJson = "[";
   int total = PositionsTotal();
   int count = 0;

   for(int i = 0; i < total; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0 && PositionSelectByTicket(ticket))
      {
         string sym   = PositionGetString(POSITION_SYMBOL);
         long type    = PositionGetInteger(POSITION_TYPE);
         double lot   = PositionGetDouble(POSITION_VOLUME);
         double openP = PositionGetDouble(POSITION_PRICE_OPEN);
         double currP = PositionGetDouble(POSITION_PRICE_CURRENT);
         double pnl   = PositionGetDouble(POSITION_PROFIT);
         long magic   = PositionGetInteger(POSITION_MAGIC);
         string comm  = PositionGetString(POSITION_COMMENT);

         if(count > 0) posJson += ",";
         posJson += StringFormat(
            "{\"ticket\":%I64u,\"symbol\":\"%s\",\"type\":\"%s\",\"lot\":%.2f,\"open_price\":%.5f,\"current_price\":%.5f,\"pnl\":%.2f,\"magic\":%d,\"comment\":\"%s\"}",
            ticket, JsonEscape(sym), (type == POSITION_TYPE_BUY ? "BUY" : "SELL"), lot, openP, currP, pnl, (int)magic, JsonEscape(comm)
         );
         count++;
      }
   }
   posJson += "]";

   string msg = StringFormat(
      "{\"event\":\"ACCOUNT_SYNC\",\"account_number\":%d,\"balance\":%.2f,\"equity\":%.2f,\"free_margin\":%.2f,\"open_positions\":%s}",
      (int)accNum, balance, equity, freeMargin, posJson
   );

   SendSocketMessage(msg);
}

//+------------------------------------------------------------------+
//| Build Spec JSON                                                  |
//+------------------------------------------------------------------+
string BuildSpecJson(const string sym, const string canonical)
{
   int digits       = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
   double point     = SymbolInfoDouble(sym, SYMBOL_POINT);
   int spread       = (int)SymbolInfoInteger(sym, SYMBOL_SPREAD);
   int stopsLevel   = (int)SymbolInfoInteger(sym, SYMBOL_TRADE_STOPS_LEVEL);
   double lotMin    = SymbolInfoDouble(sym, SYMBOL_VOLUME_MIN);
   double lotMax    = SymbolInfoDouble(sym, SYMBOL_VOLUME_MAX);
   double lotStep   = SymbolInfoDouble(sym, SYMBOL_VOLUME_STEP);
   double contract  = SymbolInfoDouble(sym, SYMBOL_TRADE_CONTRACT_SIZE);
   long exeMode     = SymbolInfoInteger(sym, SYMBOL_TRADE_EXEMODE);

   return StringFormat(
      "{\"symbol\":\"%s\",\"canonical\":\"%s\",\"digits\":%d,\"point\":%.6f,\"spread\":%d,\"stops_level\":%d,\"lot_min\":%.2f,\"lot_max\":%.2f,\"lot_step\":%.2f,\"contract_size\":%.0f,\"execution_mode\":%d}",
      JsonEscape(sym), canonical, digits, point, spread, stopsLevel, lotMin, lotMax, lotStep, contract, (int)exeMode
   );
}

//+------------------------------------------------------------------+
//| Send Specifications Handshake                                    |
//+------------------------------------------------------------------+
void SendBrokerSpecsSync()
{
   string specsJson = "[";
   int count = 0;

   // 1. Send the active chart symbol first
   specsJson += BuildSpecJson(_Symbol, "XAUUSD");
   count++;

   // 2. Add other Market Watch symbols
   int total = SymbolsTotal(true);
   for(int i = 0; i < total && count < 50; i++)
   {
      string sym = SymbolName(i, true);
      if(sym == "" || sym == _Symbol) continue;
      if(StringFind(sym, ".") >= 0) continue; // Skip dot artifacts

      specsJson += ",";
      specsJson += BuildSpecJson(sym, sym);
      count++;
   }
   specsJson += "]";

   string msg = "{\"event\":\"SPECS_SYNC\",\"specs\":" + specsJson + "}";
   SendSocketMessage(msg);
}
