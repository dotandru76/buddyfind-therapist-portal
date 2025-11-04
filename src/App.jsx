// src/App.jsx (של Admin Portal) - V23.8 FIX
import React, { useState, useEffect, useCallback } from 'react';
import LoginModal from './components/LoginModal'; 
import ProfileEditor from './components/ProfileEditor';
import RegisterModal from './components/RegisterModal'; 
import PendingReviews from './components/PendingReviews'; 

const API_URL = 'https://buddyfind-api.onrender.com';

function App() {
  const [authToken, setAuthToken] = useState(null); 
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); 
  const [currentView, setCurrentView] = useState('loading'); 

  // --- Token Decoder ---
  // ... (הקוד של ה-useEffect להבאת נתונים מהטוקן נשאר זהה) ...
  useEffect(() => {
    console.log("App Mount Effect: Checking for initial token...");
    const token = localStorage.getItem('therapist_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isAuthorized = payload.userType === 'admin' || (payload.userType === 'professional' && payload.professionalId);

        if (payload.exp * 1000 > Date.now() && isAuthorized) {
          console.log("App Mount Effect: Token valid and authorized."); 
          setUser({ userId: payload.userId, professionalId: payload.professionalId, userType: payload.userType });
          setAuthToken(token); 
          setCurrentView('dashboard');
        } else {
          console.warn("App Mount Effect: Token expired or unauthorized.");
          handleLogout(); 
          setError(isAuthorized ? 'פג תוקף ההתחברות, אנא התחבר מחדש.' : 'אינך מורשה לגשת לפורטל זה.');
          setCurrentView('login');
        }
      } catch (e) {
        console.error("App Mount Effect: Error decoding initial token:", e); 
        handleLogout(); 
        setError('אסימון לא תקין, אנא התחבר מחדש.');
        setCurrentView('login');
      }
    } else {
      setCurrentView('login'); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
       console.log("AuthToken Effect: AuthToken changed:", !!authToken); 
       if (authToken) {
           localStorage.setItem('therapist_token', authToken);
           try {
               const payload = JSON.parse(atob(authToken.split('.')[1]));
               
               // [*** התיקון ב-useEffect: בדיקת הרשאה נכונה ***]
               const isProfessional = payload.userType === 'professional' && payload.professionalId;
               const isAdmin = payload.userType === 'admin';
               const isAuthorized = isAdmin || isProfessional;
               
               if(isAuthorized){
                   console.log("AuthToken Effect: Setting user state:", payload); 
                   setUser({ userId: payload.userId, professionalId: payload.professionalId, userType: payload.userType });
                   if(currentView !== 'dashboard') { setCurrentView('dashboard'); }
               } else {
                   console.error("AuthToken Effect: Logged in user is unauthorized or missing Professional ID.");
                   handleLogout();
                   setError('שגיאה: חשבון אינו מוגדר כמטפל או מנהל.');
               }
           } catch (e) {
               console.error("AuthToken Effect: Error decoding token after state update:", e); 
               handleLogout();
               setError('שגיאה בעיבוד נתוני התחברות.');
           }
       } else {
           localStorage.removeItem('therapist_token');
           setUser(null);
           if(currentView !== 'login' && currentView !== 'register') { setCurrentView('login'); }
       }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [authToken]);


  const handleLogin = async (credentials) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();

      if (!res.ok) {
         throw new Error(data.error || `Login failed: ${res.status}`);
      }
      
      // [*** התיקון העיקרי ב-handleLogin ***]
      // אם המשתמש הוא admin OR professional, זה בסדר.
      const isProfessional = data.userType === 'professional' && data.professionalId;
      const isAdmin = data.userType === 'admin';
      
      if (!isProfessional && !isAdmin) {
          console.error("Login successful but is a pure client trying to access admin portal:", data);
          throw new Error("התחברת בהצלחה, אך חשבונך אינו מוגדר כמטפל או מנהל.");
      }

      setAuthToken(data.token);

    } catch (err) {
      console.error('handleLogin: Error during login fetch:', err); 
      setError(err.message || 'התחברות נכשלה.');
      setLoading(false); 
    }
  };

  const handleRegister = async (details) => {
     setLoading(true); setError('');
     try {
         if (!details.full_name?.trim()) { throw new Error('יש למלא שם מלא להרשמת מטפל.'); }
         const res = await fetch(`${API_URL}/api/register`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ email: details.email, password: details.password, full_name: details.full_name }),
         });
         const data = await res.json();
         if (!res.ok) { throw new Error(data.error || `Registration failed: ${res.status}`); }
         setCurrentView('login'); 
     } catch (err) { setError(err.message || 'ההרשמה נכשלה.'); }
     finally { setLoading(false); }
  };


  const handleLogout = () => {
    setAuthToken(null); 
  };

  // --- Render Logic ---
  return (
    <div className="min-h-screen bg-gray-100 p-4">
       <header className="bg-white shadow p-4 mb-4 rounded flex justify-between items-center">
            <h1 className="text-xl font-bold text-primary-blue">WellMatch - פורטל מטפלים</h1>
            {authToken && <button onClick={handleLogout} className="text-sm text-red-600 hover:underline">התנתק</button>}
       </header>

        {error && !loading && (
             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-right" role="alert">
                 <span className="block sm:inline">{error}</span>
                 <span className="absolute top-0 bottom-0 left-0 px-4 py-3 cursor-pointer" onClick={() => setError('')}>
                    <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                 </span>
             </div>
        )}

      <main>
        {currentView === 'loading' && <div className="text-center p-10"><div className="spinner w-10 h-10"></div></div>}
        {currentView === 'login' && <LoginModal handleLogin={handleLogin} loading={loading} onRegisterClick={() => {setCurrentView('register'); setError('');}} />}
        {currentView === 'register' && <RegisterModal handleRegister={handleRegister} loading={loading} onLoginClick={() => {setCurrentView('login'); setError('');}} />}
        
        {/* --- הצגת Dashboard למנהל (ADMIN) --- */}
        {currentView === 'dashboard' && user?.userType === 'admin' && (
             <AdminDashboard
                authToken={authToken}
                API_URL={API_URL}
                user={user}
                onLogout={handleLogout}
             />
        )}
        
        {/* --- הצגת Dashboard למטפל (PROFESSIONAL) --- */}
        {currentView === 'dashboard' && user?.userType === 'professional' && authToken && (
          <div className="space-y-8">
            <PendingReviews
              authToken={authToken}
              API_URL={API_URL}
              user={user}
              onLogout={handleLogout}
            />
            <ProfileEditor
              authToken={authToken}
              API_URL={API_URL}
              user={user}
              onUpdateSuccess={() => { console.log("Profile updated successfully"); setError(''); }}
              onLogout={handleLogout}
            />
          </div>
        )}
         
         {currentView === 'dashboard' && !user?.userType && !loading && (
             <div className="text-center p-10 text-red-600">שגיאה בטעינת נתוני מטפל. נסה להתחבר מחדש.</div>
         )}
      </main>
    </div>
  );
}

export default App;