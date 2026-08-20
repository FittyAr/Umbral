/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    auth: import('./lib/auth').AuthContext;
    clientIp: string;
  }
}
