#!/bin/bash
# Deployment script for Koara Backend

set -e

echo "Starting deployment process..."

# Step 1: Install Nginx if not installed
if ! command -v nginx &> /dev/null; then
    ./install-nginx.sh
fi

# Step 2: Enable site
./enable-site.sh

echo "Deployment configuration applied."
