import { cp, mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const repoRoot = resolve(process.cwd())
const src = resolve(repoRoot, 'marketing-kpi-web', 'dist')
const dest = resolve(repoRoot, 'calculator')

async function main() {
  await rm(dest, { recursive: true, force: true })
  await mkdir(dest, { recursive: true })
  await cp(src, dest, { recursive: true })
  console.log(`Copied calculator build to ${dest}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

