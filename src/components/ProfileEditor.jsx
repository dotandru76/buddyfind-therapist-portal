import React, { useState, useEffect, useRef } from 'react';
import ImageCropper from './ImageCropper'; // ייבוא רכיב החיתוך
import { getCroppedImg } from '../utils/cropImage'; // ייבוא פונקציית העזר (ודא שהקובץ קיים)

// --- Placeholder Data ---
const MOCK_PROFESSIONS = [
  { id: 1, name: 'פיזיותרפיה' }, { id: 2, name: 'ריפוי בעיסוק' },
  { id: 3, name: 'פסיכולוגיה' }, { id: 4, name: 'עבודה סוציאלית קלינית' },
  // ... (הוסף את שאר המקצועות אם צריך)
];
const MOCK_SPECIALTIES = [
    { id: 1, name: 'שיקום אורתופדי', profession_id: 1 }, { id: 2, name: 'פיזיותרפיית ספורט', profession_id: 1 },
    { id: 13, name: 'התפתחות הילד', profession_id: 2 }, { id: 14, name: 'שיקום פיזי ונוירולוגי', profession_id: 2 },
    // ... (הוסף את שאר ההתמחויות אם צריך)
];
// --- End Placeholder Data ---

const daysOfWeek = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const timeSlots = ['בוקר (8-12)', 'צהריים (12-16)', 'ערב (16-20)'];

// --- רכיבי עזר ---
const AlertMessage = ({ type, message, onDismiss }) => {
    if (!message) return null;
    const baseClasses = "px-4 py-3 rounded relative mb-6 text-right";
    const typeClasses = type === 'success'
        ? "bg-green-100 border border-green-400 text-green-700"
        : "bg-red-100 border border-red-400 text-red-700";
    return (
        <div className={`${baseClasses} ${typeClasses}`} role="alert">
            <span className="block sm:inline">{message}</span>
            {onDismiss && (
                <span className="absolute top-0 bottom-0 left-0 px-4 py-3 cursor-pointer" onClick={onDismiss}>
                    <svg className="fill-current h-6 w-6" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                </span>
            )}
        </div>
    );
};
const ButtonSpinner = ({ color = 'primary-blue' }) => (
    <div className={`spinner w-5 h-5 border-t-white border-r-white border-b-white border-l-${color}`}></div>
);
// --- סוף רכיבי עזר ---


