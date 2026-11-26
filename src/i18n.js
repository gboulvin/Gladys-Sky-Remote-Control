// -----------------------------------------------------------------------------
// User-facing messages, in the four languages of the Gladys UI.
//
// Gladys picks the user's language from a multi-language object and falls
// back to `en`. Every text the integration sends to a user (action messages,
// toasts, connection status, widget labels) comes from here, so no language
// is ever forgotten (test/i18n.test.js checks it).
// -----------------------------------------------------------------------------

export const LANGUAGES = ['en', 'fr', 'de', 'es'];

export const MESSAGES = {
  no_box_configured: {
    en: 'No Sky box configured: add the IP address of your box in the configuration.',
    fr: "Aucun décodeur Sky configuré : ajoutez l'adresse IP de votre décodeur dans la configuration.",
    de: 'Kein Sky-Receiver konfiguriert: Tragen Sie die IP-Adresse Ihres Receivers in der Konfiguration ein.',
    es: 'Ningún decodificador Sky configurado: añada la dirección IP de su decodificador en la configuración.',
  },
  invalid_boxes: {
    en: 'Ignored invalid entries: {list}.',
    fr: 'Entrées invalides ignorées : {list}.',
    de: 'Ungültige Einträge ignoriert: {list}.',
    es: 'Entradas no válidas ignoradas: {list}.',
  },
  box_reachable: {
    en: '{name}: reachable on port {port}.',
    fr: '{name} : joignable sur le port {port}.',
    de: '{name}: erreichbar über Port {port}.',
    es: '{name}: accesible en el puerto {port}.',
  },
  box_unreachable: {
    en: '{name}: no answer on the remote control ports.',
    fr: '{name} : aucune réponse sur les ports de télécommande.',
    de: '{name}: keine Antwort auf den Fernbedienungs-Ports.',
    es: '{name}: sin respuesta en los puertos del mando a distancia.',
  },
  boxes_unreachable_status: {
    en: 'Unreachable Sky box: {list}. Check that it is on and on the same network.',
    fr: 'Décodeur Sky injoignable : {list}. Vérifiez qu’il est allumé et sur le même réseau.',
    de: 'Sky-Receiver nicht erreichbar: {list}. Prüfen Sie, ob er eingeschaltet und im selben Netzwerk ist.',
    es: 'Decodificador Sky inaccesible: {list}. Compruebe que esté encendido y en la misma red.',
  },
  init_failed: {
    en: 'Initialization failed, check the integration logs.',
    fr: "L'initialisation a échoué, consultez les logs de l'intégration.",
    de: 'Initialisierung fehlgeschlagen, prüfen Sie die Logs der Integration.',
    es: 'La inicialización ha fallado, consulte los registros de la integración.',
  },
  command_sent: {
    en: 'Sent to {name}.',
    fr: 'Envoyé à {name}.',
    de: 'An {name} gesendet.',
    es: 'Enviado a {name}.',
  },
  channel_sent: {
    en: '{name}: switching to channel {channel}.',
    fr: '{name} : passage sur la chaîne {channel}.',
    de: '{name}: Wechsel zu Sender {channel}.',
    es: '{name}: cambiando al canal {channel}.',
  },
  nothing_to_send: {
    en: 'Pick a key or type a channel number.',
    fr: 'Choisissez une touche ou saisissez un numéro de chaîne.',
    de: 'Wählen Sie eine Taste oder geben Sie eine Sendernummer ein.',
    es: 'Elija una tecla o escriba un número de canal.',
  },
  pick_box: {
    en: 'Pick a Sky box in the widget settings.',
    fr: 'Choisissez un décodeur Sky dans les réglages du widget.',
    de: 'Wählen Sie einen Sky-Receiver in den Widget-Einstellungen.',
    es: 'Elija un decodificador Sky en los ajustes del widget.',
  },
  unknown_box: {
    en: 'This Sky box is no longer in the configuration.',
    fr: 'Ce décodeur Sky ne fait plus partie de la configuration.',
    de: 'Dieser Sky-Receiver ist nicht mehr in der Konfiguration.',
    es: 'Este decodificador Sky ya no está en la configuración.',
  },
  // Widget labels (status rows, buttons, values).
  connection: { en: 'Connection', fr: 'Connexion', de: 'Verbindung', es: 'Conexión' },
  power: { en: 'Power', fr: 'Alimentation', de: 'Betrieb', es: 'Encendido' },
  address: { en: 'Address', fr: 'Adresse', de: 'Adresse', es: 'Dirección' },
  model: { en: 'Model', fr: 'Modèle', de: 'Modell', es: 'Modelo' },
  online: { en: 'Online', fr: 'En ligne', de: 'Online', es: 'En línea' },
  offline: { en: 'Offline', fr: 'Hors ligne', de: 'Offline', es: 'Sin conexión' },
  unknown: { en: 'Unknown', fr: 'Inconnu', de: 'Unbekannt', es: 'Desconocido' },
  on: { en: 'On', fr: 'Allumé', de: 'An', es: 'Encendido' },
  standby: { en: 'Standby', fr: 'En veille', de: 'Standby', es: 'En espera' },
  btn_power: { en: 'Power', fr: 'Marche/Arrêt', de: 'Ein/Aus', es: 'Encender/Apagar' },
  btn_channel_up: { en: 'Channel +', fr: 'Chaîne +', de: 'Sender +', es: 'Canal +' },
  btn_channel_down: { en: 'Channel −', fr: 'Chaîne −', de: 'Sender −', es: 'Canal −' },
  btn_remote: { en: 'Remote', fr: 'Télécommande', de: 'Fernbedienung', es: 'Mando' },
  field_command: { en: 'Key', fr: 'Touche', de: 'Taste', es: 'Tecla' },
  field_channel: {
    en: 'Channel number',
    fr: 'Numéro de chaîne',
    de: 'Sendernummer',
    es: 'Número de canal',
  },
  field_channel_hint: {
    en: 'Optional: sent instead of the key.',
    fr: 'Facultatif : envoyé à la place de la touche.',
    de: 'Optional: wird statt der Taste gesendet.',
    es: 'Opcional: se envía en lugar de la tecla.',
  },
  none: { en: '(none)', fr: '(aucune)', de: '(keine)', es: '(ninguna)' },
};

/**
 * A multi-language message, `{placeholders}` replaced in every language.
 * @param {keyof MESSAGES} key
 * @param {Record<string, string|number>} [vars]
 * @returns {{ en: string, fr: string, de: string, es: string }}
 */
export function msg(key, vars = {}) {
  const texts = MESSAGES[key];
  if (!texts) {
    throw new Error(`Unknown message "${key}"`);
  }
  return Object.fromEntries(
    LANGUAGES.map((lang) => [
      lang,
      texts[lang].replace(/\{(\w+)\}/g, (match, name) =>
        Object.hasOwn(vars, name) ? String(vars[name]) : match,
      ),
    ]),
  );
}
