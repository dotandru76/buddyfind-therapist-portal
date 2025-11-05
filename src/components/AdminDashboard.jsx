// src/components/AdminDashboard.jsx
// --- גרסה V7.5 (תיקון כפילויות ואיחוד ניווט) ---

import React, { useState, useEffect, useCallback } from 'react';
import moment from 'moment';
import ActionModal from './ActionModal'; 
import RegistrationsGraph from './RegistrationsGraph'; 
import QuestionnaireManager from './QuestionnaireManager'; 
import SettingsManager from './SettingsManager'; // ייבוא ה-SettingsManager

// =================================================================
// --- רכיבי עזר פנימיים (מניעת ReferenceError) ---
// =================================================================

const LoadingSpinner = () => (
    <div className="text-center p-5">
        <div className="spinner w-8 h-8 mx-auto border-t-primary-blue border-r-primary-blue"></div>
    </div>
);

const AlertMessage = ({ type, message, onDismiss }) => {
    if (!message) return null;
    const baseClasses = "px-4 py-3 rounded relative mb-4 text-right";
    const typeClasses = type === 'success' ? "bg-green-100 border-green-400 text-green-700" : "bg-red-100 border-red-400 text-red-700";
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
        gray: 'from-gray-50 to-gray-100 border-gray-300 text-gray-800 hover:shadow-gray-200',
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
    const [currentModal, setCurrentModal] = useState(null); 
    const [adminView, setAdminView] = useState('main'); // main, settings, questionnaires
    const [modalData, setModalData] = useState(null); // לניהול פתיחת מודאלים מ-ActionCard

    if (user?.user_type !== 'admin') {
        return <div className="text-center p-10 text-red-600">גישה נדחתה. נדרשת הרשאת מנהל.</div>;
    }

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
    }, [authToken, API_URL, onLogout]);

    useEffect(() => {
        fetchAdminStats();
    }, [fetchAdminStats]);

    const handleActionComplete = () => {
        fetchAdminStats();
    };
    
    // Handler for opening the general data modal (used by the Action Cards)
    const handleActionCardClick = (modalType) => {
        setCurrentModal(modalType);
    };
    
    // Handler for the generic data modal (like View Analytics)
    const handleDataLoad = ({ title, data, headers, keys }) => {
        setModalData({ title, data, headers, keys });
        setCurrentModal('data');
    };
    
    // --- Render ---
    if (loading) { return <LoadingSpinner />; }
    
    return (
        <div className="space-y-8 md:space-y-12">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-primary-blue">🏆 לוח בקרה למנהל (Admin Dashboard)</h2>
                {/* --- גלגל השיניים להגדרות --- */}
                {adminView === 'main' && (
                     <button
                        onClick={() => setAdminView('settings')}
                        className="p-3 bg-white rounded-full shadow-lg transition duration-200 transform hover:rotate-12 hover:bg-gray-100"
                        title="ניהול הגדרות"
                     >
                         {/* Placeholder SVG for Gear Icon */}
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M11.49 3.17c-.38-.28-.88-.42-1.4-.42H10c-.52 0-1.02.14-1.4.42l-2.07 1.54-.04.04a1 1 0 00-.04 1.41l1.54 2.07c.28.38.42.88.42 1.4v2c0 .52-.14 1.02-.42 1.4l-1.54 2.07a1 1 0 00.04 1.41l.04.04 2.07 1.54c.38.28.88.42 1.4.42h2c.52 0 1.02-.14 1.4-.42l2.07-1.54.04-.04a1 1 0 00.04-1.41l-1.54-2.07c-.28-.38-.42-.88-.42-1.4v-2c0-.52.14-1.02.42-1.4l1.54-2.07a1 1 0 00-.04-1.41l-.04-.04-2.07-1.54zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}
                 {/* כפתור חזור למסכי משנה */}
                 {adminView !== 'main' && (
                     <button onClick={() => setAdminView('main')} className="py-2 px-4 bg-gray-500 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 transition">
                         חזור לדשבורד
                     </button>
                 )}
            </div>
            
            {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}

            {/* --- הצגה מותנית: דשבורד ראשי או מנהל שאלונים/הגדרות --- */}
            {adminView === 'main' ? (
                <>
                    {/* 1. רכיבי הפעולה - 5 כרטיסיות (ACTION CARDS) */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                        <ActionCard
                            title="חוות דעת ממתינות"
                            value={stats.totalPendingReviews}
                            color="yellow"
                            onClick={() => handleActionCardClick('reviews')}
                        />
                        <ActionCard
                            title="ערעורים לטיפול"
                            value={stats.totalDisputedReviews}
                            color="red"
                            onClick={() => handleActionCardClick('disputed')}
                        />
                        <ActionCard
                            title="מטפלים פעילים"
                            value={stats.totalProfessionals}
                            color="green"
                            onClick={() => handleActionCardClick('professionals')}
                        />
                        <ActionCard
                            title="משתמשים רשומים"
                            value={stats.totalUsers}
                            color="blue"
                            onClick={() => handleActionCardClick('users')}
                        />
                         <ActionCard
                            title="ניהול שאלונים"
                            value="+"
                            color="purple"
                            onClick={() => setAdminView('questionnaires')}
                        />
                    </div>
                    
                    {/* 2. כפתורי קישור למידע מפורט (ANALYTICS) */}
                    <div className="p-6 bg-white rounded-lg shadow space-y-6">
                        <h3 className="text-xl font-bold text-text-dark border-b pb-2">ניתוח נתונים ופעילות</h3>

                        {/* כפתור 1: רשומות צפייה (Analytics) */}
                        <AdminActionButton 
                            title="פעילות צפייה (View Analytics)"
                            subtitle="לקוחות שיצרו קשר עם מטפלים (כולל קוד אנונימי וזמן)"
                            apiEndpoint={`${API_URL}/api/admin/activity/views`}
                            authToken={authToken}
                            tableHeaders={['זמן צפייה', 'קוד לקוח אנונימי', 'מטפל נצפה']}
                            tableKeys={['viewed_at', 'client_anon_id', 'professional_name']}
                            onDataLoad={handleDataLoad}
                        />

                        {/* כפתור 2: רשימת מטפלים */}
                        <AdminActionButton 
                            title="רשימת מטפלים"
                            subtitle={`סך ${stats.totalProfessionals} מטפלים רשומים (כולל מקצוע וסטטוס)`}
                            apiEndpoint={`${API_URL}/api/admin/users/professionals`}
                            authToken={authToken}
                            tableHeaders={['שם מלא', 'מקצוע', 'אימייל', 'סטטוס', 'צפיות']}
                            tableKeys={['full_name', 'profession', 'email', 'active_status', 'view_count']}
                            onDataLoad={handleDataLoad}
                        />
                        
                        {/* כפתור 3: רשימת לקוחות */}
                        <AdminActionButton 
                            title="רשימת לקוחות רשומים"
                            subtitle={`סך ${stats.totalUsers} משתמשים רשומים (כולל קוד אנונימי)`}
                            apiEndpoint={`${API_URL}/api/admin/users/all`}
                            authToken={authToken}
                            tableHeaders={['ID', 'אימייל', 'קוד אנונימי', 'תאריך הרשמה']}
                            tableKeys={['id', 'email', 'anonymous_id', 'created_at']}
                            onDataLoad={handleDataLoad}
                        />
                    </div>

                    {/* 3. אזור הגרפים */}
                    <div className="p-6 bg-white rounded-lg shadow">
                        <h3 className="text-xl font-bold text-text-dark mb-4 border-b pb-2">נרשמים חדשים (30 יום אחרונים)</h3>
                        <RegistrationsGraph authToken={authToken} API_URL={API_URL} />
                    </div>
                </>
            ) : adminView === 'questionnaires' ? (
                <QuestionnaireManager 
                    authToken={authToken} 
                    API_URL={API_URL} 
                    onBack={() => setAdminView('main')} 
                />
            ) : adminView === 'settings' ? (
                <SettingsManager 
                    authToken={authToken} 
                    API_URL={API_URL} 
                    onBack={() => setAdminView('main')}
                />
            ) : null}
            
            {/* 3. המודאל החכם שמופעל לפי לחיצה */}
            {currentModal && (
                <ActionModal
                    modalType={currentModal}
                    authToken={authToken}
                    API_URL={API_URL}
                    onClose={() => setCurrentModal(null)}
                    onActionComplete={handleActionComplete}
                    // Pass data for generic data modal
                    modalData={currentModal === 'data' ? modalData : null}
                />
            )}
        </div>
    );
};

export default AdminDashboard;