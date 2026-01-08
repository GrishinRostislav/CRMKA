import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { authAPI, usersAPI, clientsAPI, activitiesAPI, statsAPI, companyAPI, inventoryAPI } from '../services/api';
import ClientCard from './ClientCard';
import MemberCard from './MemberCard';

const Dashboard = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [recentActivities, setRecentActivities] = useState([]);
    const [currentMember, setCurrentMember] = useState(null);
    const [companies, setCompanies] = useState([]);

    // Data states
    const [members, setMembers] = useState([]);
    const [clients, setClients] = useState([]);
    const [activities, setActivities] = useState([]);
    const [inventory, setInventory] = useState([]); // Warehouse Data
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modals & Selections
    const [showAddMember, setShowAddMember] = useState(false);
    const [showAddClient, setShowAddClient] = useState(false);
    const [showAddItem, setShowAddItem] = useState(false); // Add Inventory Item
    const [selectedClient, setSelectedClient] = useState(null); // For Client Card
    const [selectedMember, setSelectedMember] = useState(null); // For Member Card

    // Company Editing
    const [isEditingCompany, setIsEditingCompany] = useState(false);
    const [tempCompanyName, setTempCompanyName] = useState('');

    // Forms
    const [newMember, setNewMember] = useState({ name: '', email: '', password: '', role: 'worker' });
    const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', company: '', address: '' });
    const [newItem, setNewItem] = useState({ name: '', quantity: 0, unit: 'pcs', min_quantity: 5 });
    const [submitting, setSubmitting] = useState(false);

    // Initial load
    useEffect(() => {
        loadDashboardData();
        loadCompanyContext();
    }, []);

    const loadCompanyContext = async () => {
        try {
            const member = await companyAPI.getCurrentMember();
            setCurrentMember(member);
            const { companies } = await companyAPI.getMyCompanies();
            setCompanies(companies);
        } catch (err) {
            console.error("Failed to load company context", err);
        }
    };

    // Load data based on active tab
    useEffect(() => {
        if (activeTab === 'users') loadMembers();
        if (activeTab === 'clients') loadClients();
        if (activeTab === 'warehouse') loadInventory();
        if (activeTab === 'tasks') loadActivities();
    }, [activeTab]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const data = await statsAPI.getDashboardStats();
            setStats(data.stats);
            setRecentActivities(data.recentActivities);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadMembers = async () => {
        try {
            setLoading(true);
            const data = await usersAPI.getAll();
            setMembers(data.members);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadClients = async () => {
        try {
            setLoading(true);
            const data = await clientsAPI.getAll();
            setClients(data.clients);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadActivities = async () => {
        try {
            setLoading(true);
            const data = await activitiesAPI.getAll();
            setActivities(data.activities);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadInventory = async () => {
        try {
            setLoading(true);
            const data = await inventoryAPI.getAll();
            setInventory(data.items);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        authAPI.logout();
        onLogout();
    };

    const handleAddClient = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await clientsAPI.create(newClient);
            await loadClients();
            setShowAddClient(false);
            setNewClient({ name: '', email: '', phone: '', company: '', address: '' });
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await inventoryAPI.create(newItem);
            await loadInventory();
            setShowAddItem(false);
            setNewItem({ name: '', quantity: 0, unit: 'pcs', min_quantity: 5 });
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Note: This endpoint now invites or creates a user AND adds them to company
            const response = await fetch('http://localhost:3001/api/members', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'x-company-id': localStorage.getItem('companyId')
                },
                body: JSON.stringify(newMember)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            await loadMembers();
            setShowAddMember(false);
            setNewMember({ name: '', email: '', password: '', role: 'worker' });
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleRoleChange = async (memberId, newRole) => {
        try {
            await usersAPI.updateRole(memberId, newRole);
            setMembers(members.map(m =>
                m.id === memberId ? { ...m, role: newRole } : m
            ));
        } catch (err) {
            alert(err.message);
        }
    };

    // Switch Company Logic
    const handleSwitchCompany = (companyId) => {
        localStorage.setItem('companyId', companyId);
        window.location.reload(); // Simple reload to refresh context
    };

    const handleUpdateCompanyName = async () => {
        if (!tempCompanyName.trim()) return setIsEditingCompany(false);
        try {
            await companyAPI.update(tempCompanyName);
            // Update local state
            setCompanies(companies.map(c =>
                c.id == localStorage.getItem('companyId') ? { ...c, name: tempCompanyName } : c
            ));
            setIsEditingCompany(false);
        } catch (err) {
            alert(err.message);
        }
    };

    // Helper functions
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getRoleBadgeClass = (role) => {
        switch (role) {
            case 'super_admin': return 'badge-super-admin';
            case 'admin': return 'badge-admin';
            case 'manager': return 'badge-manager';
            case 'worker': return 'badge-worker';
            case 'client': return 'badge-client';
            default: return 'badge-user';
        }
    };

    // Find current company name
    const currentCompany = companies.find(c => c.id == localStorage.getItem('companyId'));
    const canManageInventory = currentMember && ['admin', 'manager', 'super_admin'].includes(currentMember.role);

    return (
        <div className="dashboard">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="logo">CRMK</div>
                    <div className="company-name-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        {isEditingCompany ? (
                            <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                                <input
                                    autoFocus
                                    className="edit-company-input"
                                    style={{
                                        padding: '4px 8px',
                                        fontSize: '13px',
                                        border: '1px solid var(--color-primary)',
                                        borderRadius: '4px',
                                        width: '100%',
                                        background: 'var(--color-bg)',
                                        color: 'var(--color-text-main)'
                                    }}
                                    value={tempCompanyName}
                                    onChange={e => setTempCompanyName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleUpdateCompanyName()}
                                />
                                <button
                                    onClick={handleUpdateCompanyName}
                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-primary)' }}
                                >
                                    ✓
                                </button>
                            </div>
                        ) : (
                            <>
                                <span className="logo-subtitle" style={{ marginBottom: 0 }}>
                                    {currentCompany ? currentCompany.name : 'Loading...'}
                                </span>
                                {currentMember && currentMember.role === 'super_admin' && (
                                    <button
                                        className="edit-icon-btn"
                                        onClick={() => {
                                            setTempCompanyName(currentCompany ? currentCompany.name : '');
                                            setIsEditingCompany(true);
                                        }}
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', opacity: 0.5, padding: '2px', display: 'flex' }}
                                        title="Rename Company"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {/* Simple Company Switcher (if multiple) */}
                    {companies.length > 1 && (
                        <select
                            className="company-select"
                            value={localStorage.getItem('companyId')}
                            onChange={(e) => handleSwitchCompany(e.target.value)}
                            style={{ marginTop: '8px', width: '100%', padding: '4px', fontSize: '12px' }}
                        >
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    )}
                </div>

                <nav className="sidebar-nav">
                    <button
                        className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <line x1="3" y1="9" x2="21" y2="9" />
                            <line x1="9" y1="21" x2="9" y2="9" />
                        </svg>
                        Dashboard
                    </button>

                    <button
                        className={`nav-item ${activeTab === 'clients' ? 'active' : ''}`}
                        onClick={() => setActiveTab('clients')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        Clients
                    </button>

                    <button
                        className={`nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
                        onClick={() => setActiveTab('tasks')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                        </svg>
                        Tasks & Activities
                    </button>

                    {/* Warehouse Tab */}
                    {canManageInventory && (
                        <button
                            className={`nav-item ${activeTab === 'warehouse' ? 'active' : ''}`}
                            onClick={() => setActiveTab('warehouse')}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                <line x1="12" y1="22.08" x2="12" y2="12"></line>
                            </svg>
                            Warehouse
                        </button>
                    )}

                    {currentMember && ['super_admin', 'admin', 'manager'].includes(currentMember.role) && (
                        <button
                            className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
                            onClick={() => setActiveTab('users')}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <circle cx="19" cy="8" r="3" />
                            </svg>
                            Team
                        </button>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar" style={{ background: currentMember?.avatar_color }}>
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-details">
                            <span className="user-name">{user?.name}</span>
                            <span className="user-role">{currentMember?.role?.replace('_', ' ')}</span>
                        </div>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {activeTab === 'dashboard' && stats && (
                    <div className="dashboard-home">
                        <header className="content-header">
                            <div>
                                <h1>Overview</h1>
                                <p className="header-subtitle">Welcome back, {user.name}</p>
                            </div>
                        </header>

                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-icon clients-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                    </svg>
                                </div>
                                <div className="stat-info">
                                    <span className="stat-value">{stats.totalClients}</span>
                                    <span className="stat-label">Total Clients</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                    </svg>
                                </div>
                                <div className="stat-info">
                                    <span className="stat-value">{stats.lowStockItems || 0}</span>
                                    <span className="stat-label">Low Stock Items</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'clients' && (
                    <div className="clients-section">
                        <header className="content-header">
                            <div>
                                <h1>Clients</h1>
                                <p className="header-subtitle">Manage client base for {currentCompany?.name}</p>
                            </div>
                            <button className="add-user-btn" onClick={() => setShowAddClient(true)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Add Client
                            </button>
                        </header>

                        <div className="table-container">
                            <table className="users-table highlight-rows">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Company</th>
                                        <th>Contact</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clients.map(client => (
                                        <tr key={client.id} onClick={() => setSelectedClient(client)} style={{ cursor: 'pointer' }}>
                                            <td>
                                                <div className="user-cell">
                                                    <div className="table-avatar client-avatar">
                                                        {client.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span>{client.name}</span>
                                                </div>
                                            </td>
                                            <td>{client.company || '-'}</td>
                                            <td>
                                                <div className="contact-info">
                                                    <div>{client.email}</div>
                                                    <div className="text-muted">{client.phone}</div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${client.status}`}>
                                                    {client.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Warehouse View */}
                {activeTab === 'warehouse' && (
                    <div className="warehouse-section">
                        <header className="content-header">
                            <div>
                                <h1>Warehouse Inventory</h1>
                                <p className="header-subtitle">Manage supplies and stock</p>
                            </div>
                            <button className="add-user-btn" onClick={() => setShowAddItem(true)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Add Item
                            </button>
                        </header>
                        <div className="table-container">
                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th>Item Name</th>
                                        <th>Quantity</th>
                                        <th>Unit</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inventory.map(item => (
                                        <tr key={item.id}>
                                            <td>{item.name}</td>
                                            <td>
                                                <span style={{ fontWeight: '600', fontSize: '15px' }}>{item.quantity}</span>
                                            </td>
                                            <td>{item.unit}</td>
                                            <td>
                                                {item.quantity <= item.min_quantity ? (
                                                    <span className="status-badge low-stock">Low Stock</span>
                                                ) : (
                                                    <span className="status-badge active">In Stock</span>
                                                )}
                                            </td>
                                            <td>
                                                {/* Simple quick restock for now */}
                                                <button
                                                    className="compact-action-btn"
                                                    onClick={async () => {
                                                        const q = prompt(`Restock ${item.name} by amount:`);
                                                        if (q && !isNaN(q)) {
                                                            await inventoryAPI.restock(item.id, parseInt(q));
                                                            loadInventory();
                                                        }
                                                    }}
                                                >
                                                    + Restock
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="users-section">
                        <header className="content-header">
                            <div>
                                <h1>Team Members</h1>
                                <p className="header-subtitle">Manage access to {currentCompany?.name}</p>
                            </div>
                            <button className="add-user-btn" onClick={() => setShowAddMember(true)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Add Member
                            </button>
                        </header>
                        <div className="table-container">
                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Joined Company</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.map(m => (
                                        <tr key={m.id} onClick={() => setSelectedMember(m)} style={{ cursor: 'pointer' }}>
                                            <td>
                                                <div className="user-cell">
                                                    <div className="table-avatar" style={{ background: m.avatar_color }}>
                                                        {m.name ? m.name.charAt(0).toUpperCase() : '?'}
                                                    </div>
                                                    <span>{m.name}</span>
                                                </div>
                                            </td>
                                            <td>{m.email}</td>
                                            <td>
                                                <span className={`role-badge ${getRoleBadgeClass(m.role)}`}>
                                                    {m.role?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td>{formatDate(m.created_at)}</td>
                                            <td>
                                                <div className="action-buttons" onClick={e => e.stopPropagation()}>
                                                    {m.user_id !== user.id && (
                                                        <select
                                                            className="role-select"
                                                            value={m.role}
                                                            onChange={(e) => handleRoleChange(m.id, e.target.value)}
                                                        >
                                                            <option value="worker">Worker</option>
                                                            <option value="manager">Manager</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                    )}
                                                    {m.user_id === user.id && (
                                                        <span className="you-badge">You</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'tasks' && (
                    <div className="tasks-section">
                        <header className="content-header">
                            <div>
                                <h1>Tasks & Activities</h1>
                                <p className="header-subtitle">Track work and visits</p>
                            </div>
                        </header>
                        <div className="table-container">
                            <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
                                No tasks found for this company
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Client Card Modal */}
            {selectedClient && (
                <ClientCard
                    client={selectedClient}
                    onClose={() => setSelectedClient(null)}
                    onUpdate={loadClients}
                />
            )}

            {/* Member Card Modal */}
            {selectedMember && (
                <MemberCard
                    member={selectedMember}
                    currentUser={{ user_id: user.id, role: currentMember.role }}
                    onClose={() => setSelectedMember(null)}
                    onUpdate={loadMembers}
                />
            )}

            {/* Add Client Modal */}
            {showAddClient && (
                <div className="modal-overlay" onClick={() => setShowAddClient(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add New Client</h2>
                            <button className="close-btn" onClick={() => setShowAddClient(false)}>×</button>
                        </div>
                        <form onSubmit={handleAddClient}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Client Name</label>
                                    <input
                                        type="text"
                                        value={newClient.name}
                                        onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                                        required
                                        placeholder="Full Name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Company</label>
                                    <input
                                        type="text"
                                        value={newClient.company}
                                        onChange={e => setNewClient({ ...newClient, company: e.target.value })}
                                        placeholder="Company Name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        value={newClient.email}
                                        onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                                        placeholder="Email Address"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input
                                        type="text"
                                        value={newClient.phone}
                                        onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                                        placeholder="Phone Number"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="cancel-btn" onClick={() => setShowAddClient(false)}>Cancel</button>
                                <button type="submit" className="submit-btn" disabled={submitting}>
                                    {submitting ? 'Adding...' : 'Add Client'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Warehouse Item Modal */}
            {showAddItem && (
                <div className="modal-overlay" onClick={() => setShowAddItem(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add New Item</h2>
                            <button className="close-btn" onClick={() => setShowAddItem(false)}>×</button>
                        </div>
                        <form onSubmit={handleAddItem}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Item Name</label>
                                    <input
                                        type="text"
                                        value={newItem.name}
                                        onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                        required
                                        placeholder="e.g. Paper Towels"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Initial Quantity</label>
                                    <input
                                        type="number"
                                        value={newItem.quantity}
                                        onChange={e => setNewItem({ ...newItem, quantity: e.target.value })}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Unit</label>
                                    <input
                                        type="text"
                                        value={newItem.unit}
                                        onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                                        placeholder="e.g. pcs, packs, kg"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="cancel-btn" onClick={() => setShowAddItem(false)}>Cancel</button>
                                <button type="submit" className="submit-btn" disabled={submitting}>Add Item</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Member Modal */}
            {showAddMember && (
                <div className="modal-overlay" onClick={() => setShowAddMember(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Invite Team Member</h2>
                            <button className="close-btn" onClick={() => setShowAddMember(false)}>×</button>
                        </div>
                        <form onSubmit={handleAddMember}>
                            <div className="modal-body">
                                <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                                    Add an existing user by email, or create a new account for them.
                                </p>
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        value={newMember.name}
                                        onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                                        required
                                        placeholder="Enter full name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        value={newMember.email}
                                        onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                                        required
                                        placeholder="Enter email address"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Role</label>
                                    <select
                                        className="form-input"
                                        style={{ width: '100%', padding: '12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                                        value={newMember.role}
                                        onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                                    >
                                        <option value="worker">Worker</option>
                                        <option value="manager">Manager</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Password (for new users)</label>
                                    <input
                                        type="password"
                                        value={newMember.password}
                                        onChange={e => setNewMember({ ...newMember, password: e.target.value })}
                                        minLength={6}
                                        placeholder="Set initial password"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="cancel-btn" onClick={() => setShowAddMember(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="submit-btn" disabled={submitting}>
                                    {submitting ? 'Add Member' : 'Add Member'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
