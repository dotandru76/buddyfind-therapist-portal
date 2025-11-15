// src/App.jsx (של buddyfind-therapist-portal) - SECURED
import React, { useState, useEffect, useCallback } from 'react';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import ProfileEditor from './components/ProfileEditor';
import TherapistReviewManager from './components/TherapistReviewManager';
import AdminDashboard from './components/AdminDashboard';
import LogContactForm from './components/LogContactForm';
import LoadingSpinner from './components/LoadingSpinner'; // ודא שהקובץ קיים

const API_URL = 'https://buddyfind-api.onrender.com';
const LOGO_URL = 'https://res.cloudinary.com/dermarx8t/image/upload/v1761900572/WellMatch_logo_ktdyfy.png';

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
                credentials: 'include' // <-- !!! שלח עוגיות למחיקה !!!
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
                credentials: 'include' // <-- !!! התיקון: שימוש בעוגיות !!!
            });
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    throw new Error('לא מחובר'); // שגיאה צפויה אם אין עוגייה
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
                credentials: 'include' // <-- !!! התיקון: קבלת עוגיית התחברות !!!
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
                // במקום לשמור טוקן, פשוט נטען את הפרופיל (מה שיאמת את הסשן)
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
        // ... (הקוד המקורי שלך ל-renderNav נשאר זהה) ...
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
                        onUpdateSuccess={() => fetchUserProfile()} // טען מחדש פרופיל אחרי עדכון
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
                        // העבר onLogout אם צריך לטפל ב-401
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
                    {user && ( // <-- שונה לבדיקת משתמש
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