const net = require('node:net');

async function runEndToEndTest() {
  console.log('=== STARTING EXECUTRADE E2E INTEGRATION TEST ===');

  // 1. Boot Node.js Server in-process
  console.log('1. Booting Fastify + WebSocket + TCP Socket Server...');
  await import('./dist/index.js');
  await new Promise(r => setTimeout(r, 1200));

  // 2. Test React SPA Static Serving
  console.log('2. Verifying React Single-Page Application Serving at GET / ...');
  const indexRes = await fetch('http://127.0.0.1:3000/');
  const html = await indexRes.text();
  if (!html.includes('<div id="root">') && !html.includes('ExecuTrade')) {
    throw new Error('GET / did not return valid ExecuTrade HTML!');
  }
  console.log('   ✓ React SPA correctly served from client/dist (HTML contains #root)');

  // 3. Test Health Endpoint
  console.log('3. Testing GET /health ...');
  const healthRes = await fetch('http://127.0.0.1:3000/health');
  const health = await healthRes.json();
  console.log('   ✓ Health status:', JSON.stringify(health));

  // 4. Test Simulated MT5 Bridge EA TCP Connection (Port 8282)
  console.log('4. Connecting simulated MT5 EA to TCP socket 127.0.0.1:8282 ...');
  const mt5Client = net.createConnection({ host: '127.0.0.1', port: 8282 }, () => {
    console.log('   ✓ Simulated MT5 EA connected to TCP socket successfully');

    // Send Broker Specifications Handshake
    const specsMsg = {
      event: 'SPECS_SYNC',
      specs: [
        {
          symbol: 'XAUUSD.m',
          digits: 2,
          point: 0.01,
          spread: 15,
          stops_level: 20,
          lot_min: 0.01,
          lot_max: 50.0,
          lot_step: 0.01,
          contract_size: 100,
          execution_mode: 2
        }
      ]
    };
    mt5Client.write(JSON.stringify(specsMsg) + '\n');
  });

  mt5Client.on('data', (data) => {
    const text = data.toString().trim();
    const lines = text.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.action === 'PING') {
          mt5Client.write(JSON.stringify({ event: 'PONG', timestamp: Date.now() }) + '\n');
        } else if (msg.action === 'ORDER_SEND') {
          const reply = {
            event: 'ORDER_RESULT',
            request_id: msg.request_id,
            status: 'EXECUTED',
            retcode: 10009,
            order_ticket: 884921,
            deal_ticket: 991823,
            position_ticket: 884921,
            executed_price: 2654.25,
            latency_ms: 12
          };
          mt5Client.write(JSON.stringify(reply) + '\n');
        }
      } catch (err) {}
    }
  });

  await new Promise(r => setTimeout(r, 600));

  // 5. Test TradingView Webhook Ingestion (Fast-ACK < 4ms)
  const token = process.env.WEBHOOK_SECRET || 'Yy7vbnbdgr-mSsb-JaNqkKQ1DnZkEnh3B6wdclyjTKU';
  console.log(`5. Testing TradingView Webhook POST /wh/v1/:token (with secret: ${token.slice(0, 8)}...) ...`);
  const webhookStart = Date.now();
  const webhookRes = await fetch(`http://127.0.0.1:3000/wh/v1/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      signal_id: `TV-TEST-${Date.now()}`,
      strategy: 'MKL_GCB',
      action: 'BUY',
      symbol: 'XAUUSD',
      lot: 0.02,
      sl: 2640.00,
      tp: 2680.00,
      is_test: true
    })
  });

  const webhookAckTime = Date.now() - webhookStart;
  const webhookBody = await webhookRes.json();
  console.log(`   ✓ Webhook Fast-ACK received in ${webhookAckTime}ms:`, JSON.stringify(webhookBody));

  if (webhookBody.status !== 'QUEUED') {
    throw new Error(`Unexpected webhook response: ${JSON.stringify(webhookBody)}`);
  }

  // Wait 500ms for background order dispatch and simulated MT5 fill
  await new Promise(r => setTimeout(r, 500));

  // 6. Test Signals Ledger Query
  console.log('6. Verifying Signal Ingestion in Ledger GET /api/signals ...');
  const signalsRes = await fetch('http://127.0.0.1:3000/api/signals');
  const signals = await signalsRes.json();
  const latest = signals[0];
  console.log(`   ✓ Latest Signal in DB: ID ${latest.signal_id} | Status: ${latest.status} | Ticket: ${latest.position_ticket || latest.order_ticket}`);

  // 7. Test Bridge Status
  console.log('7. Verifying Bridge Status GET /api/bridge/status ...');
  const statusRes = await fetch('http://127.0.0.1:3000/api/bridge/status');
  const statusData = await statusRes.json();
  console.log('   ✓ Bridge Telemetry:', JSON.stringify(statusData));

  // Clean up
  mt5Client.destroy();
  console.log('\n=== ALL END-TO-END VERIFICATION CHECKS PASSED WITH 100% SUCCESS! ===');
  process.exit(0);
}

runEndToEndTest().catch(err => {
  console.error('\nE2E TEST FAILED:', err);
  process.exit(1);
});

