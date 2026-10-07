# Guía de Multi-Portal y Single Sign-On (OIDC)

Umbral está preparado para despliegues empresariales y multidepartamentales que requieren portales aislados y autenticación centralizada.

---

## 🏢 Arquitectura Multi-Portal

La feature `multiPortal` sirve varias portadas desde un único container: por ejemplo `it.empresa.local` para IT y `empresa.local/mk` para Marketing, cada una con su marca, tema y tarjetas.

### Qué es de cada portal y qué es común

| De cada portal (`data/portals/<id>/config.json`) | Común a la instancia (portal `default`) |
|---|---|
| Branding, tema, layout, categorías, tarjetas, ventanas de mantenimiento | Password y usuarios, 2FA, OIDC, API tokens, Hardening, features, IA, webhooks, la lista de portales |

- **Un solo login** sirve para todos los portales: la auth es global.
- **Uploads y audit log** son compartidos (`data/uploads/`, `data/audit.log`). Cada entrada del log de un portal que no es el raíz lleva `portal=<id>`.
- Un portal nuevo arranca con la portada por defecto hasta que lo editás; su archivo se crea al primer guardado.

### Cómo se elige el portal de un request

1. **Selección explícita**: header `x-umbral-portal: <id>` o query `?portal=<id>` (sólo ids configurados). Lo usan la API del panel, los fetch de la portada de un portal servido por prefijo y las imágenes de QR.
2. **Host**: el header `Host` contra el host del portal (`it.empresa.local`, con o sin puerto, o `*.empresa.local`).
3. **Prefijo de ruta** (portales sin host): `/mk`, `/mk/dev`… La página se renderiza sin el prefijo (`/mk/dev` → categoría `dev` del portal `mk`), y el "volver" de las subpáginas apunta a `/mk/`. La API (`/api/*`), el panel (`/admin`), `/docs` y los assets no se reescriben.
4. **Portal para pedidos sin match** (`portals.defaultPortal`), o el raíz.

Con la feature apagada todo va al portal `default`, como siempre.

### Administrar los portales

- **Panel → Multi-Portal**: alta y baja de portales (id `a-z0-9-`, `default` está reservado; host y/o prefijo), y el portal para pedidos sin match.
- **Editar la portada de un portal**: el selector **Portal** del encabezado del panel (o el botón "Editar portada") recarga el panel con `?portal=<id>`. Lo que guardás en los tabs de portada va a ese portal; lo global (Hardening, usuarios, features…) se guarda para todos.
- **Reset a defaults** dentro de un portal sólo resetea su portada.
- Borrar un portal de la lista no borra `data/portals/<id>/`: si lo volvés a crear con el mismo id recupera su portada.

### Detrás de un reverse proxy

El proxy tiene que pasar el header `Host` original (`proxy_set_header Host $host;` en nginx; Caddy y Traefik lo hacen por defecto). Para portales por prefijo no hace falta nada especial: Umbral reescribe la ruta internamente.

### Migración desde instalaciones viejas

Al arrancar, si existe `data/config.json` (instalaciones v1), se mueve a `data/portals/default/config.json` sin pérdida de datos.

---

## 🔐 Single Sign-On (OIDC / SSO)

La feature `oidc` permite integrar Umbral con proveedores de identidad corporativos estándar OpenID Connect (Keycloak, Authentik, Google Workspace, Okta, Azure AD / Microsoft Entra ID).

