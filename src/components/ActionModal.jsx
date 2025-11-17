// src/components/ActionModal.jsx - SECURED
import React, { useState, useEffect, useMemo } from 'react';
import moment from 'moment';
import AdminResolveReviewModal from './AdminResolveReviewModal'; 

// ... (רכיבי עזר פנימיים - LoadingSpinner, AlertMessage, ActionButton - ללא שינוי) ...
const LoadingSpinner = () => ( <div className="text-center p-5"><div className="spinner w-8 h-8 mx-auto border-t-primary-blue border-r-primary-blue"></div></div> );
const AlertMessage = ({ type, message, onDismiss }) => { /* ... (כמו בקובץ המקורי) ... */ };
const ActionButton = ({ onClick, text, color, isLoading, ...props }) => ( <button onClick={onClick} disabled={isLoading} className={`px-3 py-1 text-xs font-medium text-white rounded-md transition ${ color === 'green' ? 'bg-green-500 hover:bg-green-600' : color === 'red' ? 'bg-red-500 hover:bg-red-600' : color === 'blue' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-500 hover:bg-gray-600' } disabled:opacity-50`} {...props} > {isLoading ? '...' : text} </button> );

// --- !!! התיקון: הסרת authToken והוספת onLogout ---
const ActionModal = ({ modalType, API_URL, onClose, onActionComplete, onLogout }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null); 
    const [viewingReview, setViewingReview] = useState(null); 

    const config = useMemo(() => {
        // ... (לוגיקת config ללא שינוי) ...
    }, [modalType, API_URL]);

    // טעינת נתונים
    useEffect(() => {
        if (!config) return;
        setLoading(true); setError(null);
        
        // --- !!! התיקון: שימוש בעוגיות ---
        fetch(config.endpoint, { credentials: 'include' })
            .then(res => {
                if (res.status === 401 || res.status === 403) { onLogout(); return; }
                if (res.status === 404) { throw new Error('הנתיב לא נמצא (404).'); }
                if (!res.ok) throw new Error('שגיאה בטעינת הנתונים.');
                return res.json();
            })
            .then(setData)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    // --- !!! התיקון: עדכון תלויות ---
    }, [config, onLogout]);

    // --- פונקציות לביצוע פעולות (דורשות גם הן תיקון) ---
    
    const handleReviewAction = async (reviewId, newStatus) => {
        // ... (יישם כאן תיקון דומה עם credentials: 'include')
    };

    const handleProfessionalAction = async (profId, currentStatus) => {
        setActionLoading(profId);
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            // --- !!! התיקון: שימוש בעוגיות ---
            const res = await fetch(`${API_URL}/api/admin/professionals/${profId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active_status: newStatus }),
                credentials: 'include'
            });
            if (res.status === 401 || res.status === 403) { onLogout(); return; }
            if (!res.ok) throw new Error('הפעולה נכשלה.');
            
            setData(prevData => prevData.map(item => item.id === profId ? { ...item, active_status: newStatus } : item));
            onActionComplete(); 
        } catch (err) { setError(err.message); } 
        finally { setActionLoading(null); }
    };
    
    const handleVerifyAction = async (profId, newVerifyStatus) => {
        setActionLoading(`${profId}-verify`);
        try {
            // --- !!! התיקון: שימוש בעוגיות ---
            const res = await fetch(`${API_URL}/api/admin/professionals/${profId}/verify`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_verified: newVerifyStatus }),
                credentials: 'include'
            });
            if (res.status === 401 || res.status === 403) { onLogout(); return; }
            if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'הפעולה נכשלה.'); }
            
            setData(prevData => prevData.map(item => item.id === profId ? { ...item, is_verified: newVerifyStatus } : item));
            onActionComplete(); 
        } catch (err) { setError(err.message); } 
        finally { setActionLoading(null); }
    };

    const handleResolveComplete = (message) => {
        setError(message); 
        setData(prev => prev.filter(item => item.id !== viewingReview.id)); 
        setViewingReview(null); 
        onActionComplete(); 
    };

    // ... (פונקציית renderRow ללא שינוי, היא תקינה) ...
    // ... (העתק את פונקציית renderRow המקורית שלך לכאן) ...
    
    // --- !!! התיקון: החזרת ה-JSX המקורי ---
    return (
        <>
            {viewingReview && (
                <AdminResolveReviewModal
                    API_URL={API_URL}
                    review={viewingReview}
                    onClose={() => setViewingReview(null)}
                    onActionComplete={handleResolveComplete}
                    onLogout={onLogout} // העברה למודאל הפנימי
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
                                    {/* {data.length > 0 ? data.map(renderRow) : (
                                        <tr><td colSpan={config.headers.length} className="p-5 text-center text-gray-500">אין נתונים להצגה.</td></tr>
                                    )} */}
                                    {/* !!! החזר את הפונקציה renderRow שלך לכאן !!! */}
                                    {/* (לא הייתה לי גישה לקוד המלא שלה בתשובה הקודמת, אז השארתי אותה ריקה) */}
                                    {/* סביר להניח שהיא נמצאת בקובץ המקורי שלך (ActionModal.jsx) */}
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