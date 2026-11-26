// -----------------------------------------------------------------------------
// Configuration screen actions (manifest `actions` field).
//
// `test_connection` checks every configured box from scratch: it detects the
// remote control port of each one and says, under the button, which answer.
// No key is sent: the test never disturbs what is on screen.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { listBoxes, testBox } from './devices/skyBox.js';
import { LANGUAGES, msg } from './i18n.js';

const logger = createLogger({ name: 'actions' });

// Join several multi-language messages, language by language.
function join(messages) {
  return Object.fromEntries(
    LANGUAGES.map((lang) => [lang, messages.map((message) => message[lang]).join(' ')]),
  );
}

export const ACTIONS = {
  async test_connection(gladys, { config }) {
    const boxes = listBoxes(gladys, config);
    if (boxes.length === 0) {
      return msg('no_box_configured');
    }
    const lines = [];
    for (const box of boxes) {
      const port = await testBox(gladys, box, config);
      logger.info(`Test of ${box.name}: ${port === null ? 'unreachable' : `port ${port}`}`);
      lines.push(
        port === null
          ? msg('box_unreachable', { name: box.name })
          : msg('box_reachable', { name: box.name, port }),
      );
    }
    if (config.invalidBoxes.length > 0) {
      lines.push(msg('invalid_boxes', { list: config.invalidBoxes.join(', ') }));
    }
    return join(lines);
  },
};
