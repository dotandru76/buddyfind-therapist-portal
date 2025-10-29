import React, { useState, useEffect, useCallback } from 'react';
import ProfileEditor from './components/ProfileEditor';

const API_URL = import.meta.env.VITE_API_URL || 'https://buddyfind-api.onrender.com';

// --- Login Component (עם העיצוב שלנו) ---
const LoginModal = ({ handleLogin, loading, error, onRegisterClick }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin(email, password);
  };

  return (
    // רקע אפור בהיר מתוך style.css
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100"> 
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-center text-text-dark">ברוכים הבאים, מטפלים</h2>
        <p className="text-center text-sm text-text-light">התחברו או צרו חשבון כדי להתחיל.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required placeholder="כתובת אימייל"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue text-left"
              style={{ direction: 'ltr' }}
            />
          </div>
          <div>
            <input
              id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required placeholder="סיסמה"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue text-left"
              style={{ direction: 'ltr' }}
            />
          </div>
          <div className="flex justify-end text-sm">
            <a href="#" className="font-medium text-primary-blue hover:text-secondary-purple">
              שכחת סיסמה?
            </a>
          </div>
          {error && (
            <p className="text-red-600 text-sm text-center p-2 bg-red-50 rounded">{error}</p>
          )}
          <button
            type="submit" disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-blue hover:bg-secondary-purple focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <div className="spinner w-5 h-5 border-t-white border-r-white border-b-white border-l-primary-blue"></div> : 'התחבר'}
          </button>
        </form>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-400">או</span>
        </div>
        <button
          type="button" onClick={onRegisterClick}
          className="w-full flex justify-center py-2.5 px-4 border border-primary-blue text-primary-blue rounded-md shadow-sm text-sm font-medium hover:bg-primary-blue/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue"
        >
          חדשים ב-BuddyFind? צרו חשבון
        </button>
      </div>
    </div>
  );
};

// --- Register Component (עם העיצוב שלנו) ---
const RegisterModal = ({ handleRegister, loading, error, onLoginClick }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('הסיסמאות לא תואמות'); // TODO: להחליף ב-setError
      return;
    }
    handleRegister({ email, password, full_name: fullName });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-center text-text-dark">הרשמה למערכת</h2>
        <p className="text-center text-sm text-text-light">צרו חשבון חדש כדי להצטרף</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
              required placeholder="שם מלא"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue"
            />
          </div>
          <div>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required placeholder="כתובת דוא״ל"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue text-left"
              style={{ direction: 'ltr' }}
            />
          </div>
          <div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength="6" placeholder="סיסמה (לפחות 6 תווים)"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue text-left"
              style={{ direction: 'ltr' }}
            />
          </div>
          <div>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              required minLength="6" placeholder="אימות סיסמה"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue text-left"
              style={{ direction: 'ltr' }}
            />
          </div>
          {error && (
            <p className="text-red-600 text-sm text-center p-2 bg-red-50 rounded">{error}</p>
          )}
          <button
            type="submit" disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-blue hover:bg-secondary-purple focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <div className="spinner w-5 h-5 border-t-white border-r-white border-b-white border-l-primary-blue"></div> : 'הרשמה'}
          </button>
        </form>
        <div className="text-center text-sm">
            <button type="button" onClick={onLoginClick} className="font-medium text-primary-blue hover:text-secondary-purple underline">
                כבר יש לך חשבון? התחבר
            </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component (עם הלוגיקה הנכונה) ---
const App = () => {
  console.log("App component function started");
  
  const [authToken, setAuthToken] = useState(localStorage.getItem('therapist_token'));
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const switchToRegister = useCallback(() => { setError(null); setCurrentView('register'); }, []);
  const switchToLogin = useCallback(() => { setError(null); setCurrentView('login'); }, []);

  const handleLogout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem('therapist_token');
    setCurrentView('login');
  }, []);

  // Validate initial token on mount
  useEffect(() => {
    const initialToken = localStorage.getItem('therapist_token');
    if (initialToken) {
      console.log("App Mount Effect: Found initial token.");
      try {
        const decodedToken = JSON.parse(atob(initialToken.split('.')[1]));
        setUser({
          userId: decodedToken.userId || 'unknown',
          professionalId: decodedToken.professionalId || null
        });
        setAuthToken(initialToken);
      } catch (e) {
        console.error("App Mount Effect: Invalid token found.", e);
        handleLogout();
      }
    } else {
      console.log("App Mount Effect: No initial token found.");
      setUser(null);
    }
  }, [handleLogout]); // הוספנו את handleLogout כתלות

  // Login Handler
  const handleLogin = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ההתחברות נכשלה');
      
      console.log("Login successful:", data);
      localStorage.setItem('therapist_token', data.token);
      setUser({
        userId: data.userId,
        professionalId: data.professionalId || null
      });
      setAuthToken(data.token);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []); // הסרנו תלויות מיותרות

  // Register Handler
  const handleRegister = useCallback(async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ההרשמה נכשלה');
      
      console.log("Registration successful:", data);
      setError(null);
      switchToLogin();
      alert('ההרשמה הצליחה! כעת תוכל להתחבר');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [switchToLogin]);

  // Dashboard View
  const DashboardView = () => (
    <div className="min-h-screen p-4 md:p-8 bg-gray-100 text-right">
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-6 md:mb-10 pb-4 border-b border-gray-300">
        <h1 className="text-2xl md:text-3xl font-bold text-text-dark">לוח בקרה למטפל</h1>
        <button
          onClick={handleLogout}
          className="text-sm px-4 py-2 border border-red-400 text-red-600 rounded-md hover:bg-red-50 transition duration-150 ease-in-out"
        >
          התנתק
        </button>
      </header>
      <main className="max-w-7xl mx-auto">
        {/* ProfileEditor צריך עכשיו לקבל את ה-props הנכונים */}
        <ProfileEditor 
          authToken={authToken} 
          API_URL={API_URL}
          user={user} // העברנו את אובייקט המשתמש
          onLogout={handleLogout} // העברנו פונקציית התנתקות
        />
      </main>
    </div>
  );

  // Render Logic
  console.log(`App Rendering: AuthToken=${!!authToken}, User=${!!user}, currentView=${currentView}`);

  if (authToken && user) {
    return <DashboardView />;
  } else if (currentView === 'register') {
    return (
      <RegisterModal
        handleRegister={handleRegister}
        loading={loading}
        error={error}
        onLoginClick={switchToLogin}
      />
    );
  } else {
    return (
      <LoginModal
        handleLogin={handleLogin}
        loading={loading}
        error={error}
        onRegisterClick={switchToRegister}
      />
    );
  }
};

export default App;