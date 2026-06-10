import fs from 'fs'
import path from 'path'
import os from 'os'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const vcCli = path.join(root, 'node_modules', 'vercel', 'dist', 'vc.js')

const SKIP_ROOT = new Set([
  '.git',
  'node_modules',
  '.next',
  '.open-next',
  '.wrangler',
  'dist',
  'build',
  'coverage',
])

if (!fs.existsSync(vcCli)) {
  console.error('Missing Vercel CLI. Run: pnpm install')
  process.exit(1)
}
if (!fs.existsSync(path.join(root, '.vercel', 'project.json'))) {
  console.error('Missing .vercel/project.json — run: npx vercel link')
  process.exit(1)
}

const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'mail-vercel-'))

try {
  fs.cpSync(root, staging, {
    recursive: true,
    filter: (s) => {
      const rel = path.relative(root, s)
      if (rel === '' || rel === '.') return true
      const segs = rel.split(path.sep).filter(Boolean)
      if (SKIP_ROOT.has(segs[0])) return false
      if (segs[0] === '.vercel' && segs[1] === 'output') return false
      return true
    },
  })
} catch (e) {
  console.error(e)
  try { fs.rmSync(staging, { recursive: true, force: true }) } catch {}
  process.exit(1)
}

console.log('Deploying from staging (no .git):', staging)

const r = spawnSync(process.execPath, [vcCli, 'deploy', '--prod', '--yes'], {
  cwd: staging,
  stdio: 'inherit',
  env: process.env,
})

try { fs.rmSync(staging, { recursive: true, force: true }) } catch {}

process.exit(r.status ?? 1)
