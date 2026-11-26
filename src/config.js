// -----------------------------------------------------------------------------
// Integration configuration.
//
// Filled in by the user from the `config_schema` of
// `gladys-assistant-integration.json`; fetched with `gladys.getConfig()` and
// updated through `gladys.onConfigUpdated()`. This module provides the
// defaults and turns the raw form values into what the code uses, so the rest
// of the code never deals with `undefined` or strings.
// -----------------------------------------------------------------------------

// Defaults: they MUST stay consistent with the `default` values declared in the
// `config_schema` of the manifest (test/manifest.test.js checks it).
export const DEFAULT_CONFIG = {
  // Boxes to control: comma or newline separated entries, each an IP address
  // or host name, optionally prefixed by a name: "Living room=192.168.1.20".
  boxes: '',
  // 'auto' tries the Sky Q port (49160), then the legacy one (5900).
  model: 'auto',
  // Read the power state of the Sky Q boxes (local REST API, port 9006).
  status_polling: true,
};

export const MODELS = ['auto', 'sky_q', 'sky_plus'];

// A host name or an IPv4 / IPv6 address: no scheme, no path, no port.
const HOST_PATTERN = /^[a-zA-Z0-9.:-]{1,253}$/;

/**
 * Parse the `boxes` field into a list of `{ name, host }`, duplicates and
 * invalid entries dropped (reported in `invalid`).
 * @param {string} raw
 * @returns {{ boxes: { name: string|null, host: string }[], invalid: string[] }}
 */
export function parseBoxes(raw = '') {
  const boxes = [];
  const invalid = [];
  const seen = new Set();
  for (const entry of String(raw).split(/[,;\n]/)) {
    const text = entry.trim();
    if (text === '') continue;
    const separator = text.lastIndexOf('=');
    const name = separator > 0 ? text.slice(0, separator).trim() : '';
    const host = (separator >= 0 ? text.slice(separator + 1) : text).trim().toLowerCase();
    if (!HOST_PATTERN.test(host)) {
      invalid.push(text);
      continue;
    }
    if (seen.has(host)) continue;
    seen.add(host);
    boxes.push({ name: name === '' ? null : name.slice(0, 60), host });
  }
  return { boxes, invalid };
}

/**
 * Merge the user config with the defaults.
 * @param {Record<string, unknown>} raw config returned by the SDK
 */
export function normalizeConfig(raw = {}) {
  const merged = { ...DEFAULT_CONFIG, ...raw };
  const { boxes, invalid } = parseBoxes(merged.boxes ?? '');
  return {
    ...merged,
    boxes: typeof merged.boxes === 'string' ? merged.boxes : DEFAULT_CONFIG.boxes,
    model: MODELS.includes(merged.model) ? merged.model : DEFAULT_CONFIG.model,
    // A form may send the boolean as a string; anything but false keeps it on.
    status_polling: merged.status_polling !== false && merged.status_polling !== 'false',
    boxList: boxes,
    invalidBoxes: invalid,
  };
}
