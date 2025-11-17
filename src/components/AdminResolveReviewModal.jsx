// src/components/AdminResolveReviewModal.jsx - SECURED
import React, { useState } from 'react';
import moment from 'moment';

// ... (רכיבי עזר פנימיים - LoadingSpinner, AlertMessage, ButtonSpinner, HeartRatingDisplay - ללא שינוי) ...
const LoadingSpinner = () => ( /* ... */ );
const AlertMessage = ({ type, message, onDismiss }) => { /* ... */ };
const ButtonSpinner = () => ( /* ... */ );
const HeartRatingDisplay = ({ score }) => { /* ... */ };

// --- !!! התיקון: הסרת authToken והוספת onLogout ---
const AdminResolveReviewModal = ({ API_URL, review, onClose, onActionComplete, onLogout }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const qaPairs = (review.questions || []).map(question => ({
        question: question.text,
        answer: review.answers[question.id] || '(לא סופקה תשובה)',
        type: question.type || 'text'
    }));

    const handleAction = async (action) => {
        setLoading(true); setError(null);
        try {
            // --- !!! התיקון: שימוש בעוגיות ---
            const res = await fetch(`${API_URL}/api/admin/questionnaires/${review.id}/resolve-dispute`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    newStatus: action, 
                    professionalId: review.professional_id 
                }),
                credentials: 'include'
            });
            
            if (res.status === 401 || res.status === 403) { onLogout(); return; }
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'הפעולה נכשלה');
            
            onActionComplete(data.message); 
            
        } catch (err) {
            setError(err.message);
            setLoading(false); 
        }
    };

    // --- !!! התיקון: החזרת ה-JSX המקורי ---
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