import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const WG_API_URL = 'http://wg-easy:51821/api/wireguard';
const WG_PASSWORD = 'admin123'; // Matches docker-compose
const PROMETHEUS_URL = 'http://vpn-prometheus:9090/api/v1';
const LIMITS_FILE = '/etc/wireguard_vpn/limits.json';

class VpnService {
    constructor() {
        this.cookie = null;
    }

    async ensureAuth() {
        // If we have a cookie, try a lightweight call or just proceed (wg-easy session might expire)
        // For simplicity, re-login if sensitive ops fail or just always login 
        // Best approach: try-catch wrapper. But wg-easy session is simple.
        try {
            await axios.post(`${WG_API_URL}/session`, { password: WG_PASSWORD });
            // Cookie is set in axios global? No, we need to handle it.
            // Axios doesn't persist cookies automatically unless configured with jar.
            // Let's use a wrapper or just simple login-on-demand.
        } catch (error) {
            console.error("Auth failed", error.message);
        }
    }

    async getHeaders() {
        // We actually need to capture the cookie from the login response.
        // Let's revise ensureAuth
        if (!this.cookie) {
            const res = await axios.post(`${WG_API_URL}/session`, { password: WG_PASSWORD });
            // Cookie is in res.headers['set-cookie']
            if (res.headers['set-cookie']) {
                this.cookie = res.headers['set-cookie'];
            }
        }
        return { Cookie: this.cookie };
    }

    async getClients() {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${WG_API_URL}/client`, { headers });

            // Merge with local limits
            const limits = this.readLimits();
            const clients = response.data.map(c => ({
                ...c,
                limits: limits[c.id] || { speed_limit: 0, traffic_limit: 0 }
            }));

            return clients;
        } catch (error) {
            console.error('Error fetching clients:', error.message);
            // Retry once on 401?
            this.cookie = null;
            return [];
        }
    }

    async createClient(name) {
        try {
            const headers = await this.getHeaders();
            await axios.post(`${WG_API_URL}/client`, { name }, { headers });
        } catch (error) {
            console.error('Error creating client:', error.message);
            throw error;
        }
    }

    async deleteClient(id) {
        try {
            const headers = await this.getHeaders();
            await axios.delete(`${WG_API_URL}/client/${id}`, { headers });
            // Cleanup limits
            const limits = this.readLimits();
            if (limits[id]) {
                delete limits[id];
                this.writeLimits(limits);
            }
        } catch (error) {
            console.error('Error deleting client:', error.message);
        }
    }

    // --- Prometheus Metrics ---

    async getMetrics() {
        try {
            const queries = {
                total_rx: 'wireguard_received_bytes_total',
                total_tx: 'wireguard_sent_bytes_total'
            };

            const results = {};
            for (const [key, query] of Object.entries(queries)) {
                const res = await axios.get(`${PROMETHEUS_URL}/query`, { params: { query } });
                results[key] = res.data.data.result;
            }
            return results;
        } catch (error) {
            console.error('Prometheus Error:', error.message);
            return {};
        }
    }

    // --- Limits (File Based) ---

    readLimits() {
        try {
            if (fs.existsSync(LIMITS_FILE)) {
                return JSON.parse(fs.readFileSync(LIMITS_FILE, 'utf8'));
            }
        } catch (err) {
            console.error("Read limits failed", err);
        }
        return {};
    }

    writeLimits(data) {
        try {
            fs.writeFileSync(LIMITS_FILE, JSON.stringify(data, null, 2));
        } catch (err) {
            console.error("Write limits failed", err);
        }
    }

    async updateLimits(clientId, speedMbps, trafficGb) {
        const limits = this.readLimits();
        // We need client name for the monitor script.
        // Let's cache 'name' as well so monitor doesn't need to query API.
        const clients = await this.getClients();
        const client = clients.find(c => c.id === clientId);

        limits[clientId] = {
            id: clientId,
            name: client ? client.name : 'unknown',
            speed_limit: parseInt(speedMbps),
            traffic_limit: parseInt(trafficGb)
        };
        this.writeLimits(limits);
    }
}

export default new VpnService();
