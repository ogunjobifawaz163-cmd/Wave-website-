#!/bin/bash
# Pushes the project to GitHub during Vercel build (has access to GITHUB_TOKEN)
# Only runs if GITHUB_TOKEN is set

if [ -z "$GITHUB_TOKEN" ]; then
  echo "[github-push] No GITHUB_TOKEN found, skipping"
  exit 0
fi

REPO="ogunjobifawaz163-cmd/Wave-website-"
echo "[github-push] Pushing to $REPO..."

# Configure git
git config --global user.email "ogunjobifawaz163-cmd@users.noreply.github.com"
git config --global user.name "ogunjobifawaz163-cmd"

# Init repo
git init
git branch -m main

# Write a comprehensive .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
.env.local
.vercel/
.agon-env/
*.log
.vite-source-tags.js
uploads/
waves-beats-project.tar.gz
public/downloads/
EOF

# Add only source files (not build artifacts or secrets)
git add \
  .gitignore \
  README.md \
  index.html \
  package.json \
  package-lock.json \
  vite.config.ts \
  tsconfig.json \
  tsconfig.app.json \
  tsconfig.node.json \
  eslint.config.js \
  vercel.json \
  scripts/ \
  api/ \
  src/ \
  public/

git commit -m "WAVES — full beat store + admin console + R2 integration

- Beat store with genre folders, licensing tiers, and player
- Admin console (folders, beats, packs, leases, briefs, analytics)
- Cloudflare R2 integration (artwork, previews, WAV masters, stems)
- R2 Setup Wizard (auto-creates bucket, CORS, keys)
- R2 diagnostics + one-click CORS fix
- Supabase auth (email + Google)
- Invoice generation, inquiry forms, private packs
- Default artwork, responsive design, dark theme"

# Push to GitHub using the token
git remote remove origin 2>/dev/null || true
git remote add origin "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git"
git push -u origin main --force

echo "[github-push] Done! Repo: https://github.com/${REPO}"
