// src/App.jsx (של buddyfind-therapist-portal) - SECURED
import React, { useState, useEffect, useCallback } from 'react';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import ProfileEditor from './components/ProfileEditor';
import TherapistReviewManager from './components/TherapistReviewManager';
import AdminDashboard from './components/AdminDashboard';
import LogContactForm from './components/LogContactForm';
import LoadingSpinner from './components/LoadingSpinner'; // ייבוא רכיב טעינה

const API_URL = 'https://buddyfind-api.onrender.com';
const LOGO_URL = 'https://res.cloudinary.com/dermarx8t/image/upload/v1761900572/WellMatch_logo_ktdyfy.png';

const App = () => {
    // --- !!! שינוי: authToken הוסר. user הוא המקור היחיד לאמת ---
    const [user, setUser] = useState(null);
    const [view, setView] = useState('login'); // login, register
    const [loading, setLoading] = useState(true); // מתחיל בטעינה לבדיקת סשן
    const [authError, setAuthError] = useState(null);
    const [nav, setNav] = useState('profile'); 

    // --- טעינת פרטי משתמש (משמש גם כבדיקת סשן) ---
    const fetchUserProfile = useCallback(async () => {
        setLoading(true); setAuthError(null);
        try {
            const res = await fetch(`${API_URL}/api/professionals/me`, {
                credentials: 'include' // <-- !!! שימוש בעוגיות !!!
                // headers: { 'Authorization': `Bearer ${token}` } <-- הוסר
            });
            if (!res.ok) {
                // אם אין הרשאה (401/403) או לא נמצא (404), המשתמש לא מחובר
                throw new Error('לא מחובר');
            }
            const data = await res.json();
            setUser(data);
            if (data.user_type === 'admin') {
                setNav('admin'); 
            } else {
                setNav('profile'); 
            }
        } catch (err) {
            setUser(null); // אפס משתמש
            setView('login'); // החזר למסך התחברות
        } finally {
            setLoading(false);
        }
    }, []);

    // --- !!! שינוי: בדיקת סשן בטעינה ראשונית ---
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
                credentials: 'include' // <-- !!! הוספה: קבלת עוגיית ההתחברות !!!
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
                // --- !!! שינוי: במקום לשמור טוקן, טוענים את הפרופיל ---
                await fetchUserProfile();
            }
        } catch (err) {
            setAuthError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
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
        }
    };

    // ... (renderNav ללא שינוי) ...

    // --- הצגת תוכן ---
    const renderContent = () => {
        if (loading) { // מסך טעינה כללי בזמן בדיקת סשן
            return <div className="text-center p-10"><LoadingSpinner /></div>;
        }

        if (!user) { // אם אין משתמש, הצג טפסי אימות
            return (
                <div>
                    {view === 'login' ? (
                        <LoginModal 
                            handleLogin={handleAuth} 
                            loading={loading} 
                            onRegisterClick={() => { setView('register'); setAuthError(null); }}
                            authError={authError} // <-- העבר שגיאה
                        />
                    ) : (
                        <RegisterModal 
                            handleRegister={(creds) => handleAuth(creds, true)} 
                            loading={loading} 
                            onLoginClick={() => { setView('login'); setAuthError(null); }} 
                            authError={authError} // <-- העבר שגיאה
                        />
                    )}
                </div>
            );
        }

        // --- תצוגה למשתמש מחובר (מטפל/מנהל) ---
        return (
            <div className="w-full">
                {renderNav()}
                {authError && <div className="p-4 mb-4 text-red-700 bg-red-100 border border-red-400 rounded text-right">{authError}</div>}
                
                {/* --- !!! שינוי: כל הרכיבים אינם מקבלים יותר authToken --- */}
                
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
        // ... ( JSX של Header ו-main ללא שינוי) ...
        <div className="min-h-screen bg-gray-50 text-text-dark">
            <header className="bg-white shadow-sm">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-20">
                    <img src={LOGO_URL} alt="WellMatch Logo" className="h-12" />
                    {user && ( // <-- שונה לבדיקת משתמש במקום טוקן
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