// --- רכיב ProfileEditor ---
const ProfileEditor = ({ authToken, API_URL, user, onUpdateSuccess, onLogout }) => {
    const [formData, setFormData] = useState({
        full_name: '', email: '', phone_number: '', bio: '', profession_id: '',
        years_of_practice: 0, profile_image_url: '/default-profile.png',
        specialties: [], locations: [], availability: {}
    });
    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingAvailability, setSavingAvailability] = useState(false);
    const [savingImage, setSavingImage] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const [professions, setProfessions] = useState([]);
    const [allSpecialties, setAllSpecialties] = useState([]);
    const [filteredSpecialties, setFilteredSpecialties] = useState([]);
    const fileInputRef = useRef(null);

    // State חדש עבור החיתוך
    const [imageToCrop, setImageToCrop] = useState(null);
    const [isCropping, setIsCropping] = useState(false);

    // --- Fetch initial data ---
    useEffect(() => {
        let isMounted = true;
        const fetchInitialData = async () => {
            if (!user?.professionalId || !authToken) { setError("שגיאה בטעינת נתונים."); if (isMounted) setLoading(false); return; }
            if (isMounted) setLoading(true);
            setError(null); setMessage(null);
            try {
                console.log("ProfileEditor: Fetching profile and options...");
                const [profileRes, optionsRes] = await Promise.all([
                    fetch(`${API_URL}/api/professionals/me`, { headers: { 'Authorization': `Bearer ${authToken}` } }),
                    fetch(`${API_URL}/api/data/options`)
                ]);
                console.log(`ProfileEditor: Statuses - Profile: ${profileRes.status}, Options: ${optionsRes.status}`);
                if (!isMounted) return;
                if (profileRes.status === 401 || profileRes.status === 403) { onLogout(); return; }
                if (!profileRes.ok) { const d = await profileRes.json(); throw new Error(d.error || 'Failed profile fetch'); }
                const profileData = await profileRes.json();
                if (!optionsRes.ok) { const d = await optionsRes.json(); throw new Error(d.error || 'Failed options fetch'); }
                const optionsData = await optionsRes.json();
                console.log("ProfileEditor: Fetched data successfully.");

                if (isMounted) {
                    setProfessions(optionsData.professions || MOCK_PROFESSIONS);
                    setAllSpecialties(optionsData.specialties || MOCK_SPECIALTIES);
                    
                    let availability = {};
                    if (typeof profileData.availability === 'string') {
                        availability = JSON.parse(profileData.availability);
                    } else if (typeof profileData.availability === 'object' && profileData.availability !== null) {
                        availability = profileData.availability;
                    }

                    setFormData({
                        full_name: profileData.full_name || '', email: profileData.email || '', phone_number: profileData.phone_number || '',
                        bio: profileData.bio || '', profession_id: profileData.profession_id || '', years_of_practice: profileData.years_of_practice || 0,
                        profile_image_url: profileData.profile_image_url || '/default-profile.png',
                        specialties: profileData.specialty_ids || [],
                        locations: profileData.locations || [],
                        availability: availability,
                    });
                    console.log("ProfileEditor: Set states successfully.");
                }
            } catch (err) { console.error('Initial fetch error:', err); if (isMounted) setError(err.message || 'שגיאה בטעינת נתונים.'); }
             finally { console.log("--- FINALLY BLOCK ---"); if (isMounted) { console.log("Setting loading = false"); setLoading(false); } else { console.log("Component unmounted, not setting state."); } }
        };
        fetchInitialData();
        return () => { isMounted = false; console.log("Cleanup effect."); };
    }, [authToken, API_URL, user?.professionalId, onLogout]);

    // --- Filter specialties ---
    useEffect(() => {
        if (formData.profession_id && allSpecialties && allSpecialties.length > 0) {
            const professionIdNum = parseInt(formData.profession_id, 10);
            setFilteredSpecialties(allSpecialties.filter(spec => spec.profession_id === professionIdNum));
        } else {
            setFilteredSpecialties([]);
        }
    }, [formData.profession_id, allSpecialties]);

    // --- *** פונקציות הניהול (Handlers) המלאות *** ---
    
    // זו הפונקציה שהיתה חסרה - אחראית על הקלדה
    const handleChange = (e) => {
         const { name, value, type } = e.target;
         setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value, 10) || 0 : value }));
         if (name === 'profession_id') { setFormData(prev => ({ ...prev, specialties: [] })); }
         setMessage(null); setError(null);
    };

    // בחירת התמחות
    const handleSpecialtyToggle = (specialtyId) => {
        setFormData(prev => ({ ...prev, specialties: prev.specialties.includes(specialtyId) ? prev.specialties.filter(id => id !== specialtyId) : [...prev.specialties, specialtyId] }));
        setMessage(null); setError(null);
    };

    // שינוי מיקום
    const handleLocationChange = (index, field, value) => {
        const updatedLocations = [...formData.locations];
        if (field === 'city') updatedLocations[index].city = value;
        if (field === 'region') updatedLocations[index].region = value;
        setFormData(prev => ({ ...prev, locations: updatedLocations }));
        setMessage(null); setError(null);
    };

    // הוספת מיקום
    const addLocation = () => {
        setFormData(prev => ({ ...prev, locations: [...prev.locations, { city: '', region: '' }] }));
        setMessage(null); setError(null);
    };

    // הסרת מיקום
    const removeLocation = (index) => {
        setFormData(prev => ({ ...prev, locations: prev.locations.filter((_, i) => i !== index) }));
        setMessage(null); setError(null);
    };

    // שינוי זמינות
    const handleAvailabilityToggle = (day, timeSlot) => {
         const dayAvailability = formData.availability[day] || []; const isSelected = dayAvailability.includes(timeSlot);
         const updatedDayAvailability = isSelected ? dayAvailability.filter(slot => slot !== timeSlot) : [...dayAvailability, timeSlot];
         const updatedAvailability = { ...formData.availability }; if (updatedDayAvailability.length === 0) { delete updatedAvailability[day]; } else { updatedAvailability[day] = updatedDayAvailability; }
         setFormData(prev => ({ ...prev, availability: updatedAvailability }));
         setMessage(null); setError(null);
    };

    // --- *** סוף פונקציות ניהול *** ---


    // --- לוגיקת העלאת תמונה (עם Cropper) ---
    const handleImageClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = null;
        }
        fileInputRef.current?.click();
    };

    const onFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setImageToCrop(reader.result);
            setIsCropping(true);
        };
        reader.readAsDataURL(file);
    };

    const onCropComplete = (croppedImageBlob) => {
        setIsCropping(false);
        if (!croppedImageBlob) return;
        const localPreviewUrl = URL.createObjectURL(croppedImageBlob);
        setFormData(prev => ({ ...prev, profile_image_url: localPreviewUrl }));
        uploadCroppedImage(croppedImageBlob);
    };

    const uploadCroppedImage = async (imageBlob) => {
        setSavingImage(true);
        setError(null);
        setMessage(null);
        try {
            const uploadFormData = new FormData();
            uploadFormData.append('profileImage', imageBlob, 'profile.jpg'); 
            const res = await fetch(`${API_URL}/api/professionals/me/upload-image`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` },
                body: uploadFormData
            });
            if (res.status === 401 || res.status === 403) { onLogout(); return; }
            const data = await res.json();
            if (!res.ok) { throw new Error(data.error || 'Image upload failed'); }
            setFormData(prev => ({ ...prev, profile_image_url: data.imageUrl }));
            setMessage('תמונה הועלתה בהצלחה!');
        } catch (err) {
            console.error('Image upload error:', err);
            setError(err.message || 'שגיאה בהעלאת התמונה.');
        } finally {
            setSavingImage(false);
        }
    };
    // --- סוף לוגיקת העלאת תמונה ---


    // --- פונקציות שמירה (Submit) ---
    const handleProfileSubmit = async (e) => {
        e.preventDefault(); setSavingProfile(true); setError(null); setMessage(null);
        try {
            const { profile_image_url, email, availability, ...payload } = formData;
            payload.profession_id = parseInt(payload.profession_id, 10) || null;
            payload.years_of_practice = parseInt(payload.years_of_practice, 10) || 0;
            payload.specialties = payload.specialties || [];
            payload.locations = (payload.locations || []).map(loc => ({ city: loc.city, region: loc.region }));
            
            console.log("Submitting profile:", payload);
            const res = await fetch(`${API_URL}/api/professionals/me`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` }, body: JSON.stringify(payload) });
            if (res.status === 401 || res.status === 403) { onLogout(); return; }
            const data = await res.json(); if (!res.ok) { throw new Error(data.error || 'Update failed'); }
            setMessage('✅ פרטי הפרופיל עודכנו!'); if (onUpdateSuccess) onUpdateSuccess();
        } catch (err) { console.error('Profile Update error:', err); setError(err.message || 'שגיאה בעדכון הפרופיל.'); }
        finally { setSavingProfile(false); }
    };

    const handleAvailabilitySubmit = async () => {
        setSavingAvailability(true); setError(null); setMessage(null);
        try {
            console.log("Submitting availability:", formData.availability);
             const res = await fetch(`${API_URL}/api/professionals/me/availability`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` }, body: JSON.stringify({ availability: formData.availability }) });
             if (res.status === 401 || res.status === 403) { onLogout(); return; }
             const data = await res.json(); if (!res.ok) { throw new Error(data.error || 'Update failed'); }
             setMessage('✅ זמינות עודכנה!');
        } catch (err) { console.error('Availability Update error:', err); setError(err.message || 'שגיאה בעדכון הזמינות.'); }
         finally { setSavingAvailability(false); }
    };
    // --- סוף פונקציות שמירה ---


    // --- Render ---
    if (loading) { return <div className="text-center p-10"><div className="spinner"></div></div>; }
    if (error && !formData.email) { return <AlertMessage type="error" message={error} />; }

    return (
        <div className="space-y-8 md:space-y-12">
            {/* מודאל החיתוך */}
            {isCropping && (
                <ImageCropper
                    imageSrc={imageToCrop}
                    onCropComplete={onCropComplete}
                    onCancel={() => setIsCropping(false)}
                />
            )}

            <AlertMessage type="success" message={message} onDismiss={() => setMessage(null)} />
            <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />

            {/* --- טופס עריכת פרופיל --- */}
            <form onSubmit={handleProfileSubmit} className="bg-white p-6 md:p-8 rounded-lg shadow w-full mx-auto text-right">
                <h3 className="text-xl font-bold text-text-dark mb-6 border-b pb-3">פרטי פרופיל ומידע מקצועי</h3>
                <div className="flex flex-col-reverse md:flex-row gap-8 md:gap-12">
                    {/* עמודת תמונה וקשר */}
                    <div className="w-full md:w-56 flex flex-col items-center space-y-5 flex-shrink-0">
                        <div className="relative cursor-pointer group" onClick={handleImageClick} title="לחץ/י להחלפת תמונה">
                            <div className="w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-primary-blue/60 shadow-lg bg-gray-100 flex items-center justify-center">
                                {savingImage ? (
                                    <div className="spinner w-8 h-8"></div>
                                ) : (
                                    <img 
                                        src={formData.profile_image_url || '/default-profile.png'} 
                                        alt="פרופיל" 
                                        className="w-full h-full object-cover"
                                        onError={(e) => e.target.src = '/default-profile.png'}
                                    />
                                )}
                            </div>
                            <div className="absolute inset-0 rounded-full bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/></svg>
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/png, image/jpeg, image/jpg" className="hidden"/>
                         
                         <div className="w-full text-center space-y-3 pt-4 border-t border-gray-200">
                             <div> <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">דוא"ל</label> <p className="text-sm text-gray-700">{formData.email}</p> </div>
                             <div> <label htmlFor="phone_number" className="block text-xs font-medium text-gray-400 uppercase tracking-wider">טלפון</label> <input type="tel" id="phone_number" name="phone_number" value={formData.phone_number || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue text-center" style={{ direction: 'ltr' }}/> </div>
                         </div>
                    </div>

                    {/* עמודת פרטים עיקריים */}
                    <div className="flex-1 space-y-6">
                        <div> <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label> <input type="text" id="full_name" name="full_name" value={formData.full_name} onChange={handleChange} required className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-primary-blue"/> </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div> <label htmlFor="profession_id" className="block text-sm font-medium text-gray-700 mb-1">מקצוע</label> <select id="profession_id" name="profession_id" value={formData.profession_id} onChange={handleChange} required className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-primary-blue bg-white appearance-none pr-8 bg-no-repeat bg-right" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'left 0.5rem center', backgroundSize: '1.5em 1.5em' }}> <option value="" disabled>-- בחר מקצוע --</option> {professions.map(p => ( <option key={p.id} value={p.id}>{p.name}</option> ))} </select> </div>
                             <div> <label htmlFor="years_of_practice" className="block text-sm font-medium text-gray-700 mb-1">שנות נסיון</label> <input type="number" id="years_of_practice" name="years_of_practice" value={formData.years_of_practice} onChange={handleChange} min="0" max="60" className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-primary-blue"/> </div>
                        </div>
                        <div> <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">קצת עלי / גישה טיפולית</label> <textarea id="bio" name="bio" value={formData.bio || ''} onChange={handleChange} rows="4" placeholder="..." className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-primary-blue resize-none"/> </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-2">התמחויות</label>
                           {formData.profession_id ? (
                               <div className="flex flex-wrap gap-2">
                                   {filteredSpecialties.length > 0 ? filteredSpecialties.map(spec => (
                                       <button key={spec.id} type="button" onClick={() => handleSpecialtyToggle(spec.id)} className={`px-3 py-1 rounded-full border text-xs font-medium transition duration-150 ease-in-out ${ formData.specialties.includes(spec.id) ? 'bg-primary-blue border-primary-blue text-white shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-primary-blue/70 hover:text-primary-blue' }`}>
                                           {spec.name}
                                       </button>
                                   )) : <p className="text-xs text-gray-500">לא נמצאו התמחויות.</p>}
                               </div>
                           ) : ( <p className="text-xs text-gray-500">נא לבחור מקצוע.</p> )}
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-2">מיקומי קליניקה</label>
                            <div className="space-y-2">
                                {formData.locations.map((loc, index) => (
                                    <div key={index} className="flex items-center gap-2 p-2 border border-gray-200 rounded-md bg-gray-50/70">
                                         <input type="text" placeholder="עיר" value={loc.city || ''} onChange={(e) => handleLocationChange(index, 'city', e.target.value)} className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm shadow-sm"/>
                                         <button type="button" onClick={() => removeLocation(index)} title="הסר מיקום" className="text-red-400 hover:text-red-600 font-bold text-xl px-1">&times;</button>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={addLocation} className="mt-2 text-sm text-primary-blue hover:underline font-medium">+ הוסף מיקום</button>
                        </div>
                        <div className="pt-6 border-t border-gray-200 flex justify-start">
                             <button type="submit" disabled={savingProfile || savingImage || savingAvailability} className="inline-flex items-center justify-center py-2.5 px-6 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white transition duration-200 ease-in-out bg-primary-blue hover:bg-secondary-purple focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue disabled:opacity-60 disabled:cursor-not-allowed">
                                {savingProfile ? <ButtonSpinner /> : 'שמור שינויי פרופיל'}
                             </button>
                         </div>
                    </div>
                </div>
            </form>

             {/* --- אזור זמינות --- */}
            <div className="bg-white p-6 md:p-8 rounded-lg shadow w-full mx-auto text-right">
                <h3 className="text-xl font-bold text-text-dark mb-4">ניהול זמינות שבועית</h3>
                <p className="text-sm text-gray-500 mb-6">סמן/י את משבצות הזמן הפנויות עבורך.</p>
                <div className="overflow-x-auto pb-4">
                    <table className="min-w-full border-collapse border border-gray-200">
                         <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">יום</th>
                                {timeSlots.map(slot => ( <th key={slot} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">{slot}</th> ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {daysOfWeek.map(day => (
                                <tr key={day} className="divide-x divide-gray-200">
                                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-200">{day}</td>
                                    {timeSlots.map(slot => {
                                        const isSelected = formData.availability[day]?.includes(slot);
                                        return (
                                            <td key={slot}
                                                className={`px-1 py-4 md:px-3 md:py-3 border border-gray-200 cursor-pointer transition-colors duration-150 ease-in-out text-center ${isSelected ? 'bg-primary-blue/80 hover:bg-primary-blue' : 'bg-white hover:bg-primary-blue/10'}`}
                                                onClick={() => handleAvailabilityToggle(day, slot)}
                                                title={`${day}, ${slot} - ${isSelected ? 'פנוי/ה (בטל)' : 'לא פנוי/ה (הוסף)'}`}>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <div className="mt-6 pt-6 border-t border-gray-200 flex justify-start">
                     <button type="button" onClick={handleAvailabilitySubmit} disabled={savingAvailability || savingProfile || savingImage}
                            className="inline-flex items-center justify-center py-2.5 px-6 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white transition duration-200 ease-in-out bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-60 disabled:cursor-not-allowed">
                        {savingAvailability ? <ButtonSpinner color="green-500"/> : 'שמור שינויי זמינות'}
                    </button>
                 </div>
            </div>
        </div>
    );
};

export default ProfileEditor;