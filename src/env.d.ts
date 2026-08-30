/// <reference path="../.astro/types.d.ts" />

// Globales que el admin publica desde scripts inline (AdminLayout, dashboard)
// y consumen los fragmentos Alpine de src/scripts/admin/*.
interface Window {
  umbralAdmin: any;
  [key: `__${string}`]: any;
}

declare namespace App {
  interface Locals {
    auth: import('./lib/auth').AuthContext;
    clientIp: string;
  }
}
