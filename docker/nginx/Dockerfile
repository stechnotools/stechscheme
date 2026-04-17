FROM nginx:stable-alpine

# Copy nginx config
COPY conf.d/default.conf /etc/nginx/conf.d/default.conf

# Set working directory to serve app static assets if needed
WORKDIR /var/www/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
