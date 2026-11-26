import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStatus, readStatus } from '../src/skyStatus.js';

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

test('readStatus reads the standby flag and the model of a Sky Q', async () => {
  let calledUrl;
  const status = await readStatus('192.168.1.20', {
    fetch: async (url) => {
      calledUrl = url;
      return jsonResponse({ activeStandby: false, hardwareName: 'Sky Q 2TB' });
    },
  });
  assert.equal(calledUrl, 'http://192.168.1.20:9006/as/system/information');
  assert.deepEqual(status, { standby: false, model: 'Sky Q 2TB' });
});

test('readStatus resolves null when the box does not answer', async () => {
  assert.equal(
    await readStatus('192.168.1.20', {
      fetch: async () => {
        throw new Error('ECONNREFUSED');
      },
    }),
    null,
  );
  assert.equal(await readStatus('h', { fetch: async () => jsonResponse({}, 404) }), null);
});

test('readStatus puts an IPv6 literal between brackets', async () => {
  let calledUrl;
  await readStatus('fe80::1', {
    fetch: async (url) => {
      calledUrl = url;
      return jsonResponse({ activeStandby: true });
    },
  });
  assert.equal(calledUrl, 'http://[fe80::1]:9006/as/system/information');
});

test('parseStatus tolerates a document without the expected fields', () => {
  assert.deepEqual(parseStatus({}), { standby: null, model: null });
  assert.deepEqual(parseStatus(null), { standby: null, model: null });
  assert.deepEqual(parseStatus({ activeStandby: true, modelNumber: ' ES240 ' }), {
    standby: true,
    model: 'ES240',
  });
});
