import React, { useState } from 'react';
import './ClientCard.css'; // Reuse basic modal styles
import { usersAPI } from '../services/api';

const MemberCard = ({ member, currentUser, onClose, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: member.name || '',
        phone: member.phone || '', // Need to ensure backend returns this
        position: member.position || ''
    });
    const [saving, setSaving] = useState(false);

    // Permission Check: Admin/Manager can edit anyone; Worker can only edit self
    const canEdit = ['admin', 'manager', 'super_admin'].includes(currentUser.role) || currentUser.user_id === member.user_id;

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await usersAPI.updateMember(member.id, formData);
            onUpdate(); // Reload dashboard data
            setIsEditing(false);
        } catch (err) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="client-card-overlay" onClick={onClose}>
            <div className="client-card" onClick={e => e.stopPropagation()} style={{ height: 'auto', maxHeight: '90vh' }}>
                <div className="card-header">
                    <div className="client-header-info">
                        <div className="client-avatar-lg" style={{ background: member.avatar_color }}>
                            {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            {isEditing ? (
                                <input
                                    className="edit-input-lg"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Full Name"
                                />
                            ) : (
                                <h2>{member.name}</h2>
                            )}
                            <p className="subtitle">{member.role.replace('_', ' ')}</p>
                        </div>
                    </div>
                    <div className="header-actions">
                        {canEdit && !isEditing && (
                            <button className="icon-btn" onClick={() => setIsEditing(true)} title="Edit Profile">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                        )}
                        <button className="close-btn" onClick={onClose}>×</button>
                    </div>
                </div>

                <div className="card-content">
                    <form onSubmit={handleSave} className="member-details-form">
                        <div className="info-row">
                            <label>Email:</label>
                            <span>{member.email}</span>
                        </div>

                        <div className="info-row">
                            <label>Position:</label>
                            {isEditing ? (
                                <input
                                    value={formData.position}
                                    onChange={e => setFormData({ ...formData, position: e.target.value })}
                                    placeholder="e.g. Sales Manager"
                                    className="edit-input"
                                />
                            ) : (
                                <span>{member.position || '-'}</span>
                            )}
                        </div>

                        <div className="info-row">
                            <label>Phone:</label>
                            {isEditing ? (
                                <input
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+1 234 567 890"
                                    className="edit-input"
                                />
                            ) : (
                                <span>{member.phone || '-'}</span>
                            )}
                        </div>

                        <div className="info-row">
                            <label>Joined:</label>
                            <span>{new Date(member.created_at).toLocaleDateString()}</span>
                        </div>

                        {isEditing && (
                            <div className="form-actions" style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                                <button type="submit" className="submit-btn" disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default MemberCard;
