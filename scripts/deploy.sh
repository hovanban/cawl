#!/bin/bash
set -e

DEPLOY_PATH="/home/baovothuat-bot/htdocs/bot.baovothuat.com"
PM2_APP_NAME="cawl"
APP_PORT=3005

echo "==> [1/5] Pull code mới nhất..."
cd $DEPLOY_PATH
git pull origin main

echo "==> [2/5] Cài dependencies..."
npm ci

echo "==> [3/5] Generate Prisma client..."
npx prisma generate

echo "==> [4/5] Đồng bộ schema MongoDB..."
npx prisma db push --accept-data-loss

echo "==> [5/5] Build & restart PM2..."
npm run build
pm2 reload $PM2_APP_NAME --update-env 2>/dev/null || pm2 start npm --name "$PM2_APP_NAME" -- start -- -p $APP_PORT

echo ""
echo "Deploy hoàn tất!"
pm2 status
