/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    auth: {
      isAuthenticated: boolean;
      csrfToken: string | null;
    };
    clientIp: string;
  }
}
