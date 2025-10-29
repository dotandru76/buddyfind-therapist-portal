// src/components/LoginModal.jsx
import React, { useState } from 'react';

const LoginModal = ({ handleLogin, loading, onRegisterClick }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!email || !password) {
            alert('Please enter both email and password.'); // Simple validation
            return;
        }
        handleLogin({ email, password });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-2xl">
                <h2 className="text-2xl font-bold text-center text-text-dark">התחברות לפורטל המטפלים</h2>
                <p className="text-center text-sm text-text-light">הזן את פרטי ההתחברות שלך.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email-login" className="sr-only">Email address</label>
                        <input
                            id="email-login" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="כתובת אימייל"
                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue text-left"
                            style={{ direction: 'ltr' }} autoComplete="email"
                        />
                    </div>
                    <div>
                        <label htmlFor="password-login" className="sr-only">Password</label>
                        <input
                            id="password-login" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="סיסמה"
                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue text-left"
                            style={{ direction: 'ltr' }} autoComplete="current-password"
                        />
                    </div>
                    <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-blue hover:bg-secondary-purple focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? <div className="spinner w-5 h-5 border-t-white border-r-white border-b-white border-l-primary-blue"></div> : 'התחבר'}
                    </button>
                </form>

                <div className="text-center text-sm">
                    <p className="text-text-light"> אין לך חשבון?{' '} <button onClick={onRegisterClick} className="font-medium text-primary-blue hover:text-secondary-purple underline"> הרשמה למטפלים </button> </p>
                </div>
            </div>
        </div>
    );
};

export default LoginModal;