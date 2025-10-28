import React, { useState } from 'react';

const RegisterModal = ({ handleRegister, loading, error, onLoginClick }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState(''); // הוספנו שם מלא
    const [formError, setFormError] = useState(null); // שגיאה ספציפית לטופס

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormError(null); // איפוס שגיאת טופס

        // בדיקת התאמת סיסמאות
        if (password !== confirmPassword) {
            setFormError('הסיסמאות אינן תואמות.');
            return;
        }
        // בדיקת אורך סיסמה (מינימום 6 תווים לדוגמה)
        if (password.length < 6) {
          setFormError('הסיסמה חייבת להכיל לפחות 6 תווים.');
          return;
        }

        // העברת הנתונים לפונקציה הראשית
        handleRegister({
          email,
          password,
          full_name: fullName // שינוי שם השדה להתאמה לשרת (אם נדרש)
        });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-2xl">
                {/* <img src="/path/to/your/logo.png" alt="BuddyFind Logo" className="w-32 mx-auto mb-4"/> */}
                <h2 className="text-2xl font-bold text-center text-text-dark">יצירת חשבון מטפל חדש</h2>
                <p className="text-center text-sm text-text-light">מלאו את הפרטים להרשמה.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* שם מלא */}
                    <div>
                         <input
                            id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                            required placeholder="שם מלא"
                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue text-right"/>
                    </div>
                    {/* אימייל */}
                    <div>
                         <input
                            id="email-register" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                            required placeholder="כתובת אימייל"
                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue text-left"
                            style={{ direction: 'ltr' }} />
                    </div>
                    {/* סיסמה */}
                    <div>
                        <input
                            id="password-register" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                            required placeholder="סיסמה (לפחות 6 תווים)"
                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue text-left"
                            style={{ direction: 'ltr' }} />
                    </div>
                     {/* אימות סיסמה */}
                    <div>
                         <input
                            id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                            required placeholder="אימות סיסמה"
                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue text-left"
                            style={{ direction: 'ltr' }} />
                    </div>

                    {/* הצגת שגיאות */}
                    {formError && <p className="text-red-600 text-sm text-center p-2 bg-red-50 rounded">{formError}</p>}
                    {error && <p className="text-red-600 text-sm text-center p-2 bg-red-50 rounded">{error}</p>}

                    <button
                        type="submit" disabled={loading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-blue hover:bg-secondary-purple focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? <div className="spinner"></div> : 'הרשמה'}
                    </button>
                </form>

                <div className="text-center text-sm">
                    <p className="text-text-light">
                        כבר יש לך חשבון?{' '}
                        <button onClick={onLoginClick} className="font-medium text-primary-blue hover:text-secondary-purple underline">
                            התחברות
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterModal;