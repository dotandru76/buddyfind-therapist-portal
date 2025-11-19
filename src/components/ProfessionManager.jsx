// src/components/ProfessionManager.jsx - v4 (Full CMS: Professions, Specialties, Symptoms)
import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from './LoadingSpinner';
import AlertMessage from './AlertMessage';

const TabButton = ({ text, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-6 py-3 font-semibold transition-colors ${
            isActive 
            ? 'text-primary-blue border-b-2 border-primary-blue bg-blue-50' 
            : 'text-gray-500 hover:bg-gray-50'
        }`}
    >
        {text}
    </button>
);

const ProfessionManager = ({ API_URL, onLogout }) => {
    const [activeTab, setActiveTab] = useState('professions'); // professions, specialties, symptoms
    
    const [data, setData] = useState({ professions: [], specialties: [], symptoms: [], mainCategories: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    
    const [newItemName, setNewItemName] = useState('');
    const [selectedParentId, setSelectedParentId] = useState(''); 
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${API_URL}/api/admin/data/all-definitions`, { credentials: 'include' });
            if (res.status === 401 || res.status === 403) { onLogout(); return; }
            if (!res.ok) throw new Error('שגיאה בטעינת הנתונים');
            const result = await res.json();
            setData(result);
            
            if (activeTab === 'professions' && result.mainCategories.length > 0) setSelectedParentId(result.mainCategories[0].id);
            if ((activeTab === 'specialties' || activeTab === 'symptoms') && result.professions.length > 0) setSelectedParentId(result.professions[0].id);

        } catch (err) { setError(err.message); } 
        finally { setLoading(false); }
    }, [API_URL, onLogout, activeTab]); 

    useEffect(() => { fetchData(); }, [fetchData]);

    // --- יצירת פריט חדש ---
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newItemName.trim() || !selectedParentId) return;
        
        let endpoint, body;
        if (activeTab === 'professions') {
            endpoint = '/api/admin/professions';
            body = { name: newItemName, main_category_id: selectedParentId };
        } else if (activeTab === 'specialties') {
            endpoint = '/api/admin/specialties';
            body = { name: newItemName, profession_id: selectedParentId };
        } else { // symptoms
            endpoint = '/api/admin/symptoms';
            body = { name: newItemName, profession_id: selectedParentId };
        }

        setSaving(true); setError(null); setMessage(null);
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error('שגיאה ביצירה');
            setMessage('נוצר בהצלחה!');
            setNewItemName('');
            fetchData();
        } catch (err) { setError(err.message); } 
        finally { setSaving(false); }
    };

    // --- מחיקת פריט ---
    const handleDelete = async (id, type) => {
        if (!window.confirm('האם אתה בטוח? המחיקה היא סופית. (המיפויים יימחקו)')) return;
        
        const endpoint = type === 'specialties' ? `/api/admin/specialties/${id}` : 
                         type === 'symptoms' ? `/api/admin/symptoms/${id}` : null;
                         
        if (!endpoint) return;

        try {
            const res = await fetch(`${API_URL}${endpoint}`, { method: 'DELETE', credentials: 'include' });
            if (!res.ok) throw new Error('שגיאה במחיקה');
            fetchData();
        } catch (err) { alert(err.message); }
    };

    // --- סינון להצגה בטבלה ---
    const getFilteredList = () => {
        if (activeTab === 'professions') return data.professions;
        if (activeTab === 'specialties') return data.specialties;
        if (activeTab === 'symptoms') return data.symptoms;
        return [];
    };
    
    const getParentName = (item) => {
        if (activeTab === 'professions') return item.main_category_name;
        const prof = data.professions.find(p => p.id === item.profession_id);
        return prof ? prof.name : '-';
    };

    const list = getFilteredList();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-text-dark">ניהול נתונים (CMS)</h3>
            </div>
            
            {message && <AlertMessage type="success" message={message} onDismiss={() => setMessage(null)} />}
            {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}

            {/* --- טאבים --- */}
            <div className="flex border-b border-gray-200 bg-white rounded-t-lg overflow-hidden">
                <TabButton text="מקצועות" isActive={activeTab === 'professions'} onClick={() => setActiveTab('professions')} />
                <TabButton text="התמחויות" isActive={activeTab === 'specialties'} onClick={() => setActiveTab('specialties')} />
                <TabButton text="סימפטומים" isActive={activeTab === 'symptoms'} onClick={() => setActiveTab('symptoms')} />
            </div>

            {/* --- טופס הוספה --- */}
            <form onSubmit={handleCreate} className="bg-white p-6 rounded-b-lg shadow space-y-4 border-t-0">
                <h4 className="text-lg font-semibold text-gray-700">
                    {activeTab === 'professions' ? 'הוספת מקצוע חדש' : 
                     activeTab === 'specialties' ? 'הוספת התמחות' : 
                     'הוספת סימפטום'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* שדה בחירה (הורה) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {activeTab === 'professions' ? 'שייך לקטגוריה' : 'שייך למקצוע'}
                        </label>
                        <select 
                            value={selectedParentId} 
                            onChange={(e) => setSelectedParentId(e.target.value)} 
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                        >
                            <option value="" disabled>-- בחר שיוך --</option>
                            {activeTab === 'professions' 
                                ? data.mainCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                                : data.professions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                            }
                        </select>
                    </div>

                    {/* שדה שם */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">שם הפריט</label>
                        <input
                            type="text"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="הקלד שם..."
                        />
                    </div>

                    <div className="self-end">
                        <button type="submit" disabled={loading || saving} className="w-full py-2 px-4 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition disabled:opacity-50">
                            {saving ? 'שומר...' : '+ הוסף'}
                        </button>
                    </div>
                </div>
            </form>

            {/* --- טבלה --- */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h4 className="text-lg font-semibold mb-4">פריטים קיימים ({list.length})</h4>
                {loading && list.length === 0 && <LoadingSpinner />}
                
                {!loading && list.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-600">ID</th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-600">שם</th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-600">משויך ל-</th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-600 w-24">פעולות</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {list.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono text-gray-400">#{item.id}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                                        <td className="px-4 py-3 text-gray-600">{getParentName(item)}</td>
                                        <td className="px-4 py-3">
                                            {/* מחיקה אפשרית רק להתמחויות וסימפטומים כרגע */}
                                            {activeTab !== 'professions' && (
                                                <button 
                                                    onClick={() => handleDelete(item.id, activeTab)}
                                                    className="text-red-500 hover:text-red-700 text-xs font-bold bg-red-50 px-2 py-1 rounded"
                                                >
                                                    מחק
                                                </button>
                                            )}
                                            {activeTab === 'professions' && <span className="text-gray-400 text-xs">נעול</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfessionManager;