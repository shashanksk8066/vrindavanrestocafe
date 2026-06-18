# Production Deployment Guide (Hostinger VPS)

This guide covers deploying the Meal Subscription Platform on a Hostinger VPS using Nginx, PM2, and SSL.

## 1. Initial VPS Setup
1. SSH into your Hostinger VPS.
2. Install Node.js (v18+ recommended) and NPM.
3. Install PM2 globally: `npm install -g pm2`
4. Install Nginx: `sudo apt update && sudo apt install nginx`
5. Clone or upload your repository to `/var/www/vrindavan`.

## 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd /var/www/vrindavan/backend
   npm install
   ```
2. Set up your `.env` file securely:
   ```bash
   nano .env
   # Add your PhonePe, Google Maps, and VPS Domain configurations here
   ```
3. Upload your `serviceAccountKey.json` to the backend directory securely.
4. Ensure the image uploads directory exists and is writable:
   ```bash
   mkdir -p /var/www/vrindavan/public/uploads
   chmod -R 755 /var/www/vrindavan/public/uploads
   ```
5. Start the backend with PM2:
   ```bash
   pm2 start src/server.js --name "vrindavan-backend"
   pm2 save
   pm2 startup
   ```

## 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd /var/www/vrindavan/frontend
   npm install
   ```
2. Build the production bundle:
   ```bash
   npm run build
   ```
3. The build output will be in `/var/www/vrindavan/frontend/dist`.

## 4. Nginx Reverse Proxy & Static Serving
1. Create a new Nginx configuration:
   ```bash
   sudo nano /etc/nginx/sites-available/vrindavan
   ```
2. Paste the following configuration:
   ```nginx
   server {
       listen 80;
       server_name your_vps_domain.com;

       # Allow large image uploads
       client_max_body_size 50M;

       # Enable Gzip Compression for Performance
       gzip on;
       gzip_vary on;
       gzip_min_length 10240;
       gzip_proxied expired no-cache no-store private auth;
       gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript;
       gzip_disable "MSIE [1-6]\.";

       # Serve Frontend Static Files
       location / {
           root /var/www/vrindavan/frontend/dist;
           try_files $uri $uri/ /index.html;
       }

       # Reverse Proxy for Backend APIs
       location /api/ {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # Serve Uploaded Images directly for performance
       location /public/uploads/ {
           alias /var/www/vrindavan/public/uploads/;
           expires 30d;
           add_header Cache-Control "public, no-transform";
       }
   }
   ```
3. Enable the site and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/vrindavan /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## 5. SSL Setup
1. Install Certbot: `sudo apt install certbot python3-certbot-nginx`
2. Generate SSL certificates:
   ```bash
   sudo certbot --nginx -d your_vps_domain.com
   ```

Your platform is now live, secure, and production-ready!
