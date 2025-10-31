// src/App.jsx (FOR ADMIN PORTAL ONLY - Final Version with POST fix)
import React, { useState, useEffect } from 'react';
import LoginModal from './components/LoginModal'; // Ensure LoginModal.jsx exists in ./components
import ProfileEditor from './components/ProfileEditor'; // Ensure ProfileEditor.jsx exists in ./components
import RegisterModal from './components/RegisterModal'; // Ensure RegisterModal.jsx exists in ./components

// Use environment variable for API URL if available, otherwise default
const API_URL = import.meta.env.VITE_API_URL || 'https://buddyfind-api.onrender.com';

function App() {
  const [authToken, setAuthToken] = useState(null); // Initialize as null
  const [user, setUser] = useState(null); // Will store { userId, professionalId, userType }
  const [loading, setLoading] = useState(false); // General loading state
  const [error, setError] = useState(''); // General error display
  const [currentView, setCurrentView] = useState('loading'); // Start in loading state: 'loading', 'login', 'register', 'dashboard'

  // Effect to handle initial token check and decoding on component mount
  useEffect(() => {
    console.log("App Mount Effect: Checking for initial token..."); // Debug Log
    const token = localStorage.getItem('therapist_token');
    if (token) {
      console.log("App Mount Effect: Found initial token."); // Debug Log
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Basic check for expiration
        if (payload.exp * 1000 > Date.now()) {
          // Check if it's a valid professional token
          if (payload.userType === 'professional' && payload.professionalId) {
            console.log("App Mount Effect: Token valid and is professional. Setting state."); // Debug Log
            setUser({ userId: payload.userId, professionalId: payload.professionalId, userType: payload.userType });
            setAuthToken(token); // Set the token state
            setCurrentView('dashboard'); // Set view to dashboard
          } else {
            console.warn("App Mount Effect: Token valid but not for a professional user or missing ID."); // Debug Log
            handleLogout(); // Force logout
            setError('חשבון לא מוגדר כמטפל.');
            setCurrentView('login'); // Ensure view is login
          }
        } else {
          console.warn("App Mount Effect: Token expired."); // Debug Log
          handleLogout(); // Token expired
          setError('פג תוקף ההתחברות, אנא התחבר מחדש.');
          setCurrentView('login'); // Ensure view is login
        }
      } catch (e) {
        console.error("App Mount Effect: Error decoding initial token:", e); // Debug Log
        handleLogout(); // Invalid token format
        setError('אסימון לא תקין, אנא התחבר מחדש.');
        setCurrentView('login'); // Ensure view is login
      }
    } else {
      console.log("App Mount Effect: No initial token found."); // Debug Log
      setCurrentView('login'); // No token, go to login
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Effect to update localStorage and user state when authToken changes state
   useEffect(() => {
       console.log("AuthToken Effect: AuthToken changed:", !!authToken); // Debug Log
       if (authToken) {
           localStorage.setItem('therapist_token', authToken);
           try {
               const payload = JSON.parse(atob(authToken.split('.')[1]));
               // Ensure userType is professional AND professionalId exists
               if(payload.userType === 'professional' && payload.professionalId){
                   console.log("AuthToken Effect: Setting user state:", payload); // Debug Log
                   setUser({ userId: payload.userId, professionalId: payload.professionalId, userType: payload.userType });
                   // Only switch view if not already on dashboard (prevents flicker on initial load)
                   if(currentView !== 'dashboard') {
                       console.log("AuthToken Effect: Switching view to dashboard."); // Debug Log
                       setCurrentView('dashboard');
                   }
               } else {
                   // Logged in successfully but server didn't return expected data for admin
                   console.error("AuthToken Effect: Logged in user is not a valid professional for admin portal."); // Debug Log
                   handleLogout();
                   setError('שגיאה: חשבון אינו מוגדר כמטפל.');
               }
           } catch (e) {
               console.error("AuthToken Effect: Error decoding token after state update:", e); // Debug Log
               handleLogout();
               setError('שגיאה בעיבוד נתוני התחברות.');
           }
       } else {
           console.log("AuthToken Effect: Clearing token and user state."); // Debug Log
           localStorage.removeItem('therapist_token');
           setUser(null);
           // Only switch view if not already on login/register
           if(currentView !== 'login' && currentView !== 'register') {
               console.log("AuthToken Effect: Switching view to login."); // Debug Log
               setCurrentView('login');
           }
       }
   // Only depend on authToken, view change is handled internally
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [authToken]);


  // --- Authentication Handlers ---
  const handleLogin = async (credentials) => {
    console.log("handleLogin started", credentials); // Debug Log
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        
        // *** !!! התיקון הקריטי כאן !!! ***
        method: 'POST',
        // **********************************

        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      console.log("handleLogin: Fetch response status:", res.status); // Debug Log
      const data = await res.json();
      console.log("handleLogin: Fetch response data:", data); // Debug Log

      if (!res.ok) {
         // Check specific server errors first
         if (res.status === 403 && data.error?.includes('הפרופיל המקצועי חסר')) {
             throw new Error(data.error);
         }
         // Use the error message from the JSON body if available, otherwise use statusText
         throw new Error(data.error || res.statusText || `Login failed: ${res.status}`);
      }

       // Crucial check for Admin Portal: Ensure professionalId exists
       if (data.professionalId === null || data.professionalId === undefined) {
           console.error("Login successful but professionalId is missing for admin portal:", data);
           throw new Error("התחברת בהצלחה אך חשבונך אינו מוגדר כמטפל.");
       }

      console.log("handleLogin: Login successful, setting auth token."); // Debug Log
      setAuthToken(data.token); // This triggers the useEffect to update user and view

    } catch (err) {
      console.error('handleLogin: Error during login fetch:', err); // Debug Log
      setError(err.message || 'התחברות נכשלה.');
      setLoading(false); // Ensure loading stops on error, as useEffect won't run
    }
    // setLoading(false) is implicitly handled by setAuthToken triggering useEffect on success
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
         // NOTE: Removed alert() as per instructions, assuming RegisterModal handles its own UI feedback
         setCurrentView('login'); // Switch to login view
     } catch (err) { setError(err.message || 'ההרשמה נכשלה.'); }
     finally { setLoading(false); }
  };


  const handleLogout = () => {
    console.log("handleLogout called"); // Debug Log
    setAuthToken(null); // Triggers useEffect to clear localStorage, user, and set view to 'login'
  };

  console.log(`App Rendering: AuthToken=${!!authToken}, User=${!!user}, currentView=${currentView}`); // Debug Log

  // --- Render Logic ---
  return (
    <div className="min-h-screen bg-gray-100 p-4">
       {/* Simple Header */}
       <header className="bg-white shadow p-4 mb-4 rounded flex justify-between items-center">
            <h1 className="text-xl font-bold text-primary-blue">WellMatch - פורטל מטפלים</h1>
            {authToken && <button onClick={handleLogout} className="text-sm text-red-600 hover:underline">התנתק</button>}
       </header>

        {/* General Error Display */}
        {error && !loading && (
             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-right" role="alert">
                 <span className="block sm:inline">{error}</span>
                 <span className="absolute top-0 bottom-0 left-0 px-4 py-3 cursor-pointer" onClick={() => setError('')}>
                    <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                 </span>
             </div>
        )}

      {/* Main Content Area */}
      <main>
        {currentView === 'loading' && <div className="text-center p-10"><div className="spinner"></div></div>}
        {currentView === 'login' && <LoginModal handleLogin={handleLogin} loading={loading} onRegisterClick={() => {setCurrentView('register'); setError('');}} />}
        {currentView === 'register' && <RegisterModal handleRegister={handleRegister} loading={loading} onLoginClick={() => {setCurrentView('login'); setError('');}} />}
        {currentView === 'dashboard' && user?.professionalId && authToken && (
          <ProfileEditor
            authToken={authToken}
            API_URL={API_URL}
            user={user}
            onUpdateSuccess={() => { console.log("Profile updated successfully"); setError(''); }} // Clear errors on success
            onLogout={handleLogout}
          />
        )}
         {/* Shows if dashboard is expected but user data isn't ready or invalid */}
         {currentView === 'dashboard' && !user?.professionalId && !loading && (
             <div className="text-center p-10 text-red-600">שגיאה בטעינת נתוני מטפל. נסה להתחבר מחדש.</div>
         )}
      </main>
    </div>
  );
}

export default App;
