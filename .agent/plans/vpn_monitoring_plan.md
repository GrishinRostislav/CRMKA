# Implementation Plan - VPN Monitoring & Limits

## Goal
Enhance the existing VPN server with professional-grade monitoring (History, Usage Charts) and traffic/speed limiting capabilities.

## Architecture: The "Monitoring Stack"
We will extend our Docker cluster with three new services:

1.  **Prometheus**: The database that stores metrics (time-series data).
2.  **WireGuard Exporter**: A small tool that reads WireGuard status and "translates" it for Prometheus.
3.  **Grafana**: The visualization dashboard. It will connect to Prometheus and draw beautiful graphs (Traffc by Client, Total Speed, etc.).
4.  **Traffic Control Script**: A standalone script using `tc` (Linux Traffic Control) to enforce speed limits, as Docker cannot easily do this per-client dynamic limiting.

## Steps

### 1. Update `docker-compose.yml`
- [ ] Add `prometheus` service.
- [ ] Add `grafana` service (Port 3000 -> mapped to `3002` to avoid conflict with CRM).
- [ ] Add `wireguard-exporter` service (Needs `cap_add: NET_ADMIN` to read wg0).

### 2. Configuration Files
- [ ] Create `prometheus.yml` (Config to scrape the exporter).
- [ ] Create `grafana/provisioning` (To auto-load the dashboard).

### 3. Traffic Limiting (The "Police")
- [ ] Create a shell script `limit_speed.sh`.
    - Logic: Use `tc` to set upload/download limits on the `wg0` interface or specific IPs (e.g., 10.8.0.2).
    - We will run this manually or via cron for now.

### 4. Deployment
- [ ] Push changes.
- [ ] `docker-compose up -d` on VPS.
- [ ] Open Grafana (`http://158.69.205.142:3002`) and check dashboards.

## Access
- **Grafana**: `http://158.69.205.142:3002` (Default: admin/admin)
