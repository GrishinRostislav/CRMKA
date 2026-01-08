import React, { useState, useEffect } from 'react';
import './ClientCard.css';
import { inventoryAPI, activitiesAPI } from '../services/api';

const ClientCard = ({ client, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState('inventory'); // Default to inventory for this task
    const [history, setHistory] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [loading, setLoading] = useState(false);

    // Take Item State
    const [showTakeItem, setShowTakeItem] = useState(false);
    const [selectedItem, setSelectedItem] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (activeTab === 'inventory') {
            loadHistory();
            loadInventoryItems();
        }
    }, [activeTab]);

    const loadHistory = async () => {
        try {
            const data = await inventoryAPI.getClientHistory(client.id);
            setHistory(data.history);
        } catch (err) {
            console.error(err);
        }
    };

    const loadInventoryItems = async () => {
        try {
            const data = await inventoryAPI.getAll();
            setInventoryItems(data.items);
        } catch (err) {
            console.error(err);
        }
    };

    const handleTakeItem = async (e) => {
        e.preventDefault();
        if (!selectedItem || quantity <= 0) return;

        setSubmitting(true);
        try {
            await inventoryAPI.use(selectedItem, parseInt(quantity), client.id);
            await loadHistory(); // Refresh history
            await loadInventoryItems(); // Refresh stock counts in selector
            setShowTakeItem(false);
            setQuantity(1);
            setSelectedItem('');
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const getSelectedItemMax = () => {
        const item = inventoryItems.find(i => i.id == selectedItem);
        return item ? item.quantity : 1;
    };

    return (
        <div className="client-card-overlay" onClick={onClose}>
            <div className="client-card" onClick={e => e.stopPropagation()}>
                <div className="card-header">
                    <div className="client-header-info">
                        <div className="client-avatar-lg">
                            {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2>{client.name}</h2>
                            <p className="subtitle">{client.company} • {client.status}</p>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="card-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                        onClick={() => setActiveTab('info')}
                    >
                        Info
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
                        onClick={() => setActiveTab('inventory')}
                    >
                        Warehouse Items
                    </button>
                </div>

                <div className="card-content">
                    {activeTab === 'info' && (
                        <div className="info-tab">
                            <div className="info-row">
                                <label>Email:</label>
                                <span>{client.email || '-'}</span>
                            </div>
                            <div className="info-row">
                                <label>Phone:</label>
                                <span>{client.phone || '-'}</span>
                            </div>
                            <div className="info-row">
                                <label>Address:</label>
                                <span>{client.address || '-'}</span>
                            </div>
                        </div>
                    )}

                    {activeTab === 'inventory' && (
                        <div className="inventory-tab">
                            <div className="tab-actions">
                                <h3>Items Used</h3>
                                <button className="primary-btn sm" onClick={() => setShowTakeItem(true)}>
                                    + Take Item
                                </button>
                            </div>

                            {/* Take Item Form (Inline or Overlay) */}
                            {showTakeItem && (
                                <div className="take-item-form-container">
                                    <form onSubmit={handleTakeItem} className="take-item-form">
                                        <h4>Select Item to Take</h4>
                                        <div className="form-row">
                                            <select
                                                value={selectedItem}
                                                onChange={e => setSelectedItem(e.target.value)}
                                                required
                                            >
                                                <option value="">Select an item...</option>
                                                {inventoryItems.map(item => (
                                                    <option key={item.id} value={item.id} disabled={item.quantity <= 0}>
                                                        {item.name} ({item.quantity} {item.unit} available)
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                type="number"
                                                min="1"
                                                max={getSelectedItemMax()}
                                                value={quantity}
                                                onChange={e => setQuantity(e.target.value)}
                                                placeholder="Qty"
                                                required
                                            />
                                            <button type="submit" disabled={submitting}>Take</button>
                                            <button type="button" className="cancel" onClick={() => setShowTakeItem(false)}>Cancel</button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            <div className="inventory-history">
                                {history.length === 0 ? (
                                    <p className="no-data">No items taken yet.</p>
                                ) : (
                                    <table className="history-table">
                                        <thead>
                                            <tr>
                                                <th>Item</th>
                                                <th>Qty</th>
                                                <th>Taken By</th>
                                                <th>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {history.map(record => (
                                                <tr key={record.id}>
                                                    <td>{record.item_name}</td>
                                                    <td>{record.quantity} {record.unit}</td>
                                                    <td>{record.user_name}</td>
                                                    <td>{new Date(record.created_at).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientCard;
