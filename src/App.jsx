// src/App.jsx (של buddyfind-therapist-portal)
// --- גרסה V3.2 (תיקון בדיקת מזהה משתמש) ---

import React, { useState, useEffect } from 'react';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import ProfileEditor from './components/ProfileEditor';
import TherapistReviewManager from './components/TherapistReviewManager'; 
import AdminDashboard from './components/AdminDashboard';

const API_URL = 'https://buddyfind-api.onrender.com';
const LOGO_URL = 'https://res.cloudinary.com/dermarx8t/image/upload/v1761900572/WellMatch_logo_ktdyfy.png';

const App = () => {
    const [authToken, setAuthToken] = useState(() => localStorage.getItem('portal_token'));
    const [user, setUser] = useState(null);
    const [view, setView] = useState('login'); // login, register
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [nav, setNav] = useState('profile'); // ניווט פנימי למשתמש מחובר

    // --- טעינת פרטי משתמש ---
    const fetchUserProfile = async (token) => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${API_URL}/api/professionals/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    throw new Error('פג תוקף, יש להתחבר מחדש.');
                }
                const data = await res.json(); // נסה לקרוא את גוף השגיאה
                throw new Error(data.error || 'שגיאה בטעינת פרופיל');
            }
            const data = await res.json();
            setUser(data);
            if (data.user_type === 'admin') {
                setNav('admin'); // מנהל תמיד יתחיל בדשבורד
            } else {
                setNav('profile'); // מטפל תמיד יתחיל בפרופיל
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
            handleLogout(); // התנתק אם יש שגיאה
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authToken) {
            fetchUserProfile(authToken);
        } else {
            setView('login');
            setUser(null);
        }
    }, [authToken]);

    // --- טיפול באימות ---
    const handleAuth = async (credentials, isRegister = false) => {
        setLoading(true); setError(null);
        const endpoint = isRegister ? '/api/register' : '/api/login';
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'הפעולה נכשלה');
            }

            if (isRegister) {
                alert('הרשמה בוצעה בהצלחה! אנא התחבר.');
                setView('login');
            } else {
                if (data.userType !== 'professional' && data.userType !== 'admin') {
                    throw new Error('גישה מורשית למטפלים ומנהלים בלבד.');
                }
                localStorage.setItem('portal_token', data.token);
                setAuthToken(data.token);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('portal_token');
        setAuthToken(null);
        setUser(null);
        setView('login');
        setNav('profile');
    };

    // --- ניווט פנימי ---
    const renderNav = () => {
        if (!user) return null;
        const isAdmin = user.user_type === 'admin';
        // --- !!! התיקון כאן: בודק user.id (מזהה מטפל) במקום professionalId ---
        const hasProfile = user.id !== null; 

        return (
            <nav className="flex justify-center gap-6 mb-8 border-b border-gray-200">
                {isAdmin && (
                    <button 
                        onClick={() => setNav('admin')}
                        className={`py-4 px-2 text-sm font-semibold ${nav === 'admin' ? 'text-primary-blue border-b-2 border-primary-blue' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        לוח בקרה (Admin)
                    </button>
                )}
                
                {hasProfile && (
                    <>
                        <button 
                            onClick={() => setNav('profile')}
                            className={`py-4 px-2 text-sm font-semibold ${nav === 'profile' ? 'text-primary-blue border-b-2 border-primary-blue' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            עריכת פרופיל
                        </button>
                        <button 
                            onClick={() => setNav('reviews')}
                            className={`py-4 px-2 text-sm font-semibold ${nav === 'reviews' ? 'text-primary-blue border-b-2 border-primary-blue' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            ניהול חוות דעת
                        </button>
                    </>
                )}
            </nav>
        );
    };

    // --- הצגת תוכן ---
    const renderContent = () => {
        if (loading && !user) return <div className="text-center p-10"><div className="spinner"></div></div>;
        if (!authToken || !user) {
            return (
                <div>
                    {view === 'login' ? (
                        <LoginModal 
                            handleLogin={handleAuth} 
                            loading={loading} 
                            onRegisterClick={() => { setView('register'); setError(null); }} 
                        />
                    ) : (
                        <RegisterModal 
                            handleRegister={(creds) => handleAuth(creds, true)} 
                            loading={loading} 
                            onLoginClick={() => { setView('login'); setError(null); }} 
                        />
                    )}
                </div>
            );
        }

        // --- תצוגה למשתמש מחובר (מטפל/מנהל) ---
        return (
            <div className="w-full">
                {renderNav()}
                {error && <div className="p-4 mb-4 text-red-700 bg-red-100 border border-red-400 rounded text-right">{error}</div>}
                
                {/* --- !!! התיקון כאן: בודק user.id (מזהה מטפל) וגם nav --- */}
                {user.id && nav === 'profile' && (
                    <ProfileEditor 
                        authToken={authToken} 
                        API_URL={API_URL} 
                        user={user}
                        onUpdateSuccess={() => fetchUserProfile(authToken)}
                        onLogout={handleLogout}
                    />
                )}
                
                {user.id && nav === 'reviews' && (
                    <TherapistReviewManager 
                        authToken={authToken} 
                        API_URL={API_URL} 
                        onLogout={handleLogout}
                    />
                )}
                
                {user.user_type === 'admin' && nav === 'admin' && (
                     <AdminDashboard 
                        authToken={authToken} 
                        API_URL={API_URL} 
                        user={user}
                        onLogout={handleLogout}
                    />
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 text-text-dark">
            <header className="bg-white shadow-sm">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-20">
                    <img src={LOGO_URL} alt="WellMatch Logo" className="h-12" />
                    {authToken && (
                        <button 
                            onClick={handleLogout}
                            className="text-sm font-medium text-gray-500 hover:text-red-600"
                        >
                            התנתק
                        </button>
                    )}
                </div>
            </header>
            
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {renderContent()}
            </main>
        </div>
    );
};

export default App;