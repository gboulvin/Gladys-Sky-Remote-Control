// -----------------------------------------------------------------------------
// Sky Q status (local network, HTTP).
//
// The remote control protocol (src/skyRemote.js) is send-only: it never says
// whether the box is on. Sky Q boxes also serve a small local REST API on
// port 9006, whose `/as/system/information` document carries `activeStandby`
// (true while the box sleeps) and a few identity fields. The integration
// reads it to report the power state, which makes the power feature, the
// "power changed" scene trigger and the widget meaningful. Sky+ HD boxes have
// no such API: their power state stays unknown.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';

const logger = createLogger({ name: 'sky-status' });

export const STATUS_PORT = 9006;
const STATUS_PATH = '/as/system/information';
const DEFAULT_TIMEOUT_MS = 4000;

/**
 * Read the status of a Sky Q box.
 * @param {string} host - IP address or host name of the box.
 * @param {object} [options]
 * @param {number} [options.timeout] - Request timeout, in milliseconds.
 * @param {Function} [options.fetch] - fetch implementation (tests).
 * @returns {Promise<{ standby: boolean|null, model: string|null }|null>}
 *   `null` when the box does not answer (offline, or not a Sky Q).
 */
export async function readStatus(host, options = {}) {
  const doFetch = options.fetch ?? globalThis.fetch;
  const url = `http://${formatHost(host)}:${STATUS_PORT}${STATUS_PATH}`;
  try {
    const response = await doFetch(url, {
      signal: AbortSignal.timeout(options.timeout ?? DEFAULT_TIMEOUT_MS),
      headers: { accept: 'application/json' },
    });
    if (!response.ok) {
      logger.debug(`Status of ${host}: HTTP ${response.status}`);
      return null;
    }
    const info = await response.json();
    return parseStatus(info);
  } catch (err) {
    logger.debug(`Status of ${host} unavailable: ${err.message}`);
    return null;
  }
}

/**
 * Keep the fields the integration uses from the box information document.
 * @param {object} info
 */
export function parseStatus(info) {
  const standby = typeof info?.activeStandby === 'boolean' ? info.activeStandby : null;
  const modelValue = [info?.hardwareName, info?.modelNumber, info?.hardwareModel].find(
    (value) => typeof value === 'string' && value.trim() !== '',
  );
  return { standby, model: modelValue ? modelValue.trim().slice(0, 40) : null };
}

// An IPv6 literal goes between brackets in a URL.
function formatHost(host) {
  return host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
}
