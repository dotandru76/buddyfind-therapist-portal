// src/components/ActionModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import moment from 'moment';
import LoadingSpinner from './LoadingSpinner';
import AlertMessage from './AlertMessage';

// רכיב פנימי לכפתורי הפעולה בטבלה
const ActionButton = ({ onClick, text, color, isLoading }) => (
    <button
        onClick={onClick}
        disabled={isLoading}
        className={`px-3 py-1 text-xs font-medium text-white rounded-md transition ${
            color === 'green' ? 'bg-green-500 hover:bg-green-600' : 
            color === 'red' ? 'bg-red-500 hover:bg-red-600' : 
            'bg-gray-500 hover:bg-gray-600'
        } disabled:opacity-50`}
    >
        {isLoading ? '...' : text}
    </button>
);

const ActionModal = ({ modalType, authToken, API_URL, onClose, onActionComplete }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null); // ID של הפריט שמטופל

    // הגדרת תצורות לכל סוג מודאל
    const config = useMemo(() => {
        switch (modalType) {
            case 'reviews':
                return {
                    title: 'ניהול חוות דעת ממתינות',
                    endpoint: `${API_URL}/api/admin/reviews/pending`,
                    headers: ['תאריך', 'קוד לקוח', 'ביקורת', 'פעולות'],
                };
            case 'professionals':
                return {
                    title: 'ניהול מטפלים',
                    endpoint: `${API_URL}/api/admin/users/professionals`,
                    headers: ['שם', 'מקצוע', 'צפיות', 'סטטוס', 'פעולות'],
                };
            case 'users':
                return {
                    title: 'רשימת משתמשים (כללי)',
                    endpoint: `${API_URL}/api/admin/users/all`, // נצטרך להוסיף API זה
                    headers: ['אימייל', 'סוג', 'קוד אנונימי', 'נרשם ב-'],
                };
            default:
                return null;
        }
    }, [modalType, API_URL]);

    // טעינת נתונים
    useEffect(() => {
        if (!config) return;
        setLoading(true); setError(null);
        fetch(config.endpoint, { headers: { 'Authorization': `Bearer ${authToken}` } })
            .then(res => {
                if (!res.ok) throw new Error('שגיאה בטעינת הנתונים.');
                return res.json();
            })
            .then(setData)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [config, authToken]);

    // --- פונקציות לביצוע פעולות ---
    const handleReviewAction = async (reviewId, newStatus) => {
        setActionLoading(reviewId);
        try {
            const res = await fetch(`${API_URL}/api/admin/reviews/${reviewId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify({ newStatus }),
            });
            if (!res.ok) throw new Error('הפעולה נכשלה.');
            setData(prev => prev.filter(item => item.id !== reviewId)); // הסר מהרשימה
            onActionComplete(); // רענן סטטיסטיקה
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(null);
        }
    };
    
    // (פונקציה לניהול מטפלים - נוסיף בהמשך)
    // const handleProfessionalAction = async (profId, newStatus) => { ... }


    // --- פונקציות עזר לרנדור טבלה ---
    const renderRow = (item) => {
        switch (modalType) {
            case 'reviews':
                return (
                    <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">{moment(item.created_at).format('DD/MM/YY')}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono">{item.client_anon_id}</td>
                        <td className="px-4 py-3 text-sm">{item.review_text}</td>
                        <td className="px-4 py-3 whitespace-nowrap space-x-2 space-x-reverse">
                            <ActionButton
                                text="אשר (למטפל)"
                                color="green"
                                isLoading={actionLoading === item.id}
                                onClick={() => handleReviewAction(item.id, 'pending_therapist')}
                            />
                            <ActionButton
                                text="דחה"
                                color="red"
                                isLoading={actionLoading === item.id}
                                onClick={() => handleReviewAction(item.id, 'rejected')}
                            />
                        </td>
                    </tr>
                );
            case 'professionals':
                return (
                    <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap font-semibold">{item.full_name}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{item.profession}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-center font-bold">{item.view_count}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                item.active_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                                {item.active_status === 'active' ? 'פעיל' : 'מושעה'}
                            </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap space-x-2 space-x-reverse">
                            <ActionButton
                                text={item.active_status === 'active' ? 'השעה' : 'הפעל'}
                                color="red"
                                isLoading={actionLoading === item.id}
                                onClick={() => alert('בקרוב: טיפול במטפלים')} // כאן נחבר את ה-API
                            />
                        </td>
                    </tr>
                );
            case 'users': // (Endpoint /api/admin/users/all עדיין לא קיים)
                 return (
                    <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{item.email}</td>
                        <td className="px-4 py-3">{item.user_type}</td>
                        <td className="px-4 py-3 font-mono">{item.anonymous_id}</td>
                        <td className="px-4 py-3">{moment(item.created_at).format('DD/MM/YYYY')}</td>
                    </tr>
                );
            default: return null;
        }
    };
    
    if (!config) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white p-6 md:p-8 rounded-2xl w-full max-w-4xl relative shadow-xl text-right max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-text-dark mb-4 border-b pb-2">{config.title}</h2>
                <button onClick={onClose} className="absolute top-4 left-4 text-gray-500 text-2xl leading-none transition hover:text-red-500">&times;</button>
                
                {error && <AlertMessage type="error" message={error} />}
                {loading && <LoadingSpinner />}

                {!loading && !error && (
                    <div className="mt-4">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    {config.headers.map((header) => (
                                        <th key={header} className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data.length > 0 ? data.map(renderRow) : (
                                    <tr><td colSpan={config.headers.length} className="p-5 text-center text-gray-500">אין נתונים להצגה.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActionModal;