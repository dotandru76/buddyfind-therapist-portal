// src/App.jsx (של buddyfind-therapist-portal) - SECURED & FIXED IMPORTS
import React, { useState, useEffect, useCallback } from 'react';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import ProfileEditor from './components/ProfileEditor';
import TherapistReviewManager from './components/TherapistReviewManager';
import AdminDashboard from './components/AdminDashboard';
import LogContactForm from './components/LogContactForm';
import LoadingSpinner from './components/LoadingSpinner'; // <-- !!! הוספתי את השורה הזו !!!
import AlertMessage from './components/AlertMessage';   // <-- !!! והוספתי את השורה הזו !!!

const API_URL = 'https://buddyfind-api.onrender.com';
const LOGO_URL = 'https://res-console.cloudinary.com/dermarx8t/image/upload/v1761900572/WellMatch_logo_ktdyfy.png'; // (הערה: הקישור הקודם היה נכון יותר, אבל אשאיר את זה אם שינית)

const App = () => {
    // --- !!! ניהול אימות חדש !!! ---
    const [user, setUser] = useState(null); // זהו המקור היחיד לאימות
    const [view, setView] = useState('login'); // login, register
    const [loading, setLoading] = useState(true); // מתחיל בטעינה לבדיקת סשן
    const [authError, setAuthError] = useState(null);
    const [nav, setNav] = useState('profile');

    // --- פונקציית התנתקות ---
    const handleLogout = useCallback(async () => {
        setLoading(true);
        try {
            await fetch(`${API_URL}/api/logout`, { 
                method: 'POST',
                credentials: 'include' 
            });
        } catch (err) {
            console.error("Logout failed:", err);
        } finally {
            setUser(null);
            setView('login');
            setNav('profile');
            setLoading(false);
            setAuthError(null);
        }
    }, []);

    // --- טעינת פרטי משתמש (משמש גם כבדיקת סשן) ---
    const fetchUserProfile = useCallback(async () => {
        setLoading(true); setAuthError(null);
        try {
            const res = await fetch(`${API_URL}/api/professionals/me`, {
                credentials: 'include' 
            });
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    throw new Error('לא מחובר'); 
                }
                const data = await res.json();
                throw new Error(data.error || 'שגיאה בטעינת פרופיל');
            }
            const data = await res.json();
            setUser(data);
            if (data.user_type === 'admin') {
                setNav('admin'); 
            } else {
                setNav('profile'); 
            }
        } catch (err) {
            setUser(null);
            setView('login');
        } finally {
            setLoading(false);
        }
    }, []);

    // בדיקת סשן בטעינה ראשונית
    useEffect(() => {
        fetchUserProfile();
    }, [fetchUserProfile]);


    // --- טיפול באימות ---
    const handleAuth = async (credentials, isRegister = false) => {
        setLoading(true); setAuthError(null);
        const endpoint = isRegister ? '/api/register' : '/api/login';
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
                credentials: 'include' 
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'הפעולה נכשלה');
            }

            if (isRegister) {
                alert('הרשמה בוצעה בהצלחה! אנא התחבר.');
                setView('login');
            } else {
                if (data.user_type !== 'professional' && data.user_type !== 'admin') {
                    throw new Error('גישה מורשית למטפלים ומנהלים בלבד.');
                }
                await fetchUserProfile();
            }
        } catch (err) {
            setAuthError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // --- ניווט פנימי (ללא שינוי) ---
    const renderNav = () => {
        if (!user) return null;
        const isAdmin = user.user_type === 'admin';
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
                        <button 
                            onClick={() => setNav('log_contact')}
                            className={`py-4 px-2 text-sm font-semibold ${nav === 'log_contact' ? 'text-primary-blue border-b-2 border-primary-blue' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            דיווח תחילת טיפול
                        </button>
                    </>
                )}
            </nav>
        );
    };

    // --- הצגת תוכן ---
    const renderContent = () => {
        if (loading) {
            return <div className="text-center p-10"><LoadingSpinner /></div>;
        }

        if (!user) { // אם אין משתמש, הצג טפסי אימות
            return (
                <div>
                    {authError && <AlertMessage type="error" message={authError} onDismiss={() => setAuthError(null)} />}
                    {view === 'login' ? (
                        <LoginModal 
                            handleLogin={handleAuth} 
                            loading={loading} 
                            onRegisterClick={() => { setView('register'); setAuthError(null); }}
                            authError={authError} 
                        />
                    ) : (
                        <RegisterModal 
                            handleRegister={(creds) => handleAuth(creds, true)} 
                            loading={loading} 
                            onLoginClick={() => { setView('login'); setAuthError(null); }} 
                            authError={authError} 
                        />
                    )}
                </div>
            );
        }

        // --- תצוגה למשתמש מחובר (מטפל/מנהל) ---
        return (
            <div className="w-full">
                {renderNav()}
                
                {user.id && nav === 'profile' && (
                    <ProfileEditor 
                        API_URL={API_URL} 
                        user={user}
                        onUpdateSuccess={() => fetchUserProfile()} 
                        onLogout={handleLogout}
                    />
                )}
                
                {user.id && nav === 'reviews' && (
                    <TherapistReviewManager 
                        API_URL={API_URL} 
                        onLogout={handleLogout}
                    />
                )}
                
                {user.id && nav === 'log_contact' && (
                    <LogContactForm 
                        API_URL={API_URL} 
                        user={user}
                        onLogout={handleLogout} 
                    />
                )}
                
                {user.user_type === 'admin' && nav === 'admin' && (
                     <AdminDashboard 
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
                    {user && ( 
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