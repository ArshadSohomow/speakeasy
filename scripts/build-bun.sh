#!/bin/sh
# Offline build used in environments without npm access. Produces the same dist/ as `vite build`.
set -e
rm -rf dist
# Bun's HTML bundler tries to resolve absolute public paths, so build from a copy without them.
sed 's#<link rel="icon" href="/favicon.svg" type="image/svg+xml" />##' index.html > speakeasy.html
bun build ./speakeasy.html --outdir dist --minify --target browser --public-path / \
  --define 'process.env.NODE_ENV="production"'
mv dist/speakeasy.html dist/index.html
sed -i 's#<head>#<head><link rel="icon" href="/favicon.svg" type="image/svg+xml">#' dist/index.html
rm speakeasy.html
cp -r public/* dist/
echo "Built to dist/"
