// src/components/AdminEditProfessionalModal.jsx - DEBUG VERSION 🕵️‍♂️
import React, { useState, useEffect } from 'react';

const AdminEditProfessionalModal = ({ API_URL, professionalId, onClose, onSave }) => {
    const [formData, setFormData] = useState(null);
    const [logs, setLogs] = useState([]); // שומר לוגים להצגה על המסך

    // פונקציית עזר לרישום לוגים בזמן אמת למסך
    const addLog = (msg) => {
        const time = new Date().toLocaleTimeString();
        console.log(`[MODAL DEBUG] ${msg}`);
        setLogs(prev => [...prev, `${time}: ${msg}`]);
    };

    useEffect(() => {
        let isMounted = true;
        addLog(`1. המודאל נפתח. ID מטפל: ${professionalId}`);
        
        const targetUrl = `${API_URL}/api/admin/professionals/${professionalId}`;
        addLog(`2. כתובת לפניה: ${targetUrl}`);

        // בדיקת טוקן (האם קיים?)
        const cookies = document.cookie;
        addLog(`3. Cookies בדפדפן: ${cookies ? 'יש עוגיות' : 'אין עוגיות (ריק)'}`);

        fetch(targetUrl, { credentials: 'include' })
            .then(async (res) => {
                addLog(`4. תשובת שרת התקבלה. סטטוס: ${res.status} (${res.statusText})`);
                
                if (!res.ok) {
                    const text = await res.text();
                    addLog(`❌ שגיאת שרת: ${text.slice(0, 100)}`);
                    throw new Error(`HTTP ${res.status}: ${text}`);
                }
                return res.json();
            })
            .then(data => {
                if (isMounted) {
                    addLog(`5. נתונים פוענחו בהצלחה!`);
                    addLog(`   שם: ${data.full_name}`);
                    addLog(`   אימייל: ${data.email}`);
                    
                    setFormData({
                        full_name: data.full_name || '',
                        bio: data.bio || '',
                        phone_number: data.phone_number || '',
                        license_number: data.license_number || '',
                        is_verified: data.is_verified,
                        offers_reduced_fee: data.offers_reduced_fee
                    });
                    addLog(`6. הטופס מוכן לרינדור.`);
                }
            })
            .catch(err => {
                addLog(`🔥 CRITICAL ERROR: ${err.message}`);
            });
            
        return () => { isMounted = false; };
    }, [API_URL, professionalId]);

    // --- תצוגת דיבאג (במקום להחזיר null) ---
    if (!formData) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" dir="ltr">
                <div className="bg-gray-900 text-green-400 p-6 rounded-lg shadow-2xl w-full max-w-2xl border border-green-500 font-mono text-left">
                    <h2 className="text-xl font-bold mb-4 border-b border-green-700 pb-2">🛠️ MODAL DEBUGGER</h2>
                    <div className="space-y-2 mb-6 h-64 overflow-y-auto bg-black p-4 rounded">
                        {logs.map((log, i) => (
                            <div key={i}>{log}</div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500 animate-pulse">Waiting for data...</span>
                        <button 
                            onClick={onClose} 
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-sans"
                        >
                            סגור חלון (Close)
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- אם הנתונים הגיעו, מציגים את הטופס הרגיל ---
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 text-right overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-xl font-bold text-gray-800">עריכת מטפל (DEBUG MODE)</h3>
                    <button onClick={onClose} className="text-gray-500 text-2xl">&times;</button>
                </div>
                {/* כאן מופיע הטופס הרגיל... */}
                <div className="p-4 bg-green-50 text-green-800 mb-4 text-sm rounded">
                    ✅ הנתונים נטענו! אפשר לערוך.
                </div>
                {/* ... שאר הקוד של הטופס ... */}
                <button onClick={onClose} className="w-full py-2 bg-gray-200 rounded mt-4">סגור (חזרה לטופס המקורי בהמשך)</button>
            </div>
        </div>
    );
};

export default AdminEditProfessionalModal;