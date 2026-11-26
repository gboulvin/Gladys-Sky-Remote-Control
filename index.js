// -----------------------------------------------------------------------------
// Entry point of the Sky Remote Control integration for Gladys Assistant.
//
// This file only wires the SDK to the modules of src/: it registers the
// handlers BEFORE connect(), then connects and publishes the boxes. The
// supervisor injects GLADYS_HOST_API_URL, GLADYS_INTEGRATION_TOKEN and
// GLADYS_INTEGRATION_SELECTOR; `new GladysIntegration()` reads them.
// -----------------------------------------------------------------------------

import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { normalizeConfig } from './src/config.js';
import {
  buildDevice,
  findBox,
  getBoxState,
  listBoxes,
  onSetValue,
  pollBox,
  resetBoxStates,
  transportEntry,
} from './src/devices/skyBox.js';
import { ACTIONS } from './src/actions.js';
import { SCENE_ACTIONS } from './src/scenes.js';
import { WIDGETS, refreshWidgets } from './src/widgets.js';
import { msg } from './src/i18n.js';

const gladys = new GladysIntegration();

// Current configuration (hot-reloaded via onConfigUpdated).
let config = normalizeConfig();

async function publishBoxes() {
  const boxes = listBoxes(gladys, config);
  await gladys.publishDiscoveredDevices(boxes.map((box) => buildDevice(gladys, config, box)));
  if (boxes.length > 0) {
    await gladys.publishTransports(boxes.map((box) => transportEntry(box)));
  }
  if (config.invalidBoxes.length > 0) {
    logger.warn(`Ignored invalid box entries: ${config.invalidBoxes.join(', ')}`);
  }
}

// Application-level status of the Configuration screen: connected when every
// box answered its last check (or none was checked yet).
async function reportStatus() {
  const boxes = listBoxes(gladys, config);
  if (boxes.length === 0) {
    await gladys.setConnectionStatus(false, msg('no_box_configured'));
    return;
  }
  const unreachable = boxes.filter((box) => getBoxState(box.externalId).reachable === false);
  if (unreachable.length > 0) {
    await gladys.setConnectionStatus(
      false,
      msg('boxes_unreachable_status', { list: unreachable.map((box) => box.name).join(', ') }),
    );
    return;
  }
  await gladys.setConnectionStatus(true);
}

// --- Discovery ---------------------------------------------------------------
gladys.onScanRequest(async () => {
  logger.info('onScanRequest -> publishing the configured boxes');
  await publishBoxes();
});

// --- Commands on a feature (power, channel, remote keys) ---------------------
gladys.onSetValue(async (device, feature, value) => {
  logger.info(`onSetValue <- ${feature.external_id} = ${value}`);
  await onSetValue(gladys, { device, feature, value, config });
});

// --- Polling: reachability and power state, every 30 seconds -----------------
gladys.onPoll(async (device) => {
  const box = findBox(gladys, config, device.external_id);
  if (!box) {
    logger.debug(`onPoll skipped: ${device.external_id} is not configured anymore`);
    return;
  }
  const wasReachable = getBoxState(box.externalId).reachable;
  const { changed } = await pollBox(gladys, box, config);
  if (changed) {
    refreshWidgets(gladys);
  }
  if (getBoxState(box.externalId).reachable !== wasReachable) {
    await reportStatus();
  }
});

// --- Configuration screen actions --------------------------------------------
for (const [actionKey, handler] of Object.entries(ACTIONS)) {
  gladys.onAction(actionKey, async (fields) => {
    const message = await handler(gladys, { fields, config });
    await reportStatus().catch((err) => logger.error('Status report failed', err));
    return message;
  });
}

// --- Scene actions -----------------------------------------------------------
for (const [actionKey, handler] of Object.entries(SCENE_ACTIONS)) {
  gladys.onSceneAction(actionKey, (fields) => handler(gladys, { fields, config }));
}

// --- Dashboard widgets -------------------------------------------------------
for (const [widgetKey, widget] of Object.entries(WIDGETS)) {
  gladys.onWidgetGet(widgetKey, (request) => widget.get(gladys, { ...request, config }));
  gladys.onWidgetAction(widgetKey, (actionKey, params, { settings, values }) =>
    widget.action(gladys, { actionKey, params, settings, values, config }),
  );
}

// --- Configuration updated by the user ---------------------------------------
gladys.onConfigUpdated(async (newConfig) => {
  logger.info('onConfigUpdated -> new configuration received');
  config = normalizeConfig(newConfig);
  // The boxes, their model or their addresses may have changed: start over.
  resetBoxStates();
  await publishBoxes();
  await reportStatus();
  refreshWidgets(gladys);
});

// --- Connection lifecycle ----------------------------------------------------
gladys.on('connected', async () => {
  try {
    config = normalizeConfig(await gladys.getConfig());
    await publishBoxes();
    await reportStatus();
    // Nudges sent while the socket was down were dropped: re-sync.
    refreshWidgets(gladys);
  } catch (err) {
    logger.error('Post-connection initialization failed', err);
    await gladys.setConnectionStatus(false, msg('init_failed')).catch(() => {});
  }
});

gladys.handleShutdown((signal) => {
  logger.info(`Received ${signal} -> graceful shutdown`);
});

logger.info('Starting the Sky Remote Control integration...');
gladys.connect().catch((err) => {
  logger.error('Initial connection failed', err);
  process.exit(1);
});
