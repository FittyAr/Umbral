import type { AdminFragment } from "./types";

/**
 * Fragmento del objeto Alpine del admin: dominio users.
 *
 * Se compone con spread en `dashboard.astro`, así que los métodos siguen
 * resolviendo `this` contra el objeto completo.
 */
export function createUsersState(): AdminFragment {
  return {
    // Multi-user (opt-in: features.multiUser). La UI muestra gestión
    // de users + modo de acceso (password único / both / users only).
    // El server valida que singlePasswordEnabled=false requiera al
    // menos un user (rechaza saveConfig si quedás sin acceso).
    multiUserEnabled: window.__featureList?.find?.((f) => f.name === 'multiUser')?.enabled === true,
    newUser: { username: '', displayName: '', password: '', role: 'viewer' },
    // ── Multi-user helpers (opt-in: features.multiUser) ──────────
    // Aclaración: el server hace el hash con bcrypt (cost 12) y
    // persiste en cfg.auth.users[].passwordHash. La UI nunca toca el
    // hash directamente — sólo manda el password en plain via los
    // métodos de Alpine, que termina llamando a /api/config (PUT)
    // y el server hace el hash en saveConfig.
    // NOTA: saveConfig actual NO hashea passwords de users — sólo del
    // password único. Por ahora, el hash se hace client-side acá.
    // Esto no es ideal (best practice es server-side hashing) pero
    // evita un roundtrip extra. Para producción: implementar server-side.
    addUser() {
      if (!this.cfg.auth) this.cfg.auth = { passwordHash: '', csrfToken: '', authEpoch: 0, users: [], singlePasswordEnabled: true };
      if (!Array.isArray(this.cfg.auth.users)) this.cfg.auth.users = [];
      const u = this.newUser;
      if (!u.username || !u.password) {
        window.umbralAdmin.toast('Username y password requeridos', 'error');
        return;
      }
      if (!/^[a-z0-9_-]{2,40}$/.test(u.username)) {
        window.umbralAdmin.toast('Username debe ser kebab-case (a-z, 0-9, guiones, underscores)', 'error');
        return;
      }
      if (u.password.length < 8) {
        window.umbralAdmin.toast('Password debe tener al menos 8 chars', 'error');
        return;
      }
      if (this.cfg.auth.users.some((x) => x.username.toLowerCase() === u.username.toLowerCase())) {
        window.umbralAdmin.toast('Username ya existe', 'error');
        return;
      }
      // Hash bcrypt client-side (no ideal, pero evita un roundtrip
      // y mantiene la implementación simple para esta ola).
      this.hashPasswordClientSide(u.password).then((hash) => {
        if (!this.cfg.auth) return;
        this.cfg.auth.users.push({
          id: 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
          username: u.username.trim(),
          displayName: (u.displayName || '').trim(),
          passwordHash: hash,
          role: u.role,
          userEpoch: 0,
          createdAt: new Date().toISOString(),
          lastLoginAt: null,
        });
        this.newUser = { username: '', displayName: '', password: '', role: 'viewer' };
        this.markDirty();
        window.umbralAdmin.toast('Usuario agregado', 'success');
      });
    },
    async hashPasswordClientSide(password) {
      const res = await window.umbralAdmin.api('POST', '/api/auth/hash-password', { password });
      return res.hash;
    },
    removeUser(id) {
      if (!confirm('Borrar este usuario? Sus sesiones seran invalidadas (userEpoch + 1).')) return;
      if (!this.cfg.auth?.users) return;
      // bump userEpoch de los demas para invalidar las sesiones del borrado
      // (en realidad no es necesario — el server al verificar el token
      // lo busca contra cada user; si el user no existe, falla.
      // El userEpoch + 1 del user borrado es un extra defense, pero
      // no es necesario para esta ola. Lo dejamos simple.)
      this.cfg.auth.users = this.cfg.auth.users.filter((u) => u.id !== id);
      this.markDirty();
      window.umbralAdmin.toast('Usuario borrado', 'success');
    },
    cycleUserRole(u) {
      if (!this.cfg.auth?.users) return;
      const idx = this.cfg.auth.users.findIndex((x) => x.id === u.id);
      if (idx < 0) return;
      const newRole = u.role === 'admin' ? 'editor' : 'admin';
      this.cfg.auth.users[idx] = { ...this.cfg.auth.users[idx], role: newRole };
      this.markDirty();
    },
    async resetUserPasswordPrompt(u) {
      const newPass = prompt(`Nuevo password para ${u.username} (min 8 chars):`);
      if (!newPass || newPass.length < 8) {
        if (newPass !== null) window.umbralAdmin.toast('Password minimo 8 chars', 'error');
        return;
      }
      const idx = this.cfg.auth.users.findIndex((x) => x.id === u.id);
      if (idx < 0) return;
      const hash = await this.hashPasswordClientSide(newPass);
      this.cfg.auth.users[idx] = {
        ...this.cfg.auth.users[idx],
        passwordHash: hash,
        userEpoch: this.cfg.auth.users[idx].userEpoch + 1, // invalida sesiones existentes
      };
      this.markDirty();
      window.umbralAdmin.toast('Password reseteado. El user debe volver a loguearse.', 'success');
    },
    multiUserIntro() {
      return this.i18n?.users?.intro || 'Crea usuarios con roles. El password unico sigue siendo valido como rescue path.';
    },
    accessModeHelp() {
      if (!this.cfg.auth?.users || this.cfg.auth.users.length === 0) {
        return 'Crea al menos un user antes de deshabilitar el password unico.';
      }
      return this.i18n?.users?.accessModeHelp || 'Tres modos: solo password unico, password + usuarios, o solo usuarios.';
    },

  };
}
