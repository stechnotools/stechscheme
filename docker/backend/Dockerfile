FROM php:8.4-fpm AS deps

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    libpq-dev \
    postgresql-client \
    unzip \
    zip \
    && docker-php-ext-install pdo_pgsql \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . ./
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress \
    && composer clear-cache

FROM php:8.4-fpm

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    postgresql-client \
    && docker-php-ext-install pdo_pgsql \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

COPY . ./
COPY --from=deps /var/www/html/vendor ./vendor
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

RUN mkdir -p storage bootstrap/cache \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 775 storage bootstrap/cache

COPY entrypoint.sh /usr/local/bin/backend-entrypoint
RUN chmod +x /usr/local/bin/backend-entrypoint

EXPOSE 9000

ENTRYPOINT ["backend-entrypoint"]
CMD ["php-fpm"]
