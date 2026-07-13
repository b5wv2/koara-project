# Deployment Guide (AWS EC2 Ubuntu)

This directory contains the necessary configurations and scripts to deploy the Koara backend API behind an Nginx reverse proxy on an AWS EC2 instance running Ubuntu.

## Architecture
- Nginx listens on port 80 (and 443 with SSL) on `api.getkoara.com`.
- Nginx forwards requests to the Node.js backend running on `http://127.0.0.1:5000`.
- The backend continues to run internally on port 5000.
- **Important**: Ensure your AWS EC2 Security Group ONLY allows inbound traffic on ports 80 and 443. Do NOT expose port 5000 publicly.

## Step-by-Step Instructions

1. **Make scripts executable**
   ```bash
   cd deployment/scripts
   chmod +x *.sh
   ```

2. **Install Nginx**
   Run the installation script to install Nginx on your Ubuntu server.
   ```bash
   ./install-nginx.sh
   ```

3. **Copy Configuration and Enable the Site**
   Run the enable-site script. This will:
   - Copy `api.getkoara.com.conf` to `/etc/nginx/sites-available/`
   - Create a symbolic link in `/etc/nginx/sites-enabled/`
   - Test the Nginx configuration
   - Reload Nginx
   ```bash
   ./enable-site.sh
   ```

4. **Testing Nginx Configuration (Manual)**
   If you ever need to manually test the configuration, run:
   ```bash
   sudo nginx -t
   ```

5. **Reloading Nginx (Manual)**
   If you make manual changes to the configuration, reload Nginx with:
   ```bash
   sudo systemctl reload nginx
   ```

6. **Installing SSL later with Certbot**
   To secure the API with HTTPS, use Certbot (Let's Encrypt).
   ```bash
   # Install Certbot and the Nginx plugin
   sudo apt-get update
   sudo apt-get install -y certbot python3-certbot-nginx

   # Obtain and install the certificate
   sudo certbot --nginx -d api.getkoara.com
   ```
   Certbot will automatically update the Nginx configuration to listen on port 443 and handle SSL certificates.
