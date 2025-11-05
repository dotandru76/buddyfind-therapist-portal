// src/components/ViewAnswersModal.jsx
// --- גרסה V2.0 (תמיכה בסוגי שאלות) ---

import React, { useState } from 'react';

// =================================================================
// --- רכיבי עזר פנימיים ---
// =================================================================
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

// --- !!! רכיב פנימי חדש להצגת דירוג !!! ---
const StarRatingDisplay = ({ score }) => {
    const stars = [1, 2, 3, 4, 5];
    const numericScore = Number(score) || 0;
    
    return (
        <div className="flex gap-1" style={{direction: 'ltr'}}>
            {stars.map(starValue => (
                <svg
                    key={starValue}
                    className="w-5 h-5" // גודל קטן יותר לצפייה
                    fill={numericScore >= starValue ? "#FFD700" : "#E0E0E0"}
                    viewBox="0 0 20 20"
                >
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 7.02l6.561-.955L10 0l2.95 6.065 6.561.955-4.756 4.625L15.878 18.09z"/>
                </svg>
            ))}
            <span className="text-gray-600 text-sm font-semibold mr-2">({numericScore} / 5)</span>
        </div>
    );
};

// =================================================================
// --- רכיב ראשי: ViewAnswersModal ---
// =================================================================
const ViewAnswersModal = ({ authToken, API_URL, review, onClose, onActionComplete }) => {
    const [therapistResponse, setTherapistResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- !!! התיקון כאן: שולפים גם את סוג השאלה !!! ---
    const qaPairs = review.questions.map(question => ({
        question: question.text,
        answer: review.answers[question.id] || '(לא סופקה תשובה)',
        type: question.type || 'text' // ברירת מחדל לטקסט אם הסוג חסר
    }));

    const handleAction = async (action) => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${API_URL}/api/professionals/me/questionnaires/${review.id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({ action, response: therapistResponse }), // 'publish' or 'dispute'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'הפעולה נכשלה');
            
            onActionComplete(data.message); // סגור מודאל והצג הודעת הצלחה
            
        } catch (err) {
            setError(err.message);
            setLoading(false); // השאר מודאל פתוח במקרה של שגיאה
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white p-6 md:p-8 rounded-2xl w-full max-w-2xl relative shadow-xl text-right max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-text-dark mb-4 border-b pb-2">טיפול בחוות דעת</h2>
                <button onClick={onClose} className="absolute top-4 left-4 text-gray-500 text-2xl leading-none transition hover:text-red-500">&times;</button>
                
                {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}

                {/* --- פרטי השאלון --- */}
                <div className="space-y-4">
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <h4 className="font-semibold">{review.questionnaire_name}</h4>
                        <p className="text-sm text-gray-600">מאת: {review.client_email}</p>
                    </div>

                    {qaPairs.map((qa, index) => (
                        <div key={index} className="p-3 border border-gray-200 rounded-md">
                            <p className="text-sm font-semibold text-gray-800">{qa.question}</p>
                            
                            {/* --- !!! התיקון כאן: הצגה מותנית לפי סוג !!! --- */}
                            {qa.type === 'rating' ? (
                                <StarRatingDisplay score={qa.answer} />
                            ) : (
                                <p className="text-gray-600 mt-1">{qa.answer}</p>
                            )}
                        </div>
                    ))}
                    
                    {/* --- טופס תגובה ופעולות --- */}
                    <div className="pt-4 border-t border-gray-200">
                        <label htmlFor="therapistResponse" className="block text-sm font-medium text-gray-700 mb-1">
                            הוסף תגובה פומבית (אופציונלי)
                        </label>
                        <textarea
                            id="therapistResponse"
                            rows="3"
                            value={therapistResponse}
                            onChange={(e) => setTherapistResponse(e.target.value)}
                            className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm"
                            placeholder="התגובה שלך תופיע מתחת לביקורת..."
                        />
                    </div>
                    
                    <div className="flex gap-4 mt-4">
                        <button 
                            onClick={() => handleAction('publish')}
                            disabled={loading}
                            className="inline-flex items-center justify-center flex-1 py-2 px-4 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600 disabled:opacity-50"
                        >
                            {loading ? <ButtonSpinner /> : 'פרסם חוות דעת'}
                        </button>
                        <button 
                            onClick={() => handleAction('dispute')}
                            disabled={loading}
                            className="inline-flex items-center justify-center flex-1 py-2 px-4 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 disabled:opacity-50"
                        >
                            {loading ? <ButtonSpinner /> : 'ערער (שלח למנהל)'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ViewAnswersModal;