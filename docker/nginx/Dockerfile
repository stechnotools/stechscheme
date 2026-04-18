FROM nginx:stable-alpine

COPY conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY conf.d/security-headers.conf /etc/nginx/conf.d/security-headers.conf

WORKDIR /var/www/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
