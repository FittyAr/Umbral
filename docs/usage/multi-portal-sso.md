# Guía de Multi-Portal y Single Sign-On (OIDC)

Umbral está preparado para despliegues empresariales y multidepartamentales que requieren portales aislados y autenticación centralizada.

---

## 🏢 Arquitectura Multi-Portal

La feature `multiPortal` permite alojar múltiples portales independientes dentro de un único contenedor Docker de Umbral, sin necesidad de levantar instancias adicionales ni consumir más memoria.

### Características Principales
- **Aislamiento Total:** Cada portal cuenta con su propio archivo de configuración (`data/portals/<id>/config.json`), su propio directorio de uploads (`data/portals/<id>/uploads/`) y su propio registro de auditoría (`data/portals/<id>/audit.log`).
- **Portal por Defecto:** La instancia siempre mantiene el portal `default` como raíz principal.
- **Estrategias de Enrutamiento:**
  1. **Por Subdominio:** `it.empresa.local`, `dev.empresa.local`, `ops.empresa.local`.
  2. **Por Prefijo de Ruta:** `empresa.local/it`, `empresa.local/dev`, `empresa.local/ops`.
- **Migración Automática:** Al activar `multiPortal` por primera vez, el servidor migra automáticamente los datos existentes de `data/config.json` hacia `data/portals/default/` sin pérdida de información.

---

## 🔐 Single Sign-On (OIDC / SSO)

La feature `oidc` permite integrar Umbral con proveedores de identidad corporativos estándar OpenID Connect (Keycloak, Authentik, Google Workspace, Okta, Azure AD / Microsoft Entra ID).

### Configuración del Proveedor OIDC
1. **Issuer URL:** URL base del servidor de identidad (ej. `https://auth.empresa.com/realms/master`).
2. **Client ID & Client Secret:** Credenciales de la aplicación cliente registrada en el IdP.
3. **Redirect URI (Callback):** `https://tu-umbral.empresa.com/api/auth/oidc/callback`.
4. **Scopes:** `openid profile email`.

### Flujo de Acceso
- El formulario de login en `/admin` muestra el botón **"Iniciar sesión con SSO"**.
- Al completar la autenticación en el proveedor de identidad, Umbral valida los tokens JWT y aprovisiona al usuario de forma Just-in-Time (JIT) respetando los roles asignados.

---

## 👥 Modo Multi-Usuario y 2FA (TOTP)

### Roles y Privilegios
- **`admin`:** Acceso total a configuración, usuarios, claves de API y opciones de seguridad.
- **`editor`:** Capacidad para crear, editar, reordenar y eliminar tarjetas y categorías.
- **`viewer`:** Acceso de solo lectura al dashboard administrativo y diagnósticos de estado.

### Autenticación en Dos Pasos (2FA / TOTP)
- Cada usuario puede escanear un código QR desde su aplicación de autenticación favorita (Google Authenticator, Aegis, 1Password, Bitwarden).
- Se generan **códigos de recuperación (backup codes)** de un solo uso para garantizar acceso en caso de pérdida del dispositivo.
- La contraseña maestra del super-admin permanece como vía de rescate de emergencia en el servidor.
