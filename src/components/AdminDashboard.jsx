// src/components/AdminDashboard.jsx (V3.0 - Action Focused Dashboard)
import React, { useState, useEffect, useCallback } from 'react';
import moment from 'moment'; // נדרש: npm install moment

// --- Helper Components (אותם אלו שהשתמשנו ב-ProfileEditor) ---
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
const LoadingSpinner = () => (
    <div className="text-center p-5"><div className="spinner w-8 h-8 mx-auto border-t-primary-blue border-r-primary-blue"></div></div>
);


// --- רכיב עזר חדש: Admin Action Button (מציג נתונים במודאל) ---
const AdminActionButton = ({ title, subtitle, apiEndpoint, authToken, tableHeaders, tableKeys }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(apiEndpoint, {
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            if (!res.ok) throw new Error(`שגיאה ${res.status}: קריאת נתונים נכשלה.`);
            const result = await res.json();
            setData(result);
            setIsModalOpen(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [apiEndpoint, authToken]);

    return (
        <>
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex justify-between items-center">
                <div>
                    <h4 className="font-semibold text-lg text-text-dark">{title}</h4>
                    <p className="text-sm text-gray-500">{subtitle}</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="py-2 px-4 bg-primary-blue text-white rounded-lg text-sm font-semibold hover:bg-secondary-purple transition disabled:opacity-50"
                >
                    {loading ? 'טוען...' : 'הצג פרטים'}
                </button>
            </div>

            {/* Modal for displaying detailed data */}
            {isModalOpen && (
                <DataModal 
                    title={title}
                    data={data}
                    headers={tableHeaders}
                    keys={tableKeys}
                    onClose={() => setIsModalOpen(false)}
                    error={error}
                />
            )}
        </>
    );
};

// --- רכיב המודאל המציג את הנתונים (טבלת נתונים) ---
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
                                            {/* (moment.js required for proper date formatting) */}
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


const AdminDashboard = ({ authToken, API_URL, user, onLogout }) => {
    const [stats, setStats] = useState({ totalUsers: 0, totalProfessionals: 0, totalPendingReviews: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- קריאת API סטטיסטית בלבד (הנתונים המספריים) ---
    const fetchAdminStats = useCallback(async () => {
        if (user?.userType !== 'admin') return;
        setLoading(true);
        setError(null);

        const fetchOptions = { headers: { 'Authorization': `Bearer ${authToken}` } };

        try {
            const statsRes = await fetch(`${API_URL}/api/admin/stats`, fetchOptions);

            const data = await statsRes.json();

            if (!statsRes.ok) {
                 if (statsRes.status === 403) onLogout();
                 throw new Error('אחת מקריאות ה-API נכשלה.');
            }

            setStats(data);

        } catch (err) {
            setError('שגיאה בטעינת נתוני הניהול. אנא ודא שהשרת מעודכן.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [authToken, API_URL, user?.userType, onLogout]);

    useEffect(() => {
        fetchAdminStats();
    }, [fetchAdminStats]);

    if (user?.userType !== 'admin') {
        return <div className="text-center p-10 text-red-600">גישה נדחתה. נדרשת הרשאת מנהל.</div>;
    }
    
    // --- ממשק הניהול ---
    return (
        <div className="space-y-8 md:space-y-12">
            <h2 className="text-3xl font-bold text-primary-blue text-center">🏆 לוח בקרה למנהל (Admin Dashboard)</h2>
            
            {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}
            
            {loading ? <LoadingSpinner /> : (
                <>
                    {/* 1. סטטיסטיקות כלליות (הבלוק הצבעוני) */}
                    <div className="bg-white p-6 md:p-8 rounded-lg shadow grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* סך משתמשים */}
                        <div className="text-center p-4 border rounded-lg bg-blue-50">
                            <h3 className="text-4xl font-extrabold text-blue-700">{stats.totalUsers}</h3>
                            <p className="text-gray-600 mt-2">משתמשים רשומים (כללי)</p>
                        </div>
                        {/* מטפלים פעילים */}
                        <div className="text-center p-4 border rounded-lg bg-green-50">
                            <h3 className="text-4xl font-extrabold text-green-700">{stats.totalProfessionals}</h3>
                            <p className="text-gray-600 mt-2">מטפלים פעילים</p>
                        </div>
                        {/* חוות דעת לאישור */}
                        <div className="text-center p-4 border rounded-lg bg-yellow-50">
                            <h3 className="text-4xl font-extrabold text-yellow-700">{stats.totalPendingReviews}</h3>
                            <p className="text-gray-600 mt-2">חוות דעת ממתינות</p>
                        </div>
                    </div>

                    {/* 2. כפתורי קישור למידע מפורט (מחליף את הטבלאות) */}
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
                            tableHeaders={['שם מלא', 'מקצוע', 'אימייל', 'סטטוס']}
                            tableKeys={['full_name', 'profession', 'email', 'active_status']}
                        />
                        
                        {/* כפתור 3: רשימת לקוחות */}
                        <AdminActionButton 
                            title="רשימת לקוחות רשומים"
                            subtitle={`סך ${stats.totalUsers} משתמשים רשומים (כולל קוד אנונימי)`}
                            apiEndpoint={`${API_URL}/api/admin/users/clients`}
                            authToken={authToken}
                            tableHeaders={['ID', 'אימייל', 'קוד אנונימי', 'תאריך הרשמה']}
                            tableKeys={['id', 'email', 'anonymous_id', 'created_at']}
                        />
                    </div>
                    
                    {/* 3. מודול הודעות (שלב עתידי) */}
                    <div className="p-4 bg-gray-100 rounded-lg">
                        <h3 className="text-xl font-bold text-text-dark mb-4 border-b pb-2">שירות הודעות (צ'אט מנהל)</h3>
                        <p className="text-sm text-gray-700">מודול תיבת ההודעות (ניהול תכתובות הבהרה) יפותח כשלב הבא.</p>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminDashboard;