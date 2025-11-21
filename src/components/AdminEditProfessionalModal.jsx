// src/components/AdminEditProfessionalModal.jsx - V3.0 (Fix Black Screen)
import React, { useState, useEffect } from 'react';

const AdminEditProfessionalModal = ({ API_URL, professionalId, onClose, onSave }) => {
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        // טעינת פרטי המטפל
        // הכתובת חייבת להיות /api/admin/...
        fetch(`${API_URL}/api/admin/professionals/${professionalId}`, { credentials: 'include' })
            .then(res => {
                if (!res.ok) throw new Error('שגיאה בטעינת הנתונים מהשרת');
                return res.json();
            })
            .then(data => {
                if (isMounted) {
                    setFormData({
                        full_name: data.full_name || '',
                        bio: data.bio || '',
                        phone_number: data.phone_number || '',
                        license_number: data.license_number || '',
                        is_verified: data.is_verified,
                        offers_reduced_fee: data.offers_reduced_fee
                    });
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error(err);
                if (isMounted) {
                    setFetchError(err.message);
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

    // --- תצוגת מצבי ביניים ---
    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
                <div className="bg-white p-5 rounded-lg text-center">
                    <div className="spinner w-8 h-8 mx-auto border-t-blue-600 border-r-blue-600 rounded-full animate-spin mb-2"></div>
                    <p>טוען נתוני מטפל...</p>
                </div>
            </div>
        );
    }

    // אם יש שגיאה, נציג אותה במקום מסך שחור
    if (fetchError || !formData) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
                <div className="bg-white p-6 rounded-lg text-center max-w-sm">
                    <h3 className="text-xl font-bold text-red-600 mb-2">שגיאה</h3>
                    <p className="mb-4 text-gray-700">{fetchError || 'לא נמצאו נתונים למטפל זה.'}</p>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">סגור</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 text-right overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-xl font-bold text-gray-800">עריכת מטפל (Admin)</h3>
                    <button onClick={onClose} className="text-gray-500 text-2xl hover:text-red-500">&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-700">שם מלא</label>
                        <input className="w-full border p-2 rounded" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-700">טלפון</label>
                        <input className="w-full border p-2 rounded" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} style={{direction:'ltr', textAlign:'right'}} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-700">מספר רישיון</label>
                        <input className="w-full border p-2 rounded" value={formData.license_number} onChange={e => setFormData({...formData, license_number: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-700">אודות (Bio)</label>
                        <textarea className="w-full border p-2 rounded" rows="4" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} />
                    </div>
                    
                    <div className="flex flex-col gap-3 bg-gray-50 p-3 rounded border border-gray-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={formData.is_verified === 1} onChange={e => setFormData({...formData, is_verified: e.target.checked ? 1 : 0})} className="h-4 w-4 text-blue-600" />
                            <span className="text-gray-800">מאומת (וי כחול)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={formData.offers_reduced_fee === 1} onChange={e => setFormData({...formData, offers_reduced_fee: e.target.checked ? 1 : 0})} className="h-4 w-4 text-purple-600" />
                            <span className="text-gray-800">מנוי PRO (מקודם)</span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-2 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition">ביטול</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition shadow-md">שמור שינויים</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminEditProfessionalModal;