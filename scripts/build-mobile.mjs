// Cross-platform native bundle build. Keeps existing GitHub Pages PWA build untouched.
import { spawnSync } from 'node:child_process'
const command = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const result = spawnSync(command, ['run', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, NATIVE_BUILD: 'true' },
  shell: process.platform === 'win32'
})
if (result.error) { console.error(result.error); process.exit(1) }
process.exit(result.status ?? 1)
