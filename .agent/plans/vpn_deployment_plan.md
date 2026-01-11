# Implementation Plan - VPN Server (WireGuard)

## Goal
Deploy a personal VPN server on the VPS to allow secure internet access and private connection to the server's services.

## Technology Choice: **wg-easy**
We will use [wg-easy](https://github.com/wg-easy/wg-easy), which offers:
- **WireGuard**: Fast, modern, and secure VPN protocol.
- **Web UI**: Easy management of clients (phones, laptops) with QR codes.
- **Docker**: Clean installation.

## Proposed Architecture
1.  **VPN Service**: Runs in a Docker container.
2.  **VPN Traffic**: Uses UDP Port `51820` (Direct access).
3.  **Management UI**: Uses Port `51821`. We will route this through Nginx Proxy Manager (NPM) for security (`vpn.158.69.205.142.nip.io`) or expose it directly for initial setup.

## Steps

### 1. Configuration
- [ ] Create `vpn` directory on local workspace.
- [ ] Create `docker-compose.yml` for `wg-easy`.
    - **Host**: `158.69.205.142`
    - **Password**: Secure password for Web UI.

### 2. Deployment
- [ ] Push configuration to GitHub.
- [ ] Pull on VPS.
- [ ] Start the VPN service (`docker-compose up -d`).

### 3. Access Setup (User Action)
- [ ] Open Web UI (via IP `http://158.69.205.142:51821` or secure Domain).
- [ ] Create a client config.
- [ ] PRO TIP: Add the Web UI to Nginx Proxy Manager as `vpn.158.69.205.142.nip.io` for HTTPS access.

## Verification
- [ ] Check if container is running.
- [ ] Verify Web UI is accessible.
