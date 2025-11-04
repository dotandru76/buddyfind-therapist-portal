// src/components/AdminDashboard.jsx (V2.0 - With Data Tables)
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

// --- רכיב טבלת נתונים בסיסי (Common Table) ---
const AdminTable = ({ title, data, headers, keyMapper }) => {
    if (!data || data.length === 0) {
        return (
            <div className="mt-6">
                <h3 className="text-xl font-bold text-text-dark mb-4 border-b pb-2">{title} ({data?.length || 0})</h3>
                <p className="text-gray-500 text-sm">לא נמצאו נתונים.</p>
            </div>
        );
    }

    return (
        <div className="mt-6">
            <h3 className="text-xl font-bold text-text-dark mb-4 border-b pb-2">{title} ({data.length})</h3>
            <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {headers.map((header, index) => (
                                <th key={index} className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                {keyMapper.map((key, kIndex) => (
                                    <td key={kIndex} className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                                        {/* עיבוד תאריכים באמצעות moment.js */}
                                        {key.includes('date') || key.includes('created_at') || key.includes('viewed_at') || key.includes('last_updated')
                                            ? moment(item[key]).format('DD/MM/YY HH:mm')
                                            : item[key]
                                        }
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const AdminDashboard = ({ authToken, API_URL, user, onLogout }) => {
    // נתונים סטטיסטיים כלליים
    const [stats, setStats] = useState({ totalUsers: 0, totalProfessionals: 0, totalPendingReviews: 0 });
    // רשימות נתונים גולמיות
    const [dataLists, setDataLists] = useState({ clients: [], professionals: [], views: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- קריאת API מרובה ---
    const fetchAllAdminData = useCallback(async () => {
        if (user?.userType !== 'admin') return;
        setLoading(true);
        setError(null);

        const fetchOptions = { headers: { 'Authorization': `Bearer ${authToken}` } };

        try {
            // קריאה מקבילית לכל 4 הנתיבים החדשים
            const [statsRes, clientsRes, profsRes, viewsRes] = await Promise.all([
                fetch(`${API_URL}/api/admin/stats`, fetchOptions),
                fetch(`${API_URL}/api/admin/users/clients`, fetchOptions),
                fetch(`${API_URL}/api/admin/users/professionals`, fetchOptions),
                fetch(`${API_URL}/api/admin/activity/views`, fetchOptions),
            ]);

            const responses = await Promise.all([
                statsRes.json(),
                clientsRes.json(),
                profsRes.json(),
                viewsRes.json(),
            ]);

            if (!statsRes.ok || !clientsRes.ok || !profsRes.ok || !viewsRes.ok) {
                 if (statsRes.status === 403) onLogout();
                 throw new Error('אחת מקריאות ה-API נכשלה. בדוק הרשאות Admin.');
            }

            setStats(responses[0]);
            setDataLists({
                clients: responses[1],
                professionals: responses[2],
                views: responses[3],
            });

        } catch (err) {
            setError('שגיאה בטעינת נתוני הניהול. אנא ודא שהשרת מעודכן.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [authToken, API_URL, user?.userType, onLogout]);

    useEffect(() => {
        fetchAllAdminData();
    }, [fetchAllAdminData]);

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
                    {/* סטטיסטיקות כלליות */}
                    <div className="bg-white p-6 md:p-8 rounded-lg shadow grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center p-4 border rounded-lg bg-blue-50">
                            <h3 className="text-4xl font-extrabold text-blue-700">{stats.totalUsers}</h3>
                            <p className="text-gray-600 mt-2">משתמשים רשומים (כללי)</p>
                        </div>
                        <div className="text-center p-4 border rounded-lg bg-green-50">
                            <h3 className="text-4xl font-extrabold text-green-700">{stats.totalProfessionals}</h3>
                            <p className="text-gray-600 mt-2">מטפלים פעילים</p>
                        </div>
                        <div className="text-center p-4 border rounded-lg bg-yellow-50">
                            <h3 className="text-4xl font-extrabold text-yellow-700">{stats.totalPendingReviews}</h3>
                            <p className="text-gray-600 mt-2">חוות דעת ממתינות</p>
                        </div>
                    </div>

                    {/* --- טבלאות נתונים --- */}
                    
                    {/* טבלת פעילות (Views) */}
                    <AdminTable
                        title="פעילות צפייה (לקוחות שפתחו כרטיסים)"
                        data={dataLists.views}
                        headers={['זמן צפייה', 'קוד לקוח אנונימי', 'מטפל נצפה', 'ID מטפל']}
                        keyMapper={['viewed_at', 'client_anon_id', 'professional_name', 'professional_id']}
                    />

                    {/* טבלת מטפלים */}
                    <AdminTable
                        title="רשימת מטפלים"
                        data={dataLists.professionals}
                        headers={['ID', 'שם מלא', 'מקצוע', 'סטטוס', 'עדכון אחרון']}
                        keyMapper={['id', 'full_name', 'profession', 'active_status', 'last_updated']}
                    />
                    
                    {/* טבלת לקוחות רגילים */}
                    <AdminTable
                        title="רשימת לקוחות"
                        data={dataLists.clients}
                        headers={['ID', 'אימייל', 'קוד אנונימי', 'תאריך הרשמה']}
                        keyMapper={['id', 'email', 'anonymous_id', 'created_at']}
                    />

                    {/* מודול הודעות (שלב עתידי) */}
                    <div className="p-4 bg-gray-100 rounded-lg">
                        <h3 className="text-xl font-bold text-text-dark mb-4 border-b pb-2">שירות הודעות (צ'אט מנהל)</h3>
                        <p className="text-sm text-gray-700">מודול תיבת ההודעות (ניהול תכתובות הבהרה) יפותח כשלב הבא. נדרש עדכון ל-DB ול-Backend.</p>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminDashboard;