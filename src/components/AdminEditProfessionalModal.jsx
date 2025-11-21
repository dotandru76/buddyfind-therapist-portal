// src/components/AdminEditProfessionalModal.jsx - V-FINAL (Production Ready)
import React, { useState, useEffect } from 'react';

const AdminEditProfessionalModal = ({ API_URL, professionalId, onClose, onSave }) => {
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        // טעינת נתונים
        fetch(`${API_URL}/api/admin/professionals/${professionalId}`, { credentials: 'include' })
            .then(res => {
                if (!res.ok) {
                    if (res.status === 404) throw new Error('מטפל לא נמצא (רשומה שבורה)');
                    throw new Error('שגיאה בטעינת נתונים');
                }
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
                onSave(); // סגירה ורענון
            } else {
                alert('שגיאה בעדכון');
            }
        } catch (e) { console.error(e); }
    };

    // --- תצוגות מצב (מונע מסך שחור) ---

    // 1. מצב טעינה
    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-pulse">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-700 font-bold">טוען נתוני מטפל...</p>
                </div>
            </div>
        );
    }

    // 2. מצב שגיאה (למשל ID 50)
    if (error || !formData) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-xl shadow-2xl text-center max-w-sm border-t-4 border-red-500">
                    <h3 className="text-xl font-bold text-red-600 mb-2">שגיאה</h3>
                    <p className="mb-6 text-gray-600">{error || 'לא ניתן לטעון את הנתונים.'}</p>
                    <button 
                        onClick={onClose} 
                        className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition shadow-md"
                    >
                        סגור
                    </button>
                </div>
            </div>
        );
    }

    // 3. הטופס התקין
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 text-right overflow-y-auto max-h-[90vh] transform transition-all scale-100">
                
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 className="text-2xl font-bold text-gray-800">עריכת מטפל: {formData.full_name}</h3>
                    <button onClick={onClose} className="text-gray-400 text-3xl hover:text-red-500 transition">&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-bold mb-1 text-gray-700">שם מלא</label>
                            <input 
                                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" 
                                value={formData.full_name}
                                onChange={e => setFormData({...formData, full_name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1 text-gray-700">טלפון</label>
                            <input 
                                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" 
                                value={formData.phone_number}
                                onChange={e => setFormData({...formData, phone_number: e.target.value})}
                                style={{ direction: 'ltr', textAlign: 'right' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-700">מספר רישיון</label>
                        <input 
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" 
                            value={formData.license_number}
                            onChange={e => setFormData({...formData, license_number: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-700">אודות (Bio)</label>
                        <textarea 
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" rows="5"
                            value={formData.bio}
                            onChange={e => setFormData({...formData, bio: e.target.value})}
                        />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded-lg transition">
                            <input 
                                type="checkbox" 
                                checked={formData.is_verified === 1}
                                onChange={e => setFormData({...formData, is_verified: e.target.checked ? 1 : 0})}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-gray-800 font-medium">מאומת (וי כחול)</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded-lg transition">
                            <input 
                                type="checkbox" 
                                checked={formData.offers_reduced_fee === 1}
                                onChange={e => setFormData({...formData, offers_reduced_fee: e.target.checked ? 1 : 0})}
                                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <span className="text-gray-800 font-medium">מנוי PRO (מקודם)</span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition">ביטול</button>
                        <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">שמור שינויים</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminEditProfessionalModal;