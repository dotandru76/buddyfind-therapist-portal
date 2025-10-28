import React, { useState, useEffect, useCallback } from 'react';
import ProfileEditor from './components/ProfileEditor';
import RegisterModal from './components/RegisterModal';

const API_URL = import.meta.env.VITE_API_URL || 'https://buddyfind-api.onrender.com';

// --- Login Component (כבר תקין) ---
const LoginModal = ({ handleLogin, loading, error, onRegisterClick }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
      e.preventDefault();
      handleLogin(email, password);
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-2xl">
          <h2 className="text-2xl font-bold text-center text-text-dark">ברוכים הבאים, מטפלים</h2>
          <p className="text-center text-sm text-text-light">התחברו או צרו חשבון כדי להתחיל.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="כתובת אימייל" className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue text-left" style={{ direction: 'ltr' }} />
            </div>
            <div>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="סיסמה" className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue text-left" style={{ direction: 'ltr' }} />
            </div>
            <div className="flex justify-end text-sm">
              <a href="#" className="font-medium text-primary-blue hover:text-secondary-purple">שכחת סיסמה?</a>
            </div>
            {error && <p className="text-red-600 text-sm text-center p-2 bg-red-50 rounded">{error}</p>}
            <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-blue hover:bg-secondary-purple focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <div className="spinner"></div> : 'התחברות'}
            </button>
          </form>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-500">או</span></div>
          <button type="button" onClick={onRegisterClick} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-blue hover:bg-secondary-purple focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue">
            חדש/ה ב-BuddyFind? יצירת חשבון
          </button>
        </div>
      </div>
    );
  };

// --- Main App Component ---
const App = () => {
  const [view, setView] = useState('login'); // Initial view state
  const [authToken, setAuthToken] = useState(null); // Initialize token as null
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null); // Initialize user as null

  const switchToRegister = useCallback(() => { setError(null); setView('register'); }, []);
  const switchToLogin = useCallback(() => { setError(null); setView('login'); }, []);

  const handleLogout = useCallback(() => {
    console.log("Logging out...");
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem('therapist_token');
    setView('login'); // Ensure view switches to login on logout
  }, []); // Removed setView from dependencies


  // --- *** EFFECT 1: Check initial token on component mount *** ---
  useEffect(() => {
    const storedToken = localStorage.getItem('therapist_token');
    if (storedToken) {
      console.log("Effect 1: Found token in storage on mount.");
      setAuthToken(storedToken); // Set token state
      try {
        const decodedToken = JSON.parse(atob(storedToken.split('.')[1]));
        // --- *** שינוי: שמירת professionalId גם כאן *** ---
        setUser({ userId: decodedToken.userId || 'unknown', professionalId: decodedToken.professionalId || null });
        setView('dashboard'); // Switch view immediately if token is valid
        console.log("Effect 1: Setting view to dashboard on mount.");
      } catch (e) {
        console.error("Effect 1: Failed to decode token on mount:", e);
        handleLogout(); // Log out if token is invalid
      }
    } else {
        console.log("Effect 1: No token found on mount, view remains login.");
         // No need to explicitly setView('login') here as it's the default
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array: Runs only once on mount


  // --- *** EFFECT 2: Handle changes in authToken (after login) or view changes *** ---
  useEffect(() => {
      console.log(`Effect 2 triggered: authToken=${!!authToken}, view=${view}`);
      if (authToken) {
          // Store token whenever it's set/updated
          localStorage.setItem('therapist_token', authToken);
          // If we have a token, we should be on the dashboard.
          // This handles the switch AFTER successful login.
          if (view !== 'dashboard') {
              console.log("Effect 2: Token exists, ensuring view is dashboard.");
              setView('dashboard');
          }
          // Make sure user state is also set if token exists but user isn't set yet
          if (!user) {
               try {
                   const decodedToken = JSON.parse(atob(authToken.split('.')[1]));
                   setUser({ userId: decodedToken.userId || 'unknown', professionalId: decodedToken.professionalId || null });
               } catch (e) {
                   console.error("Effect 2: Failed to decode token:", e);
                   handleLogout(); // Log out if token becomes invalid
               }
          }
      } else {
          // AuthToken is null or undefined (logout or initial state without token)
          localStorage.removeItem('therapist_token');
          // If we are supposed to be on dashboard but have no token, switch to login
          if (view === 'dashboard') {
              console.log("Effect 2: No token, but view is dashboard. Switching to login.");
              setUser(null); // Clear user state as well
              setView('login');
          }
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, view, user]); // Depend on authToken, view and user


  const handleLogin = useCallback(async (email, password) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ההתחברות נכשלה');
      console.log("Login successful, received data:", data);
      // --- *** שינוי: שמירת professionalId מהתגובה *** ---
      setUser({ userId: data.userId, professionalId: data.professionalId || null });
      setAuthToken(data.token); // This will trigger Effect 2 to store token and switch view
      // No need to call setView('dashboard') here, Effect 2 will handle it
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []); // Removed dependency on setUser and setAuthToken

  const handleRegister = useCallback(async (userData) => { /* ... (ללא שינוי) ... */
    setLoading(true); setError(null);
    try {
        const res = await fetch(`${API_URL}/api/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userData) });
        const data = await res.json();
        if (!res.ok) { throw new Error(data.error || `ההרשמה נכשלה (סטטוס ${res.status})`); }
        alert('ההרשמה בוצעה בהצלחה! כעת ניתן להתחבר.');
        switchToLogin();
    } catch (err) {
        console.error('Registration error:', err);
        setError(err.message);
    } finally {
        setLoading(false);
    }
  }, [switchToLogin]);


  // --- Dashboard View (כבר תקין) ---
  const DashboardView = () => (
    <div className="min-h-screen p-8 bg-gray-50 text-right">
      <div className="flex justify-between items-center mb-10 border-b pb-4">
        <h1 className="text-3xl font-semibold text-text-dark">לוח בקרה למטפל</h1>
        <button onClick={handleLogout} className="px-4 py-2 border border-red-400 text-red-600 rounded-md hover:bg-red-50 transition">התנתק</button>
      </div>
      {/* We pass user which now includes professionalId if available */}
      <ProfileEditor authToken={authToken} API_URL={API_URL} user={user} onLogout={handleLogout} />
    </div>
  );

  // --- Render Logic ---
  console.log(`Rendering view: ${view}`); // הוספנו לוג לבדיקה
  if (view === 'login') {
    return <LoginModal handleLogin={handleLogin} loading={loading} error={error} onRegisterClick={switchToRegister} />;
  }
  if (view === 'register') {
    return <RegisterModal handleRegister={handleRegister} loading={loading} error={error} onLoginClick={switchToLogin} />;
  }
  if (view === 'dashboard') {
    // Render dashboard only if we have a valid user object (which includes userId)
    return user?.userId ? <DashboardView /> : <div className="flex justify-center items-center min-h-screen"><p className="text-xl">טוען נתוני משתמש...</p></div>;
  }

  // Fallback/Initial Loading state before Effect 1 determines the view
  return <div className="flex justify-center items-center min-h-screen"><p className="text-xl">טוען...</p></div>;
};

export default App;