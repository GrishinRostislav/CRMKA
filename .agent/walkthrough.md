# Deployment Walkthrough & Access Guide

## 1. System Status
- **VPS IP**: `158.69.205.142`
- **Nginx Proxy Manager (Admin)**: `http://158.69.205.142:81`
- **CRM (Direct Access)**: `http://158.69.205.142:3000`

## 2. Using "Magic" Domains (No Domain Required)
If you don't have a domain yet, we can use `nip.io`. It allows you to use your IP address as a domain name.

**Your "Magic" Domain**: `crm.158.69.205.142.nip.io`

### Setup Steps in "The Watchman" (Nginx Proxy Manager):
1.  **Login**: Go to `http://158.69.205.142:81`
    - Email: `admin@example.com`
    - Password: `changeme` (Change this!)
2.  **Add Proxy Host**:
    - Click **Proxy Hosts** -> **Add Proxy Host**
    - **Domain Names**: `crm.158.69.205.142.nip.io`
    - **Scheme**: `http`
    - **Forward Hostname / IP**: `172.17.0.1` (Docker Gateway)
    - **Forward Port**: `3000`
    - **Block Common Exploits**: [x] Enable
3.  **SSL (Optional but Recommended)**:
    - Go to **SSL** tab.
    - **SSL Certificate**: `Request a new SSL Certificate`
    - **Force SSL**: [x] Enable
    - **Email Address**: Your email
    - **Agree to TOS**: [x] Enable
    - Click **Save**.

## 3. Result
You can now access your CRM at: **https://crm.158.69.205.142.nip.io**
It will look like a real production site with a secure lock icon.

## 4. VPN Access (WireGuard)
Secure your connection and access internal services safely.

**Web Panel**: `http://158.69.205.142:51821`
**Password**: `changeme123`

### Setup Steps
1.  **Login**: Open the link above and enter the password.
2.  **Create Client**: Click "**New Client**", give it a name (e.g., "iPhone").
3.  **Connect**:
    - **Phone**: Download the WireGuard app App Store/Google Play and scan the QR code.
    - **PC**: Download the config file and import it into the WireGuard desktop app.

*Note: Once connected, your internet traffic goes through the VPS. This is great for public Wi-Fi security.*
