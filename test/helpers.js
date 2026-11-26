// Shared test helpers: a fake driver replacing the network I/O of the boxes.
import { driver, resetBoxStates } from '../src/devices/skyBox.js';
import { normalizeConfig } from '../src/config.js';

export const BOXES = 'Living room=192.168.1.20, 192.168.1.21';

export function makeConfig(overrides = {}) {
  return normalizeConfig({ boxes: BOXES, ...overrides });
}

/**
 * Install a fake driver. `boxes` maps a host to its simulated state:
 * `{ port: number|null, standby: boolean|null, status: boolean }`
 * (`status: false` = no REST API, like a Sky+ HD).
 * Returns the record of the keys sent: [{ host, port, commands }].
 */
export function installFakeDriver(boxes = {}) {
  resetBoxStates();
  const sent = [];
  const box = (host) => boxes[host] ?? { port: null, standby: null, status: false };
  driver.detectPort = async (host) => box(host).port;
  driver.probe = async (host, port) => box(host).port === port;
  driver.readStatus = async (host) => {
    const b = box(host);
    if (!b.status || b.port === null) return null;
    return { standby: b.standby, model: b.model ?? null };
  };
  driver.sendCommands = async (host, port, commands) => {
    if (box(host).port !== port) throw new Error(`${host}:${port} refused`);
    sent.push({ host, port, commands: [...commands] });
  };
  return sent;
}
