// src/components/PendingReviews.jsx
import React, { useState, useEffect } from 'react';

// --- רכיבי עזר שנעתיק מ-ProfileEditor ---
const AlertMessage = ({ type, message, onDismiss }) => {
    if (!message) return null;
    const baseClasses = "px-4 py-3 rounded relative mb-6 text-right";
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
const ButtonSpinner = ({ color = 'primary-blue' }) => ( <div className={`spinner w-5 h-5 border-t-white border-r-white border-b-white border-l-${color}`}></div> );
// --- סוף רכיבי עזר ---

const PendingReviews = ({ authToken, API_URL, onLogout }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // ID של הביקורת שמטופלת

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/professionals/me/pending-reviews`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (res.status === 401 || res.status === 403) {
        onLogout(); // התנתקות אם הטוקן לא תקין
        return;
      }
      if (!res.ok) throw new Error('שגיאה באחזור ביקורות');
      const data = await res.json();
      setReviews(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [authToken, API_URL, onLogout]); // הוספנו תלויות

  const handleAction = async (reviewId, action) => {
    setActionLoading(reviewId); // מציג טעינה על הכפתור הספציפי
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/professionals/me/reviews/${reviewId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ action }), // 'publish' or 'dispute'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'פעולה נכשלה');
      
      setMessage(`ביקורת ${reviewId} עודכנה בהצלחה.`);
      // רענן רשימה
      setReviews(prev => prev.filter(r => r.id !== reviewId));

    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null); // הסר טעינה
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow w-full mx-auto text-right mb-8">
      <h3 className="text-xl font-bold text-text-dark mb-4">חוות דעת ממתינות לאישור</h3>
      
      <AlertMessage type="success" message={message} onDismiss={() => setMessage(null)} />
      <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />

      {loading && <div className="text-center p-5"><div className="spinner w-8 h-8"></div></div>}
      
      {!loading && reviews.length === 0 && (
        <p className="text-gray-500 text-center py-4">אין חוות דעת הממתינות לאישור.</p>
      )}

      <div className="space-y-4">
        {reviews.map(review => (
          <div key={review.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">
                {new Date(review.created_at).toLocaleDateString('he-IL')}
              </span>
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                דירוג: {review.rating} / 5
              </span>
            </div>
            
            <p className="text-gray-700 mb-4">{review.review_text}</p>
            
            <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
              <p className="text-sm font-medium text-gray-700">
                שאלה: האם קוד האימות הבא מוכר לך כמטופל?
              </p>
              <p className="text-lg font-bold text-secondary-purple text-center my-2 tracking-wider">
                {review.verification_code_used}
              </p>
              <div className="flex gap-4 mt-3">
                <button 
                  onClick={() => handleAction(review.id, 'publish')}
                  disabled={!!actionLoading}
                  className="inline-flex items-center justify-center flex-1 py-2 px-4 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600 disabled:opacity-50"
                >
                  {actionLoading === review.id ? <ButtonSpinner color="green-500" /> : 'אשר ופרסם'}
                </button>
                <button 
                  onClick={() => handleAction(review.id, 'dispute')}
                  disabled={!!actionLoading}
                  className="inline-flex items-center justify-center flex-1 py-2 px-4 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 disabled:opacity-50"
                >
                  {actionLoading === review.id ? <ButtonSpinner color="red-500" /> : 'ערער (קוד לא מוכר)'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingReviews;