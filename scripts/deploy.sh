#!/bin/bash
set -e

DEPLOY_PATH="/home/baovothuat-bot/htdocs/bot.baovothuat.com"
PM2_APP_NAME="cawl"
APP_PORT=3005

cd $DEPLOY_PATH

echo "==> [1/4] Cài dependencies..."
npm ci

echo "==> [2/4] Generate Prisma client..."
npx prisma generate

echo "==> [3/4] Đồng bộ schema MongoDB..."
npx prisma db push --accept-data-loss

echo "==> [4/4] Build & restart PM2..."
npm run build
pm2 reload $PM2_APP_NAME --update-env 2>/dev/null || pm2 start npm --name "$PM2_APP_NAME" -- start -- -p $APP_PORT

echo ""
echo "Deploy hoàn tất!"
pm2 status
