#!/usr/bin/env node
// Thin wrapper: makes sure Python + edge-tts are present, then runs scripts/generate_audio.py
// with whatever flags were passed (npm run audio -- --voice sarah --only ar/word).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const py = ['python', 'python3', 'py'].find(c => spawnSync(c, ['--version'], { stdio: 'ignore' }).status === 0);
if (!py) {
  console.error('Python 3 is required: https://www.python.org/downloads/');
  process.exit(1);
}
const args = process.argv.slice(2);
const provider = (args[args.indexOf('--provider') + 1] && args.includes('--provider')) ? args[args.indexOf('--provider') + 1] : (process.env.TTS_PROVIDER || 'edge');
if (provider === 'edge' && spawnSync(py, ['-c', 'import edge_tts'], { stdio: 'ignore' }).status !== 0) {
  console.log('Installing edge-tts ...');
  const r = spawnSync(py, ['-m', 'pip', 'install', '--quiet', 'edge-tts', 'truststore'], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
const r = spawnSync(py, [path.join(here, 'generate_audio.py'), ...args], { stdio: 'inherit', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
process.exit(r.status ?? 1);
