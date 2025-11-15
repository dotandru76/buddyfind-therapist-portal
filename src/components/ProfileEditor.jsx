// src/components/ProfileEditor.jsx - SECURED
import React, { useState, useEffect, useRef } from 'react';
// ... (ייבוא רכיבי עזר) ...

// --- !!! התיקון: הסרת authToken מה-props ---
const ProfileEditor = ({ API_URL, user, onUpdateSuccess, onLogout }) => {
    // ... (כל ה-state הפנימי ללא שינוי) ...
    const [formData, setFormData] = useState({ /* ... */ });
    // ...

    // --- Fetch initial data ---
    useEffect(() => {
        let isMounted = true;
        const fetchInitialData = async () => {
            // ...
            try {
                // --- !!! התיקון: שימוש בעוגיות !!! ---
                const fetchOptions = { credentials: 'include' }; 
                
                const optionsRes = await fetch(`${API_URL}/api/data/options`, fetchOptions);
                if (!isMounted) return;

                if (optionsRes.status === 401 || optionsRes.status === 403) {
                     if (onLogout) onLogout(); return;
                }
                // ... (המשך הלוגיקה ללא שינוי) ...
                
            } catch (err) {
                 if (isMounted) setError(`שגיאה בטעינת נתונים: ${err.message}`);
            } finally {
                if (isMounted) { setLoading(false); }
            }
        };
        fetchInitialData();
        // --- !!! התיקון: הסרת authToken מהתלויות ---
    }, [API_URL, user, onLogout]); 

    // ... (כל ה-Handlers הפנימיים ללא שינוי - handleChange, וכו') ...

    // --- Image Cropper Logic ---
    const uploadCroppedImage = async (imageBlob) => {
        setSavingImage(true); setError(null); setMessage(null);
        try {
            const uploadFormData = new FormData(); 
            uploadFormData.append('profileImage', imageBlob, 'profile.jpg');
            
            // --- !!! התיקון: שימוש בעוגיות !!! ---
            const res = await fetch(`${API_URL}/api/professionals/me/upload-image`, { 
                method: 'POST', 
                credentials: 'include', // <-- הוספה
                // headers: { 'Authorization': `Bearer ${authToken}` }, <-- הוסר
                body: uploadFormData 
            });
            
            if (res.status === 401 || res.status === 403) { onLogout(); return; }
            const data = await res.json(); 
            if (!res.ok) { throw new Error(data.error || 'Image upload failed'); }
            setFormData(prev => ({ ...prev, profile_image_url: data.imageUrl })); 
            setMessage('תמונה הועלתה בהצלחה!');
        } catch (err) { /* ... */ }
        finally { setSavingImage(false); }
    };

    // --- Submit Handlers ---
    const handleProfileSubmit = async (e) => {
        e.preventDefault(); setSavingProfile(true); setError(null); setMessage(null);
        try {
            // ... (לוגיקת payload ללא שינוי) ...
            
            // --- !!! התיקון: שימוש בעוגיות !!! ---
            const res = await fetch(`${API_URL}/api/professionals/me`, { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload),
                credentials: 'include' // <-- הוספה
                // 'Authorization': `Bearer ${authToken}` <-- הוסר
            });
            
            if (res.status === 401 || res.status === 403) { onLogout(); return; }
            // ... (המשך לוגיקה ללא שינוי) ...
        } catch (err) { /* ... */ }
        finally { setSavingProfile(false); }
    };
    
    const handleAvailabilitySubmit = async () => {
        setSavingAvailability(true); setError(null); setMessage(null);
        try {
             // --- !!! התיקון: שימוש בעוגיות !!! ---
             const res = await fetch(`${API_URL}/api/professionals/me/availability`, { 
                 method: 'PUT', 
                 headers: { 'Content-Type': 'application/json' }, 
                 body: JSON.stringify({ availability: formData.availability || {} }),
                 credentials: 'include' // <-- הוספה
             });
             if (res.status === 401 || res.status === 403) { onLogout(); return; }
             // ... (המשך לוגיקה ללא שינוי) ...
        } catch (err) { /* ... */ }
         finally { setSavingAvailability(false); }
    };

    // ... (כל ה-JSX ללא שינוי) ...
    return (
        // ... (כל ה-JSX נשאר זהה לקובץ המקורי שלך) ...
    );
};

export default ProfileEditor;