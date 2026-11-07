const esbuild = require('esbuild')

const args = process.argv.slice(2)
const watch = args.includes('--watch')
const minOnly = args.includes('--min-only')

const base = {
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'iife',
  globalName: 'NitPik',
  target: 'es2015',
}

const builds = [{ ...base, outfile: 'dist/nitpik.min.js', minify: true }]
if (!minOnly) builds.unshift({ ...base, outfile: 'dist/nitpik.js', minify: false })

async function run() {
  for (const opts of builds) {
    if (watch) {
      const ctx = await esbuild.context(opts)
      await ctx.watch()
    } else {
      await esbuild.build(opts)
    }
  }
}

run().catch(function () { process.exit(1) })
