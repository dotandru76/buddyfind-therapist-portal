// src/components/LogContactForm.jsx
// --- רכיב חדש לדיווח על תחילת טיפול ---

import React, { useState } from 'react';

// (רכיבי עזר פנימיים)
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
const ButtonSpinner = () => ( <div className="spinner w-5 h-5 border-t-white border-r-white border-b-white border-l-primary-blue"></div> );


const LogContactForm = ({ authToken, API_URL, user }) => {
    const [anonymousId, setAnonymousId] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!anonymousId.trim()) {
            setError('יש להזין את קוד הזיהוי האנונימי של המטופל.');
            return;
        }
        
        setLoading(true); setError(null); setMessage(null);
        
        try {
            const res = await fetch(`${API_URL}/api/professionals/me/log-contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({ client_anonymous_id: anonymousId.trim() }),
            });
            
            const data = await res.json();
            
            if (!res.ok) {
                // שגיאות 404/409/400 מהשרת מוחזרות כ-error
                throw new Error(data.error || 'שגיאה כללית בדיווח.');
            }
            
            setMessage(data.message || 'הדיווח התקבל בהצלחה.');
            setAnonymousId(''); // איפוס הטופס
            
        } catch (err) {
            setError(err.message || 'שגיאה ברשת או בשרת.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 md:p-8 rounded-lg shadow w-full max-w-xl mx-auto text-right mb-8">
            <h3 className="text-xl font-bold text-text-dark mb-4 border-b pb-3">דיווח על תחילת טיפול</h3>
            <p className="text-sm text-gray-600 mb-6">
                נא להזין את הקוד האנונימי שקיבלת מהמטופל. לאחר 60 יום, המערכת תשלח לו שאלון חוות דעת אוטומטי.
            </p>

            <AlertMessage type="success" message={message} onDismiss={() => setMessage(null)} />
            <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="anon-id" className="block text-sm font-medium text-gray-700 mb-1">
                        קוד זיהוי אנונימי של המטופל (דוגמה: WM-U-ABC123)
                    </label>
                    <input
                        id="anon-id"
                        type="text"
                        value={anonymousId}
                        onChange={(e) => setAnonymousId(e.target.value.toUpperCase())}
                        required
                        placeholder="WM-U-XXXXXXX"
                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue text-center"
                        style={{ direction: 'ltr', letterSpacing: '1px' }}
                    />
                </div>
                
                <div className="flex justify-end pt-4 border-t border-gray-200">
                    <button 
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center justify-center py-2.5 px-6 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? <ButtonSpinner /> : 'דווח על התחלת טיפול'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default LogContactForm;