import esbuild from 'esbuild'

esbuild.build({
  entryPoints: ['src/client/date.js'],
  bundle: true,
  format: 'iife',
  outfile: 'client/date.js',
  sourcemap: true,
  minify: true,
}).then(() => {
  console.log('built client/date.js')
}).catch(() => process.exit(1))
