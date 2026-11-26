import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, normalizeConfig, parseBoxes } from '../src/config.js';

test('normalizeConfig applies the defaults', () => {
  const config = normalizeConfig();
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    assert.equal(config[key], value, key);
  }
  assert.deepEqual(config.boxList, []);
});

test('parseBoxes reads addresses, optional names and drops duplicates', () => {
  const { boxes, invalid } = parseBoxes(
    'Living room=192.168.1.20, 192.168.1.21\nBedroom = SKYQ.local ; 192.168.1.20',
  );
  assert.deepEqual(boxes, [
    { name: 'Living room', host: '192.168.1.20' },
    { name: null, host: '192.168.1.21' },
    { name: 'Bedroom', host: 'skyq.local' },
  ]);
  assert.deepEqual(invalid, []);
});

test('parseBoxes rejects URLs and junk instead of using them', () => {
  const { boxes, invalid } = parseBoxes('http://192.168.1.2/, a b, fe80::1');
  assert.deepEqual(boxes, [{ name: null, host: 'fe80::1' }]);
  assert.deepEqual(invalid, ['http://192.168.1.2/', 'a b']);
});

test('normalizeConfig coerces the form values', () => {
  assert.equal(normalizeConfig({ status_polling: 'false' }).status_polling, false);
  assert.equal(normalizeConfig({ status_polling: false }).status_polling, false);
  assert.equal(normalizeConfig({ status_polling: true }).status_polling, true);
  assert.equal(normalizeConfig({ model: 'nonsense' }).model, 'auto');
  assert.equal(normalizeConfig({ model: 'sky_plus' }).model, 'sky_plus');
});
