This task involves migrating the existing single-container deployment to a multi-tenant architecture using Nginx Proxy Manager (NPM).

## Status
- [x] Create Nginx Proxy Manager configuration (`nginx-proxy/docker-compose.yml`)
- [x] Update CRM configuration to run on port 3000 instead of 80/443
- [x] Push changes to GitHub
- [x] Pull changes on VPS
- [x] Stop existing CRM containers (Free up port 80/443)
- [x] Start Nginx Proxy Manager on VPS (Port 80/443/81)

- [x] Start CRM on VPS (Port 3000)

- [x] Verify connectivity


## Goals
1.  **Reverse Proxy**: Establish NPM as the gateway on ports 80/443.
2.  **App deployment**: Deploy CRM behind the proxy.
3.  **Future-proofing**: Allow easy addition of other apps (WordPress, etc.) via NPM UI.
