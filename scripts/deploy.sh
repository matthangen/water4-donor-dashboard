#!/bin/bash
# deploy.sh — Build and deploy Water4 Donor Dashboard to GitHub Pages
# Usage: npm run deploy
set -e

echo "=== Water4 Donor Dashboard — Deploy ==="

# Build
echo "Building..."
npm run build

# Push dist/ to gh-pages branch
TOKEN=$(gh auth token)
TMPDIR=$(mktemp -d)
cd "$TMPDIR"
git init
git checkout --orphan gh-pages
cp -r "$OLDPWD/dist"/. .
git add -A
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M')"
git remote add origin "https://${TOKEN}@github.com/matthangen/water4-donor-dashboard.git"
git push origin gh-pages --force
cd "$OLDPWD"
rm -rf "$TMPDIR"

echo ""
echo "✅ Deployed to https://matthangen.github.io/water4-donor-dashboard/"
