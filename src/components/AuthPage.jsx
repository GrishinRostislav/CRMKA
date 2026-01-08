import React, { useState } from 'react';
import './AuthPage.css';
import { authAPI, companyAPI } from '../services/api';

const AuthPage = ({ onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        companyName: '' // New field
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            let userData;
            if (isLogin) {
                // Login Flow
                const loginData = await authAPI.login(formData.email, formData.password);
                userData = loginData.user;

                // Fetch companies to select one
                const { companies } = await companyAPI.getMyCompanies();

                if (companies.length > 0) {
                    const lastCompanyId = localStorage.getItem('companyId');
                    const targetCompany = companies.find(c => c.id == lastCompanyId) || companies[0];
                    localStorage.setItem('companyId', targetCompany.id);
                    // Pass userData to update App state immediately
                    onLoginSuccess(userData);
                } else {
                    setError('No companies found for this account.');
                }
            } else {
                // Register Flow
                const registerData = await authAPI.register(
                    formData.name,
                    formData.email,
                    formData.password,
                    formData.companyName
                );
                userData = registerData.user;
                // Pass userData to update App state immediately
                onLoginSuccess(userData);
            }
        } catch (err) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>CRMK</h1>
                    <p>{isLogin ? 'Welcome back' : 'Start your journey'}</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    {!isLogin && (
                        <>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Company Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="My Awesome Company"
                                    value={formData.companyName}
                                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                />
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            required
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                        {loading ? <div className="spinner-sm"></div> : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            className="toggle-auth-btn"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                                setFormData({ name: '', email: '', password: '', companyName: '' });
                            }}
                        >
                            {isLogin ? 'Sign Up' : 'Log In'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
