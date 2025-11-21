// src/components/ProfileEditor.jsx - V-FINAL (Payment + Smart Filter)
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

    // 1. טעינת נתונים
    useEffect(() => {
        let isMounted = true;
        const fetchInitialData = async () => {
            if (!user?.id) { setError("שגיאה בנתוני משתמש"); setLoading(false); return; }
            if (isMounted) setLoading(true); setError(null);

            try {
                const optionsRes = await fetch(`${API_URL}/api/data/options`, { credentials: 'include' });
                if (optionsRes.status === 401) { if (onLogout) onLogout(); return; }
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
                        availability = typeof profileData.availability === 'string' 
                            ? JSON.parse(profileData.availability) 
                            : (profileData.availability || {});
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
                        availability: availability, 
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

    // 2. לוגיקת סינון (חכמה!)
    useEffect(() => {
         if (formData.profession_id && allSpecialties?.length > 0) {
             const professionIdNum = parseInt(formData.profession_id, 10);
             const selectedProfession = professions.find(p => p.id === professionIdNum);
             const mainCategoryId = selectedProfession ? selectedProfession.main_category_id : null;

             setFilteredSpecialties(allSpecialties.filter(spec => {
                 // תנאי א: שייך ישירות למקצוע
                 const isDirect = spec.profession_id === professionIdNum;
                 // תנאי ב: שייך לקטגוריה הראשית ואין לו מקצוע ספציפי
                 const isShared = spec.main_category_id === mainCategoryId && !spec.profession_id;
                 return isDirect || isShared;
             }));
         } else {
             setFilteredSpecialties([]);
         }
     }, [formData.profession_id, allSpecialties, professions]);

    // 3. Handlers
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
    const handleSpecialtyToggle = (id) => {
        setFormData(prev => ({ ...prev, specialties: prev.specialties.includes(id) ? prev.specialties.filter(s => s !== id) : [...prev.specialties, id] }));
    };
    const handleLocationChange = (i, f, v) => {
        const locs = [...formData.locations]; locs[i][f] = v; setFormData(prev => ({ ...prev, locations: locs }));
    };
    const addLocation = () => setFormData(prev => ({ ...prev, locations: [...prev.locations, { city: '', region: '' }] }));
    const removeLocation = (i) => setFormData(prev => ({ ...prev, locations: prev.locations.filter((_, idx) => idx !== i) }));
    const handleAvailabilityToggle = (d, s) => {
         setFormData(prev => {
            const current = prev.availability || {};
            const daySlots = current[d] || [];
            const updated = daySlots.includes(s) ? daySlots.filter(sl => sl !== s) : [...daySlots, s];
            const newAvail = { ...current };
            if (updated.length === 0) delete newAvail[d]; else newAvail[d] = updated;
            return { ...prev, availability: newAvail };
         });
    };

    // 4. תמונות (וקרופינג)
    const handleImageClick = () => { if (fileInputRef.current) fileInputRef.current.click(); };
    const onFileChange = (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => { setImageToCrop(reader.result); setIsCropping(true); };
        reader.readAsDataURL(file);
    };
    const onCropComplete = (blob) => {
        setIsCropping(false); if (!blob) return;
        setFormData(prev => ({ ...prev, profile_image_url: URL.createObjectURL(blob) }));
        uploadImage(blob);
    };
    const uploadImage = async (blob) => {
        setSavingImage(true); 
        try {
            const fd = new FormData(); fd.append('profileImage', blob, 'p.jpg');
            const res = await fetch(`${API_URL}/api/professionals/me/upload-image`, { method: 'POST', credentials: 'include', body: fd });
            const data = await res.json(); 
            if(res.ok) setFormData(prev => ({ ...prev, profile_image_url: data.imageUrl }));
        } catch(e) { setError('שגיאת העלאה'); } finally { setSavingImage(false); }
    };

    // 5. שדרוג / תשלום
    const handleUpgrade = async () => {
        if (!window.confirm('מעבר לדף תשלום מאובטח?')) return;
        try {
            const res = await fetch(`${API_URL}/api/payment/checkout`, { method: 'POST', credentials: 'include' });
            const data = await res.json();
            if (data.paymentUrl) window.location.href = data.paymentUrl;
            else alert('שגיאה ביצירת תשלום');
        } catch(e) { alert('שגיאת תקשורת'); }
    };

    // 6. שמירה
    const handleProfileSubmit = async (e) => {
        e.preventDefault(); setSavingProfile(true); setError(null); setMessage(null);
        try {
            const { profile_image_url, email, availability, is_verified, ...payload } = formData;
            // ניקוי וסידור
            payload.profession_id = parseInt(payload.profession_id) || null;
            payload.locations = payload.locations.filter(l => l.region);
            
            const res = await fetch(`${API_URL}/api/professionals/me`, { 
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include'
            });
            if (res.status === 401) { onLogout(); return; }
            const data = await res.json(); 
            if (!res.ok) throw new Error(data.error);
            setMessage('✅ נשמר בהצלחה!'); if(onUpdateSuccess) onUpdateSuccess();
        } catch (err) { setError(err.message); } finally { setSavingProfile(false); }
    };

    const handleAvailabilitySubmit = async () => {
        setSavingAvailability(true); 
        try {
             const res = await fetch(`${API_URL}/api/professionals/me/availability`, { 
                 method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ availability: formData.availability }), credentials: 'include'
             });
             if (res.ok) setMessage('✅ זמינות נשמרה!');
        } catch (err) { setError(err.message); } finally { setSavingAvailability(false); }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-8 md:space-y-12">
            {isCropping && <ImageCropper imageSrc={imageToCrop} onCropComplete={onCropComplete} onCancel={() => setIsCropping(false)} />}
            {message && <AlertMessage type="success" message={message} onDismiss={() => setMessage(null)} />}
            {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}

            {/* תשלום */}
            <div className="mb-6 p-4 bg-gradient-to-l from-purple-100 to-white border border-purple-200 rounded-lg flex justify-between items-center shadow-sm">
                <div>
                    <h4 className="font-bold text-purple-900 text-lg">סטטוס: {formData.offers_reduced_fee ? '💎 PRO' : 'חינם'}</h4>
                    <p className="text-sm text-purple-700 mt-1">שדרג כדי להופיע בראש.</p>
                </div>
                {!formData.offers_reduced_fee && (
                    <button onClick={handleUpgrade} className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 shadow-md transition">
                        שדרג עכשיו 🚀
                    </button>
                )}
            </div>

            <form onSubmit={handleProfileSubmit} className="bg-white p-6 md:p-8 rounded-lg shadow w-full mx-auto text-right">
                <h3 className="text-xl font-bold text-text-dark mb-6 border-b pb-3">פרטי פרופיל</h3>
                
                <div className="flex flex-col-reverse md:flex-row gap-8 md:gap-12">
                    <div className="w-full md:w-56 flex flex-col items-center space-y-5">
                         <div className="relative cursor-pointer group" onClick={handleImageClick}>
                              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary-blue/60 shadow-lg">
                                  {savingImage ? <div className="spinner"></div> : <img src={formData.profile_image_url} className="w-full h-full object-cover" />}
                              </div>
                         </div>
                         <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" className="hidden"/>
                    </div>

                    <div className="flex-1 space-y-6">
                        <div><label className="block text-sm font-bold mb-1">שם מלא</label><input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="block w-full px-4 py-2 border rounded-lg"/></div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                 <label className="block text-sm font-bold mb-1">מקצוע</label>
                                 <select name="profession_id" value={formData.profession_id} onChange={handleChange} className="block w-full px-4 py-2 border rounded-lg bg-white">
                                     <option value="" disabled>-- בחר --</option>
                                     {professions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                 </select>
                             </div>
                             <div><label className="block text-sm font-bold mb-1">שנות נסיון</label><input type="number" name="years_of_practice" value={formData.years_of_practice} onChange={handleChange} className="block w-full px-4 py-2 border rounded-lg"/></div>
                        </div>

                        {/* התמחויות */}
                        <div>
                           <label className="block text-sm font-bold mb-2">התמחויות</label>
                           {formData.profession_id ? (
                               <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border max-h-48 overflow-y-auto">
                                   {filteredSpecialties.map(spec => (
                                       <button type="button" key={spec.id} onClick={() => handleSpecialtyToggle(spec.id)} 
                                            className={`px-3 py-1 rounded-full border text-xs font-bold transition ${formData.specialties.includes(spec.id) ? 'bg-primary-blue text-white' : 'bg-white text-gray-600'}`}>
                                           {spec.name}
                                       </button>
                                   ))}
                               </div>
                           ) : <p className="text-xs text-gray-500">בחר מקצוע.</p>}
                        </div>
                        
                        <div className="pt-4"><button type="submit" disabled={savingProfile} className="py-2.5 px-8 bg-primary-blue text-white rounded-lg font-bold hover:bg-secondary-purple transition">{savingProfile ? 'שומר...' : 'שמור'}</button></div>
                    </div>
                </div>
            </form>
            
            {/* זמינות (ניתן להשאיר כמו בקוד הקודם או להעתיק מכאן) */}
            <div className="bg-white p-6 rounded-lg shadow text-right">
                <h3 className="text-xl font-bold mb-4">זמינות</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full border">
                         <thead><tr><th className="px-2">יום</th>{defSlots.map(s => <th key={s} className="px-2 text-center">{s}</th>)}</tr></thead>
                         <tbody>
                            {defDays.map(d => (
                                <tr key={d}><td className="px-2 font-bold">{d}</td>
                                    {defSlots.map(s => (
                                        <td key={s} className={`border cursor-pointer ${formData.availability?.[d]?.includes(s) ? 'bg-blue-500' : 'bg-white'}`} onClick={() => handleAvailabilityToggle(d, s)}></td>
                                    ))}
                                </tr>
                            ))}
                         </tbody>
                    </table>
                </div>
                <div className="mt-4"><button onClick={handleAvailabilitySubmit} className="py-2 px-6 bg-green-500 text-white rounded-lg font-bold">שמור זמינות</button></div>
            </div>
        </div>
    );
};

export default ProfileEditor;