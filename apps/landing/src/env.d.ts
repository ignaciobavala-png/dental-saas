/// <reference types="astro/client" />
declare namespace App {
  interface Locals { clinic: import('./lib/clinic').ClinicData; }
}
declare module 'cloudflare:workers' {
  export const env: {
    DENTAL_API: { fetch(input: Request | string, init?: RequestInit): Promise<Response> };
    /** Origen del panel (Worker `dental-api`); la raíz de la landing redirige a su /login. */
    PANEL_URL?: string;
  };
}
