//+------------------------------------------------------------------+
//|                                         ExecuTradeBridgeEA.mq5   |
//|                        Copyright 2026, ExecuTrade Technologies   |
//|                                  https://github.com/executrade   |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, ExecuTrade"
#property link      "https://github.com/executrade"
#property version   "2.00"
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
   Print("[ExecuTrade] Bridge EA initializing...");

   // Initialize CTrade helper
   g_trade.SetExpertMagicNumber(InpDefaultMagic);
   g_trade.SetDeviationInPoints(InpMaxDeviation);
   g_trade.SetTypeFilling(ORDER_FILLING_IOC); // Default to IOC, dynamic per symbol

   // Check if Algo Trading is allowed by user/terminal
   if(!MQLInfoInteger(MQL_TRADE_ALLOWED))
   {
      Print("[ExecuTrade] WARNING: Algo Trading is DISABLED in MT5 toolbar. Please click the 'Algo Trading' button.");
   }

   // Enable 10ms High-Frequency Millisecond Timer (100 ticks per second)
   if(!EventSetMillisecondTimer(10))
   {
      Print("[ExecuTrade] Error: Failed to set millisecond timer!");
      return(INIT_FAILED);
   }

   // Attempt initial connection
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

   // Update on-chart telemetry comment every ~500ms
   static ulong lastCommentUpdate = 0;
   if(now - lastCommentUpdate >= 500)
   {
      lastCommentUpdate = now;
      Comment(StringFormat("=== ExecuTrade Bridge v2.0 ===\n" +
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

   // 1. Maintain Socket Connection (Retry every 1,000ms if disconnected)
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

   // 2. Heartbeat Watchdog: Check if server died or half-open socket (5,000ms timeout)
   if(now - g_lastHeartbeat > 5000)
   {
      Print("[ExecuTrade] Warning: No heartbeat from Node.js server for >5s. Forcing reconnect.");
      CloseSocketConnection();
      return;
   }

   // 3. Read Incoming Socket Packets (Non-blocking)
   ReadSocketData();

   // 4. Periodic Account Sync (Every 1,000ms)
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

   // Connect with 1000ms timeout for reliable local loopback
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

   // Sync MarketWatch Specifications to Node.js Normalizer
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
   int len = ArraySize(buffer) - 1; // remove null terminator

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

      // Process complete lines (ndjson)
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
//| Simple JSON Field Parser Helper                                  |
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

//+------------------------------------------------------------------+
//| Dispatch Parsed JSON Command from Node.js                        |
//+------------------------------------------------------------------+
void ProcessCommandMessage(const string json)
{
   string action = GetJsonString(json, "action");
   if(action == "") return;

   // 1. PING Heartbeat Response
   if(action == "PING")
   {
      g_lastHeartbeat = GetTickCount64();
      SendSocketMessage("{\"event\":\"PONG\",\"timestamp\":" + IntegerToString(GetTickCount()) + "}");
      return;
   }

   string reqId = GetJsonString(json, "request_id");

   // 2. ORDER_SEND Execution
   if(action == "ORDER_SEND")
   {
      ExecuteOrderSend(json, reqId);
      return;
   }

   // 3. POSITION_CLOSE Execution
   if(action == "POSITION_CLOSE")
   {
      ExecutePositionClose(json, reqId);
      return;
   }

   // 4. FLATTEN_ALL Execution
   if(action == "FLATTEN_ALL")
   {
      ExecuteFlattenAll(json, reqId);
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

   string symbol    = GetJsonString(json, "symbol");
   string tradeType = GetJsonString(json, "trade_type");
   double lot       = GetJsonNumber(json, "lot");
   double sl        = GetJsonNumber(json, "sl");
   double tp        = GetJsonNumber(json, "tp");
   ulong  magic     = (ulong)GetJsonNumber(json, "magic");
   if(magic == 0) magic = InpDefaultMagic;

   if(!SymbolSelect(symbol, true))
   {
      SendSocketMessage(StringFormat("{\"event\":\"ORDER_RESULT\",\"request_id\":\"%s\",\"status\":\"FAILED\",\"retcode\":10014,\"message\":\"Symbol %s not found\"}", reqId, symbol));
      return;
   }

   g_trade.SetExpertMagicNumber(magic);
   g_trade.SetTypeFilling(GetSymbolFillingMode(symbol));

   bool success = false;
   if(tradeType == "BUY")
   {
      // Open with sl=0, tp=0 first to guarantee fill on ECN/Market accounts
      success = g_trade.Buy(lot, symbol, 0.0, 0.0, 0.0, "ExecuTrade_TV");
   }
   else if(tradeType == "SELL")
   {
      success = g_trade.Sell(lot, symbol, 0.0, 0.0, 0.0, "ExecuTrade_TV");
   }

   uint latency = GetTickCount() - startTime;
   uint retcode = g_trade.ResultRetcode();
   ulong orderTicket = g_trade.ResultOrder();
   ulong dealTicket  = g_trade.ResultDeal();
   double price      = g_trade.ResultPrice();

   if(success && (retcode == 10009 || retcode == 10008))
   {
      // Stage 2: Modify SL/TP if provided
      if(sl > 0.0 || tp > 0.0)
      {
         // Wait up to 50ms for position to register
         Sleep(10);
         if(PositionSelectByTicket(orderTicket))
         {
            g_trade.PositionModify(orderTicket, sl, tp);
         }
      }

      string reply = StringFormat(
         "{\"event\":\"ORDER_RESULT\",\"request_id\":\"%s\",\"status\":\"EXECUTED\",\"retcode\":%u,\"order_ticket\":%I64u,\"deal_ticket\":%I64u,\"position_ticket\":%I64u,\"executed_price\":%.5f,\"latency_ms\":%u}",
         reqId, retcode, orderTicket, dealTicket, orderTicket, price, latency
      );
      SendSocketMessage(reply);
   }
   else
   {
      string errDesc = g_trade.ResultRetcodeDescription();
      string reply = StringFormat(
         "{\"event\":\"ORDER_RESULT\",\"request_id\":\"%s\",\"status\":\"FAILED\",\"retcode\":%u,\"message\":\"%s\",\"latency_ms\":%u}",
         reqId, retcode, errDesc, latency
      );
      SendSocketMessage(reply);
   }
}

//+------------------------------------------------------------------+
//| Execute Position Close by Ticket                                 |
//+------------------------------------------------------------------+
void ExecutePositionClose(const string json, const string reqId)
{
   ulong ticket = (ulong)GetJsonNumber(json, "position_ticket");
   if(ticket <= 0)
   {
      SendSocketMessage(StringFormat("{\"event\":\"CLOSE_RESULT\",\"request_id\":\"%s\",\"status\":\"FAILED\",\"message\":\"Invalid ticket\"}", reqId));
      return;
   }

   bool closed = g_trade.PositionClose(ticket);
   uint retcode = g_trade.ResultRetcode();

   if(closed && retcode == 10009)
   {
      SendSocketMessage(StringFormat("{\"event\":\"CLOSE_RESULT\",\"request_id\":\"%s\",\"status\":\"EXECUTED\",\"position_ticket\":%I64u,\"retcode\":%u}", reqId, ticket, retcode));
   }
   else
   {
      SendSocketMessage(StringFormat("{\"event\":\"CLOSE_RESULT\",\"request_id\":\"%s\",\"status\":\"FAILED\",\"position_ticket\":%I64u,\"retcode\":%u,\"message\":\"%s\"}", reqId, ticket, retcode, g_trade.ResultRetcodeDescription()));
   }
}

//+------------------------------------------------------------------+
//| Execute Emergency Flatten All Positions                          |
//+------------------------------------------------------------------+
void ExecuteFlattenAll(const string json, const string reqId)
{
   int total = PositionsTotal();
   int closedCount = 0;

   for(int i = total - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0)
      {
         if(g_trade.PositionClose(ticket))
         {
            closedCount++;
         }
      }
   }

   SendSocketMessage(StringFormat("{\"event\":\"FLATTEN_RESULT\",\"request_id\":\"%s\",\"status\":\"SUCCESS\",\"closed_positions\":%d}", reqId, closedCount));
}

//+------------------------------------------------------------------+
//| Listen for Trade Transactions & Ticket Mutations                 |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& req,
                        const MqlTradeResult& res)
{
   // Capture Deal Additions to track position ticket mapping
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      string payload = StringFormat(
         "{\"event\":\"DEAL_UPDATE\",\"deal_ticket\":%I64u,\"order_ticket\":%I64u,\"position_ticket\":%I64u,\"symbol\":\"%s\",\"price\":%.5f,\"volume\":%.2f}",
         trans.deal, trans.order, trans.position, trans.symbol, trans.price, trans.volume
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
            ticket, sym, (type == POSITION_TYPE_BUY ? "BUY" : "SELL"), lot, openP, currP, pnl, (int)magic, comm
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
//| Send MarketWatch Specifications Handshake                        |
//+------------------------------------------------------------------+
void SendBrokerSpecsSync()
{
   int total = SymbolsTotal(true); // MarketWatch symbols
   string specsJson = "[";
   int count = 0;

   for(int i = 0; i < total && count < 50; i++)
   {
      string sym = SymbolName(i, true);
      if(sym == "") continue;

      int digits       = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
      double point     = SymbolInfoDouble(sym, SYMBOL_POINT);
      int spread       = (int)SymbolInfoInteger(sym, SYMBOL_SPREAD);
      int stopsLevel   = (int)SymbolInfoInteger(sym, SYMBOL_TRADE_STOPS_LEVEL);
      double lotMin    = SymbolInfoDouble(sym, SYMBOL_VOLUME_MIN);
      double lotMax    = SymbolInfoDouble(sym, SYMBOL_VOLUME_MAX);
      double lotStep   = SymbolInfoDouble(sym, SYMBOL_VOLUME_STEP);
      double contract  = SymbolInfoDouble(sym, SYMBOL_TRADE_CONTRACT_SIZE);
      long exeMode     = SymbolInfoInteger(sym, SYMBOL_TRADE_EXEMODE);

      if(count > 0) specsJson += ",";
      specsJson += StringFormat(
         "{\"symbol\":\"%s\",\"digits\":%d,\"point\":%.6f,\"spread\":%d,\"stops_level\":%d,\"lot_min\":%.2f,\"lot_max\":%.2f,\"lot_step\":%.2f,\"contract_size\":%.0f,\"execution_mode\":%d}",
         sym, digits, point, spread, stopsLevel, lotMin, lotMax, lotStep, contract, (int)exeMode
      );
      count++;
   }
   specsJson += "]";

   string msg = "{\"event\":\"SPECS_SYNC\",\"specs\":" + specsJson + "}";
   SendSocketMessage(msg);
}

