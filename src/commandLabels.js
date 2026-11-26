// -----------------------------------------------------------------------------
// Labels of the remote keys, in the four languages of the Gladys UI.
//
// Used by the "Remote" form of the dashboard widget. The `send_command` scene
// action of the manifest declares the same options: test/manifest.test.js
// checks that both lists stay identical, and that they cover every key of
// COMMANDS (src/skyRemote.js).
// -----------------------------------------------------------------------------

const digit = (d) => ({ en: d, fr: d, de: d, es: d });

export const COMMAND_LABELS = {
  power: { en: 'Power', fr: 'Marche/Arrêt', de: 'Ein/Aus', es: 'Encender/Apagar' },
  select: { en: 'Select (OK)', fr: 'Valider (OK)', de: 'Auswählen (OK)', es: 'Seleccionar (OK)' },
  backup: { en: 'Back', fr: 'Retour', de: 'Zurück', es: 'Atrás' },
  dismiss: { en: 'Dismiss', fr: 'Fermer', de: 'Schließen', es: 'Cerrar' },
  channelup: { en: 'Channel +', fr: 'Chaîne +', de: 'Sender +', es: 'Canal +' },
  channeldown: { en: 'Channel −', fr: 'Chaîne −', de: 'Sender −', es: 'Canal −' },
  interactive: { en: 'Interactive', fr: 'Interactif', de: 'Interaktiv', es: 'Interactivo' },
  sidebar: { en: 'Sidebar', fr: 'Barre latérale', de: 'Seitenleiste', es: 'Barra lateral' },
  help: { en: 'Help', fr: 'Aide', de: 'Hilfe', es: 'Ayuda' },
  services: { en: 'Services', fr: 'Services', de: 'Dienste', es: 'Servicios' },
  search: { en: 'Search', fr: 'Rechercher', de: 'Suchen', es: 'Buscar' },
  tvguide: { en: 'TV guide', fr: 'Guide TV', de: 'TV-Programm', es: 'Guía de TV' },
  home: { en: 'Home', fr: 'Accueil', de: 'Startseite', es: 'Inicio' },
  i: { en: 'Info (i)', fr: 'Info (i)', de: 'Info (i)', es: 'Info (i)' },
  text: { en: 'Teletext', fr: 'Télétexte', de: 'Videotext', es: 'Teletexto' },
  up: { en: 'Up', fr: 'Haut', de: 'Hoch', es: 'Arriba' },
  down: { en: 'Down', fr: 'Bas', de: 'Runter', es: 'Abajo' },
  left: { en: 'Left', fr: 'Gauche', de: 'Links', es: 'Izquierda' },
  right: { en: 'Right', fr: 'Droite', de: 'Rechts', es: 'Derecha' },
  red: { en: 'Red', fr: 'Rouge', de: 'Rot', es: 'Rojo' },
  green: { en: 'Green', fr: 'Vert', de: 'Grün', es: 'Verde' },
  yellow: { en: 'Yellow', fr: 'Jaune', de: 'Gelb', es: 'Amarillo' },
  blue: { en: 'Blue', fr: 'Bleu', de: 'Blau', es: 'Azul' },
  0: digit('0'),
  1: digit('1'),
  2: digit('2'),
  3: digit('3'),
  4: digit('4'),
  5: digit('5'),
  6: digit('6'),
  7: digit('7'),
  8: digit('8'),
  9: digit('9'),
  play: { en: 'Play', fr: 'Lecture', de: 'Wiedergabe', es: 'Reproducir' },
  pause: { en: 'Pause', fr: 'Pause', de: 'Pause', es: 'Pausa' },
  stop: { en: 'Stop', fr: 'Stop', de: 'Stopp', es: 'Detener' },
  record: { en: 'Record', fr: 'Enregistrer', de: 'Aufnehmen', es: 'Grabar' },
  fastforward: { en: 'Fast forward', fr: 'Avance rapide', de: 'Vorspulen', es: 'Avance rápido' },
  rewind: { en: 'Rewind', fr: 'Retour rapide', de: 'Zurückspulen', es: 'Rebobinar' },
  boxoffice: { en: 'Box Office', fr: 'Box Office', de: 'Box Office', es: 'Box Office' },
  sky: { en: 'Sky button', fr: 'Touche Sky', de: 'Sky-Taste', es: 'Botón Sky' },
};

// Display order of the keys. Spelled out because JavaScript lists the
// integer-like keys ('0' to '9') of an object first.
export const COMMAND_ORDER = [
  'power',
  'select',
  'backup',
  'dismiss',
  'channelup',
  'channeldown',
  'up',
  'down',
  'left',
  'right',
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'play',
  'pause',
  'stop',
  'record',
  'fastforward',
  'rewind',
  'tvguide',
  'home',
  'sky',
  'i',
  'text',
  'help',
  'search',
  'services',
  'interactive',
  'sidebar',
  'boxoffice',
  'red',
  'green',
  'yellow',
  'blue',
];

/** The `options` of a select field listing every remote key. */
export function commandOptions() {
  return COMMAND_ORDER.map((value) => ({ value, label: COMMAND_LABELS[value] }));
}
