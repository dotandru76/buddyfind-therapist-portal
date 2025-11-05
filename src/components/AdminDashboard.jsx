// src/components/AdminDashboard.jsx
// --- גרסה V6.1 (תיקון באג snake_case) ---

import React, { useState, useEffect, useCallback } from 'react';
import ActionModal from './ActionModal'; 
import RegistrationsGraph from './RegistrationsGraph'; 

// =================================================================
// --- רכיבי עזר פנימיים (כדי למנוע יצירת קבצים קטנים) ---
// =================================================================

const LoadingSpinner = () => (
    <div className="text-center p-5">
        <div className="spinner w-8 h-8 mx-auto border-t-primary-blue border-r-primary-blue"></div>
    </div>
);

const AlertMessage = ({ type, message, onDismiss }) => {
    if (!message) return null;
    const baseClasses = "px-4 py-3 rounded relative mb-4 text-right";
    const typeClasses = type === 'success' 
        ? "bg-green-100 border-green-400 text-green-700" 
        : "bg-red-100 border-red-400 text-red-700";
    
    return (
        <div className={`${baseClasses} ${typeClasses}`} role="alert">
            <span className="block sm:inline">{message}</span>
            {onDismiss && (
                <span className="absolute top-0 bottom-0 left-0 px-4 py-3 cursor-pointer" onClick={onDismiss}>
                    <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                </span>
            )}
        </div>
    );
};

const ActionCard = ({ title, value, color, onClick }) => {
    const colorClasses = {
        yellow: 'from-yellow-50 to-yellow-100 border-yellow-300 text-yellow-800 hover:shadow-yellow-200',
        green: 'from-green-50 to-green-100 border-green-300 text-green-800 hover:shadow-green-200',
        blue: 'from-blue-50 to-blue-100 border-blue-300 text-blue-800 hover:shadow-blue-200',
        red: 'from-red-50 to-red-100 border-red-300 text-red-800 hover:shadow-red-200',
        purple: 'from-purple-50 to-purple-100 border-purple-300 text-purple-800 hover:shadow-purple-200', 
    };

    return (
        <button
            onClick={onClick}
            className={`p-6 border rounded-lg bg-gradient-to-br transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg ${colorClasses[color]}`}
        >
            <div className="text-5xl font-extrabold">{value}</div>
            <div className="text-lg font-semibold mt-2">{title}</div>
        </button>
    );
};

// =================================================================
// --- הרכיב הראשי: AdminDashboard ---
// =================================================================

const AdminDashboard = ({ authToken, API_URL, user, onLogout }) => {
    const [stats, setStats] = useState({ 
        totalUsers: 0, 
        totalProfessionals: 0, 
        totalPendingReviews: 0,
        totalDisputedReviews: 0 
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentModal, setCurrentModal] = useState(null); // 'reviews', 'professionals', 'users', 'disputed'
    const [adminView, setAdminView] = useState('main'); 

    // --- !!! התיקון הקריטי כאן (בדיקת snake_case) !!! ---
    if (user?.user_type !== 'admin') {
        return <div className="text-center p-10 text-red-600">גישה נדחתה. נדרשת הרשאת מנהל.</div>;
    }

    // --- קריאת API סטטיסטית ראשונית ---
    const fetchAdminStats = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const statsRes = await fetch(`${API_URL}/api/admin/stats`, { 
                headers: { 'Authorization': `Bearer ${authToken}` } 
            });
            if (!statsRes.ok) {
                 if (statsRes.status === 403) onLogout();
                 throw new Error('שגיאה בטעינת נתונים סטטיסטיים.');
            }
            const data = await statsRes.json();
            setStats(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [authToken, API_URL, onLogout]); // 'user' הוסר מכאן כי הבדיקה מתבצעת למעלה

    useEffect(() => {
        fetchAdminStats();
    }, [fetchAdminStats]);

    // --- פונקציה שתטפל בעדכון ה-API לאחר פעולה במודאל ---
    const handleActionComplete = () => {
        fetchAdminStats(); // רענון הנתונים הסטטיסטיים
    };

    if (loading) { return <LoadingSpinner />; }
    
    return (
        <div className="space-y-8 md:space-y-12">
            <h2 className="text-3xl font-bold text-primary-blue text-center">🏆 לוח בקרה למנהל (Admin Dashboard)</h2>
            
            {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}

            {/* --- הצגה מותנית: דשבורד ראשי או מנהל שאלונים --- */}
            {adminView === 'main' ? (
                <>
                    {/* 1. רכיבי הפעולה - 5 כרטיסיות */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                        <ActionCard
                            title="חוות דעת ממתינות"
                            value={stats.totalPendingReviews}
                            color="yellow"
                            onClick={() => setCurrentModal('reviews')}
                        />
                        <ActionCard
                            title="ערעורים לטיפול"
                            value={stats.totalDisputedReviews}
                            color="red"
                            onClick={() => setCurrentModal('disputed')}
                        />
                        <ActionCard
                            title="מטפלים פעילים"
                            value={stats.totalProfessionals}
                            color="green"
                            onClick={() => setCurrentModal('professionals')}
                        />
                        <ActionCard
                            title="משתמשים רשומים"
                            value={stats.totalUsers}
                            color="blue"
                            onClick={() => setCurrentModal('users')}
                        />
                        <ActionCard
                            title="ניהול שאלונים"
                            value="+"
                            color="purple"
                            onClick={() => setAdminView('questionnaires')}
                        />
                    </div>
                    
                    {/* 2. אזור הגרפים */}
                    <div className="p-6 bg-white rounded-lg shadow">
                        <h3 className="text-xl font-bold text-text-dark mb-4 border-b pb-2">נרשמים חדשים (30 יום אחרונים)</h3>
                        <RegistrationsGraph authToken={authToken} API_URL={API_URL} />
                    </div>
                </>
            ) : (
                // --- הצגת מנהל השאלונים ---
                <QuestionnaireManager 
                    authToken={authToken} 
                    API_URL={API_URL} 
                    onBack={() => setAdminView('main')} 
                />
            )}
            
            {/* 3. המודאל החכם שמופעל לפי לחיצה */}
            {currentModal && (
                <ActionModal
                    modalType={currentModal}
                    authToken={authToken}
                    API_URL={API_URL}
                    onClose={() => setCurrentModal(null)}
                    onActionComplete={handleActionComplete}
                />
            )}
        </div>
    );
};

export default AdminDashboard;