#!/bin/bash

echo "🚀 Deployment started"

DEPLOYPATH="/home1/stechhwk/schemeapi.stechnotools.com"

echo "📦 Sync backend"
rsync -av --delete --exclude=".git" /home1/stechhwk/repositories/stechscheme/backend/ $DEPLOYPATH

cd $DEPLOYPATH

echo "📦 Install dependencies"
composer install --no-dev --optimize-autoloader

echo "⚙️ Optimize Laravel"
php artisan config:cache
php artisan route:cache
php artisan migrate --force

chmod -R 775 storage bootstrap/cache

echo "✅ Deployment finished"