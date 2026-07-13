#!/bin/bash
# Install Nginx on Ubuntu

set -e

echo "Updating package lists..."
sudo apt-get update

echo "Installing Nginx..."
sudo apt-get install -y nginx

echo "Ensuring Nginx is enabled to start on boot..."
sudo systemctl enable nginx

echo "Starting Nginx..."
sudo systemctl start nginx

echo "Nginx installation complete."
