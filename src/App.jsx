import React, { useState, useEffect, useCallback } from 'react';
import ProfileEditor from './components/ProfileEditor';
import RegisterModal from './components/RegisterModal';

const API_URL = import.meta.env.VITE_API_URL || 'https://buddyfind-api.onrender.com';

// --- Login Component ---
const LoginModal = ({ handleLogin, loading, error, onRegisterClick }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const handleSubmit = (e) => { e.preventDefault(); handleLogin(email, password); };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50"> {/* Added bg */}
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg"> {/* Reduced shadow */}
                <h2 className="text-2xl font-bold text-center text-text-dark">ברוכים הבאים, מטפלים</h2>
                <p className="text-center text-sm text-text-light">התחברו או צרו חשבון כדי להתחיל.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="כתובת אימייל" className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue text-left" style={{ direction: 'ltr' }} /></div>
                    <div><input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="סיסמה" className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue text-left" style={{ direction: 'ltr' }} /></div>
                    <div className="flex justify-end text-sm"><a href="#" className="font-medium text-primary-blue hover:text-secondary-purple">שכחת סיסמה?</a></div>
                    {error && <p className="text-red-600 text-sm text-center p-2 bg-red-100 border border-red-300 rounded">{error}</p>} {/* Enhanced error style */}
                    <button type="submit" disabled={loading} className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-blue hover:bg-secondary-purple focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? <div className="spinner w-5 h-5 border-t-white border-r-white border-b-white border-l-primary-blue"></div> : 'התחברות'}
                    </button>
                </form>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">או</span></div>
                <button type="button" onClick={onRegisterClick} className="w-full flex justify-center py-2.5 px-4 border border-primary-blue text-primary-blue rounded-md shadow-sm text-sm font-medium hover:bg-primary-blue/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue"> {/* Changed style */}
                    חדש/ה ב-BuddyFind? יצירת חשבון
                </button>
            </div>
        </div>
    );
};

// --- Register Component (Assuming it exists and works) ---
// import RegisterModal from './components/RegisterModal'; // Make sure this path is correct

// --- Main App Component ---
const App = () => {
    const [view, setView] = useState('login');
    const [authToken, setAuthToken] = useState(null);
    const [loading, setLoading] = useState(false); // General loading state, maybe rename if needed elsewhere
    const [error, setError] = useState(null); // General error state
    const [user, setUser] = useState(null);

    const switchToRegister = useCallback(() => { setError(null); setView('register'); }, []);
    const switchToLogin = useCallback(() => { setError(null); setView('login'); }, []);

    const handleLogout = useCallback(() => {
        setAuthToken(null); setUser(null); localStorage.removeItem('therapist_token'); setView('login');
    }, []);

    // Effect 1: Check initial token
    useEffect(() => {
        const storedToken = localStorage.getItem('therapist_token');
        if (storedToken) {
            setAuthToken(storedToken);
            try {
                const decodedToken = JSON.parse(atob(storedToken.split('.')[1]));
                setUser({ userId: decodedToken.userId || 'unknown', professionalId: decodedToken.professionalId || null });
                setView('dashboard');
            } catch (e) { console.error("Token decode error on mount:", e); handleLogout(); }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Runs once

    // Effect 2: Sync state and localStorage, manage view transitions
    useEffect(() => {
        if (authToken) {
            localStorage.setItem('therapist_token', authToken);
            if (view !== 'dashboard') { setView('dashboard'); }
            if (!user) { // Ensure user state is set if token exists
                try {
                    const decodedToken = JSON.parse(atob(authToken.split('.')[1]));
                    setUser({ userId: decodedToken.userId || 'unknown', professionalId: decodedToken.professionalId || null });
                } catch (e) { console.error("Token decode error in effect 2:", e); handleLogout(); }
            }
        } else {
            localStorage.removeItem('therapist_token');
            if (view === 'dashboard') { setUser(null); setView('login'); }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authToken, view]); // Re-run if token or view changes

    const handleLogin = useCallback(async (email, password) => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${API_URL}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'ההתחברות נכשלה');
            setUser({ userId: data.userId, professionalId: data.professionalId || null });
            setAuthToken(data.token); // Triggers Effect 2
        } catch (err) { console.error('Login error:', err); setError(err.message); }
         finally { setLoading(false); }
    }, []); // Dependencies removed as setters are stable

    const handleRegister = useCallback(async (userData) => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${API_URL}/api/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userData) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `ההרשמה נכשלה`);
            alert('ההרשמה בוצעה בהצלחה! כעת ניתן להתחבר.');
            switchToLogin();
        } catch (err) { console.error('Registration error:', err); setError(err.message); }
         finally { setLoading(false); }
    }, [switchToLogin]);

    // --- Dashboard View ---
    const DashboardView = () => (
        <div className="min-h-screen p-4 md:p-8 bg-gray-100 text-right"> {/* Adjusted padding and bg */}
            <header className="max-w-7xl mx-auto flex justify-between items-center mb-6 md:mb-10 pb-4 border-b border-gray-300">
                <h1 className="text-2xl md:text-3xl font-bold text-text-dark">לוח בקרה למטפל</h1>
                <button onClick={handleLogout} className="text-sm px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition duration-150 ease-in-out">
                    התנתק
                </button>
            </header>
            <main className="max-w-7xl mx-auto">
                <ProfileEditor authToken={authToken} API_URL={API_URL} user={user} onLogout={handleLogout} />
                {/* TODO: Add Tabs Navigation here later */}
            </main>
        </div>
    );

    // --- Render Logic ---
    if (view === 'login') {
        return <LoginModal handleLogin={handleLogin} loading={loading} error={error} onRegisterClick={switchToRegister} />;
    }
    if (view === 'register') {
        return <RegisterModal handleRegister={handleRegister} loading={loading} error={error} onLoginClick={switchToLogin} />;
    }
    if (view === 'dashboard') {
        // Show loading only if user data isn't ready yet
        return user?.userId ? <DashboardView /> : <div className="flex justify-center items-center min-h-screen"><p className="text-xl">טוען נתונים...</p></div>;
    }

    // Fallback/Initial Loading
    return <div className="flex justify-center items-center min-h-screen"><p className="text-xl">טוען...</p></div>;
};

export default App;