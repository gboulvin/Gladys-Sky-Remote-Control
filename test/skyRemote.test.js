// The protocol against a fake Sky box listening on the loopback interface.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {
  COMMANDS,
  channelToCommands,
  detectPort,
  keyFrame,
  normalizeCommands,
  probe,
  sendCommands,
} from '../src/skyRemote.js';

// A fake box: banner, one short frame, then the 24-byte "ready" frame; it
// records every byte the client sends.
function fakeBox() {
  const received = [];
  const server = net.createServer((socket) => {
    const chunks = [];
    received.push(chunks);
    let step = 0;
    socket.write(Buffer.from('SKY 000.001\n'));
    socket.on('data', (data) => {
      chunks.push(...data);
      if (step === 0) {
        step = 1;
        socket.write(Buffer.from([1, 1]));
      } else if (step === 1) {
        step = 2;
        socket.write(Buffer.alloc(24, 0));
      }
    });
    socket.on('error', () => {});
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port, received }));
  });
}

test('keyFrame encodes the key down frame', () => {
  assert.deepEqual([...keyFrame(COMMANDS.power)], [4, 1, 0, 0, 0, 0, 224, 0]);
  assert.deepEqual([...keyFrame(COMMANDS.sky)], [4, 1, 0, 0, 0, 0, 239, 1]);
  assert.deepEqual([...keyFrame(COMMANDS.channelup)], [4, 1, 0, 0, 0, 0, 224, 6]);
});

test('normalizeCommands refuses an unknown key before anything is sent', () => {
  assert.deepEqual(normalizeCommands([' Power ', 'SKY']), ['power', 'sky']);
  assert.throws(() => normalizeCommands(['volumeup']), /Unknown Sky remote command/);
  assert.throws(() => normalizeCommands([]), /No command/);
});

test('channelToCommands types the digits of a channel', () => {
  assert.deepEqual(channelToCommands(101), ['1', '0', '1']);
  assert.deepEqual(channelToCommands(' 5 '), ['5']);
  assert.throws(() => channelToCommands('12a'), /Invalid channel/);
  assert.throws(() => channelToCommands('12345'), /Invalid channel/);
});

test('sendCommands runs the handshake then sends key down and key up', async (t) => {
  const { server, port, received } = await fakeBox();
  t.after(() => server.close());
  await sendCommands('127.0.0.1', port, ['power', 'select'], { keyDelay: 0 });
  // Wait for the server to drain the socket.
  await new Promise((resolve) => setTimeout(resolve, 50));
  const bytes = received[0];
  assert.deepEqual(bytes.slice(0, 12), [...Buffer.from('SKY 000.001\n')], 'banner echoed');
  assert.deepEqual(bytes.slice(12, 13), [1], 'short frame acknowledged with one byte');
  assert.deepEqual(bytes.slice(13), [
    ...[4, 1, 0, 0, 0, 0, 224, 0],
    ...[4, 0, 0, 0, 0, 0, 224, 0],
    ...[4, 1, 0, 0, 0, 0, 224, 1],
    ...[4, 0, 0, 0, 0, 0, 224, 1],
  ]);
});

test('probe and detectPort find the port that answers', async (t) => {
  const { server, port } = await fakeBox();
  t.after(() => server.close());
  assert.equal(await probe('127.0.0.1', port), true);
  // A closed port: grab a free one and release it.
  const closed = await new Promise((resolve) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => {
      const { port: free } = s.address();
      s.close(() => resolve(free));
    });
  });
  assert.equal(await probe('127.0.0.1', closed, { timeout: 500 }), false);
  await assert.rejects(sendCommands('127.0.0.1', closed, ['power']), /127\.0\.0\.1/);
});

test('detectPort returns null when no candidate answers', async () => {
  // An unknown model falls back to the automatic candidates (49160, 5900),
  // closed on the loopback of a test machine.
  assert.equal(await detectPort('127.0.0.1', 'unknown-model', { timeout: 300 }), null);
});
