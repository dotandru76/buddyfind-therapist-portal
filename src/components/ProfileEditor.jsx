// src/components/ProfileEditor.jsx (Final Synced Version)
import React, { useState, useEffect, useRef } from 'react';
import ImageCropper from './ImageCropper';
import { getCroppedImg } from '../utils/cropImage';

// --- MOCK DATA (REMOVED) ---
// Mocks are no longer needed as we fetch everything

// --- Helper Components ---
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

// --- Main Component ---
const ProfileEditor = ({ authToken, API_URL, user, onUpdateSuccess, onLogout }) => {
    const [formData, setFormData] = useState({
        full_name: '', email: '', phone_number: '', bio: '', profession_id: '',
        years_of_practice: 0, profile_image_url: '/default-profile.png',
        specialties: [], locations: [], availability: {}
    });
    
    // --- **NEW**: State for dynamic definitions ---
    const [professions, setProfessions] = useState([]);
    const [allSpecialties, setAllSpecialties] = useState([]);
    const [filteredSpecialties, setFilteredSpecialties] = useState([]);
    const [defRegions, setDefRegions] = useState([]); // For regions dropdown
    const [defDays, setDefDays] = useState([]);       // For availability table
    const [defSlots, setDefSlots] = useState([]);     // For availability table
    // --- End New State ---

    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingAvailability, setSavingAvailability] = useState(false);
    const [savingImage, setSavingImage] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);
    const [imageToCrop, setImageToCrop] = useState(null);
    const [isCropping, setIsCropping] = useState(false);

    // --- Fetch initial data (With Enhanced Error Logging) ---
    useEffect(() => {
        let isMounted = true;
        const fetchInitialData = async () => {
            if (!user?.professionalId || !authToken) {
                console.error("ProfileEditor: Fetch aborted - missing professionalId or authToken.", { user, authToken });
                setError("שגיאה בטעינת נתונים: פרטי המשתמש אינם תקינים.");
                if (isMounted) setLoading(false);
                return;
            }
            if (isMounted) setLoading(true); setError(null); setMessage(null);
            console.log("ProfileEditor: Fetching profile and options...");

            try {
                const fetchOptions = { headers: { 'Authorization': `Bearer ${authToken}` } };
                // **MODIFIED**: Fetching options and profile in parallel
                const [profileRes, optionsRes] = await Promise.all([
                    fetch(`${API_URL}/api/professionals/me`, fetchOptions),
                    fetch(`${API_URL}/api/data/options`, fetchOptions) 
                ]);
                
                console.log(`ProfileEditor: Statuses - Profile: ${profileRes.status}, Options: ${optionsRes.status}`);
                if (!isMounted) return;

                if (profileRes.status === 401 || profileRes.status === 403 || optionsRes.status === 401 || optionsRes.status === 403) {
                     if (onLogout) onLogout(); return;
                 }

                if (!profileRes.ok) {
                    let errorBodyText = '', errorJson = {};
                    try { errorBodyText = await profileRes.text(); errorJson = JSON.parse(errorBodyText || '{}'); } catch (parseError) { errorBodyText = `(Could not parse error: ${parseError.message})`; }
                    console.error(`ProfileEditor: Profile fetch failed! Status: ${profileRes.status}, Body: ${errorBodyText}`);
                    const fetchError = new Error(errorJson.error || `Failed profile fetch (${profileRes.status}) - ${errorBodyText}`);
                    fetchError.responseStatus = profileRes.status; fetchError.responseBody = errorBodyText;
                    throw fetchError;
                }
                 if (!optionsRes.ok) { const optionsErrorData = await optionsRes.json(); throw new Error(optionsErrorData.error || `Failed options fetch (${optionsRes.status})`); }

                const profileData = await profileRes.json();
                const optionsData = await optionsRes.json();
                console.log("ProfileEditor: Fetched data successfully.");

                if (isMounted) {
                    // **MODIFIED**: Set all definitions from API
                    setProfessions(optionsData.professions || []);
                    setAllSpecialties(optionsData.specialties || []);
                    setDefRegions(optionsData.regions || []); // e.g., [{region_key: 'center', ...}]
                    setDefDays(optionsData.days || []);       // e.g., ['ראשון', 'שני', ...]
                    setDefSlots(optionsData.slots || []);     // e.g., ['בוקר (8-12)', ...]

                    let availability = {};
                    try {
                        if (typeof profileData.availability === 'string' && profileData.availability) {
                             availability = JSON.parse(profileData.availability);
                        } else if (typeof profileData.availability === 'object' && profileData.availability !== null) {
                             availability = profileData.availability;
                        }
                    } catch(e) { console.error("Error parsing availability from profile data", e); availability = {}; }

                    setFormData({
                        full_name: profileData.full_name || '',
                        email: profileData.email || '',
                        phone_number: profileData.phone_number || '',
                        bio: profileData.bio || '',
                        profession_id: profileData.profession_id || '',
                        years_of_practice: profileData.years_of_practice || 0,
                        profile_image_url: profileData.profile_image_url || '/default-profile.png',
                        specialties: profileData.specialty_ids || [], 
                        locations: profileData.locations || [], 
                        availability: availability || {}, 
                    });
                    console.log("ProfileEditor: Set states successfully.");
                }
            } catch (err) {
                console.error('ProfileEditor: Initial fetch CATCH block:', err);
                if (err.responseStatus) { console.error('Initial fetch Response Status:', err.responseStatus); console.error('Initial fetch Response Body:', err.responseBody); }
                 if (isMounted) setError(`שגיאה בטעינת נתונים: ${err.message}`);
            } finally {
                console.log("ProfileEditor: --- FINALLY BLOCK ---");
                if (isMounted) { console.log("ProfileEditor: Setting loading = false"); setLoading(false); }
                else { console.log("ProfileEditor: Component unmounted, not setting state."); }
            }
        };
        fetchInitialData();
        return () => { isMounted = false; console.log("ProfileEditor: Cleanup effect."); };
    }, [authToken, API_URL, user?.professionalId, onLogout]);


    // --- Filter specialties (No change) ---
    useEffect(() => {
         if (formData.profession_id && allSpecialties?.length > 0) {
             const professionIdNum = parseInt(formData.profession_id, 10);
             setFilteredSpecialties(allSpecialties.filter(spec => spec.profession_id === professionIdNum));
         } else {
             setFilteredSpecialties([]);
         }
     }, [formData.profession_id, allSpecialties]);


    // --- Handlers (No change) ---
    const handleChange = (e) => {
         const { name, value, type } = e.target;
         setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value, 10) || 0 : value }));
         if (name === 'profession_id') { setFormData(prev => ({ ...prev, specialties: [] })); }
         setMessage(null); setError(null);
    };
    const handleSpecialtyToggle = (specialtyId) => {
        setFormData(prev => ({ ...prev, specialties: prev.specialties.includes(specialtyId) ? prev.specialties.filter(id => id !== specialtyId) : [...prev.specialties, specialtyId] }));
        setMessage(null); setError(null);
    };
    // **MODIFIED**: Location handler now handles 'region_key' from dropdown
    const handleLocationChange = (index, field, value) => {
        const updatedLocations = [...formData.locations];
        if (field === 'city') updatedLocations[index].city = value;
        if (field === 'region') updatedLocations[index].region = value; // value is now 'center', 'north' etc.
        setFormData(prev => ({ ...prev, locations: updatedLocations }));
        setMessage(null); setError(null);
    };
    const addLocation = () => { setFormData(prev => ({ ...prev, locations: [...prev.locations, { city: '', region: '' }] })); setMessage(null); setError(null); };
    const removeLocation = (index) => { setFormData(prev => ({ ...prev, locations: prev.locations.filter((_, i) => i !== index) })); setMessage(null); setError(null); };
    const handleAvailabilityToggle = (day, timeSlot) => {
         const currentAvailability = formData.availability || {};
         const dayAvailability = currentAvailability[day] || [];
         const isSelected = dayAvailability.includes(timeSlot);
         const updatedDayAvailability = isSelected ? dayAvailability.filter(slot => slot !== timeSlot) : [...dayAvailability, timeSlot];
         const updatedAvailability = { ...currentAvailability };
         if (updatedDayAvailability.length === 0) { delete updatedAvailability[day]; }
         else { updatedAvailability[day] = updatedDayAvailability; }
         setFormData(prev => ({ ...prev, availability: updatedAvailability }));
         setMessage(null); setError(null);
    };

    // --- Image Cropper Logic (No change) ---
    const handleImageClick = () => { if (fileInputRef.current) fileInputRef.current.value = null; fileInputRef.current?.click(); };
    const onFileChange = (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => { setImageToCrop(reader.result); setIsCropping(true); };
        reader.readAsDataURL(file);
    };
    const onCropComplete = (croppedImageBlob) => {
        setIsCropping(false); if (!croppedImageBlob) return;
        const localPreviewUrl = URL.createObjectURL(croppedImageBlob);
        setFormData(prev => ({ ...prev, profile_image_url: localPreviewUrl }));
        uploadCroppedImage(croppedImageBlob);
    };
    const uploadCroppedImage = async (imageBlob) => {
        setSavingImage(true); setError(null); setMessage(null);
        try {
            const uploadFormData = new FormData(); uploadFormData.append('profileImage', imageBlob, 'profile.jpg');
            const res = await fetch(`${API_URL}/api/professionals/me/upload-image`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` }, body: uploadFormData });
            if (res.status === 401 || res.status === 403) { onLogout(); return; }
            const data = await res.json(); if (!res.ok) { throw new Error(data.error || 'Image upload failed'); }
            setFormData(prev => ({ ...prev, profile_image_url: data.imageUrl })); setMessage('תמונה הועלתה בהצלחה!');
        } catch (err) { console.error('Image upload error:', err); setError(err.message || 'שגיאה בהעלאת התמונה.'); }
        finally { setSavingImage(false); }
    };

    // --- Submit Handlers ---
    const handleProfileSubmit = async (e) => {
        e.preventDefault(); setSavingProfile(true); setError(null); setMessage(null);
        try {
            const { profile_image_url, email, availability, ...payload } = formData;
            payload.profession_id = parseInt(payload.profession_id, 10) || null;
            payload.years_of_practice = parseInt(payload.years_of_practice, 10) || 0;
            payload.specialties = payload.specialties || []; 
            
            // **MODIFIED**: Ensure locations have valid region_key
            payload.locations = (payload.locations || [])
                .map(loc => ({ city: loc.city?.trim(), region: loc.region })) // region is now the key
                .filter(loc => loc.city && loc.region); // Must have both city and region

            const res = await fetch(`${API_URL}/api/professionals/me`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` }, body: JSON.stringify(payload) });
            if (res.status === 401 || res.status === 403) { onLogout(); return; }
            const data = await res.json(); if (!res.ok) { throw new Error(data.error || 'Update failed'); }
            setMessage('✅ פרטי הפרופיל עודכנו!'); if (onUpdateSuccess) onUpdateSuccess();
        } catch (err) { console.error('Profile Update error:', err); setError(err.message || 'שגיאה בעדכון הפרופיל.'); }
        finally { setSavingProfile(false); }
    };
    
    // **MODIFIED**: This handler is now much simpler, it just sends the state.
    // The backend does the validation against the DB.
    const handleAvailabilitySubmit = async () => {
        setSavingAvailability(true); setError(null); setMessage(null);
        try {
             const res = await fetch(`${API_URL}/api/professionals/me/availability`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` }, body: JSON.stringify({ availability: formData.availability || {} }) });
             if (res.status === 401 || res.status === 403) { onLogout(); return; }
             const data = await res.json(); if (!res.ok) { throw new Error(data.error || 'Update failed'); }
             setMessage('✅ זמינות עודכנה!');
        } catch (err) { console.error('Availability Update error:', err); setError(err.message || 'שגיאה בעדכון הזמינות.'); }
         finally { setSavingAvailability(false); }
    };

    // --- Render ---
    if (loading) { return <div className="text-center p-10"><div className="spinner"></div></div>; }
    if (error && !formData.email) { return <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />; }

    return (
        <div className="space-y-8 md:space-y-12">
            {isCropping && ( <ImageCropper imageSrc={imageToCrop} onCropComplete={onCropComplete} onCancel={() => setIsCropping(false)} /> )}
            <AlertMessage type="success" message={message} onDismiss={() => setMessage(null)} />
            {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}

            {/* Profile Edit Form */}
            <form onSubmit={handleProfileSubmit} className="bg-white p-6 md:p-8 rounded-lg shadow w-full mx-auto text-right">
                <h3 className="text-xl font-bold text-text-dark mb-6 border-b pb-3">פרטי פרופיל ומידע מקצועי</h3>
                <div className="flex flex-col-reverse md:flex-row gap-8 md:gap-12">
                    {/* Image Column (No change) */}
                    <div className="w-full md:w-56 flex flex-col items-center space-y-5 flex-shrink-0">
                         <div className="relative cursor-pointer group" onClick={handleImageClick} title="לחץ/י להחלפת תמונה">
                              <div className="w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-primary-blue/60 shadow-lg bg-gray-100 flex items-center justify-center">
                                  {savingImage ? <div className="spinner w-8 h-8"></div> : <img src={formData.profile_image_url || '/default-profile.png'} alt="פרופיל" className="w-full h-full object-cover" onError={(e) => e.target.src = '/default-profile.png'} />}
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

                    {/* Details Column */}
                    <div className="flex-1 space-y-6">
                        {/* Full Name (No change) */}
                        <div> <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label> <input type="text" id="full_name" name="full_name" value={formData.full_name} onChange={handleChange} required className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-primary-blue"/> </div>
                        {/* Profession & Years (No change) */}
                        <div className="grid grid-cols-2 gap-4">
                             <div> <label htmlFor="profession_id" className="block text-sm font-medium text-gray-700 mb-1">מקצוע</label> <select id="profession_id" name="profession_id" value={formData.profession_id} onChange={handleChange} required className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-primary-blue bg-white appearance-none pr-8 bg-no-repeat bg-right" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'left 0.5rem center', backgroundSize: '1.5em 1.5em' }}> <option value="" disabled>-- בחר מקצוע --</option> {(professions || []).map(p => ( <option key={p.id} value={p.id}>{p.name}</option> ))} </select> </div>
                             <div> <label htmlFor="years_of_practice" className="block text-sm font-medium text-gray-700 mb-1">שנות נסיון</label> <input type="number" id="years_of_practice" name="years_of_practice" value={formData.years_of_practice} onChange={handleChange} min="0" max="60" className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-primary-blue"/> </div>
                        </div>
                        {/* Bio (No change) */}
                        <div> <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">קצת עלי / גישה טיפולית</label> <textarea id="bio" name="bio" value={formData.bio || ''} onChange={handleChange} rows="4" placeholder="..." className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-primary-blue resize-none"/> </div>
                        {/* Specialties (No change) */}
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-2">התמחויות (שפת מטפל)</label>
                           {formData.profession_id ? (
                               <div className="flex flex-wrap gap-2">
                                   {filteredSpecialties.length > 0 ? filteredSpecialties.map(spec => (
                                       <button key={spec.id} type="button" onClick={() => handleSpecialtyToggle(spec.id)} className={`px-3 py-1 rounded-full border text-xs font-medium transition duration-150 ease-in-out ${ formData.specialties.includes(spec.id) ? 'bg-primary-blue border-primary-blue text-white shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-primary-blue/70 hover:text-primary-blue' }`}>
                                           {spec.name}
                                       </button>
                                   )) : <p className="text-xs text-gray-500">לא נמצאו התמחויות למקצוע זה.</p>}
                               </div>
                           ) : ( <p className="text-xs text-gray-500">נא לבחור מקצוע להצגת התמחויות.</p> )}
                        </div>
                        
                        {/* --- LOCATIONS (MODIFIED) --- */}
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-2">מיקומי קליניקה</label>
                            <div className="space-y-3">
                                {(formData.locations || []).map((loc, index) => (
                                    <div key={index} className="grid grid-cols-3 items-center gap-2 p-2 border border-gray-200 rounded-md bg-gray-50/70">
                                         {/* City (col-span-2) */}
                                         <input type="text" placeholder="עיר" value={loc.city || ''} onChange={(e) => handleLocationChange(index, 'city', e.target.value)} className="col-span-2 px-3 py-1.5 border border-gray-300 rounded-md text-sm shadow-sm"/>
                                         
                                         {/* **MODIFIED**: Region Dropdown (col-span-1) */}
                                         <select 
                                            value={loc.region || ''} 
                                            onChange={(e) => handleLocationChange(index, 'region', e.target.value)} 
                                            className="col-span-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm shadow-sm bg-white"
                                          >
                                            <option value="" disabled>-- בחר אזור --</option>
                                            {(defRegions || []).map(r => (
                                                <option key={r.region_key} value={r.region_key}>{r.region_name_he}</option>
                                            ))}
                                         </select>
                                         
                                         {/* Remove button (col-span-3, centered) */}
                                         <button type="button" onClick={() => removeLocation(index)} title="הסר מיקום" className="col-span-3 text-xs text-red-500 hover:text-red-700 hover:underline text-center">הסר מיקום זה</button>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={addLocation} className="mt-3 text-sm text-primary-blue hover:underline font-medium">+ הוסף מיקום</button>
                        </div>
                        {/* --- END LOCATIONS --- */}

                        {/* Save Button (No change) */}
                        <div className="pt-6 border-t border-gray-200 flex justify-start">
                             <button type="submit" disabled={savingProfile || savingImage || savingAvailability} className="inline-flex items-center justify-center py-2.5 px-6 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white transition duration-200 ease-in-out bg-primary-blue hover:bg-secondary-purple focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue disabled:opacity-60 disabled:cursor-not-allowed">
                                {savingProfile ? <ButtonSpinner /> : 'שמור שינויי פרופיל'}
                             </button>
                         </div>
                    </div>
                </div>
            </form>

            {/* --- AVAILABILITY SECTION (MODIFIED) --- */}
            <div className="bg-white p-6 md:p-8 rounded-lg shadow w-full mx-auto text-right">
                <h3 className="text-xl font-bold text-text-dark mb-4">ניהול זמינות שבועית</h3>
                <p className="text-sm text-gray-500 mb-6">סמן/י את משבצות הזמן הפנויות עבורך.</p>
                <div className="overflow-x-auto pb-4">
                    <table className="min-w-full border-collapse border border-gray-200">
                         <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">יום</th>
                                {/* **MODIFIED**: Render slots dynamically */}
                                {defSlots.map(slot => ( <th key={slot} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">{slot}</th> ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {/* **MODIFIED**: Render days dynamically */}
                            {defDays.map(day => (
                                <tr key={day} className="divide-x divide-gray-200">
                                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-200">{day}</td>
                                    {/* **MODIFIED**: Render slots dynamically */}
                                    {defSlots.map(slot => {
                                        const isSelected = formData.availability && formData.availability[day]?.includes(slot);
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