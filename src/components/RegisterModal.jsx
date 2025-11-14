// src/components/RegisterModal.jsx
import React, { useState } from 'react';

const RegisterModal = ({ handleRegister, loading, onLoginClick, authError }) => { // הוספנו קבלת שגיאה
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState(''); 
    const [formError, setFormError] = useState(null);
    const [shake, setShake] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormError(null);
        setShake(true); // הפעל אנימציה בכל לחיצה לבדיקה

        if (!fullName.trim()) { setFormError('יש למלא שם מלא.'); return; }
        if (password !== confirmPassword) { setFormError('הסיסמאות אינן תואמות.'); return; }
        if (password.length < 6) { setFormError('הסיסמה חייבת להכיל לפחות 6 תווים.'); return; }

        setShake(false); // בטל אנימציה אם הכל תקין
        handleRegister({ email, password, full_name: fullName });
    };
    
    React.useEffect(() => {
        if (authError) { // הפעל אנימציה גם בשגיאות שרת
            setShake(true);
        }
    }, [authError]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] p-4">
            <div 
                className={`w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-2xl ${shake ? 'shake-error' : ''}`}
                onAnimationEnd={() => setShake(false)} // איפוס אנימציה
            >
                <h2 className="text-2xl font-bold text-center text-text-dark">יצירת חשבון מטפל חדש</h2>
                <p className="text-center text-sm text-text-light">מלאו את הפרטים להרשמה.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                         <label htmlFor="fullName" className="sr-only">Full Name</label>
                         <input
                            id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="שם מלא"
                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue text-right"
                            autoComplete="name"
                        />
                    </div>
                    <div>
                         <label htmlFor="email-register" className="sr-only">Email address</label>
                         <input
                            id="email-register" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="כתובת אימייל"
                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue text-left"
                            style={{ direction: 'ltr' }} autoComplete="email"
                        />
                    </div>
                    <div>
                        <label htmlFor="password-register" className="sr-only">Password</label>
                        <input
                            id="password-register" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="סיסמה (לפחות 6 תווים)"
                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue text-left"
                            style={{ direction: 'ltr' }} autoComplete="new-password"
                        />
                    </div>
                    <div>
                         <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
                         <input
                            id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="אימות סיסמה"
                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue text-left"
                            style={{ direction: 'ltr' }} autoComplete="new-password"
                        />
                    </div>

                    {formError && <p className="text-red-600 text-sm text-center p-2 bg-red-50 rounded">{formError}</p>}
                    
                    <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-blue hover:bg-secondary-purple focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? <div className="spinner w-5 h-5 border-t-white border-r-white border-b-white border-l-primary-blue"></div> : 'הרשמה'}
                    </button>
                </form>

                <div className="text-center text-sm">
                    <p className="text-text-light"> כבר יש לך חשבון?{' '} <button onClick={onLoginClick} className="font-medium text-primary-blue hover:text-secondary-purple underline"> התחברות </button> </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterModal;