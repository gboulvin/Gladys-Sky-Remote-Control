// -----------------------------------------------------------------------------
// Dashboard widget (SDK v0.14+, Gladys 5.1+): a Sky remote on the dashboard.
//
// Declared in the manifest `widgets` field, with one per-instance setting:
// the box to drive (a `"source": "devices"` select). The content shows the
// state of the box (connection, power, address, model) and four buttons:
// power, channel up, channel down, and a "Remote" form to press any key or
// type a channel number.
//
// The buttons are widget actions, not device-feature buttons: they work as
// soon as the box is configured, before its device is added in Gladys. Their
// `params` are declared here and echoed back as-is: the handler never trusts
// user input for the box (a dashboard can hang on a public wall), only the
// values of the form, validated by the core against the declared fields.
// -----------------------------------------------------------------------------

import { createLogger, WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { COMMAND_ORDER, commandOptions } from './commandLabels.js';
import { findBox, getBoxState, sendToBox, setPower, changeChannel } from './devices/skyBox.js';
import { MAX_CHANNEL } from './devices/skyBox.js';
import { msg } from './i18n.js';

const logger = createLogger({ name: 'widgets' });

// Widget key, as declared in the manifest `widgets` field.
export const SKY_REMOTE_WIDGET = 'sky_remote';

// Keys of the button actions of the content.
export const WIDGET_ACTIONS = {
  POWER: 'power',
  CHANNEL_UP: 'channel_up',
  CHANNEL_DOWN: 'channel_down',
  REMOTE: 'remote',
};

function connectionRow(state) {
  if (state.reachable === null) {
    return { value: msg('unknown'), color: WIDGET_COLORS.NEUTRAL };
  }
  return state.reachable
    ? { value: msg('online'), color: WIDGET_COLORS.SUCCESS }
    : { value: msg('offline'), color: WIDGET_COLORS.DANGER };
}

function powerRow(state) {
  if (state.standby === null) {
    return { value: msg('unknown'), color: WIDGET_COLORS.NEUTRAL };
  }
  return state.standby
    ? { value: msg('standby'), color: WIDGET_COLORS.WARNING }
    : { value: msg('on'), color: WIDGET_COLORS.SUCCESS };
}

function buttons(box) {
  const params = { device: box.externalId };
  return [
    {
      type: 'button',
      label: msg('btn_power'),
      icon: 'power',
      style: 'primary',
      action: { key: WIDGET_ACTIONS.POWER, params },
    },
    {
      type: 'button',
      label: msg('btn_channel_up'),
      icon: 'chevron-up',
      action: { key: WIDGET_ACTIONS.CHANNEL_UP, params },
    },
    {
      type: 'button',
      label: msg('btn_channel_down'),
      icon: 'chevron-down',
      action: { key: WIDGET_ACTIONS.CHANNEL_DOWN, params },
    },
    {
      type: 'button',
      label: msg('btn_remote'),
      icon: 'grid',
      action: {
        key: WIDGET_ACTIONS.REMOTE,
        params,
        fields: [
          {
            key: 'command',
            type: 'select',
            label: msg('field_command'),
            default: 'select',
            options: commandOptions(),
          },
          {
            key: 'channel',
            type: 'number',
            label: msg('field_channel'),
            description: msg('field_channel_hint'),
            min: 1,
            max: MAX_CHANNEL,
          },
        ],
      },
    },
  ];
}

export const WIDGETS = {
  [SKY_REMOTE_WIDGET]: {
    async get(gladys, { settings = {}, config }) {
      logger.debug(`onWidgetGet <- ${SKY_REMOTE_WIDGET} (${settings.device ?? 'no box'})`);
      if (!settings.device) {
        return { ttl_seconds: 300, components: [{ type: 'text', text: msg('pick_box') }] };
      }
      const box = findBox(gladys, config, settings.device);
      if (!box) {
        return { ttl_seconds: 300, components: [{ type: 'text', text: msg('unknown_box') }] };
      }
      const state = getBoxState(box.externalId);
      const items = [
        { label: msg('connection'), icon: 'wifi', ...connectionRow(state) },
        { label: msg('power'), icon: 'power', ...powerRow(state) },
        { label: msg('address'), icon: 'map-pin', value: box.host, color: WIDGET_COLORS.NEUTRAL },
      ];
      if (state.model) {
        items.push({
          label: msg('model'),
          icon: 'tv',
          value: state.model,
          color: WIDGET_COLORS.NEUTRAL,
        });
      }
      return {
        // index.js nudges the widget when a poll sees a change: the TTL is a
        // safety net.
        ttl_seconds: 120,
        components: [
          { type: 'text', variant: 'heading', text: box.name.slice(0, 40) },
          { type: 'status', items },
          ...buttons(box),
        ],
      };
    },

    async action(gladys, { actionKey, params = {}, values = {}, config }) {
      logger.info(`onWidgetAction <- ${SKY_REMOTE_WIDGET}.${actionKey}`);
      const box = findBox(gladys, config, params.device);
      if (!box) {
        throw new Error(msg('unknown_box').en);
      }
      switch (actionKey) {
        case WIDGET_ACTIONS.POWER:
          await setPower(gladys, box, config, 'toggle');
          return msg('command_sent', { name: box.name });
        case WIDGET_ACTIONS.CHANNEL_UP:
          await sendToBox(gladys, box, config, ['channelup']);
          return msg('command_sent', { name: box.name });
        case WIDGET_ACTIONS.CHANNEL_DOWN:
          await sendToBox(gladys, box, config, ['channeldown']);
          return msg('command_sent', { name: box.name });
        case WIDGET_ACTIONS.REMOTE: {
          // A channel number wins over the key: it is the more specific ask.
          if (values.channel !== undefined && values.channel !== null && values.channel !== '') {
            await changeChannel(gladys, box, config, Math.round(Number(values.channel)));
            return msg('channel_sent', { name: box.name, channel: Math.round(values.channel) });
          }
          if (!COMMAND_ORDER.includes(values.command)) {
            return msg('nothing_to_send');
          }
          await sendToBox(gladys, box, config, [values.command]);
          return msg('command_sent', { name: box.name });
        }
        default:
          // Throwing acks the action as failed: the message reaches the user.
          throw new Error(`Unknown widget action: ${actionKey}`);
      }
    },
  },
};

/**
 * Freshness nudge: ask the core to re-pull every widget now (after a
 * (re)connection, a config update, or a poll that saw a change). Rate-limited
 * core-side to 1 per 10 s per widget, dropped while disconnected.
 */
export function refreshWidgets(gladys) {
  for (const key of Object.keys(WIDGETS)) {
    gladys.requestWidgetRefresh(key);
  }
}
