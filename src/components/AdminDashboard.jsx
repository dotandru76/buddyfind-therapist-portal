// src/components/AdminDashboard.jsx
// --- גרסה V7.2 (הוספת ניהול הגדרות) ---

import React, { useState, useEffect, useCallback } from 'react';
import ActionModal from './ActionModal'; 
import RegistrationsGraph from './RegistrationsGraph'; 
import QuestionnaireManager from './QuestionnaireManager'; 

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

// --- !!! רכיב חדש לניהול הגדרות !!! ---
const SettingsManager = ({ authToken, API_URL }) => {
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
            <h3 className="text-xl font-bold text-text-dark mb-4 border-b pb-3">הגדרות אוטומציה</h3>
            {message && <AlertMessage type="success" message={message} onDismiss={() => setMessage(null)} />}
            {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}

            <div className="space-y-4">
                {/* הגדרת ימי ההמתנה לשליחת שאלון */}
                <div className="p-4 border border-gray-200 rounded-lg flex justify-between items-center">
                    <div>
                        <h4 className="font-semibold text-text-dark">ימי המתנה לשאלון (Treatment Delay)</h4>
                        <p className="text-sm text-gray-600">
                            קביעת מספר הימים שיעברו מדיווח תחילת הטיפול ועד שליחת שאלון חוות דעת אוטומטית. (ברירת מחדל: 60 ימים).
                        </p>
                    </div>
                    <div className="flex flex-col gap-2">
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
                
                {/* כפתור בדיקת CRON (שלב עזר) */}
                <div className="p-4 border border-gray-200 rounded-lg bg-red-50 flex justify-between items-center">
                    <div>
                        <h4 className="font-semibold text-text-dark">בדיקת שליחה מיידית (Test CRON)</h4>
                        <p className="text-sm text-red-600">
                            מפעיל את מנגנון השליחה האוטומטי באופן מיידי (בודק רשומות שעברו את זמן ההמתנה שנקבע).
                        </p>
                    </div>
                    <button
                        onClick={() => handleSave('questionnaire_delay_days')} // (משתמשים בפונקציית שמירה כדוגמה)
                        disabled={saving}
                        className="py-1 px-3 bg-red-500 text-white rounded-md text-xs font-medium hover:bg-red-600 disabled:opacity-50"
                    >
                        הפעל בדיקה
                    </button>
                </div>
            </div>
        </div>
    );
};


// =================================================================
// --- הרכיב הראשי: AdminDashboard ---
// =================================================================

const AdminDashboard = ({ authToken, API_URL, user, onLogout }) => {
    // ... (כל הקוד של AdminDashboard נשאר זהה)
    // ... (פונקציות העזר LoadingSpinner, AlertMessage, ActionCard)
    // ... (הבדיקה user?.user_type !== 'admin')

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

            {/* --- הצגה מותנית: דשבורד ראשי או מנהל שאלונים --- */}
            {adminView === 'main' ? (
                <>
                    {/* 1. רכיבי הפעולה - 5 כרטיסיות */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                        {/* ... (כרטיסיות חוות דעת, ערעורים, מטפלים, משתמשים) ... */}
                        
                        <ActionCard
                            title="ניהול הגדרות"
                            value="⚙️"
                            color="purple"
                            onClick={() => setAdminView('settings')}
                        />
                    </div>
                    
                    {/* 2. אזור הגרפים */}
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