### Configuración del Proveedor OIDC
Cada provider vive en `oidc.providers[]` (Avanzado → OIDC en el panel):
1. **Issuer URL (`issuer`):** URL base del servidor de identidad (ej. `https://auth.empresa.com/realms/master`). **Tiene que ser `https`**: el `id_token` se confía por venir del token endpoint por TLS, y sobre `http` cualquiera en el medio podía inyectar claims. La única excepción es `http://localhost` / `127.0.0.1` / `[::1]` para desarrollo. Un config viejo con issuer `http` sigue cargando, pero el login con ese provider falla hasta corregirlo.
2. **Client ID & Client Secret:** Credenciales de la aplicación cliente registrada en el IdP. El `clientSecret` nunca viaja al navegador: el panel lo muestra vacío y, si guardás sin tocarlo, se conserva el que estaba.
3. **Redirect URI (Callback):** `https://tu-umbral.empresa.com/api/auth/oidc/<providerId>/callback` (con el `id` del provider). Se arma con `BASE_URL`, así que definila.
4. **Scopes:** `openid profile email` por default.
5. **`redirectPath`:** a dónde va el usuario después del login (default `/`). **Tiene que ser un path local** que empiece con `/`: una URL absoluta o algo como `//evil.com` se reemplaza por `/` (antes era un open redirect).
6. **`autoProvision` / `defaultRole`:** si el usuario no existe, crearlo con `defaultRole` (default `viewer`) o rechazar el login.
7. **`trustRoleClaim`** (default `false`): ver abajo.

### Vínculo de identidad (`iss` + `sub`)
Un usuario OIDC se identifica por `<issuer>|<sub>` (se guarda en `oidcSubject`), no por el username. El `preferred_username` suele ser editable por el propio usuario en el IdP: vincular por nombre permitía que alguien se renombrara como `admin` y entrara con esa cuenta.
- **Primer login:** si ya hay un usuario con ese `iss`+`sub`, entra con esa cuenta. Si no, y existe un usuario OIDC sin vincular con el mismo username (creado por una versión anterior), se vincula en ese momento.
- **Conflicto con un usuario local:** si el username del IdP coincide con un **usuario local con password**, el login falla con `409` ("Ya existe un usuario local…") y queda `oidc_username_conflict` en el audit log. Un admin tiene que renombrar o borrar el usuario local; Umbral no toma cuentas locales por nombre.
- Si no hay usuario y `autoProvision` está apagado, el login falla con `403`.

### Rol desde el IdP (`trustRoleClaim`)
Por default **el rol lo administra Umbral**: un usuario nuevo recibe `defaultRole` y uno existente conserva el rol que tiene en `users[]`, sin importar lo que diga el `id_token`. En muchos IdP el usuario puede editar claims de su propio perfil, así que confiar en ellos era una escalada de privilegios.

Si tu IdP controla ese claim (un grupo o atributo que sólo el admin del IdP puede asignar), activá `trustRoleClaim`: en cada login, el claim `claimMap.role` (default `umbral_role`) define el rol si vale `admin`, `editor` o `viewer`; cualquier otro valor se ignora.

### Flujo de Acceso
- Con la feature `oidc` activa y al menos un provider habilitado, el login de `/admin` muestra **"O continuar con SSO"** con un botón por provider.
- El flow es Authorization Code + PKCE. El `state` queda atado a una cookie del navegador que inició el login (un callback con un `state` ajeno no sirve), los flows pendientes tienen tope y `/start` tiene rate limit (20 por minuto por IP).
- Los errores del callback no exponen detalles internos del IdP.

---

## 👥 Modo Multi-Usuario y 2FA (TOTP)

### Roles y Privilegios
Los roles se aplican **en el server**, no sólo en la UI (ver [Seguridad](../config/security.md) y la tabla por endpoint en la [Referencia de API](./api.md#roles-por-endpoint)):
- **`admin`:** Acceso total a configuración, usuarios, claves de API, features y opciones de seguridad.
- **`editor`:** Edita contenido: branding, tema, layout, categorías, tarjetas y ventanas de mantenimiento; sube assets y usa el autocompletar. Si guarda desde el panel, las demás secciones se descartan y quedan como estaban.
- **`viewer`:** Sólo lectura: ve el config saneado (sin secretos) y las métricas, pero no puede guardar nada.

### Autenticación en Dos Pasos (2FA / TOTP)
- Cada usuario puede escanear un código QR desde su aplicación de autenticación favorita (Google Authenticator, Aegis, 1Password, Bitwarden).
- Un mismo código no se acepta dos veces.
- El seed se guarda cifrado con una clave derivada de `SESSION_SECRET`: si cambiás el secreto, los usuarios tienen que volver a configurar 2FA.
- La contraseña maestra del super-admin permanece como vía de rescate de emergencia en el servidor.
