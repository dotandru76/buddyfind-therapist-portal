// src/components/ProfileEditor.jsx - V2.0 (Shared Specialties Filter)
import React, { useState, useEffect, useRef } from 'react';
import ImageCropper from './ImageCropper';
import { getCroppedImg } from '../utils/cropImage';
import AgeRangeSelector from './AgeRangeSelector.jsx'; 

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
const LoadingSpinner = () => ( <div className="text-center p-10"><div className="spinner"></div></div> );
const Checkbox = ({ label, checked, onChange, name }) => (
    <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
        <input type="checkbox" name={name} checked={checked} onChange={onChange} className="h-4 w-4 rounded border-gray-300 text-primary-blue focus:ring-primary-blue"/>
        <span className="text-sm font-medium text-gray-700">{label}</span>
    </label>
);

const ProfileEditor = ({ API_URL, user, onUpdateSuccess, onLogout }) => {
    const [formData, setFormData] = useState({
        full_name: '', email: '', phone_number: '', bio: '', profession_id: '',
        years_of_practice: 0, profile_image_url: '/default-profile.png',
        specialties: [], locations: [], availability: {}, 
        age_ranges: [], license_number: '', whatsapp_number: '',
        is_accessible: false, offers_reduced_fee: false
    });
    
    const [professions, setProfessions] = useState([]);
    const [allSpecialties, setAllSpecialties] = useState([]);
    const [filteredSpecialties, setFilteredSpecialties] = useState([]);
    const [defRegions, setDefRegions] = useState([]); 
    const [defDays, setDefDays] = useState([]);       
    const [defSlots, setDefSlots] = useState([]);     

    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingAvailability, setSavingAvailability] = useState(false);
    const [savingImage, setSavingImage] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);
    const [imageToCrop, setImageToCrop] = useState(null);
    const [isCropping, setIsCropping] = useState(false);

    // Fetch Data
    useEffect(() => {
        let isMounted = true;
        const fetchInitialData = async () => {
            if (!user?.id) {
                setError("שגיאה בטעינת נתונים: פרטי המשתמש אינם תקינים.");
                setLoading(false);
                return;
            }
            if (isMounted) setLoading(true); setError(null); setMessage(null);

            try {
                const optionsRes = await fetch(`${API_URL}/api/data/options`, { credentials: 'include' });
                if (optionsRes.status === 401 || optionsRes.status === 403) { if (onLogout) onLogout(); return; }
                if (!optionsRes.ok) throw new Error('Failed options fetch');

                const profileData = user; 
                const optionsData = await optionsRes.json();

                if (isMounted) {
                    setProfessions(optionsData.professions || []);
                    setAllSpecialties(optionsData.specialties || []);
                    setDefRegions(optionsData.regions || []); 
                    setDefDays(optionsData.days || []);       
                    setDefSlots(optionsData.slots || []);     

                    let availability = {};
                    try {
                        if (typeof profileData.availability === 'string' && profileData.availability) {
                             availability = JSON.parse(profileData.availability);
                        } else if (typeof profileData.availability === 'object' && profileData.availability !== null) {
                             availability = profileData.availability;
                        }
                    } catch(e) { availability = {}; }

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
                        age_ranges: profileData.age_ranges || [],
                        license_number: profileData.license_number || '', 
                        whatsapp_number: profileData.whatsapp_number || '',
                        is_verified: profileData.is_verified || 0,
                        is_accessible: !!profileData.is_accessible,
                        offers_reduced_fee: !!profileData.offers_reduced_fee
                    });
                }
            } catch (err) { if (isMounted) setError(err.message); } 
            finally { if (isMounted) setLoading(false); }
        };
        fetchInitialData();
        return () => { isMounted = false; };
    }, [API_URL, user, onLogout]); 

    // --- Filter Logic (Shared Specialties) ---
    useEffect(() => {
         if (formData.profession_id && allSpecialties?.length > 0) {
             const professionIdNum = parseInt(formData.profession_id, 10);
             
             // מציאת קטגוריה ראשית
             const selectedProfession = professions.find(p => p.id === professionIdNum);
             const mainCategoryId = selectedProfession ? selectedProfession.main_category_id : null;

             setFilteredSpecialties(allSpecialties.filter(spec => {
                 const isDirect = spec.profession_id === professionIdNum;
                 const isShared = spec.main_category_id === mainCategoryId && !spec.profession_id;
                 return isDirect || isShared;
             }));
         } else {
             setFilteredSpecialties([]);
         }
     }, [formData.profession_id, allSpecialties, professions]);

    // Handlers
    const handleChange = (e) => {
         const { name, value, type, checked } = e.target;
         setFormData(prev => {
            let newValue = type === 'checkbox' ? checked : (type === 'number' ? (parseInt(value, 10) || 0) : value);
            const newState = { ...prev, [name]: newValue };
            if (name === 'profession_id') newState.specialties = [];
            return newState;
         });
         setMessage(null); setError(null);
    };

    const handleSpecialtyToggle = (specialtyId) => {
        setFormData(prev => ({ ...prev, specialties: prev.specialties.includes(specialtyId) ? prev.specialties.filter(id => id !== specialtyId) : [...prev.specialties, specialtyId] }));
    };
    
    const handleLocationChange = (index, field, value) => {
        const updatedLocations = [...formData.locations];
        if (field === 'city') updatedLocations[index].city = value;
        if (field === 'region') updatedLocations[index].region = value; 
        setFormData(prev => ({ ...prev, locations: updatedLocations }));
    };
    const addLocation = () => setFormData(prev => ({ ...prev, locations: [...prev.locations, { city: '', region: '' }] }));
    const removeLocation = (index) => setFormData(prev => ({ ...prev, locations: prev.locations.filter((_, i) => i !== index) }));
    
    const handleAvailabilityToggle = (day, timeSlot) => {
         setFormData(prev => {
            const currentAvailability = prev.availability || {};
            const dayAvailability = currentAvailability[day] || [];
            const isSelected = dayAvailability.includes(timeSlot);
            const updatedDayAvailability = isSelected ? dayAvailability.filter(slot => slot !== timeSlot) : [...dayAvailability, timeSlot];
            const updatedAvailability = { ...currentAvailability };
            if (updatedDayAvailability.length === 0) delete updatedAvailability[day];
            else updatedAvailability[day] = updatedDayAvailability;
            return { ...prev, availability: updatedAvailability };
         });
    };

    // Image Logic
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
            const res = await fetch(`${API_URL}/api/professionals/me/upload-image`, { method: 'POST', credentials: 'include', body: uploadFormData });
            if (res.status === 401 || res.status === 403) { onLogout(); return; }
            const data = await res.json(); if (!res.ok) throw new Error(data.error);
            setFormData(prev => ({ ...prev, profile_image_url: data.imageUrl })); setMessage('תמונה הועלתה בהצלחה!');
        } catch (err) { setError(err.message); } finally { setSavingImage(false); }
    };

    // Submit Logic
    const handleProfileSubmit = async (e) => {
        e.preventDefault(); setSavingProfile(true); setError(null); setMessage(null);
        try {
            const { profile_image_url, email, availability, is_verified, ...payload } = formData;
            payload.profession_id = parseInt(payload.profession_id, 10) || null;
            payload.years_of_practice = parseInt(payload.years_of_practice, 10) || 0;
            payload.specialties = payload.specialties || []; 
            payload.locations = (payload.locations || []).map(loc => ({ city: loc.city?.trim(), region: loc.region })).filter(loc => loc.region && (loc.city || loc.region === 'online'));
            payload.age_ranges = formData.age_ranges || []; 
            
            const res = await fetch(`${API_URL}/api/professionals/me`, { 
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include'
            });
            if (res.status === 401 || res.status === 403) { onLogout(); return; }
            const data = await res.json(); 
            if (!res.ok) throw new Error(data.error);
            setMessage('✅ פרטי הפרופיל עודכנו!'); 
            if(onUpdateSuccess) onUpdateSuccess(); 
        } catch (err) { setError(err.message); } finally { setSavingProfile(false); }
    };
    
    const handleAvailabilitySubmit = async () => {
        setSavingAvailability(true); setError(null); setMessage(null);
        try {
             const res = await fetch(`${API_URL}/api/professionals/me/availability`, { 
                 method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ availability: formData.availability || {} }), credentials: 'include'
             });
             if (res.status === 401 || res.status === 403) { onLogout(); return; }
             const data = await res.json(); 
             if (!res.ok) throw new Error(data.error);
             setMessage('✅ זמינות עודכנה!');
             setFormData(prev => ({ ...prev, availability: data.availability }));
        } catch (err) { setError(err.message); } finally { setSavingAvailability(false); }
    };

    if (loading) return <LoadingSpinner />;
    if (error && !formData.email) return <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />;

    return (
        <div className="space-y-8 md:space-y-12">
            {isCropping && ( <ImageCropper imageSrc={imageToCrop} onCropComplete={onCropComplete} onCancel={() => setIsCropping(false)} /> )}
            <AlertMessage type="success" message={message} onDismiss={() => setMessage(null)} />
            {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}

            <form onSubmit={handleProfileSubmit} className="bg-white p-6 md:p-8 rounded-lg shadow w-full mx-auto text-right">
                <h3 className="text-xl font-bold text-text-dark mb-6 border-b pb-3">פרטי פרופיל ומידע מקצועי</h3>
                
                {formData.is_verified === 1 ? (
                    <div className="mb-6 p-4 bg-green-50 border border-green-300 rounded-lg text-green-800 text-center font-semibold">✔️ הפרופיל מאומת</div>
                ) : (
                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-800 text-center font-semibold">⚠️ ממתין לאימות</div>
                )}
                
                <div className="flex flex-col-reverse md:flex-row gap-8 md:gap-12">
                    <div className="w-full md:w-56 flex flex-col items-center space-y-5 flex-shrink-0">
                         <div className="relative cursor-pointer group" onClick={handleImageClick} title="לחץ להחלפת תמונה">
                              <div className="w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-primary-blue/60 shadow-lg bg-gray-100 flex items-center justify-center">
                                  {savingImage ? <div className="spinner w-8 h-8"></div> : <img src={formData.profile_image_url || '/default-profile.png'} alt="פרופיל" className="w-full h-full object-cover" onError={(e) => e.target.src = '/default-profile.png'} />}
                              </div>
                         </div>
                         <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/png, image/jpeg, image/jpg" className="hidden"/>
                         <div className="w-full text-center space-y-3 pt-4 border-t border-gray-200">
                             <div> <label className="block text-xs font-medium text-gray-400">דוא"ל</label> <p className="text-sm text-gray-700">{formData.email}</p> </div>
                             <div> <label className="block text-xs font-medium text-gray-400">טלפון</label> <input type="tel" name="phone_number" value={formData.phone_number || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm text-center" style={{ direction: 'ltr' }}/> </div>
                             <div> <label className="block text-xs font-medium text-gray-400">WhatsApp</label> <input type="tel" name="whatsapp_number" value={formData.whatsapp_number || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm text-center" style={{ direction: 'ltr' }}/> </div>
                         </div>
                    </div>

                    <div className="flex-1 space-y-6">
                        <div> <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label> <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} required className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm"/> </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div> <label className="block text-sm font-medium text-gray-700 mb-1">מקצוע</label> <select name="profession_id" value={formData.profession_id} onChange={handleChange} required className="block w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"> <option value="" disabled>-- בחר --</option> {professions.map(p => ( <option key={p.id} value={p.id}>{p.name}</option> ))} </select> </div>
                             <div> <label className="block text-sm font-medium text-gray-700 mb-1">שנות נסיון</label> <input type="number" name="years_of_practice" value={formData.years_of_practice} onChange={handleChange} min="0" max="60" className="block w-full px-4 py-2 border border-gray-300 rounded-lg"/> </div>
                             <div> <label className="block text-sm font-medium text-gray-700 mb-1">מספר רישיון</label> <input type="text" name="license_number" value={formData.license_number || ''} onChange={handleChange} className="block w-full px-4 py-2 border border-gray-300 rounded-lg"/> </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                             <Checkbox label="קליניקה נגישה" name="is_accessible" checked={formData.is_accessible} onChange={handleChange} />
                             <Checkbox label="תעריף מוזל" name="offers_reduced_fee" checked={formData.offers_reduced_fee} onChange={handleChange} />
                        </div>
                        <div> <label className="block text-sm font-medium text-gray-700 mb-1">קצת עלי</label> <textarea name="bio" value={formData.bio || ''} onChange={handleChange} rows="4" className="block w-full px-4 py-2 border border-gray-300 rounded-lg"/> </div>
                        
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-2">התמחויות (שפת מטפל)</label>
                           {formData.profession_id ? (
                               <div className="flex flex-wrap gap-2">
                                   {filteredSpecialties.length > 0 ? filteredSpecialties.map(spec => (
                                       <button key={spec.id} type="button" onClick={() => handleSpecialtyToggle(spec.id)} className={`px-3 py-1 rounded-full border text-xs font-medium transition ${ formData.specialties.includes(spec.id) ? 'bg-primary-blue text-white' : 'bg-gray-50 text-gray-600' }`}>
                                           {spec.name}
                                       </button>
                                   )) : <p className="text-xs text-gray-500">אין התמחויות זמינות.</p>}
                               </div>
                           ) : ( <p className="text-xs text-gray-500">בחר מקצוע תחילה.</p> )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">טווחי גילאים</label>
                          <AgeRangeSelector value={formData.age_ranges} onChange={(newRanges) => setFormData(prev => ({ ...prev, age_ranges: newRanges }))} />
                        </div>

                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-2">מיקומים</label>
                            <div className="space-y-3">
                                {(formData.locations || []).map((loc, index) => (
                                    <div key={index} className="grid grid-cols-3 gap-2 p-2 border rounded-md bg-gray-50">
                                         <input type="text" placeholder="עיר" value={loc.city || ''} onChange={(e) => handleLocationChange(index, 'city', e.target.value)} className="col-span-2 px-3 py-1 border rounded-md"/>
                                         <select value={loc.region || ''} onChange={(e) => handleLocationChange(index, 'region', e.target.value)} className="col-span-1 px-2 py-1 border rounded-md bg-white">
                                            <option value="" disabled>-- בחר --</option>
                                            {defRegions.map(r => ( <option key={r.region_key} value={r.region_key}>{r.region_name_he}</option> ))}
                                         </select>
                                         <button type="button" onClick={() => removeLocation(index)} className="col-span-3 text-xs text-red-500 text-center">הסר מיקום</button>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={addLocation} className="mt-3 text-sm text-primary-blue font-medium">+ הוסף מיקום</button>
                        </div>

                        <div className="pt-6 border-t border-gray-200 flex justify-start">
                             <button type="submit" disabled={savingProfile} className="py-2.5 px-6 bg-primary-blue text-white rounded-lg font-semibold hover:bg-secondary-purple disabled:opacity-50">{savingProfile ? <ButtonSpinner /> : 'שמור שינויים'}</button>
                         </div>
                    </div>
                </div>
            </form>

            <div className="bg-white p-6 md:p-8 rounded-lg shadow w-full mx-auto text-right">
                <h3 className="text-xl font-bold text-text-dark mb-4">זמינות שבועית</h3>
                <div className="overflow-x-auto pb-4">
                    <table className="min-w-full border-collapse border border-gray-200">
                         <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-right border border-gray-200">יום</th>
                                {defSlots.map(slot => ( <th key={slot} className="px-3 py-2 text-center border border-gray-200">{slot}</th> ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {defDays.map(day => (
                                <tr key={day}>
                                    <td className="px-3 py-3 text-sm font-medium border border-gray-200">{day}</td>
                                    {defSlots.map(slot => {
                                        const isSelected = formData.availability?.[day]?.includes(slot);
                                        return (
                                            <td key={slot} className={`border border-gray-200 cursor-pointer ${isSelected ? 'bg-primary-blue/80' : 'bg-white'}`} onClick={() => handleAvailabilityToggle(day, slot)}></td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <div className="mt-6 pt-6 border-t border-gray-200 flex justify-start">
                     <button type="button" onClick={handleAvailabilitySubmit} disabled={savingAvailability} className="py-2.5 px-6 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50">{savingAvailability ? <ButtonSpinner color="green-500"/> : 'שמור זמינות'}</button>
                 </div>
            </div>
        </div>
    );
};

export default ProfileEditor;