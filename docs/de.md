# Sky Remote Control

Steuern Sie Ihre **Sky Q** und **Sky+ HD** Receiver mit Gladys: einschalten
oder in Standby versetzen, Sender wechseln, jede Taste der Fernbedienung
drücken – über das Dashboard, Szenen oder die Geräteseite.

Alles läuft **in Ihrem lokalen Netzwerk**, mit dem Protokoll der
Sky-Fernbedienungs-Apps: kein Sky-Konto, keine Cloud, keine Daten verlassen
Ihr Zuhause.

## Voraussetzungen

- Ein Sky Q oder Sky+ HD Receiver (von Sky in Großbritannien, Irland,
  Italien, Deutschland und Österreich vertrieben), im selben Netzwerk wie
  Gladys.
- Gladys 5.3 oder neuer.
- Eine **feste IP-Adresse** für jeden Receiver: Legen Sie in Ihrem Router eine
  DHCP-Reservierung an. Gladys erkennt einen Receiver an seiner Adresse; ändert
  sie sich, erscheint er als neues Gerät.

Sky Glass und Sky Stream bieten diese lokale Steuerung nicht und werden nicht
unterstützt.

## Konfiguration

1. Ermitteln Sie die IP-Adresse Ihres Receivers: beim Sky Q unter **Home →
   Einstellungen → Setup → Netzwerk → Erweiterte Einstellungen**, oder in der
   Geräteliste Ihres Routers.
2. Öffnen Sie den Reiter **Konfiguration** der Integration.
3. Tragen Sie unter **Sky-Receiver** die Adresse jedes Receivers ein, durch
   Kommas getrennt. Sie können Namen vergeben:
   `Wohnzimmer=192.168.1.20, Schlafzimmer=192.168.1.21`.
4. Lassen Sie **Receiver-Modell** auf **Automatisch**: Die Integration
   versucht den Sky-Q-Port (49160), dann den Sky+-HD-Port (5900). Wählen Sie
   das Modell nur, wenn die Erkennung fehlschlägt.
5. Lassen Sie **Betriebszustand lesen (Sky Q)** aktiviert, um zu wissen, ob
   jeder Sky Q eingeschaltet oder im Standby ist (alle 30 Sekunden über die
   lokale API des Receivers gelesen, Port 9006). Sky+ HD Receiver haben diese
   API nicht: Ihr Zustand bleibt unbekannt.
6. Speichern Sie und klicken Sie auf **Verbindung testen**: Das Ergebnis zeigt
   für jeden Receiver, ob und auf welchem Port er antwortet.
7. Öffnen Sie den Reiter **Erkennung** und fügen Sie Ihre Receiver hinzu.

## Das Gerät

Jeder Receiver wird in Gladys zu einem **Fernseher**-Gerät mit:

- **Betrieb** – bei einem Sky Q mit gelesenem Zustand drückt Gladys die
  Ein/Aus-Taste nur, wenn der Receiver nicht schon im gewünschten Zustand ist;
  sonst schaltet die Taste um.
- **Sender** – gibt die Sendernummer ein (bis zu 4 Ziffern).
- **Tasten** – Sender + / −, TV-Programm, Startseite, Info, Auswählen,
  Zurück, die vier Pfeiltasten, Wiedergabe, Pause, Stopp, Zurückspulen,
  Vorspulen und Aufnahme.

Ein Badge am Gerät zeigt, ob der Receiver im lokalen Netzwerk erreichbar ist.

## Aktionen

- **Verbindung testen** – prüft jeden konfigurierten Receiver, ohne eine Taste
  zu drücken, und zeigt, welche antworten.

## Szenen

Auslöser (Gladys 5.1 oder neuer), in der Kategorie **Integrationen** des
Szenen-Editors:

- **Betriebszustand des Sky-Receivers geändert** – ein Sky Q wurde
  eingeschaltet oder ging in Standby („Betriebszustand lesen“ nötig). Filtern
  Sie nach Receiver und neuem Zustand; die Szene liest ihn mit
  `{{triggerEvent.data.state}}` (`on` oder `standby`).
- **Sky-Receiver online / offline** – ein Receiver antwortet wieder bzw. nicht
  mehr im Netzwerk. `{{triggerEvent.data.status}}` ist `online` oder
  `offline`.

Aktionen:

- **Sky-Fernbedienungstaste drücken** – jede Taste der Fernbedienung, 1- bis
  10-mal. Ausgabe: `sent` (Receiver erreicht).
- **Sky-Sender wechseln** – gibt eine Sendernummer ein. Das Feld akzeptiert
  Szenen-Variablen. Ausgabe: `sent`.
- **Sky-Receiver ein- / ausschalten** – ein, Standby oder umschalten.
  Ausgaben: `sent` und `pressed` (ob die Ein/Aus-Taste gedrückt werden
  musste).

Ein nicht erreichbarer Receiver stoppt die Szene nicht: Die Aktion liefert
`sent = false`, sodass die folgenden Aktionen davon abhängen können.

## Dashboard

Fügen Sie das Widget **Sky-Fernbedienung** hinzu und wählen Sie in seinen
Einstellungen einen Receiver. Es zeigt Verbindung, Betriebszustand, Adresse
und Modell des Receivers sowie vier Tasten: **Ein/Aus**, **Sender +**,
**Sender −** und **Fernbedienung**, die ein Formular öffnet, um jede Taste zu
drücken oder eine Sendernummer einzugeben.

## Fehlerbehebung

- **„Keine Antwort auf den Fernbedienungs-Ports“** – prüfen Sie, ob der
  Receiver eingeschaltet (oder im Standby, nicht ausgesteckt) ist, ob die
  Adresse stimmt und ob Gladys und der Receiver im selben Netzwerk sind (kein
  Gast-WLAN, keine Client-Isolation).
- **Manche Receiver nutzen den alten Port**: Sky Q mit alter Firmware
  antworten nur auf Port 5900 – wählen Sie **Sky+ HD** als Modell.
- **Der Betriebszustand bleibt unbekannt** – normal bei einem Sky+ HD. Prüfen
  Sie beim Sky Q, ob Port 9006 von Gladys aus erreichbar ist.
- **Eine Taste bewirkt nichts** – nicht jede Taste gibt es auf jedem Modell
  oder in jedem Menü.
- Ausführliche Logs: die Logs der Integration in der Gladys-Oberfläche, mit
  `LOG_LEVEL=debug` für alle Details.

Das Sky-Fernbedienungsprotokoll hat keine Lautstärketasten: Die Lautstärke
regelt Ihr Fernseher.
