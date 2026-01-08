const API_URL = 'http://localhost:3001/api';

// Helper function to get auth headers with company context
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    const companyId = localStorage.getItem('companyId');
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(companyId && { 'x-company-id': companyId })
    };
};

// Auth API
export const authAPI = {
    // Register new user AND new company
    async register(name, email, password, companyName) {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, companyName })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        // Save session
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('companyId', data.companyId); // Auto-select created company
        return data;
    },

    // Login
    async login(email, password) {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        // Note: Login doesn't return companyId automatically now, need to fetch companies or use last one
        return data;
    },

    logout() {
        localStorage.clear();
    },

    isLoggedIn() {
        return !!localStorage.getItem('token');
    },

    getStoredUser() {
        const u = localStorage.getItem('user');
        return u ? JSON.parse(u) : null;
    }
};

// Company Management API
export const companyAPI = {
    // Get all companies for current user
    async getMyCompanies() {
        const response = await fetch(`${API_URL}/me/companies`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data; // { companies: [...] }
    },

    // Create a NEW company for existing user
    async create(name) {
        const response = await fetch(`${API_URL}/companies`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
    },

    // Get current member info (my role in current company)
    async getCurrentMember() {
        const response = await fetch(`${API_URL}/company/me`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.member;
    },

    // Update Company Name
    async update(name) {
        const response = await fetch(`${API_URL}/company`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data; // { message, name }
    }
};


// Users/Members API (Scoped to Company)
export const usersAPI = {
    async getAll() {
        const response = await fetch(`${API_URL}/members`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data; // { members: [] } (was users)
    },

    // Invite/Add Member
    async delete(id) {
        const response = await fetch(`${API_URL}/members/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Failed');
    },

    async updateRole(id, role) {
        const response = await fetch(`${API_URL}/members/${id}/role`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ role })
        });
        if (!response.ok) throw new Error('Failed');
    },

    async updateMember(id, data) {
        const response = await fetch(`${API_URL}/members/${id}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update member');
        const result = await response.json();
        return result;
    }
};

// Clients API
export const clientsAPI = {
    async getAll() {
        const response = await fetch(`${API_URL}/clients`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
    },
    async create(clientData) {
        const response = await fetch(`${API_URL}/clients`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(clientData)
        });
        if (!response.ok) throw new Error('Failed');
    }
};

// Activities API
export const activitiesAPI = {
    async getAll() {
        const response = await fetch(`${API_URL}/activities`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
    }
};

// Inventory API
export const inventoryAPI = {
    // Get all items
    async getAll() {
        const response = await fetch(`${API_URL}/inventory`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
    },

    // Add new item (Admin/Manager)
    async create(itemData) {
        const response = await fetch(`${API_URL}/inventory`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(itemData)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
    },

    // Restock item (Admin/Manager)
    async restock(id, quantity) {
        const response = await fetch(`${API_URL}/inventory/${id}/restock`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ quantity })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
    },

    // Use item for client (Worker)
    async use(id, quantity, clientId) {
        const response = await fetch(`${API_URL}/inventory/${id}/use`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ quantity, client_id: clientId })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
    },

    // Get Client usage history
    async getClientHistory(clientId) {
        const response = await fetch(`${API_URL}/clients/${clientId}/inventory`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
    }
};

// Stats API
export const statsAPI = {
    async getDashboardStats() {
        const response = await fetch(`${API_URL}/stats`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return { stats: data.stats, recentActivities: [] }; // Adapt for now
    }
};
