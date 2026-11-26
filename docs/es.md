# Sky Remote Control

Controle sus decodificadores **Sky Q** y **Sky+ HD** desde Gladys:
enciéndalos o póngalos en espera, cambie de canal, pulse cualquier tecla del
mando, desde el panel, las escenas o la página del dispositivo.

Todo ocurre **en su red local**, con el protocolo de las aplicaciones de mando
Sky: sin cuenta Sky, sin nube, ningún dato sale de su hogar.

## Requisitos

- Un decodificador Sky Q o Sky+ HD (comercializados por Sky en el Reino Unido,
  Irlanda, Italia, Alemania y Austria), conectado a la misma red que Gladys.
- Gladys 5.3 o posterior.
- Una **dirección IP fija** para cada decodificador: cree una reserva DHCP en
  su router. Gladys identifica un decodificador por su dirección; si cambia,
  aparece como un dispositivo nuevo.

Los dispositivos Sky Glass y Sky Stream no ofrecen este control local y no
son compatibles.

## Configuración

1. Busque la dirección IP de su decodificador: en un Sky Q, **Inicio →
   Ajustes → Configuración → Red → Ajustes avanzados**; o en la lista de
   dispositivos de su router.
2. Abra la pestaña **Configuración** de la integración.
3. En **Decodificadores Sky**, escriba la dirección de cada decodificador,
   separadas por comas. Puede nombrarlos:
   `Salón=192.168.1.20, Dormitorio=192.168.1.21`.
4. Deje **Modelo de decodificador** en **Automático**: la integración prueba
   el puerto Sky Q (49160) y luego el de Sky+ HD (5900). Elija el modelo solo
   si la detección falla.
5. Mantenga **Leer el estado de encendido (Sky Q)** activado para saber si
   cada Sky Q está encendido o en espera (leído cada 30 segundos desde la API
   local del decodificador, puerto 9006). Los Sky+ HD no tienen esta API: su
   estado sigue siendo desconocido.
6. Guarde y pulse **Probar la conexión**: el resultado indica, para cada
   decodificador, si responde y en qué puerto.
7. Abra la pestaña **Descubrimiento** y añada sus decodificadores.

## El dispositivo

Cada decodificador se convierte en un dispositivo **televisión** de Gladys
con:

- **Encendido** — en un Sky Q cuyo estado se lee, Gladys solo pulsa la tecla
  de encendido si el decodificador no está ya en el estado pedido; si no, la
  tecla alterna el decodificador.
- **Canal** — marca el número de canal (hasta 4 cifras).
- **Botones** — canal + / −, guía de TV, inicio, info, seleccionar, atrás, las
  cuatro flechas, reproducir, pausa, detener, rebobinar, avance rápido y
  grabar.

Una insignia en el dispositivo indica si el decodificador es accesible en la
red local.

## Acciones

- **Probar la conexión** — comprueba cada decodificador configurado sin pulsar
  ninguna tecla y muestra cuáles responden.

## Escenas

Disparadores (Gladys 5.1 o posterior), en la categoría **Integraciones** del
editor de escenas:

- **Encendido del decodificador Sky cambiado** — un Sky Q se encendió o pasó
  a espera (requiere «Leer el estado de encendido»). Filtre por decodificador
  y por el nuevo estado; la escena lo lee con `{{triggerEvent.data.state}}`
  (`on` o `standby`).
- **Decodificador Sky en línea / sin conexión** — un decodificador empezó o
  dejó de responder en la red. `{{triggerEvent.data.status}}` vale `online` u
  `offline`.

Acciones:

- **Pulsar una tecla del mando Sky** — cualquier tecla del mando, de 1 a 10
  veces. Salida: `sent` (se alcanzó el decodificador).
- **Cambiar de canal Sky** — marca un número de canal. El campo acepta
  variables de escena. Salida: `sent`.
- **Encender / apagar un decodificador Sky** — encendido, en espera o
  alternar. Salidas: `sent` y `pressed` (si hubo que pulsar la tecla de
  encendido).

Un decodificador inaccesible no detiene la escena: la acción devuelve
`sent = false`, para que las acciones siguientes puedan depender de ello.

## Panel

Añada el widget **Mando Sky** y elija un decodificador en sus ajustes. Muestra
la conexión, el estado de encendido, la dirección y el modelo del
decodificador, con cuatro botones: **Encender/Apagar**, **Canal +**,
**Canal −** y **Mando**, que abre un formulario para pulsar cualquier tecla o
escribir un número de canal.

## Solución de problemas

- **«Sin respuesta en los puertos del mando a distancia»** — compruebe que el
  decodificador está encendido (o en espera, no desenchufado), que la
  dirección es correcta y que Gladys y el decodificador están en la misma red
  (sin wifi de invitados ni aislamiento de clientes).
- **Algunos decodificadores usan el puerto antiguo**: los Sky Q con firmware
  antiguo solo responden en el puerto 5900 — elija **Sky+ HD** como modelo.
- **El estado de encendido sigue desconocido** — normal en un Sky+ HD. En un
  Sky Q, compruebe que el puerto 9006 es accesible desde Gladys.
- **Una tecla no hace nada** — no todas las teclas existen en todos los
  modelos ni en todos los menús.
- Registros detallados: los registros de la integración en la interfaz de
  Gladys, con `LOG_LEVEL=debug` para todo el detalle.

El protocolo del mando Sky no tiene teclas de volumen: el volumen se controla
desde su televisor.
