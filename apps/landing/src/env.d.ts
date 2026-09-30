/// <reference types="astro/client" />
declare namespace App {
  interface Locals { clinic: import('./lib/clinic').ClinicData; }
}
declare module 'cloudflare:workers' {
  export const env: { DENTAL_API: { fetch(input: Request | string, init?: RequestInit): Promise<Response> } };
}
