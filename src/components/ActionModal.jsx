// src/components/ActionModal.jsx
// --- גרסה V4.3 (מפעיל מודאל טיפול בערעור) ---

import React, { useState, useEffect, useMemo } from 'react';
import moment from 'moment';
import AdminResolveReviewModal from './AdminResolveReviewModal'; // <-- !!! הוספה חדשה !!!

// =================================================================
// --- רכיבי עזר פנימיים ---
// =================================================================

const LoadingSpinner = () => (
    <div className="text-center p-5">
        <div className="spinner w-8 h-8 mx-auto border-t-primary-blue border-r-primary-blue"></div>
    </div>
);

const AlertMessage = ({ type, message, onDismiss }) => {
    // ... (קוד ללא שינוי)
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

const ActionButton = ({ onClick, text, color, isLoading, ...props }) => (
    // ... (קוד ללא שינוי)
    <button
        onClick={onClick}
        disabled={isLoading}
        className={`px-3 py-1 text-xs font-medium text-white rounded-md transition ${
            color === 'green' ? 'bg-green-500 hover:bg-green-600' : 
            color === 'red' ? 'bg-red-500 hover:bg-red-600' : 
            color === 'blue' ? 'bg-blue-500 hover:bg-blue-600' :
            'bg-gray-500 hover:bg-gray-600'
        } disabled:opacity-50`}
        {...props} 
    >
        {isLoading ? '...' : text}
    </button>
);

// =================================================================
// --- הרכיב הראשי: ActionModal ---
// =================================================================

const ActionModal = ({ modalType, authToken, API_URL, onClose, onActionComplete }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null); 
    const [viewingReview, setViewingReview] = useState(null); // <-- !!! הוספה חדשה !!!

    // הגדרת תצורות לכל סוג מודאל
    const config = useMemo(() => {
        switch (modalType) {
            case 'reviews':
                return {
                    title: 'ניהול חוות דעת ממתינות (מערכת ישנה)',
                    endpoint: `${API_URL}/api/admin/reviews/pending-admin`,
                    headers: ['תאריך', 'קוד לקוח', 'ביקורת', 'פעולות'],
                };
            case 'disputed':
                return {
                    title: 'טיפול בערעורים (מערכת שאלונים)',
                    endpoint: `${API_URL}/api/admin/questionnaires/disputed`,
                    headers: ['מטפל מערער', 'לקוח', 'שם שאלון', 'פעולות'],
                };
            case 'professionals':
                return {
                    title: 'ניהול מטפלים',
                    endpoint: `${API_URL}/api/admin/users/professionals`,
                    headers: ['שם', 'מקצוע', 'מספר רישיון', 'סטטוס', 'פעולות'],
                };
            case 'users':
                return {
                    title: 'רשימת משתמשים (כללי)',
                    endpoint: `${API_URL}/api/admin/users/all`,
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
                if (res.status === 404) { 
                    throw new Error('הנתיב לא נמצא (404). ודא שה-API בשרת מעודכן.');
                }
                if (!res.ok) throw new Error('שגיאה בטעינת הנתונים.');
                return res.json();
            })
            .then(setData)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [config, authToken]);

    // --- פונקציות לביצוע פעולות ---
    const handleReviewAction = async (reviewId, newStatus) => {
        // ... (קוד ללא שינוי)
    };
    const handleDisputeAction = async (reviewId, newStatus) => {
        // ... (קוד ללא שינוי)
    };
    const handleProfessionalAction = async (profId, currentStatus) => {
        // ... (קוד ללא שינוי)
        setActionLoading(profId);
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        
        try {
            const res = await fetch(`${API_URL}/api/admin/professionals/${profId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify({ active_status: newStatus }),
            });
            if (!res.ok) throw new Error('הפעולה נכשלה.');
            
            setData(prevData => 
                prevData.map(item => 
                    item.id === profId ? { ...item, active_status: newStatus } : item
                )
            );
            onActionComplete(); 
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(null);
        }
    };
    const handleVerifyAction = async (profId, newVerifyStatus) => {
        // ... (קוד ללא שינוי)
        setActionLoading(`${profId}-verify`);
        try {
            const res = await fetch(`${API_URL}/api/admin/professionals/${profId}/verify`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify({ is_verified: newVerifyStatus }), // 0 או 1
            });
            
            if (!res.ok) {
                 const data = await res.json();
                 throw new Error(data.error || 'הפעולה נכשלה.');
            }
            
            setData(prevData => 
                prevData.map(item => 
                    item.id === profId ? { ...item, is_verified: newVerifyStatus } : item
                )
            );
            onActionComplete(); 
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    // --- !!! הוספה חדשה: פונקציה לסגירת מודאל הערעור ---
    const handleResolveComplete = (message) => {
        setError(message); // הצג הודעת הצלחה
        setData(prev => prev.filter(item => item.id !== viewingReview.id)); // הסר מהרשימה
        setViewingReview(null); // סגור את המודאל הפנימי
        onActionComplete(); // רענן את הסטטיסטיקה בדשבורד
    };


    // --- פונקציות עזר לרנדור טבלה ---
    const renderRow = (item) => {
        switch (modalType) {
            
            case 'disputed':
                // --- !!! התיקון כאן !!! ---
                return (
                    <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">{item.professional_name}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{item.client_email}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{item.questionnaire_name}</td>
                        <td className="px-4 py-3 whitespace-nowrap space-x-2 space-x-reverse">
                            <ActionButton
                                text="פתח לטיפול"
                                color="blue"
                                isLoading={actionLoading === item.id}
                                onClick={() => setViewingReview(item)} // <-- פותח את המודאל החדש
                            />
                        </td>
                    </tr>
                );
            
            case 'reviews':
                // ... (קוד ללא שינוי)
                return (
                    <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">{new Date(item.created_at).toLocaleDateString('he-IL')}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono">{item.client_anon_id}</td>
                        <td className="px-4 py-3">
                            <span className="font-bold">({item.rating}/5)</span> {item.review_text}
                        </td>
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
                
            case 'professionals': {
                // ... (קוד ללא שינוי)
                const newStatusText = item.active_status === 'active' ? 'השעה' : 'הפעל';
                const newStatusColor = item.active_status === 'active' ? 'red' : 'green';
                
                const licenseNum = item.license_number || '';
                let professionPathId = '1'; 

                if (licenseNum && licenseNum.includes('-')) {
                    professionPathId = licenseNum.split('-')[0];
                }
                
                const licenseCheckUrl = `https://practitioners.health.gov.il/Practitioners/${professionPathId}/search?name=${encodeURIComponent(item.full_name)}&license=${encodeURIComponent(licenseNum)}&certificate=`;
                
                return (
                    <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap font-semibold">{item.full_name}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{item.profession}</td>
                        
                        <td className="px-4 py-3 whitespace-nowrap font-mono">
                            {item.license_number ? (
                                <a 
                                    href={licenseCheckUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 hover:underline"
                                    title="לחץ לבדיקה במשרד הבריאות"
                                >
                                    {item.license_number} 🔗
                                </a>
                            ) : (
                                <span className="text-gray-400">לא הוזן</span>
                            )}
                        </td>
                        
                        <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                item.active_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                                {item.active_status === 'active' ? 'פעיל' : 'מושעה'}
                            </span>
                            
                            {item.is_verified === 1 && (
                                <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                    מאומת
                                </span>
                            )}
                        </td>
                        
                        <td className="px-4 py-3 whitespace-nowrap space-x-2 space-x-reverse">
                            <ActionButton
                                text={newStatusText}
                                color={newStatusColor}
                                isLoading={actionLoading === item.id}
                                onClick={() => handleProfessionalAction(item.id, item.active_status)}
                                title={newStatusText + ' מטפל'}
                            />
                            
                            {item.is_verified === 0 ? (
                                <ActionButton
                                    text="אשר וי"
                                    color="blue"
                                    isLoading={actionLoading === `${item.id}-verify`}
                                    onClick={() => handleVerifyAction(item.id, 1)}
                                    title="סמן כמטפל מאומת"
                                />
                            ) : (
                                <ActionButton
                                    text="בטל וי"
                                    color="gray"
                                    isLoading={actionLoading === `${item.id}-verify`}
                                    onClick={() => handleVerifyAction(item.id, 0)}
                                    title="בטל אימות מטפל"
                                />
                            )}
                        </td>
                    </tr>
                );
            } 
            case 'users': 
                 return (
                    // ... (קוד ללא שינוי)
                    <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">{item.email}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{item.user_type}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono">{item.anonymous_id}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{new Date(item.created_at).toLocaleDateString('he-IL')}</td>
                    </tr>
                );
            default: return null;
        }
    };
    
    if (!config) return null;

    return (
        <>
            {/* --- !!! הוספה חדשה: רינדור המודאל הפנימי !!! --- */}
            {viewingReview && (
                <AdminResolveReviewModal
                    authToken={authToken}
                    API_URL={API_URL}
                    review={viewingReview}
                    onClose={() => setViewingReview(null)}
                    onActionComplete={handleResolveComplete}
                />
            )}
        
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
                <div className="bg-white p-6 md:p-8 rounded-2xl w-full max-w-4xl relative shadow-xl text-right max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <h2 className="text-2xl font-bold text-text-dark mb-4 border-b pb-2">{config.title}</h2>
                    <button onClick={onClose} className="absolute top-4 left-4 text-gray-500 text-2xl leading-none transition hover:text-red-500">&times;</button>
                    
                    {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}
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
        </>
    );
};

export default ActionModal;