// src/components/TherapistReviewManager.jsx
// --- גרסה V2.1 (טיפול שגיאות משופר) ---

import React, { useState, useEffect, useCallback } from 'react';
import moment from 'moment';
import ViewAnswersModal from './ViewAnswersModal'; 

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

const TherapistReviewManager = ({ authToken, API_URL, onLogout }) => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [selectedReview, setSelectedReview] = useState(null); 

    const fetchReviews = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${API_URL}/api/professionals/me/questionnaires`, {
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            
            if (res.status === 401 || res.status === 403) {
                onLogout(); 
                return;
            }
            
            // --- !!! תיקון: טיפול שגיאות משופר !!! ---
            if (!res.ok) {
                let errorMsg = `שגיאה ${res.status}`;
                try {
                    const data = await res.json();
                    errorMsg = data.error || errorMsg;
                } catch(e) {
                    // אין גוף JSON, השתמש בטקסט הסטטוס
                    errorMsg = `${errorMsg}: ${res.statusText}`;
                }
                throw new Error(errorMsg);
            }
            // --- סוף התיקון ---

            const data = await res.json();
            setReviews(data);
        } catch (err) {
            console.error("Error fetching reviews:", err);
            setError(err.message || 'שגיאה לא ידועה באחזור חוות דעת');
        } finally {
            setLoading(false);
        }
    }, [authToken, API_URL, onLogout]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    const handleActionComplete = (successMessage) => {
        setSelectedReview(null); 
        setMessage(successMessage); 
        fetchReviews(); 
    };

    return (
        <>
            {selectedReview && (
                <ViewAnswersModal
                    authToken={authToken}
                    API_URL={API_URL}
                    review={selectedReview}
                    onClose={() => setSelectedReview(null)}
                    onActionComplete={handleActionComplete}
                />
            )}

            <div className="bg-white p-6 md:p-8 rounded-lg shadow w-full mx-auto text-right mb-8">
                <h3 className="text-xl font-bold text-text-dark mb-4">ניהול חוות דעת (שאלונים)</h3>
                
                <AlertMessage type="success" message={message} onDismiss={() => setMessage(null)} />
                <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />

                {loading && <LoadingSpinner />}
                
                {!loading && !error && reviews.length === 0 && (
                    <p className="text-gray-500 text-center py-4">אין חוות דעת הממתינות לאישור.</p>
                )}

                {!loading && !error && reviews.length > 0 && (
                     <div className="overflow-x-auto mt-4">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך הגשה</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">לקוח</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">שם השאלון</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {reviews.map(review => (
                                    <tr key={review.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-nowrap">{moment(review.completed_at).format('DD/MM/YYYY')}</td>
                                        <td className="px-4 py-3 whitespace-nowrap font-semibold">{review.client_email}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{review.questionnaire_name}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <button
                                                onClick={() => setSelectedReview(review)}
                                                className="py-1 px-3 bg-primary-blue text-white rounded-md text-xs font-medium hover:bg-secondary-purple transition"
                                            >
                                                צפה וטפל
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
};

export default TherapistReviewManager;