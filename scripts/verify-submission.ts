import WebSocket from 'ws';

const TARGET_ENV = process.env.TARGET_ENV || 'local';
const HOST = TARGET_ENV === 'prod' ? 'rank-everything.lassenordahl.partykit.dev' : 'localhost:1999';

const PROTOCOL_HTTP = TARGET_ENV === 'prod' ? 'https' : 'http';
const PROTOCOL_WS = TARGET_ENV === 'prod' ? 'wss' : 'ws';

const ROOM_ID = `VRF${Date.now().toString(36).slice(-4).toUpperCase()}`;
const URL_HTTP = `${PROTOCOL_HTTP}://${HOST}/party/${ROOM_ID}`;
const URL_WS = `${PROTOCOL_WS}://${HOST}/party/${ROOM_ID}`;

async function main() {
  console.log(`\n🎯 Targeting ${HOST} (Room: ${ROOM_ID})\n`);

  // 1. CREATE Room via HTTP
  console.log('1. Creating room...');
  const createRes = await fetch(URL_HTTP, {
    method: 'POST',
    body: JSON.stringify({
      action: 'create',
      nickname: 'Verifier',
      avatar: '🤖',
      config: { submissionMode: 'host-only', timerSeconds: 0, itemsPerGame: 10 },
    }),
    headers: { 'Content-Type': 'application/json' },
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Failed to create room: ${createRes.status} ${text}`);
  }

  const createData = (await createRes.json()) as { playerId: string; room: { id: string } };
  const playerId = createData.playerId;
  console.log(`   ✓ Room created. Player ID: ${playerId}`);

  // 2. START game
  console.log('2. Starting game...');
  const startRes = await fetch(URL_HTTP, {
    method: 'POST',
    body: JSON.stringify({ action: 'start', playerId }),
    headers: { 'Content-Type': 'application/json' },
  });

  if (!startRes.ok) {
    console.warn(`   ⚠ Start failed (might need more players): ${await startRes.text()}`);
  } else {
    console.log('   ✓ Game started');
  }

  // 3. Connect WebSocket
  console.log('3. Connecting WebSocket...');
  const ws = new WebSocket(URL_WS);

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Timeout waiting for item_submitted'));
    }, 10000);

    ws.on('open', () => {
      console.log('   ✓ WebSocket connected');

      // 4. Send Reconnect (Handshake)
      console.log('4. Sending handshake...');
      ws.send(
        JSON.stringify({
          type: 'reconnect',
          playerId: playerId,
        })
      );

      // Wait a bit then submit
      setTimeout(() => {
        // 5. Submit Item
        const itemText = `Verify-${Date.now()}`;
        console.log(`5. Submitting item: "${itemText}"`);
        ws.send(
          JSON.stringify({
            type: 'submit_item',
            text: itemText,
            emoji: '✅',
          })
        );
      }, 500);
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'error') {
        console.error('   ❌ Error:', msg.message, msg.code);
      }

      if (msg.type === 'item_submitted') {
        console.log('   ✅ item_submitted event received!');
        console.log('   Full payload:', JSON.stringify(msg.item, null, 2));
        console.log(`\n🎉 SUCCESS - Item submitted to room ${ROOM_ID}\n`);
        console.log('Now check the database with:');
        console.log(
          `  pnpm rank items list ${TARGET_ENV === 'prod' ? '--remote' : ''} --limit 5\n`
        );
        clearTimeout(timeout);
        ws.close();
        resolve();
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

main().catch((e) => {
  console.error('\n❌ FAILED:', e.message);
  process.exit(1);
});
