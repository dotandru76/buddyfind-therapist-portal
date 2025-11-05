// src/components/AdminDashboard.jsx
// --- גרסה V7.3 (תיקון באג הסתרת כפתורים והוספת Settings) ---

import React, { useState, useEffect, useCallback } from 'react';
import ActionModal from './ActionModal'; 
import RegistrationsGraph from './RegistrationsGraph'; 
import QuestionnaireManager from './QuestionnaireManager'; 

// =================================================================
// --- רכיבי עזר פנימיים (הועברו לכאן כדי להימנע מריבוי קבצים קטנים) ---
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

// --- !!! רכיב ניהול הגדרות !!! ---
const SettingsManager = ({ authToken, API_URL, onBack }) => {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const fetchSettings = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${API_URL}/api/admin/app-settings`, { 
                headers: { 'Authorization': `Bearer ${authToken}` } 
            });
            if (!res.ok) throw new Error('שגיאה בטעינת הגדרות המערכת');
            const data = await res.json();
            setSettings(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [authToken, API_URL]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleSave = async (key) => {
        setSaving(true); setError(null); setMessage(null);
        const value = settings[key];
        
        if (!value || isNaN(parseInt(value, 10)) || parseInt(value, 10) < 1) {
            setError('הערך חייב להיות מספר חיובי.');
            setSaving(false);
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/admin/app-settings/${key}`, { 
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify({ value: value.toString() })
            });
            if (!res.ok) throw new Error('שגיאה בעדכון ההגדרה');
            setMessage('✅ ההגדרה עודכנה בהצלחה!');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingSpinner />;
    
    return (
        <div className="bg-white p-6 md:p-8 rounded-lg shadow w-full mx-auto text-right">
             <div className="flex justify-between items-center mb-6 border-b pb-3">
                <h3 className="text-2xl font-bold text-text-dark">⚙️ ניהול הגדרות אוטומציה</h3>
                <button onClick={onBack} className="py-2 px-4 bg-gray-500 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 transition">
                    חזור לדשבורד
                </button>
            </div>
            
            {message && <AlertMessage type="success" message={message} onDismiss={() => setMessage(null)} />}
            {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}

            <div className="space-y-4">
                {/* הגדרת ימי ההמתנה לשליחת שאלון */}
                <div className="p-4 border border-gray-200 rounded-lg flex justify-between items-center">
                    <div className="flex-1">
                        <h4 className="font-semibold text-text-dark">ימי המתנה לשאלון (Questionnaire Delay)</h4>
                        <p className="text-sm text-gray-600">
                            קביעת מספר הימים שיעברו מדיווח תחילת הטיפול ועד שליחת שאלון חוות דעת אוטומטית. 
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                        <input
                            type="number"
                            min="1"
                            value={settings.questionnaire_delay_days || ''}
                            onChange={(e) => setSettings({ ...settings, questionnaire_delay_days: e.target.value })}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md text-center"
                        />
                        <button
                            onClick={() => handleSave('questionnaire_delay_days')}
                            disabled={saving}
                            className="py-1 px-3 bg-primary-blue text-white rounded-md text-xs font-medium hover:bg-secondary-purple disabled:opacity-50"
                        >
                            שמור
                        </button>
                    </div>
                </div>
            </div>
        </div>
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
    const [adminView, setAdminView] = useState('main'); 

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

    if (loading) { return <LoadingSpinner />; }
    
    return (
        <div className="space-y-8 md:space-y-12">
            <h2 className="text-3xl font-bold text-primary-blue text-center">🏆 לוח בקרה למנהל (Admin Dashboard)</h2>
            
            {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}

            {/* --- הצגה מותנית: דשבורד ראשי או מנהל שאלונים/הגדרות --- */}
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
                    
                    {/* 2. כפתורי קישור למידע מפורט (הוספת ניהול הגדרות) */}
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
                        />

                        {/* כפתור 2: רשימת מטפלים */}
                        <AdminActionButton 
                            title="רשימת מטפלים"
                            subtitle={`סך ${stats.totalProfessionals} מטפלים רשומים (כולל מקצוע וסטטוס)`}
                            apiEndpoint={`${API_URL}/api/admin/users/professionals`}
                            authToken={authToken}
                            tableHeaders={['שם מלא', 'מקצוע', 'אימייל', 'סטטוס', 'צפיות']}
                            tableKeys={['full_name', 'profession', 'email', 'active_status', 'view_count']}
                        />
                        
                        {/* כפתור 3: ניהול הגדרות דינמיות */}
                        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex justify-between items-center">
                            <div>
                                <h4 className="font-semibold text-lg text-text-dark">ניהול הגדרות מערכת</h4>
                                <p className="text-sm text-gray-500">עדכון ימי המתנה לשאלונים, ניהול קבועים גלובליים.</p>
                            </div>
                            <button
                                onClick={() => setAdminView('settings')}
                                className="py-2 px-4 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition"
                            >
                                ערוך הגדרות
                            </button>
                        </div>
                    </div>
                    
                    {/* 3. אזור הגרפים */}
                    <div className="p-6 bg-white rounded-lg shadow">
                        <h3 className="text-xl font-bold text-text-dark mb-4 border-b pb-2">נרשמים חדשים (30 יום אחרונים)</h3>
                        <RegistrationsGraph authToken={authToken} API_URL={API_URL} />
                    </div>
                </>
            ) : adminView === 'questionnaires' ? (
                // --- הצגת מנהל השאלונים ---
                <QuestionnaireManager 
                    authToken={authToken} 
                    API_URL={API_URL} 
                    onBack={() => setAdminView('main')} 
                />
            ) : adminView === 'settings' ? (
                // --- !!! הוספת מנהל ההגדרות !!! ---
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
                />
            )}
        </div>
    );
};

export default AdminDashboard;