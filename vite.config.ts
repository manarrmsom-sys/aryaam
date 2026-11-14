import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { spawn } from 'node:child_process';

const VOICES = ['sarah', 'ahmed', 'kid'];
const PROVIDERS = ['edge', 'openai', 'elevenlabs'];

/**
 * Dev-only studio API used by the parent dashboard:
 *   GET  /api/audio/status      -> { ok: true }
 *   POST /api/audio/regenerate  -> { voice, clip, text?, provider? }  re-runs scripts/generate_audio.py for one file
 */
function audioStudio(): Plugin {
  return {
    name: 'sibaq-audio-studio',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/audio/status', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, providers: PROVIDERS }));
      });
      server.middlewares.use('/api/audio/regenerate', (req, res) => {
        const send = (code: number, body: unknown) => {
          res.statusCode = code;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        };
        if (req.method !== 'POST') return send(405, { error: 'POST only' });
        let raw = '';
        req.on('data', c => { raw += c; if (raw.length > 4000) req.destroy(); });
        req.on('end', () => {
          let b: { voice?: string; clip?: string; text?: string; provider?: string };
          try { b = JSON.parse(raw || '{}'); } catch { return send(400, { error: 'bad json' }); }
          const voice = String(b.voice || ''), clip = String(b.clip || ''), provider = String(b.provider || 'edge');
          if (!VOICES.includes(voice) || !/^(ar|en)\/[a-z0-9-]{1,40}$/.test(clip) || !PROVIDERS.includes(provider)) return send(400, { error: 'bad params' });
          const args = [path.resolve(server.config.root, 'scripts/generate_audio.py'), '--voice', voice, '--clip', clip, '--force', '--provider', provider];
          if (b.text && typeof b.text === 'string') args.push('--text', b.text.slice(0, 200));
          const py = process.platform === 'win32' ? 'python' : 'python3';
          const p = spawn(py, args, { cwd: server.config.root, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
          let out = '';
          p.stdout.on('data', d => { out += d; });
          p.stderr.on('data', d => { out += d; });
          p.on('error', e => send(500, { error: String(e) }));
          p.on('close', code => (code === 0 ? send(200, { ok: true }) : send(500, { error: out.slice(-600) })));
        });
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), audioStudio()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { port: 5173, host: true },
  build: { chunkSizeWarningLimit: 1400 },
});
