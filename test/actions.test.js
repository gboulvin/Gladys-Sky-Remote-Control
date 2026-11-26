import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { ACTIONS } from '../src/actions.js';
import { installFakeDriver, makeConfig } from './helpers.js';

test('test_connection reports every box, in every language', async () => {
  installFakeDriver({ '192.168.1.20': { port: 49160 } });
  const gladys = createFakeGladys();
  const config = makeConfig({ boxes: 'Living room=192.168.1.20, 192.168.1.21, bad entry' });
  const message = await ACTIONS.test_connection(gladys, { fields: {}, config });
  assert.match(message.en, /Living room: reachable on port 49160/);
  assert.match(message.en, /Sky box 192\.168\.1\.21: no answer/);
  assert.match(message.en, /bad entry/);
  assert.match(message.fr, /joignable sur le port 49160/);
  assert.match(message.de, /erreichbar über Port 49160/);
  assert.match(message.es, /accesible en el puerto 49160/);
});

test('test_connection explains that no box is configured', async () => {
  installFakeDriver({});
  const message = await ACTIONS.test_connection(createFakeGladys(), {
    fields: {},
    config: makeConfig({ boxes: '' }),
  });
  assert.match(message.en, /No Sky box configured/);
});
