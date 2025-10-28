import React, { useState, useEffect, useRef } from 'react';

const daysOfWeek = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const timeSlots = ['בוקר (8-12)', 'צהריים (12-16)', 'ערב (16-20)']; // Example slots

const ProfileEditor = ({ authToken, API_URL, user, onUpdateSuccess, onLogout }) => {
    const [formData, setFormData] = useState({
        full_name: '', email: '', phone_number: '', bio: '', profession_id: '',
        years_of_practice: 0, profile_image_url: '/default-profile.png', // Default image
        specialties: [], locations: [], availability: {}
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false); // Separate state for saving indication
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const [professions, setProfessions] = useState([]);
    const [allSpecialties, setAllSpecialties] = useState([]);
    const [filteredSpecialties, setFilteredSpecialties] = useState([]);
    const fileInputRef = useRef(null);

    // --- Fetch initial data (Profile & Options) ---
    useEffect(() => {
        const fetchInitialData = async () => {
            if (!user?.professionalId || !authToken) { setError("שגיאה בטעינת נתונים."); setLoading(false); return; }
            setLoading(true); setError(null);
            try {
                const [profileRes, optionsRes] = await Promise.all([
                    fetch(`${API_URL}/api/professionals/me`, { headers: { 'Authorization': `Bearer ${authToken}` } }),
                    fetch(`${API_URL}/api/data/options`) // Fetch professions & specialties
                ]);

                if (profileRes.status === 401 || profileRes.status === 403) { onLogout(); return; }
                if (!profileRes.ok) { const d = await profileRes.json(); throw new Error(d.error || 'Failed to fetch profile data.'); }
                const profileData = await profileRes.json();

                if (!optionsRes.ok) { const d = await optionsRes.json(); throw new Error(d.error || 'Failed to fetch options.'); }
                const optionsData = await optionsRes.json();

                setProfessions(optionsData.professions || []);
                setAllSpecialties(optionsData.specialties || []);

                // Parse availability if it comes from backend (adjust parsing as needed)
                const currentAvailability = profileData.availability || {}; // Assuming backend sends structured availability

                setFormData({
                    full_name: profileData.full_name || '', email: profileData.email || '', phone_number: profileData.phone_number || '',
                    bio: profileData.bio || '', profession_id: profileData.profession_id || '', years_of_practice: profileData.years_of_practice || 0,
                    profile_image_url: profileData.profile_image_url || '/default-profile.png',
                    specialties: profileData.specialty_ids || [], // Use IDs directly from backend
                    locations: profileData.locations || [],
                    availability: currentAvailability,
                });
            } catch (err) { console.error('Initial data fetch error:', err); setError(err.message || 'שגיאה בטעינת נתונים.'); }
             finally { setLoading(false); }
        };
        fetchInitialData();
    }, [authToken, API_URL, user, onLogout]);

    // --- Filter specialties ---
    useEffect(() => {
        if (formData.profession_id) {
            const professionIdNum = parseInt(formData.profession_id, 10);
            setFilteredSpecialties(allSpecialties.filter(spec => spec.profession_id === professionIdNum));
        } else { setFilteredSpecialties([]); }
    }, [formData.profession_id, allSpecialties]);

    // --- Handlers ---
    const handleChange = (e) => {
         const { name, value, type } = e.target;
         setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value, 10) || 0 : value })); // Ensure number for years
         if (name === 'profession_id') { setFormData(prev => ({ ...prev, specialties: [] })); }
    };
    const handleSpecialtyToggle = (specialtyId) => {
        setFormData(prev => ({ ...prev, specialties: prev.specialties.includes(specialtyId) ? prev.specialties.filter(id => id !== specialtyId) : [...prev.specialties, specialtyId] }));
    };
    const handleLocationChange = (index, field, value) => {
        const updatedLocations = [...formData.locations]; updatedLocations[index][field] = value; setFormData(prev => ({ ...prev, locations: updatedLocations }));
    };
    const addLocation = () => setFormData(prev => ({ ...prev, locations: [...prev.locations, { city: '', region: '', address: '' }] }));
    const removeLocation = (index) => setFormData(prev => ({ ...prev, locations: prev.locations.filter((_, i) => i !== index) }));
    const handleImageClick = () => fileInputRef.current?.click();
    const handleImageChange = async (e) => { // Made async for potential upload
        const file = e.target.files?.[0];
        if (!file) return;

        // Show Preview
        const reader = new FileReader();
        reader.onloadend = () => { setFormData(prev => ({ ...prev, profile_image_url: reader.result })); };
        reader.readAsDataURL(file);

        // --- Actual Upload Logic ---
        setSaving(true); // Indicate upload process
        setError(null); setMessage(null);
        try {
            const uploadFormData = new FormData();
            uploadFormData.append('profileImage', file); // 'profileImage' should match multer field name

            const res = await fetch(`${API_URL}/api/professionals/me/upload-image`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` }, // No Content-Type needed for FormData
                body: uploadFormData
            });

             if (res.status === 401 || res.status === 403) { onLogout(); return; }
             const data = await res.json();
             if (!res.ok) { throw new Error(data.error || 'Image upload failed'); }

            // Update form data with the NEW URL from the server response
             setFormData(prev => ({ ...prev, profile_image_url: data.imageUrl }));
             setMessage('תמונה הועלתה בהצלחה!');

        } catch (err) {
            console.error('Image upload error:', err);
            setError(err.message || 'שגיאה בהעלאת התמונה.');
             // Optional: Revert preview on failure?
             // setFormData(prev => ({ ...prev, profile_image_url: originalImageUrlBeforeUpload }));
        } finally {
            setSaving(false); // Finish upload indication
        }
    };
    const handleAvailabilityToggle = (day, timeSlot) => {
        setFormData(prev => {
            const dayAvailability = prev.availability[day] || [];
            const isSelected = dayAvailability.includes(timeSlot);
            const updatedDayAvailability = isSelected ? dayAvailability.filter(slot => slot !== timeSlot) : [...dayAvailability, timeSlot];
            // If the day becomes empty, remove the key; otherwise, update it
            const updatedAvailability = { ...prev.availability };
            if (updatedDayAvailability.length === 0) { delete updatedAvailability[day]; }
            else { updatedAvailability[day] = updatedDayAvailability; }
            return { ...prev, availability: updatedAvailability };
        });
    };

    // --- Save Handlers ---
    const handleProfileSubmit = async (e) => {
        e.preventDefault(); setSaving(true); setError(null); setMessage(null);
        try {
            const { profile_image_url, email, availability, ...updatePayload } = formData; // Exclude fields not directly updatable here
            updatePayload.profession_id = parseInt(updatePayload.profession_id, 10) || null; // Ensure integer or null
            updatePayload.years_of_practice = parseInt(updatePayload.years_of_practice, 10) || 0;
            updatePayload.specialties = updatePayload.specialties || []; // Ensure array
            updatePayload.locations = updatePayload.locations || [];   // Ensure array

            console.log("Submitting profile update:", updatePayload);
            const res = await fetch(`${API_URL}/api/professionals/me`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` }, body: JSON.stringify(updatePayload) });
            if (res.status === 401 || res.status === 403) { onLogout(); return; }
            const data = await res.json();
            if (!res.ok) { throw new Error(data.error || 'עדכון נכשל.'); }
            setMessage('✅ פרטי הפרופיל עודכנו בהצלחה!');
            if (onUpdateSuccess) onUpdateSuccess(); // Notify parent if needed
        } catch (err) { console.error('Profile Update error:', err); setError(err.message || 'שגיאה בעדכון הפרופיל.'); }
         finally { setSaving(false); }
    };

    const handleAvailabilitySubmit = async () => {
        setSaving(true); setError(null); setMessage(null);
        try {
            console.log("Submitting availability update:", formData.availability);
             const res = await fetch(`${API_URL}/api/professionals/me/availability`, {
                 method: 'PUT',
                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                 body: JSON.stringify({ availability: formData.availability })
             });
             if (res.status === 401 || res.status === 403) { onLogout(); return; }
             const data = await res.json();
             if (!res.ok) { throw new Error(data.error || 'עדכון זמינות נכשל.'); }
             setMessage('✅ זמינות עודכנה בהצלחה!');
        } catch (err) { console.error('Availability Update error:', err); setError(err.message || 'שגיאה בעדכון הזמינות.'); }
         finally { setSaving(false); }
    };


    // --- Render ---
    if (loading) { return <div className="text-center p-10"><div className="spinner"></div></div>; }
    // Separate initial loading error from update errors
    if (error && !formData.email) { return <div className="p-4 text-red-700 bg-red-100 border border-red-400 rounded">{error}</div>; }


    return (
        <div className="space-y-10">
             {/* Global Messages */}
             {message && <p className="text-green-600 p-3 bg-green-100 border border-green-400 rounded mb-6 text-center animate-pulse">{message}</p>}
             {error && <p className="text-red-600 p-3 bg-red-100 border border-red-400 rounded mb-6 text-center">{error}</p>}

            {/* --- חלק 1: עריכת פרטי פרופיל --- */}
            <form onSubmit={handleProfileSubmit} className="bg-white p-6 md:p-8 rounded-xl shadow-md w-full mx-auto text-right">
                <h3 className="text-xl font-bold text-text-dark mb-6 border-b pb-3">פרטי פרופיל ומידע מקצועי</h3>
                <div className="flex flex-col-reverse md:flex-row gap-8 md:gap-12">
                     {/* עמודה שמאלית (תמונה וקשר) */}
                    <div className="w-full md:w-56 flex flex-col items-center space-y-5">
                         {/* העלאת תמונה */}
                         <div className="relative cursor-pointer group" onClick={handleImageClick} title="לחץ/י להחלפת תמונה">
                              {/* ... (קוד אזור התמונה נשאר זהה) ... */}
                              <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-primary-blue/60 shadow-lg bg-gray-100 flex items-center justify-center text-gray-500 text-center text-xs p-2">
                                  {formData.profile_image_url && formData.profile_image_url !== '/default-profile.png' ? (
                                      <img src={formData.profile_image_url} alt="פרופיל" className="w-full h-full object-cover"/>
                                  ) : ( <span>העלה/י תמונת פרופיל</span> )}
                              </div>
                              <div className="absolute inset-0 rounded-full bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                   <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/></svg>
                              </div>
                         </div>
                         <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/png, image/jpeg, image/jpg" className="hidden"/>
                         {/* פרטי התקשרות */}
                         <div className="w-full text-center space-y-3 pt-4 border-t border-gray-200">
                              {/* ... (קוד דוא"ל וטלפון נשאר זהה) ... */}
                               <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">דוא"ל</label>
                                <p className="text-sm text-gray-700">{formData.email}</p>
                             </div>
                              <div>
                                <label htmlFor="phone_number" className="block text-xs font-medium text-gray-400 uppercase tracking-wider">טלפון</label>
                                <input type="tel" id="phone_number" name="phone_number" value={formData.phone_number} onChange={handleChange}
                                       className="mt-1 block w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue text-center" style={{ direction: 'ltr' }}/>
                             </div>
                         </div>
                    </div>
                     {/* עמודה ימנית (פרטים עיקריים) */}
                    <div className="flex-1 space-y-6">
                        {/* שם מלא */}
                        <div>
                            {/* ... (קוד שם מלא נשאר זהה) ... */}
                            <label htmlFor="full_name" className="block text-sm font-medium text-gray-500 mb-1">שם מלא</label>
                            <input type="text" id="full_name" name="full_name" value={formData.full_name} onChange={handleChange} required
                                   className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-primary-blue"/>
                        </div>
                        {/* מקצוע ושנות ניסיון */}
                        <div className="grid grid-cols-2 gap-4">
                             {/* ... (קוד מקצוע ושנות ניסיון נשאר זהה, כולל select) ... */}
                               <div>
                                <label htmlFor="profession_id" className="block text-sm font-medium text-gray-500 mb-1">מקצוע</label>
                                <select id="profession_id" name="profession_id" value={formData.profession_id} onChange={handleChange} required
                                       className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-primary-blue bg-white appearance-none pr-8 bg-no-repeat bg-right" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'left 0.5rem center', backgroundSize: '1.5em 1.5em' }}>
                                     <option value="" disabled>-- בחר מקצוע --</option>
                                     {professions.map(prof => ( <option key={prof.id} value={prof.id}>{prof.name}</option> ))}
                                </select>
                             </div>
                              <div>
                                <label htmlFor="years_of_practice" className="block text-sm font-medium text-gray-500 mb-1">שנות נסיון</label>
                                <input type="number" id="years_of_practice" name="years_of_practice" value={formData.years_of_practice} onChange={handleChange} min="0" max="60"
                                       className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-primary-blue"/>
                             </div>
                        </div>
                        {/* אודות */}
                        <div>
                            {/* ... (קוד אודות נשאר זהה) ... */}
                             <label htmlFor="bio" className="block text-sm font-medium text-gray-500 mb-1">קצת עלי / גישה טיפולית</label>
                            <textarea id="bio" name="bio" value={formData.bio} onChange={handleChange} rows="5" placeholder="ספר/י על הניסיון, הגישה הטיפולית וההתמחויות שלך..."
                                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-primary-blue resize-none"/>
                        </div>
                        {/* התמחויות */}
                        <div>
                           {/* ... (קוד התמחויות עם תגיות נשאר זהה) ... */}
                            <label className="block text-sm font-medium text-gray-500 mb-2">התמחויות</label>
                           {formData.profession_id ? (
                               <div className="flex flex-wrap gap-3">
                                   {filteredSpecialties.length > 0 ? filteredSpecialties.map(spec => (
                                       <button key={spec.id} type="button" onClick={() => handleSpecialtyToggle(spec.id)}
                                               className={`px-4 py-1.5 rounded-full border-2 text-sm font-medium transition duration-150 ease-in-out ${ formData.specialties.includes(spec.id) ? 'bg-primary-blue border-primary-blue text-white shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-primary-blue/70 hover:text-primary-blue' }`}>
                                           {spec.name}
                                       </button>
                                   )) : <p className="text-sm text-gray-500">לא נמצאו התמחויות למקצוע זה.</p>}
                               </div>
                           ) : ( <p className="text-sm text-gray-500">נא לבחור מקצוע כדי להציג התמחויות.</p> )}
                        </div>
                        {/* מיקומים */}
                        <div>
                            {/* ... (קוד מיקומים נשאר זהה) ... */}
                             <label className="block text-sm font-medium text-gray-500 mb-2">מיקומי קליניקה</label>
                            <div className="space-y-2">
                                {formData.locations.map((loc, index) => (
                                    <div key={index} className="flex items-center gap-2 p-2 border border-gray-200 rounded-md bg-gray-50">
                                         {/* TODO: Add Region dropdown */}
                                         <input type="text" placeholder="עיר" value={loc.city} onChange={(e) => handleLocationChange(index, 'city', e.target.value)} className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm shadow-sm"/>
                                         <input type="text" placeholder="כתובת (אופציונלי)" value={loc.address} onChange={(e) => handleLocationChange(index, 'address', e.target.value)} className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm shadow-sm"/>
                                         <button type="button" onClick={() => removeLocation(index)} title="הסר מיקום" className="text-red-400 hover:text-red-600 font-bold text-xl px-1">&times;</button>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={addLocation} className="mt-2 text-sm text-primary-blue hover:underline font-medium">+ הוסף מיקום</button>
                        </div>
                        {/* כפתור שמירה (של הפרופיל) */}
                        <div className="pt-6 border-t border-gray-200 flex justify-start">
                             <button type="submit" disabled={saving} /* Changed from loading */
                                     className="inline-flex items-center justify-center py-2.5 px-6 border border-transparent rounded-lg shadow-md text-base font-semibold text-white transition duration-200 ease-in-out bg-primary-blue hover:bg-secondary-purple focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue disabled:opacity-60 disabled:cursor-not-allowed">
                                {saving ? <div className="spinner w-5 h-5 border-t-white border-r-white border-b-white border-l-primary-blue"></div> : 'שמור שינויי פרופיל'}
                             </button>
                         </div>
                    </div>
                </div>
            </form>

             {/* --- חלק 2: ניהול זמינות (עם משבצות מלאות) --- */}
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-md w-full mx-auto text-right">
                <h3 className="text-xl font-bold text-text-dark mb-4">ניהול זמינות שבועית</h3>
                <p className="text-sm text-gray-500 mb-6">סמן/י את משבצות הזמן הפנויות עבורך לקביעת פגישות. לחיצה נוספת מבטלת.</p>
                <div className="overflow-x-auto pb-4"> {/* Added padding bottom */}
                    <table className="min-w-full border-collapse border border-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">יום</th>
                                {timeSlots.map(slot => (
                                    <th key={slot} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">{slot}</th>
                                ))}
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
                                                title={`${day}, ${slot} - ${isSelected ? 'פנוי/ה (לחץ לביטול)' : 'לא פנוי/ה (לחץ להוספה)'}`}>
                                                 {/* No content needed */}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {/* כפתור שמירת זמינות */}
                 <div className="mt-6 pt-6 border-t border-gray-200 flex justify-start">
                     <button type="button" onClick={handleAvailabilitySubmit} disabled={saving} /* Changed from loading */
                            className="inline-flex items-center justify-center py-2.5 px-6 border border-transparent rounded-lg shadow-md text-base font-semibold text-white transition duration-200 ease-in-out bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-60 disabled:cursor-not-allowed">
                        {saving ? <div className="spinner w-5 h-5 border-t-white border-r-white border-b-white border-l-green-500"></div> : 'שמור שינויי זמינות'}
                    </button>
                 </div>
            </div>
        </div>
    );
};

export default ProfileEditor;