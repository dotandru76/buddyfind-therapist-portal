// src/components/AdminEditProfessionalModal.jsx - V-FINAL-LAYER-FIX
import React, { useState, useEffect } from 'react';

const AdminEditProfessionalModal = ({ API_URL, professionalId, onClose, onSave }) => {
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        
        fetch(`${API_URL}/api/admin/professionals/${professionalId}`, { credentials: 'include' })
            .then(res => {
                if (!res.ok) {
                    if (res.status === 404) throw new Error('מטפל לא נמצא');
                    throw new Error(`שגיאת שרת: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                if (isMounted) {
                    // אבטחת שדות - מניעת null שגורם לקריסות רינדור
                    setFormData({
                        full_name: data.full_name || '',
                        bio: data.bio || '',
                        phone_number: data.phone_number || '',
                        license_number: data.license_number || '',
                        is_verified: data.is_verified === 1 ? 1 : 0,
                        offers_reduced_fee: data.offers_reduced_fee === 1 ? 1 : 0
                    });
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error(err);
                if (isMounted) {
                    setError(err.message);
                    setLoading(false);
                }
            });
            
        return () => { isMounted = false; };
    }, [API_URL, professionalId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/admin/professionals/${professionalId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                alert('עודכן בהצלחה!');
                onSave();
            } else {
                alert('שגיאה בעדכון');
            }
        } catch (e) { console.error(e); }
    };

    // 1. טעינה (עם z-index גבוה)
    if (loading) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
                <div className="bg-white p-5 rounded text-black font-bold shadow-xl">
                    טוען נתונים...
                </div>
            </div>
        );
    }

    // 2. שגיאה (עם z-index גבוה)
    if (error) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
                <div className="bg-white p-5 rounded text-center max-w-sm border-2 border-red-500 shadow-xl">
                    <h3 className="text-red-600 font-bold mb-2">שגיאה</h3>
                    <p>{error}</p>
                    <button onClick={onClose} className="mt-4 bg-gray-300 px-4 py-2 rounded">סגור</button>
                </div>
            </div>
        );
    }

    if (!formData) return null;

    // 3. הטופס (z-[100] מבטיח שהוא מעל טבלת המטפלים)
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 text-right overflow-y-auto max-h-[90vh] relative" 
                onClick={(e) => e.stopPropagation()}
                style={{ direction: 'rtl' }}
            >
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-xl font-bold text-gray-800">עריכת פרטים</h3>
                    <button onClick={onClose} className="text-3xl leading-none hover:text-red-500">&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-700">שם מלא</label>
                        <input className="w-full border p-2 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-700">טלפון</label>
                        <input className="w-full border p-2 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} style={{direction: 'ltr', textAlign: 'right'}} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-700">מספר רישיון</label>
                        <input className="w-full border p-2 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.license_number} onChange={e => setFormData({...formData, license_number: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-700">אודות (Bio)</label>
                        <textarea className="w-full border p-2 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" rows="4" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} />
                    </div>
                    
                    <div className="flex gap-4 bg-gray-100 p-3 rounded border border-gray-200">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={formData.is_verified === 1} onChange={e => setFormData({...formData, is_verified: e.target.checked ? 1 : 0})} className="w-5 h-5 accent-blue-600"/>
                            <span className="font-medium">מאומת (וי כחול)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={formData.offers_reduced_fee === 1} onChange={e => setFormData({...formData, offers_reduced_fee: e.target.checked ? 1 : 0})} className="w-5 h-5 accent-purple-600"/>
                            <span className="font-medium">מנוי PRO</span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 mt-4 pt-2 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition">ביטול</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition shadow-md">שמור שינויים</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminEditProfessionalModal;