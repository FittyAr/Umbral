# Guía de Webhooks y Ventanas de Mantenimiento

Umbral permite automatizar notificaciones de estado hacia canales de comunicación externos y silenciar alertas durante tareas programadas de mantenimiento.

---

## 🔔 Webhooks de Notificación

Cuando la feature `webhooks` está habilitada, Umbral monitorea el estado de las tarjetas que tienen activo el **Health Check** y envía alertas HTTP automáticas.

### 1. Disparadores de Eventos
- **Servicio Caído (Service Outage):** Cuando un servicio falla de forma consecutiva un número configurable de veces (umbral de tolerancia).
- **Servicio Recuperado (Service Recovery):** Cuando un servicio que estaba caído vuelve a responder satisfactoriamente.

### 2. Plataformas e Integraciones Soportadas

Umbral incluye formateadores automáticos para las principales herramientas de mensajería:

| Plataforma | Tipo de Payload | Ejemplo de Configuración |
|---|---|---|
| **Slack** | Block Kit / JSON | `https://hooks.slack.com/services/...` |
| **Discord** | Embeds JSON | `https://discord.com/api/webhooks/...` |
| **Mattermost** | Formato Slack compatible | `https://mattermost.internal/hooks/...` |
| **ntfy.sh** | Notificaciones Push | `https://ntfy.sh/mi-topico-alertas` |
| **Gotify** | Mensajería Push Self-Hosted | `https://gotify.internal/message?token=...` |
| **Webhook Genérico** | JSON estructurado | Endpoint personalizado |

### 3. Prueba de Conectividad
En la pestaña **Webhooks**, el botón **"Probar antes de guardar"** envía un payload de prueba al endpoint remoto para verificar que la URL y los permisos sean correctos antes de activar las notificaciones.

---

## 🛠️ Ventanas de Mantenimiento

Para evitar falsas alarmas durante reinicios de servidores, actualizaciones de software o migraciones de infraestructura:

1. **Configuración:**
   - En la pestaña **Mantenimiento** (o directamente en el editor de cada tarjeta), define una fecha y hora de inicio y fin.
2. **Efectos Durante el Mantenimiento:**
   - **Silenciamiento de Alertas:** El servicio no disparará notificaciones de error hacia los webhooks aunque el health check falle.
   - **Badge Ámbar en Portada:** La tarjeta muestra un distintivo ámbar indicando *"En Mantenimiento"*, informando de manera clara a los usuarios finales.
   - **Restauración Automática:** Al concluir la ventana temporal, el monitoreo normal se reanuda de forma transparente.
