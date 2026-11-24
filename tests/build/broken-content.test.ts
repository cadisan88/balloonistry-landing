/**
 * docs/ARCHITECTURE.md section 7: a broken product file must fail the build.
 * Copies a broken fixture into src/content/products, runs `astro sync` (the content
 * check of `astro build`), and always removes the file again.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const astroBin = fileURLToPath(new URL('../../node_modules/astro/bin/astro.mjs', import.meta.url));
/** The name is git-ignored, in case a run is killed before the clean-up. */
const target = fileURLToPath(
  new URL('../../src/content/products/__test-fixture__.md', import.meta.url),
);

function syncWith(fixture: string) {
  copyFileSync(fileURLToPath(new URL(`./fixtures/${fixture}`, import.meta.url)), target);
  const result = spawnSync(process.execPath, [astroBin, 'sync'], {
    cwd: root,
    encoding: 'utf8',
    // No colour codes in the output, so the messages are easy to match
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', FORCE_COLOR: '0', NO_COLOR: '1' },
  });
  const output = `${result.stdout}${result.stderr}`;
  return { status: result.status, output };
}

describe('broken product files fail the build', { timeout: 120_000 }, () => {
  afterEach(() => rmSync(target, { force: true }));

  it('fails on an unknown category', () => {
    const { status, output } = syncWith('unknown-category.md');
    expect(status).not.toBe(0);
    expect(output).toContain('Unknown category');
  });

  it('fails on a negative price', () => {
    const { status, output } = syncWith('bad-price.md');
    expect(status).not.toBe(0);
    expect(output).toContain('price');
  });
});
