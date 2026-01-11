# Implementation Plan - Reverse Proxy Migration

## Context
The user wants to host multiple websites (CRM, WordPress, etc.) on a single VPS. We are introducing Nginx Proxy Manager as the "Traffic Controller".

## Steps

### 1. Preparation (Local)
- [x] Create `nginx-proxy` directory with `docker-compose.yml`.
- [x] Modify `crmka/docker-compose.yml` to expose port 3000.
- [x] Commit and Push.

### 2. Deployment (VPS)
- [x] `git pull` latest changes.
- [x] Stop running containers (`docker-compose down`) to release ports 80/443.
- [x] Start Nginx Proxy Manager:
    ```bash
    cd nginx-proxy
    docker-compose up -d
    ```
- [x] Start CRM:
    ```bash
    cd ..
    docker-compose up -d --build
    ```

### 3. Verification
- [x] Check `docker ps`: Ensure `nginx-proxy-app-1` is on 80/443/81 and `crmka-frontend` is on 3000.
- [ ] User to configure domains in NPM UI (Port 81).

## Next Steps (User)
- Login to NPM (Port 81).
- Change default credentials.
- Add Proxy Host for the CRM domain pointing to port 3000.
