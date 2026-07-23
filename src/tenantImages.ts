// Optional per-archetype portraits. Drop an image named after the archetype id
// (e.g. pensioner.png) into assets/tenants/ and it replaces the emoji in the UI;
// with no file the components fall back to the emoji. Vite resolves whatever is
// present at build time, so an empty folder is fine — the glob just yields
// nothing and every tenant keeps its emoji.

import type { ArchetypeId } from './game/types';

const modules = import.meta.glob('./assets/tenants/*.{png,jpg,jpeg,webp,svg,gif,avif}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const byArchetype: Partial<Record<ArchetypeId, string>> = {};
for (const [path, url] of Object.entries(modules)) {
  const file = path.split('/').pop() ?? '';
  const id = file.replace(/\.[^.]+$/, '') as ArchetypeId;
  byArchetype[id] = url;
}

/** Portrait URL for an archetype, or undefined when no image has been added. */
export function tenantImage(archetype: ArchetypeId): string | undefined {
  return byArchetype[archetype];
}
