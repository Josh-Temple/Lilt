import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// This check deliberately refuses production hosts. Run against next start with
// Supabase environment variables absent; it never authenticates or writes data.
const origin = new URL(process.env.SECURITY_SMOKE_URL ?? 'http://127.0.0.1:3007');
assert.equal(origin.protocol, 'http:');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname));
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url)));
assert.equal(pkg.dependencies.next, '15.5.27');
assert.equal(lock.packages['node_modules/next'].version, pkg.dependencies.next);
assert.equal(lock.packages['node_modules/eslint-config-next'].version, pkg.devDependencies['eslint-config-next']);
assert.equal(lock.packages['node_modules/sharp'].version, '0.35.5');
assert.equal(lock.packages['node_modules/source-map-js'].version, '1.2.2');

for (const path of ['/', '/library', '/library?debugLibrary=1', '/review', '/settings', '/pack/requests-cafe?phrase=could-i-get', '/phrase/could-i-get', '/admin']) {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(15000), redirect: 'manual' });
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/, path);
  const html = await response.text();
  assert.match(html, /Input-first English phrase learning app/, path);
  assert.doesNotMatch(html, /NEXT_PUBLIC_SUPABASE_(?:ANON_KEY|PUBLISHABLE_DEFAULT_KEY)=/, path);
}
const library = await fetch(new URL('/library?debugLibrary=1', origin)).then(r => r.text());
assert.match(library, /Loading library/, 'query hook stays behind the prerender Suspense boundary');
const packs = await fetch(new URL('/api/packs', origin));
assert.equal(packs.status, 500, 'missing environment fails explicitly');
const payload = await packs.json();
assert.equal(typeof payload.error, 'string');
console.log('PASS: patched lock versions, local production routes, query prerender boundary and missing-env API response.');
