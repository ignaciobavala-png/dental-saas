export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

const RESERVED = new Set(['www', 'app', 'api', 'admin', 'mail', 'evoluciondental']);

export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  let slug = slugify(base) || 'consultorio';
  if (RESERVED.has(slug)) slug = `${slug}-clinica`;
  let attempt = slug;
  let n = 2;
  while (await exists(attempt)) {
    attempt = `${slug}-${n}`;
    n += 1;
  }
  return attempt;
}
