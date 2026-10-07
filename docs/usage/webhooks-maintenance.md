# Guía de Webhooks y Ventanas de Mantenimiento

Umbral permite automatizar notificaciones de estado hacia canales de comunicación externos y silenciar alertas durante tareas programadas de mantenimiento.

---

## 🔔 Webhooks de Notificación

Cuando la feature `webhooks` está habilitada, Umbral monitorea el estado de las tarjetas que tienen activo el **Health Check** y envía alertas HTTP automáticas.

### 1. Disparadores de Eventos
Los chequeos los hace `/api/status` (el que usa la portada). Sólo cuentan los chequeos nuevos: los resultados cacheados no avanzan los contadores.
- **Servicio Caído (`health_fail`):** cuando las fallas consecutivas de una tarjeta llegan al **umbral de ese webhook** (`minFailures`, default 3, de 1 a 20). Cada webhook tiene su propio umbral: uno con `minFailures: 1` avisa en la primera falla y otro con `5` recién en la quinta. Notifica una sola vez por caída.
- **Servicio Recuperado (`health_recover`):** cuando la tarjeta vuelve a responder, **sólo si antes ese webhook notificó la falla** (o habría notificado: el estado se marca aunque el webhook no esté suscripto a `health_fail`). Un servicio que falló una vez y volvió, sin llegar al umbral, no genera un "recuperado" suelto.
- **Cooldown (`cooldownMin`, default 30):** se cuenta por **webhook + tarjeta + evento**. Que una tarjeta dispare no silencia las alertas de otra.
- El estado vive en memoria: un reinicio vuelve los contadores a cero.

### 2. Formato del Payload y Destinos
Umbral manda un `POST` con un JSON genérico: `event`, `card` (`id`, `title`, `url`), `status` (`ok`, `code`, `latencyMs`, `error`), `consecutiveFailures`, `threshold`, `timestamp` y `portal`, con los headers `X-Umbral-Event`, `X-Umbral-Card` y `User-Agent: Umbral-Webhook/1.0`.

Ese es el formato **JSON genérico** (preset `custom`), que sirve tal cual para endpoints propios, n8n, Node-RED, Home Assistant o cualquier receptor que acepte JSON arbitrario. Para los servicios que esperan su propio formato, elegí el **Formato** al crear el webhook:

| Formato | Qué manda |
|---|---|
| `slack` / `mattermost` | `{ "text": "…" }` (incoming webhook) |
| `discord` | `{ "content": "…" }` |
| `gotify` | `{ "title", "message", "priority" }` (URL con `?token=`) |
| `ntfy` | Publicación JSON: la URL del webhook es la del topic (`https://ntfy.sh/mi-topic`); Umbral publica en la raíz del server con `topic`, `title`, `message`, `tags` y `priority` |

El botón **Probar** usa el formato elegido.

**Destinos en la red interna:** los envíos pasan por `safeFetch` (sin seguir redirects) y **respetan `security.network.allowInternalHosts`**. Con el default (`true`) podés apuntar a un ntfy o Gotify en la LAN (`http://192.168.1.10:8080/...`); con `false`, las IPs privadas se bloquean. La metadata de la nube (`169.254.169.254` y compañía) queda bloqueada siempre.

### 3. Prueba de Conectividad
En la pestaña **Webhooks**, el botón **"Probar antes de guardar"** (`POST /api/webhooks/test`, sólo admin) envía un payload de prueba al endpoint remoto, con las mismas reglas de `allowInternalHosts`, para verificar que la URL y los permisos sean correctos antes de activar las notificaciones.

---

## 🛠️ Ventanas de Mantenimiento

Para evitar falsas alarmas durante reinicios de servidores, actualizaciones de software o migraciones de infraestructura:

1. **Configuración:**
   - En la pestaña **Mantenimiento** (o directamente en el editor de cada tarjeta), define una fecha y hora de inicio y fin.
2. **Efectos Durante el Mantenimiento:**
   - **Silenciamiento de Alertas:** El servicio no disparará `health_fail` hacia los webhooks aunque el health check falle. `health_recover` sí sale, para confirmar que volvió.
   - **Badge Ámbar en Portada:** La tarjeta muestra un distintivo ámbar indicando *"En Mantenimiento"*, informando de manera clara a los usuarios finales.
   - **Restauración Automática:** Al concluir la ventana temporal, el monitoreo normal se reanuda de forma transparente.
