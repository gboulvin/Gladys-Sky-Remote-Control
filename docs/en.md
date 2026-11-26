# Sky Remote Control

Control your **Sky Q** and **Sky+ HD** set-top boxes from Gladys: turn them on
or to standby, change channel, press any key of the remote, from the
dashboard, from scenes or from the device page.

Everything happens **on your local network**, with the protocol of the Sky
remote apps: no Sky account, no cloud, no data leaving your home.

## Requirements

- A Sky Q or Sky+ HD box (sold by Sky in the United Kingdom, Ireland, Italy,
  Germany and Austria), connected to the same network as Gladys.
- Gladys 5.3 or later.
- A **fixed IP address** for each box: create a DHCP reservation in your
  router. Gladys identifies a box by its address; if the address changes, the
  box shows up as a new device.

Sky Glass and Sky Stream devices do not offer this local remote control and
are not supported.

## Configuration

1. Find the IP address of your box: on a Sky Q, **Home → Settings → Setup →
   Network → Advanced settings**; or in the list of devices of your router.
2. Open the **Configuration** tab of the integration.
3. In **Sky boxes**, type the address of each box, separated by commas. You
   can give each one a name: `Living room=192.168.1.20, Bedroom=192.168.1.21`.
4. Leave **Box model** on **Automatic**: the integration tries the Sky Q port
   (49160), then the Sky+ HD one (5900). Pick the model only if detection
   fails.
5. Keep **Read the power state (Sky Q)** on to know whether each Sky Q is on
   or in standby (read every 30 seconds from the box's local API, port 9006).
   Sky+ HD boxes have no such API: their state stays unknown.
6. Save, then click **Test the connection**: the result says, for each box,
   whether it answers and on which port.
7. Open the **Discovery** tab and add your boxes.

## The device

Each box becomes a Gladys **television** device with:

- **Power** — on a Sky Q whose state is read, Gladys only presses the power
  key when the box is not already in the requested state; otherwise the key
  toggles the box.
- **Channel** — types the channel number (up to 4 digits).
- **Buttons** — channel up / down, TV guide, home, info, select, back, the
  four arrows, play, pause, stop, rewind, fast forward and record.

A badge on the device shows whether the box is reachable on the local network.

## Actions

- **Test the connection** — checks every configured box without pressing any
  key, and shows which ones answer.

## Scenes

Triggers (Gladys 5.1 or later), under the **Integrations** category of the
scene editor:

- **Sky box power changed** — a Sky Q was turned on or went to standby
  (requires "Read the power state"). Filter on a box and on the new state;
  the scene can read it with `{{triggerEvent.data.state}}` (`on` or
  `standby`).
- **Sky box online / offline** — a box started or stopped answering on the
  network. `{{triggerEvent.data.status}}` is `online` or `offline`.

Actions:

- **Press a Sky remote key** — any key of the remote, pressed 1 to 10 times.
  Output: `sent` (the box was reached).
- **Change Sky channel** — types a channel number. The field accepts scene
  variables. Output: `sent`.
- **Turn a Sky box on / off** — on, standby or toggle. Outputs: `sent` and
  `pressed` (whether the power key had to be pressed).

An unreachable box does not stop the scene: the action returns
`sent = false`, so the following actions can depend on it.

## Dashboard

Add the **Sky remote** widget and pick a box in its settings. It shows the
connection, the power state, the address and the model of the box, with
four buttons: **Power**, **Channel +**, **Channel −** and **Remote**, which
opens a form to press any key or type a channel number.

## Troubleshooting

- **"No answer on the remote control ports"** — check that the box is on (or
  in standby, not unplugged), that the address is right, and that Gladys and
  the box are on the same network (no guest Wi-Fi, no client isolation).
- **Some boxes need the legacy port**: Sky Q boxes on old firmware only
  answer on port 5900 — set **Box model** to **Sky+ HD**.
- **The power state stays unknown** — normal on a Sky+ HD. On a Sky Q, check
  that port 9006 is reachable from Gladys.
- **A key does nothing** — not every key exists on every model or menu.
- Detailed logs: the integration logs from the Gladys UI, with
  `LOG_LEVEL=debug` for the full detail.

The Sky remote protocol has no volume keys: volume is driven by your TV.
