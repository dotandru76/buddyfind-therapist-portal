// src/components/AdminResolveReviewModal.jsx
// --- גרסה V1.1 (שדרוג אייקון ללב) ---

import React, { useState } from 'react';
import moment from 'moment';

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
const ButtonSpinner = () => ( <div className="spinner w-5 h-5 border-t-white border-r-white border-b-white border-l-primary-blue"></div> );

// --- !!! רכיב פנימי חדש להצגת דירוג (עם לב) !!! ---
const HeartRatingDisplay = ({ score }) => {
    const stars = [1, 2, 3, 4, 5];
    const numericScore = Number(score) || 0;
    
    return (
        <div className="flex gap-1" style={{direction: 'ltr'}}>
            {stars.map(starValue => (
                <svg
                    key={starValue}
                    className="w-5 h-5"
                    fill={numericScore >= starValue ? "#FFD700" : "#E0E0E0"}
                    viewBox="0 0 20 20"
                >
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
            ))}
            <span className="text-gray-600 text-sm font-semibold mr-2">({numericScore} / 5)</span>
        </div>
    );
};

// --- רכיב ראשי ---
const AdminResolveReviewModal = ({ authToken, API_URL, review, onClose, onActionComplete }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // חילוץ השאלות והתשובות
    const qaPairs = (review.questions || []).map(question => ({
        question: question.text,
        answer: review.answers[question.id] || '(לא סופקה תשובה)',
        type: question.type || 'text'
    }));

    const handleAction = async (action) => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${API_URL}/api/admin/questionnaires/${review.id}/resolve-dispute`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({ 
                    newStatus: action, // 'published' or 'rejected'
                    professionalId: review.professional_id 
                }), 
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'הפעולה נכשלה');
            
            onActionComplete(data.message); 
            
        } catch (err) {
            setError(err.message);
            setLoading(false); 
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white p-6 md:p-8 rounded-2xl w-full max-w-2xl relative shadow-xl text-right max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-text-dark mb-4 border-b pb-2">טיפול בערעור</h2>
                <button onClick={onClose} className="absolute top-4 left-4 text-gray-500 text-2xl leading-none transition hover:text-red-500">&times;</button>
                
                {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}

                <div className="space-y-4">
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <h4 className="font-semibold">{review.questionnaire_name}</h4>
                        <p className="text-sm text-gray-600">מאת: {review.client_email}</p>
                        <p className="text-sm text-gray-600">עבור: {review.professional_name}</p>
                    </div>

                    {qaPairs.map((qa, index) => (
                        <div key={index} className="p-3 border border-gray-200 rounded-md">
                            <p className="text-sm font-semibold text-gray-800">{qa.question}</p>
                            {qa.type === 'rating' ? (
                                <HeartRatingDisplay score={qa.answer} />
                            ) : (
                                <p className="text-gray-600 mt-1">{qa.answer}</p>
                            )}
                        </div>
                    ))}
                    
                    <div className="flex gap-4 mt-4 pt-4 border-t border-gray-200">
                        <button 
                            onClick={() => handleAction('published')}
                            disabled={loading}
                            className="inline-flex items-center justify-center flex-1 py-2 px-4 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600 disabled:opacity-50"
                        >
                            {loading ? <ButtonSpinner /> : 'אשר ופרסם'}
                        </button>
                        <button 
                            onClick={() => handleAction('rejected')}
                            disabled={loading}
                            className="inline-flex items-center justify-center flex-1 py-2 px-4 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 disabled:opacity-50"
                        >
                            {loading ? <ButtonSpinner /> : 'דחה סופית'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminResolveReviewModal;