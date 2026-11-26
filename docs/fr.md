# Sky Remote Control

Pilotez vos décodeurs **Sky Q** et **Sky+ HD** depuis Gladys : allumez-les ou
mettez-les en veille, changez de chaîne, appuyez sur n'importe quelle touche
de la télécommande, depuis le tableau de bord, les scènes ou la page de
l'appareil.

Tout se passe **sur votre réseau local**, avec le protocole des applications
télécommande Sky : pas de compte Sky, pas de cloud, aucune donnée ne quitte
votre domicile.

## Prérequis

- Un décodeur Sky Q ou Sky+ HD (commercialisés par Sky au Royaume-Uni, en
  Irlande, en Italie, en Allemagne et en Autriche), branché sur le même réseau
  que Gladys.
- Gladys 5.3 ou plus récent.
- Une **adresse IP fixe** pour chaque décodeur : créez un bail DHCP statique
  dans votre box internet. Gladys identifie un décodeur par son adresse ; si
  elle change, le décodeur apparaît comme un nouvel appareil.

Les appareils Sky Glass et Sky Stream ne proposent pas ce contrôle local et ne
sont pas pris en charge.

## Configuration

1. Trouvez l'adresse IP de votre décodeur : sur un Sky Q, **Accueil →
   Paramètres → Configuration → Réseau → Paramètres avancés** ; ou dans la
   liste des appareils de votre box internet.
2. Ouvrez l'onglet **Configuration** de l'intégration.
3. Dans **Décodeurs Sky**, saisissez l'adresse de chaque décodeur, séparées
   par des virgules. Vous pouvez les nommer :
   `Salon=192.168.1.20, Chambre=192.168.1.21`.
4. Laissez **Modèle de décodeur** sur **Automatique** : l'intégration essaie
   le port Sky Q (49160), puis celui du Sky+ HD (5900). Ne choisissez le
   modèle que si la détection échoue.
5. Gardez **Lire l'état d'alimentation (Sky Q)** activé pour savoir si chaque
   Sky Q est allumé ou en veille (lu toutes les 30 secondes via l'API locale
   du décodeur, port 9006). Les Sky+ HD n'ont pas cette API : leur état reste
   inconnu.
6. Enregistrez, puis cliquez sur **Tester la connexion** : le résultat indique,
   pour chaque décodeur, s'il répond et sur quel port.
7. Ouvrez l'onglet **Découverte** et ajoutez vos décodeurs.

## L'appareil

Chaque décodeur devient un appareil **télévision** dans Gladys, avec :

- **Alimentation** — sur un Sky Q dont l'état est lu, Gladys n'appuie sur la
  touche marche/arrêt que si le décodeur n'est pas déjà dans l'état demandé ;
  sinon, la touche bascule le décodeur.
- **Chaîne** — compose le numéro de chaîne (jusqu'à 4 chiffres).
- **Boutons** — chaîne + / −, guide TV, accueil, info, valider, retour, les
  quatre flèches, lecture, pause, stop, retour rapide, avance rapide et
  enregistrement.

Un badge sur l'appareil indique si le décodeur est joignable sur le réseau
local.

## Actions

- **Tester la connexion** — vérifie chaque décodeur configuré sans appuyer sur
  aucune touche, et affiche ceux qui répondent.

## Scènes

Déclencheurs (Gladys 5.1 ou plus récent), dans la catégorie
**Intégrations** de l'éditeur de scènes :

- **Alimentation du décodeur Sky modifiée** — un Sky Q s'est allumé ou mis en
  veille (nécessite « Lire l'état d'alimentation »). Filtrez sur un décodeur
  et sur le nouvel état ; la scène peut le lire avec
  `{{triggerEvent.data.state}}` (`on` ou `standby`).
- **Décodeur Sky en ligne / hors ligne** — un décodeur a commencé ou cessé de
  répondre sur le réseau. `{{triggerEvent.data.status}}` vaut `online` ou
  `offline`.

Actions :

- **Appuyer sur une touche Sky** — n'importe quelle touche de la
  télécommande, de 1 à 10 fois. Sortie : `sent` (le décodeur a été joint).
- **Changer de chaîne Sky** — compose un numéro de chaîne. Le champ accepte
  les variables de scène. Sortie : `sent`.
- **Allumer / éteindre un décodeur Sky** — allumé, en veille ou basculer.
  Sorties : `sent` et `pressed` (s'il a fallu appuyer sur marche/arrêt).

Un décodeur injoignable n'arrête pas la scène : l'action renvoie
`sent = false`, pour que les actions suivantes puissent en dépendre.

## Tableau de bord

Ajoutez le widget **Télécommande Sky** et choisissez un décodeur dans ses
réglages. Il affiche la connexion, l'état d'alimentation, l'adresse et le
modèle du décodeur, avec quatre boutons : **Marche/Arrêt**, **Chaîne +**,
**Chaîne −** et **Télécommande**, qui ouvre un formulaire pour appuyer sur
n'importe quelle touche ou saisir un numéro de chaîne.

## Dépannage

- **« Aucune réponse sur les ports de télécommande »** — vérifiez que le
  décodeur est allumé (ou en veille, pas débranché), que l'adresse est juste,
  et que Gladys et le décodeur sont sur le même réseau (pas de Wi-Fi invité,
  pas d'isolation des clients).
- **Certains décodeurs utilisent l'ancien port** : les Sky Q avec un ancien
  logiciel ne répondent que sur le port 5900 — choisissez **Sky+ HD** comme
  modèle.
- **L'état d'alimentation reste inconnu** — normal sur un Sky+ HD. Sur un Sky
  Q, vérifiez que le port 9006 est joignable depuis Gladys.
- **Une touche ne fait rien** — toutes les touches n'existent pas sur tous les
  modèles ni dans tous les menus.
- Logs détaillés : les logs de l'intégration dans l'interface de Gladys, avec
  `LOG_LEVEL=debug` pour tout le détail.

Le protocole de télécommande Sky n'a pas de touches de volume : le volume se
règle sur votre téléviseur.
