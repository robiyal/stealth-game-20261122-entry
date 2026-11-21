// NIGHTMAIL — the entry assembler. One job: gather the playable game and
// its four screenshots into the output directory, then write the dossier
// the scorer checks, byte for byte. Run it as `node main.ts`; the output
// directory comes from MAKEFUN_OUTPUT_DIR and defaults to /output.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

// The bounty's gate: 160 KiB of dossier text, at most 4 screenshots of at
// most 256 KiB each, at most 993 entries and 48 MiB under game/.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

function fail(message) {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function countFiles(dir) {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    n += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
  }
  return n;
}

const gameSrc = join(REPO_ROOT, 'game');
const shotsSrc = join(REPO_ROOT, 'screenshots');
if (!existsSync(join(gameSrc, 'index.html'))) fail(`no game/index.html under ${gameSrc}`);
if (!existsSync(shotsSrc)) fail(`no screenshots/ under ${REPO_ROOT}`);
const shotNames = readdirSync(shotsSrc).filter((name) => /\.(png|jpe?g)$/i.test(name)).sort();
if (shotNames.length < 3) fail(`screenshots/ holds ${shotNames.length} image(s); the bounty needs 3 or 4`);

// A stale file from an earlier run must never leak into the dossier.
mkdirSync(OUT_DIR, { recursive: true });
for (const sub of ['game', 'screenshots', 'dossier.json']) {
  rmSync(join(OUT_DIR, sub), { recursive: true, force: true });
}
cpSync(gameSrc, join(OUT_DIR, 'game'), { recursive: true });
cpSync(shotsSrc, join(OUT_DIR, 'screenshots'), { recursive: true });

const dossier = buildDossier(OUT_DIR, CAPS);
writeFileSync(join(OUT_DIR, 'dossier.json'), dossier);
console.log(`output: ${OUT_DIR}`);
console.log(`game files: ${countFiles(join(OUT_DIR, 'game'))}`);
for (const name of shotNames) {
  const bytes = statSync(join(OUT_DIR, 'screenshots', name)).size;
  console.log(`screenshot: ${name} (${bytes} bytes)`);
}
console.log(`dossier.json: ${dossier.length} bytes, sha256 ${sha256(dossier)}`);
