#!/bin/bash
# Enable the Nginx site configuration

set -e

SITE_CONF="api.getkoara.com.conf"
NGINX_AVAILABLE="/etc/nginx/sites-available/$SITE_CONF"
NGINX_ENABLED="/etc/nginx/sites-enabled/$SITE_CONF"

echo "Copying configuration to sites-available..."
sudo cp ../nginx/$SITE_CONF $NGINX_AVAILABLE

echo "Creating symlink to sites-enabled..."
if [ -f "$NGINX_ENABLED" ]; then
    sudo rm "$NGINX_ENABLED"
fi
sudo ln -s $NGINX_AVAILABLE $NGINX_ENABLED

echo "Testing Nginx configuration..."
sudo nginx -t

echo "Reloading Nginx..."
sudo systemctl reload nginx

echo "Site enabled successfully."
