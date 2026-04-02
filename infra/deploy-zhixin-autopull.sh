#!/usr/bin/env bash
# Auto-deploy zhixincn.com (zhixin): pull main, install, build, sync nginx, restart PM2.
# Intended for systemd timer; install to /usr/local/bin and run as root.
set -euo pipefail

export PATH="/usr/local/bin:/usr/bin:/usr/sbin:/bin"

readonly APP_ROOT="/root/var/www/nextjs/zhixin"
readonly NGINX_DST="/etc/nginx/sites-available/zhixincn.com"
readonly PM2_NAME="zhixin"
readonly LOCK="/run/lock/deploy-zhixin-autopull.lock"
readonly BRANCH="main"

exec 9>"$LOCK"
if ! flock -n 9; then
  echo "deploy-zhixin: another run holds the lock; skipping"
  exit 0
fi

cd "$APP_ROOT"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "deploy-zhixin: SKIP — working tree has local changes (commit or stash first)"
  exit 0
fi

old_head=$(git rev-parse HEAD)
git fetch origin "$BRANCH" --quiet
if ! git merge --ff-only "origin/$BRANCH"; then
  echo "deploy-zhixin: fast-forward pull failed (resolve on server)"
  exit 1
fi
new_head=$(git rev-parse HEAD)

if [[ "$old_head" == "$new_head" ]]; then
  echo "deploy-zhixin: already at origin/$BRANCH ($new_head)"
  exit 0
fi

echo "deploy-zhixin: $old_head -> $new_head"

npm ci
npm run build

install -m 644 "$APP_ROOT/nginx.conf" "$NGINX_DST"
nginx -t
systemctl reload nginx

pm2 restart "$PM2_NAME" --update-env
pm2 save

echo "deploy-zhixin: OK"
