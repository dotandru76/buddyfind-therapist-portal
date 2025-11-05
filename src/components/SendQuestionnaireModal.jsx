// src/components/SendQuestionnaireModal.jsx
// --- רכיב מודאל חדש לשליחת שאלון ---

import React, { useState, useEffect } from 'react';

// (רכיבי עזר פנימיים)
const LoadingSpinner = () => (
    <div className="text-center p-5">
        <div className="spinner w-8 h-8 mx-auto border-t-primary-blue border-r-primary-blue"></div>
    </div>
);

const AlertMessage = ({ type, message, onDismiss }) => {
    if (!message) return null;
    const baseClasses = "px-4 py-3 rounded relative mb-4 text-right";
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


const SendQuestionnaireModal = ({ authToken, API_URL, onClose, onSend, templates }) => {
    const [clients, setClients] = useState([]);
    const [professionals, setProfessionals] = useState([]);
    
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedProfId, setSelectedProfId] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // טעינת רשימות לבחירה (לקוחות ומטפלים)
    useEffect(() => {
        const fetchDropdownData = async () => {
            setLoading(true); setError(null);
            try {
                const [clientsRes, profsRes] = await Promise.all([
                    fetch(`${API_URL}/api/admin/users/all`, { // שימוש ב-API הקיים
                        headers: { 'Authorization': `Bearer ${authToken}` }
                    }),
                    fetch(`${API_URL}/api/admin/users/professionals`, { // שימוש ב-API הקיים
                        headers: { 'Authorization': `Bearer ${authToken}` }
                    })
                ]);

                if (!clientsRes.ok || !profsRes.ok) {
                    throw new Error('שגיאה בטעינת רשימות');
                }
                
                const allUsers = await clientsRes.json();
                const professionalsData = await profsRes.json();
                
                // סינון הלקוחות מתוך רשימת כל המשתמשים
                setClients(allUsers.filter(u => u.user_type === 'client'));
                setProfessionals(professionalsData);
                
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchDropdownData();
    }, [authToken, API_URL]);
    
    const handleSubmit = async () => {
        if (!selectedClientId || !selectedProfId || !selectedTemplateId) {
            setError("חובה לבחור לקוח, מטפל ותבנית.");
            return;
        }
        
        setLoading(true); setError(null);
        
        try {
             const res = await fetch(`${API_URL}/api/admin/questionnaires/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    client_user_id: parseInt(selectedClientId, 10),
                    professional_id: parseInt(selectedProfId, 10),
                    questionnaire_id: parseInt(selectedTemplateId, 10)
                })
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'שגיאה בשליחת השאלון');
            }
            
            onSend(); // הצלחה
            
        } catch (err) {
            setError(err.message);
            setLoading(false); // השאר מודאל פתוח אם יש שגיאה
        }
    };
    
    const canSubmit = selectedClientId && selectedProfId && selectedTemplateId;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white p-6 md:p-8 rounded-2xl w-full max-w-lg relative shadow-xl text-right" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-text-dark mb-6 border-b pb-3">שליחת שאלון חדש</h2>
                <button onClick={onClose} className="absolute top-4 left-4 text-gray-500 text-2xl leading-none transition hover:text-red-500">&times;</button>
                
                {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}
                
                {loading && <LoadingSpinner />}
                
                {!loading && !error && (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="clientSelect" className="block text-sm font-medium text-gray-700 mb-1">1. בחר לקוח</label>
                            <select
                                id="clientSelect"
                                value={selectedClientId}
                                onChange={(e) => setSelectedClientId(e.target.value)}
                                className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white"
                            >
                                <option value="" disabled>-- בחר לקוח --</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.email}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label htmlFor="templateSelect" className="block text-sm font-medium text-gray-700 mb-1">2. בחר תבנית שאלון</label>
                            <select
                                id="templateSelect"
                                value={selectedTemplateId}
                                onChange={(e) => setSelectedTemplateId(e.target.value)}
                                className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white"
                            >
                                <option value="" disabled>-- בחר תבנית --</option>
                                {templates.map(template => (
                                    <option key={template.id} value={template.id}>{template.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label htmlFor="profSelect" className="block text-sm font-medium text-gray-700 mb-1">3. שייך למטפל</label>
                            <select
                                id="profSelect"
                                value={selectedProfId}
                                onChange={(e) => setSelectedProfId(e.target.value)}
                                className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white"
                            >
                                <option value="" disabled>-- בחר מטפל --</option>
                                {professionals.map(prof => (
                                    <option key={prof.id} value={prof.id}>{prof.full_name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="pt-4 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={handleSubmit}
                                disabled={!canSubmit || loading}
                                className="py-2.5 px-6 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition disabled:opacity-50"
                            >
                                {loading ? 'שולח...' : 'שלח שאלון'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SendQuestionnaireModal;