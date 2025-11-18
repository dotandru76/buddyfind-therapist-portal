// src/components/AdminDashboard.jsx
// --- גרסה V8.0 (תמיכה בבורר מצבי אבחון) ---

import React, { useState, useEffect, useCallback } from 'react';
import moment from 'moment'; 
import ActionModal from './ActionModal'; 
import RegistrationsGraph from './RegistrationsGraph'; 
import QuestionnaireManager from './QuestionnaireManager'; 

// (רכיבי עזר פנימיים)
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

// --- רכיב ניהול הגדרות ---
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

    const handleSave = async (key, explicitValue = null) => {
        setSaving(true); setError(null); setMessage(null);
        const value = explicitValue !== null ? explicitValue : settings[key];
        
        if (key === 'questionnaire_delay_days' && (!value || isNaN(parseInt(value, 10)) || parseInt(value, 10) < 1)) {
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
            // עדכון הסטייט המקומי אם צריך
            if (explicitValue !== null) {
                setSettings(prev => ({ ...prev, [key]: explicitValue }));
            }
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
                <h3 className="text-2xl font-bold text-text-dark">⚙️ ניהול הגדרות מערכת</h3>
                <button onClick={onBack} className="py-2 px-4 bg-gray-500 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 transition">
                    חזור לדשבורד
                </button>
            </div>
            
            {message && <AlertMessage type="success" message={message} onDismiss={() => setMessage(null)} />}
            {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}

            <div className="space-y-6">
                
                {/* --- !!! הוספה חדשה: בורר מצב אבחון !!! --- */}
                <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg flex justify-between items-center">
                    <div className="flex-1 ml-4">
                        <h4 className="font-bold text-blue-800 text-lg">מצב מערכת אבחון</h4>
                        <p className="text-sm text-blue-600 mt-1">
                            בחר באיזה מנוע אבחון להשתמש באתר המשתמשים הציבורי.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => handleSave('diagnostic_mode', 'legacy')}
                            className={`px-4 py-2 rounded-md border font-semibold transition ${
                                settings.diagnostic_mode === 'legacy' 
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            מערכת ישנה (Hardcoded)
                        </button>
                        <button
                            onClick={() => handleSave('diagnostic_mode', 'dynamic')}
                            className={`px-4 py-2 rounded-md border font-semibold transition ${
                                settings.diagnostic_mode === 'dynamic' 
                                ? 'bg-green-600 text-white border-green-600 shadow-md' 
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            מערכת חדשה (Flow Builder)
                        </button>
                    </div>
                </div>
                {/* --- סוף הוספה --- */}


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
                            className="py-1 px-3 bg-primary-blue text-white rounded-lg text-xs font-medium hover:bg-secondary-purple disabled:opacity-50"
                        >
                            שמור
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- רכיב המודאל המציג את הנתונים (DataModal) ---
const DataModal = ({ title, data, headers, keys, onClose, error }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white p-6 md:p-8 rounded-2xl w-full max-w-4xl relative shadow-xl text-right max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-text-dark mb-4 border-b pb-2">{title}</h2>
                <button onClick={onClose} className="absolute top-4 left-4 text-gray-500 text-2xl leading-none transition hover:text-red-500">&times;</button>
                
                {error && <AlertMessage type="error" message={error} />}

                <div className="mt-4">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                {headers.map((header, index) => (
                                    <th key={index} className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data?.map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    {keys.map((key, kIndex) => (
                                        <td key={kIndex} className="px-4 py-3 whitespace-nowrap text-gray-800">
                                            {moment(item[key]).isValid() ? moment(item[key]).format('DD/MM/YY HH:mm') : item[key]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
    const [modalData, setModalData] = useState(null); 

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
    
    const handleActionCardClick = (modalType) => {
        setCurrentModal(modalType);
    };

    if (loading) { return <LoadingSpinner />; }
    
    return (
        <div className="space-y-8 md:space-y-12">
            <h2 className="text-3xl font-bold text-primary-blue text-center">🏆 לוח בקרה למנהל (Admin Dashboard)</h2>
            
            {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}

            {adminView === 'main' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                        <ActionCard title="חוות דעת ממתינות" value={stats.totalPendingReviews} color="yellow" onClick={() => handleActionCardClick('reviews')} />
                        <ActionCard title="ערעורים לטיפול" value={stats.totalDisputedReviews} color="red" onClick={() => handleActionCardClick('disputed')} />
                        <ActionCard title="מטפלים פעילים" value={stats.totalProfessionals} color="green" onClick={() => handleActionCardClick('professionals')} />
                        <ActionCard title="משתמשים רשומים" value={stats.totalUsers} color="blue" onClick={() => handleActionCardClick('users')} />
                        <ActionCard title="ניהול שאלונים" value="+" color="purple" onClick={() => setAdminView('questionnaires')} />
                    </div>
                    
                    <div className="p-6 bg-white rounded-lg shadow">
                        <h3 className="text-xl font-bold text-text-dark mb-4 border-b pb-2">נרשמים חדשים (30 יום אחרונים)</h3>
                        <RegistrationsGraph authToken={authToken} API_URL={API_URL} />
                    </div>
                    
                    <div className="p-6 bg-white rounded-lg shadow space-y-6">
                        <h3 className="text-xl font-bold text-text-dark border-b pb-2">הגדרות מערכת</h3>
                         <button onClick={() => setAdminView('settings')} className="py-2 px-4 bg-gray-500 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 transition">
                            ⚙️ ערוך הגדרות אוטומציה ומצב אבחון
                        </button>
                    </div>
                </>
            ) : adminView === 'questionnaires' ? (
                <QuestionnaireManager authToken={authToken} API_URL={API_URL} onBack={() => setAdminView('main')} />
            ) : adminView === 'settings' ? (
                <SettingsManager authToken={authToken} API_URL={API_URL} onBack={() => setAdminView('main')} />
            ) : null}
            
            {currentModal === 'data' && modalData && (
                <DataModal title={modalData.title} data={modalData.data} headers={modalData.headers} keys={modalData.keys} onClose={() => setCurrentModal(null)} error={modalData.error} />
            )}
             {['reviews', 'disputed', 'professionals', 'users'].includes(currentModal) && (
                 <ActionModal modalType={currentModal} authToken={authToken} API_URL={API_URL} onClose={() => setCurrentModal(null)} onActionComplete={handleActionComplete} />
            )}
        </div>
    );
};

export default AdminDashboard;