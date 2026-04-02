#!/usr/bin/env bash
# Auto-deploy yiwuwax.com (yiwu-wax): pull main, install, build, sync nginx, restart PM2.
# Intended for systemd timer; install to /usr/local/bin and run as root.
set -euo pipefail

export PATH="/root/.local/share/pnpm:/usr/local/bin:/usr/bin:/usr/sbin:/bin"

readonly APP_ROOT="/root/var/www/nextjs/yiwu-wax"
readonly NGINX_DST="/etc/nginx/sites-available/yiwuwax.com"
readonly PM2_NAME="yiwu-wax"
readonly LOCK="/run/lock/deploy-yiwu-wax-autopull.lock"
readonly BRANCH="main"

exec 9>"$LOCK"
if ! flock -n 9; then
  echo "deploy-yiwu-wax: another run holds the lock; skipping"
  exit 0
fi

cd "$APP_ROOT"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "deploy-yiwu-wax: SKIP — working tree has local changes (commit or stash first)"
  exit 0
fi

old_head=$(git rev-parse HEAD)
git fetch origin "$BRANCH" --quiet
if ! git merge --ff-only "origin/$BRANCH"; then
  echo "deploy-yiwu-wax: fast-forward pull failed (resolve on server)"
  exit 1
fi
new_head=$(git rev-parse HEAD)

if [[ "$old_head" == "$new_head" ]]; then
  echo "deploy-yiwu-wax: already at origin/$BRANCH ($new_head)"
  exit 0
fi

echo "deploy-yiwu-wax: $old_head -> $new_head"

pnpm install --frozen-lockfile
pnpm run build

install -m 644 "$APP_ROOT/nginx.conf" "$NGINX_DST"
nginx -t
systemctl reload nginx

pm2 restart "$PM2_NAME" --update-env
pm2 save

echo "deploy-yiwu-wax: OK"
