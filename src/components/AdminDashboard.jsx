// src/components/AdminDashboard.jsx (V1.0)
import React, { useState, useEffect, useCallback } from 'react';
// נשתמש ב-AlertMessage ו-ButtonSpinner מ-ProfileEditor.jsx

const AdminDashboard = ({ authToken, API_URL, user, onLogout }) => {
    // ניתן יהיה לשלוף כאן נתונים סטטיסטיים ונתוני DB גולמיים
    const [totalUsers, setTotalUsers] = useState(0);
    const [totalProfessionals, setTotalProfessionals] = useState(0);
    const [totalPendingReviews, setTotalPendingReviews] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // [הערה: נצטרך להוסיף נתיב API חדש בשרת שיחזיר את הנתונים האלה]
    const fetchAdminStats = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/stats`, {
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            if (res.status === 401 || res.status === 403) { onLogout(); return; }
            const data = await res.json();
            
            setTotalUsers(data.totalUsers);
            setTotalProfessionals(data.totalProfessionals);
            setTotalPendingReviews(data.totalPendingReviews);

        } catch (err) {
            setError('שגיאה בטעינת נתוני הניהול.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [authToken, API_URL, onLogout]);

    useEffect(() => {
        if (user?.userType === 'admin') {
            fetchAdminStats();
        }
    }, [user, fetchAdminStats]);

    if (user?.userType !== 'admin') {
        return <div className="text-center p-10 text-red-600">גישה נדחתה. נדרשת הרשאת מנהל.</div>;
    }
    
    // --- ממשק הניהול ---
    return (
        <div className="space-y-8 md:space-y-12">
            <h2 className="text-3xl font-bold text-primary-blue text-center">🏆 לוח בקרה למנהל (Admin Dashboard)</h2>
            
            {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}

            <div className="bg-white p-6 md:p-8 rounded-lg shadow grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 border rounded-lg bg-blue-50">
                    <h3 className="text-4xl font-extrabold text-blue-700">{loading ? '...' : totalUsers}</h3>
                    <p className="text-gray-600 mt-2">משתמשים רשומים</p>
                </div>
                <div className="text-center p-4 border rounded-lg bg-green-50">
                    <h3 className="text-4xl font-extrabold text-green-700">{loading ? '...' : totalProfessionals}</h3>
                    <p className="text-gray-600 mt-2">מטפלים פעילים</p>
                </div>
                <div className="text-center p-4 border rounded-lg bg-yellow-50">
                    <h3 className="text-4xl font-extrabold text-yellow-700">{loading ? '...' : totalPendingReviews}</h3>
                    <p className="text-gray-600 mt-2">חוות דעת לאישור</p>
                </div>
            </div>

            <div className="p-4 bg-gray-100 rounded-lg">
                <h3 className="text-xl font-bold text-text-dark mb-4 border-b pb-2">פעולות ניהול מהירות</h3>
                <p className="text-sm text-gray-700">בגרסאות מתקדמות, ניתן יהיה להוסיף כאן לוחות אישור ביקורות גלובליים וניהול משתמשים.</p>
            </div>
            
            {/* ... (כאן ניתן יהיה להוסיף טבלה לניהול משתמשים/ביקורות) ... */}

        </div>
    );
};

export default AdminDashboard;