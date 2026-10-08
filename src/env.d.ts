/// <reference path="../.astro/types.d.ts" />

// Globales que publican public/js/boot.js y los módulos del admin
// y consumen los fragmentos Alpine de src/scripts/admin/*.
interface Window {
  umbralAdmin: any;
  [key: `__${string}`]: any;
}

declare namespace App {
  interface Locals {
    auth: import('./lib/auth').AuthContext;
    clientIp: string;
    /** Portal del request (multi-portal); `default` con la feature apagada. */
    portal: import('./lib/multi-portal').ResolvedPortal;
  }
}

// El build CSP de Alpine no trae tipos propios: expone la misma API que
// `alpinejs` (tipada por @types/alpinejs).
declare module '@alpinejs/csp' {
  import Alpine from 'alpinejs';
  export default Alpine;
}
