// -----------------------------------------------------------------------------
// Sky set-top box remote control protocol (local network, TCP).
//
// The same protocol Home Assistant's `sky_remote` integration uses (through
// the `skyboxremote` library): the box listens on TCP port 49160 (Sky Q) or
// 5900 (Sky+ HD, and Sky Q boxes on older firmware). A session goes:
//   1. the box sends its protocol version, a 12-byte "SKY 000.001\n" banner;
//   2. the client echoes the first 12 bytes, then each short frame the box
//      sends next is acknowledged with its first byte;
//   3. once the box sends a frame of 24 bytes or more, the session is open:
//      every key is sent as an 8-byte "key down" frame followed by the same
//      frame with its second byte cleared ("key up").
//
// No pairing, no account, no credential: any host of the LAN can drive the
// box, which is why the integration only ever talks to the addresses the
// user configured.
// -----------------------------------------------------------------------------

import net from 'node:net';
import { createLogger } from '@gladysassistant/integration-sdk';

const logger = createLogger({ name: 'sky-remote' });

export const SKY_Q_PORT = 49160;
export const LEGACY_PORT = 5900;

// Port candidates, in the order an "automatic" box tries them.
export const PORTS_BY_MODEL = {
  auto: [SKY_Q_PORT, LEGACY_PORT],
  sky_q: [SKY_Q_PORT],
  sky_plus: [LEGACY_PORT],
};

// Remote key codes. The keys (commands) are stored by the scenes and the
// widget forms: never rename one, only add.
export const COMMANDS = {
  power: 0,
  select: 1,
  backup: 2,
  dismiss: 2,
  channelup: 6,
  channeldown: 7,
  interactive: 8,
  sidebar: 8,
  help: 9,
  services: 10,
  search: 10,
  tvguide: 11,
  home: 11,
  i: 14,
  text: 15,
  up: 16,
  down: 17,
  left: 18,
  right: 19,
  red: 32,
  green: 33,
  yellow: 34,
  blue: 35,
  0: 48,
  1: 49,
  2: 50,
  3: 51,
  4: 52,
  5: 53,
  6: 54,
  7: 55,
  8: 56,
  9: 57,
  play: 64,
  pause: 65,
  stop: 66,
  record: 67,
  fastforward: 69,
  rewind: 71,
  boxoffice: 240,
  sky: 241,
};

export const COMMAND_NAMES = Object.keys(COMMANDS);

const BANNER_LENGTH = 12;
const SESSION_READY_LENGTH = 24;
const DEFAULT_TIMEOUT_MS = 5000;
// Pause between two keys of a sequence: the box drops keys sent faster.
const DEFAULT_KEY_DELAY_MS = 250;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The 8-byte "key down" frame of a key code. The "key up" frame is the same
 * with its second byte set to 0.
 * @param {number} code - Remote key code (see COMMANDS).
 * @returns {Buffer}
 */
export function keyFrame(code) {
  return Buffer.from([4, 1, 0, 0, 0, 0, Math.floor(224 + code / 16), code % 16]);
}

/**
 * Normalize a list of commands: lower case, trimmed, every one known.
 * Throws on an unknown command, before anything is sent to the box.
 * @param {string[]} commands
 * @returns {string[]}
 */
export function normalizeCommands(commands) {
  const list = (Array.isArray(commands) ? commands : [commands]).map((command) =>
    String(command).trim().toLowerCase(),
  );
  if (list.length === 0) {
    throw new Error('No command to send');
  }
  for (const command of list) {
    if (!Object.hasOwn(COMMANDS, command)) {
      throw new Error(`Unknown Sky remote command "${command}"`);
    }
  }
  return list;
}

/**
 * The digit keys of a channel number ("101" -> ['1', '0', '1']).
 * @param {number|string} channel
 * @returns {string[]}
 */
export function channelToCommands(channel) {
  const digits = String(channel).trim();
  if (!/^\d{1,4}$/.test(digits)) {
    throw new Error(`Invalid channel number "${channel}" (1 to 4 digits expected)`);
  }
  return digits.split('');
}

/**
 * Open a remote control session with a box and run `onReady(socket)` once the
 * handshake is done. Resolves what `onReady` resolves, rejects on a refused
 * connection, a timeout or a box that closes the session early.
 */
function withSession(host, port, onReady, { timeout = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let ready = false;
    let echoLength = BANNER_LENGTH;
    const socket = net.connect({ host, port });

    const finish = (err, result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (err) reject(err);
      else resolve(result);
    };

    socket.setTimeout(timeout, () =>
      finish(new Error(`Sky box ${host}:${port} did not answer within ${timeout} ms`)),
    );
    socket.on('error', (err) => finish(new Error(`Sky box ${host}:${port}: ${err.message}`)));
    socket.on('close', () => {
      if (!ready) finish(new Error(`Sky box ${host}:${port} closed the session`));
    });
    socket.on('data', (data) => {
      if (ready) return;
      if (data.length < SESSION_READY_LENGTH) {
        socket.write(data.subarray(0, echoLength));
        echoLength = 1;
        return;
      }
      ready = true;
      Promise.resolve()
        .then(() => onReady(socket))
        .then(
          (result) => finish(null, result),
          (err) => finish(err),
        );
    });
  });
}

function write(socket, buffer) {
  return new Promise((resolve, reject) => {
    socket.write(buffer, (err) => (err ? reject(err) : resolve()));
  });
}

/**
 * Send a sequence of remote keys to a box, in one session.
 * @param {string} host - IP address or host name of the box.
 * @param {number} port - Remote control port (49160 or 5900).
 * @param {string[]} commands - Keys of COMMANDS, sent in order.
 * @param {object} [options]
 * @param {number} [options.timeout] - Session timeout, in milliseconds.
 * @param {number} [options.keyDelay] - Pause between two keys, in milliseconds.
 */
export async function sendCommands(host, port, commands, options = {}) {
  const list = normalizeCommands(commands);
  const keyDelay = options.keyDelay ?? DEFAULT_KEY_DELAY_MS;
  logger.debug(`Sending ${list.join(', ')} to ${host}:${port}`);
  await withSession(
    host,
    port,
    async (socket) => {
      for (const [index, command] of list.entries()) {
        if (index > 0 && keyDelay > 0) await sleep(keyDelay);
        const frame = keyFrame(COMMANDS[command]);
        await write(socket, frame);
        frame[1] = 0;
        await write(socket, frame);
      }
    },
    // The keys are paced inside the session: give it the time it needs.
    { timeout: (options.timeout ?? DEFAULT_TIMEOUT_MS) + list.length * keyDelay },
  );
}

/**
 * Whether a box answers the remote control handshake on a port. Sends no key.
 * @returns {Promise<boolean>}
 */
export async function probe(host, port, options = {}) {
  try {
    await withSession(host, port, () => undefined, options);
    return true;
  } catch (err) {
    logger.debug(`Probe of ${host}:${port} failed: ${err.message}`);
    return false;
  }
}

/**
 * The remote control port of a box: the first candidate of its model that
 * answers the handshake, or `null` when none does.
 * @param {string} host
 * @param {'auto'|'sky_q'|'sky_plus'} model
 * @returns {Promise<number|null>}
 */
export async function detectPort(host, model = 'auto', options = {}) {
  for (const port of PORTS_BY_MODEL[model] ?? PORTS_BY_MODEL.auto) {
    if (await probe(host, port, options)) return port;
  }
  return null;
}
