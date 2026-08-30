# Guía de Hardening y Seguridad en Umbral

Umbral está diseñado bajo un modelo de **defensa en profundidad** para entornos de producción y autoalojados detrás de VPNs o expuestos a Internet.

---

## 🛡️ Capas de Protección del Sistema

### 1. Autenticación y Control de Acceso
- **Hash de Contraseña Robusto:** Encriptación de contraseñas mediante **bcrypt** con factor de coste 12 y protección explícita contra ataques de temporización (timing-attacks).
- **Época de Invalidation de Sesión (`authEpoch`):** Cualquier cambio de contraseña o revocación de credenciales incrementa la época de autenticación, invalidando de inmediato todas las cookies de sesión y tokens activos.
- **Modo Multi-Usuario con Roles:**
  - `admin`: Control total de la configuración, usuarios, claves y hardening.
  - `editor`: Gestión de tarjetas, categorías y contenidos.
  - `viewer`: Acceso de solo lectura a paneles de diagnóstico y estado.
- **Autenticación de Dos Factores (2FA / TOTP):** Soporte estándar TOTP con generación de códigos de recuperación (backup codes) de un solo uso.
- **Single Sign-On (OIDC):** Integración nativa con proveedores de identidad OpenID Connect (Keycloak, Authentik, Google Workspace, Okta) con aprovisionamiento Just-in-Time.

---

### 2. Seguridad de Sesiones y Protección contra CSRF
- **Cookies Firmadas:** Cookies cifradas y firmadas criptográficamente con `SESSION_SECRET`.
- **Atributos de Cookie Seguros:**
  - `HttpOnly`: Previene el acceso a la cookie desde scripts del cliente (mitigación XSS).
  - `SameSite`: Configurable en `Strict` o `Lax`.
  - `Secure`: Forzado automático cuando se detecta conexión HTTPS (`auto` o `always`).
- **Protección Anti-CSRF:** Validación de tokens de sincronización (`x-csrf-token`) en todas las mutaciones de estado (`POST`, `PUT`, `DELETE`, `PATCH`).

---

### 3. Protección contra SSRF y Bloqueo de Red Interna
Al realizar auto-completado de tarjetas (`/api/autofill`) o diagnósticos de red:
- **Bloqueo de Endpoints de Metadata Cloud:** Se prohíbe de forma terminante cualquier petición hacia direcciones de metadata de proveedores de nube (ej. `169.254.169.254`, `metadata.google.internal`, `100.100.100.200`).
- **Control de Peticiones Salientes:** Timeout estricto de 5 segundos, deshabilitación de redirecciones infinitas y verificación estricta de esquemas `http:` y `https:`.

---

### 4. Seguridad en la Subida de Archivos (Assets)
- **Validación de Magic-Bytes:** No se confía en la extensión ni en la cabecera `Content-Type` enviada por el cliente. El backend inspecciona los primeros bytes del archivo con `file-type` para verificar su firma binaria real (PNG, JPEG, WebP, SVG, ICO).
- **Sanitización Profunda de SVG:** Los archivos SVG pasan obligatoriamente por **DOMPurify** sobre un entorno virtual **JSDOM** en el servidor, eliminando etiquetas `<script>`, iframes, objetos externos y atributos `onload`/`onerror`.
- **Procesamiento de Imágenes con Sharp:** Redimensionamiento y optimización en memoria de imágenes rasterizadas para prevenir bombas de descompresión (decompression bombs / pixel floods).

---

### 5. Cabeceras HTTP y Content Security Policy (CSP)
Umbral emite cabeceras de seguridad estrictas en cada respuesta:
- **`Content-Security-Policy` (CSP):**
  ```http
  Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self'; frame-ancestors 'none';
  ```
- **`Strict-Transport-Security` (HSTS):** `max-age=31536000; includeSubDomains; preload`.
- **`X-Frame-Options`:** `DENY` (prevención total contra Clickjacking).
- **`X-Content-Type-Options`:** `nosniff`.
- **`Referrer-Policy`:** `strict-origin-when-cross-origin`.

---

### 6. Rate Limiting y Protección DoS
- **Límites por IP:** Ventana deslizante configurable para mitigar ataques de fuerza bruta en `/api/login` y endpoints críticos.
- **Soporte de Proxies Inversos:** Detección segura de IP real detrás de Caddy, Nginx o Traefik mediante la directiva `security.network.trustForwardedFor`.
- **Límite de Tamaño de Body:** Cap configurable (por defecto 10MB) en peticiones entrantes para evitar saturación de memoria.
