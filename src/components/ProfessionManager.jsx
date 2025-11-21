// src/components/ProfessionManager.jsx - V-FINAL (Smart CMS)
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
    const [activeTab, setActiveTab] = useState('professions'); 
    const [data, setData] = useState({ professions: [], specialties: [], symptoms: [], mainCategories: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    
    // מצב יצירה
    const [newItemName, setNewItemName] = useState('');
    const [selectedParentId, setSelectedParentId] = useState('');
    const [parentType, setParentType] = useState('profession'); 
    const [saving, setSaving] = useState(false);

    // מצב עריכה
    const [editingItem, setEditingItem] = useState(null);
    const [editNameVal, setEditNameVal] = useState('');

    // טעינת נתונים
    const fetchData = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${API_URL}/api/admin/data/all-definitions`, { credentials: 'include' });
            if (res.status === 401 || res.status === 403) { onLogout(); return; }
            if (!res.ok) throw new Error('שגיאה בטעינת הנתונים');
            const result = await res.json();
            setData(result);
            
            // איפוס בחירה ברירת מחדל
            if (activeTab === 'professions' && result.mainCategories.length > 0) {
                setSelectedParentId(result.mainCategories[0].id);
            } else if (result.professions.length > 0) {
                setSelectedParentId(result.professions[0].id);
            }
        } catch (err) { setError(err.message); } 
        finally { setLoading(false); }
    }, [API_URL, onLogout, activeTab]); 

    useEffect(() => { fetchData(); }, [fetchData]);

    // יצירה
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newItemName.trim() || !selectedParentId) return;
        
        let endpoint, body;
        if (activeTab === 'professions') {
            endpoint = '/api/admin/professions';
            body = { name: newItemName, main_category_id: selectedParentId };
        } else if (activeTab === 'specialties') {
            endpoint = '/api/admin/specialties';
            if (parentType === 'category') {
                body = { name: newItemName, main_category_id: selectedParentId, profession_id: null };
            } else {
                body = { name: newItemName, profession_id: selectedParentId, main_category_id: null };
            }
        } else { // symptoms
            endpoint = '/api/admin/symptoms';
            body = { name: newItemName, profession_id: selectedParentId };
        }

        setSaving(true); setError(null); setMessage(null);
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error('שגיאה ביצירה');
            setMessage('נוצר בהצלחה!');
            setNewItemName('');
            fetchData(); 
        } catch (err) { setError(err.message); } 
        finally { setSaving(false); }
    };

    // מחיקה
    const handleDelete = async (id) => {
        if (!window.confirm('האם אתה בטוח? מחיקה זו עלולה להשפיע על נתונים קיימים.')) return;
        
        let endpoint = '';
        if (activeTab === 'professions') endpoint = `/api/admin/professions/${id}`;
        else if (activeTab === 'specialties') endpoint = `/api/admin/specialties/${id}`;
        else if (activeTab === 'symptoms') endpoint = `/api/admin/symptoms/${id}`;

        try {
            const res = await fetch(`${API_URL}${endpoint}`, { method: 'DELETE', credentials: 'include' });
            const data = await res.json();
            if (!res.ok) {
                if (data.error && data.error.includes('לא ניתן למחוק')) {
                    throw new Error(data.error);
                }
                throw new Error('שגיאה במחיקה');
            }
            setMessage('נמחק בהצלחה!');
            fetchData();
        } catch (err) { alert(err.message); }
    };

    // עריכה
    const startEdit = (item) => { setEditingItem(item.id); setEditNameVal(item.name); };
    const cancelEdit = () => { setEditingItem(null); setEditNameVal(''); };
    const saveEdit = async (id) => {
        if (!editNameVal.trim()) return;
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/data/update-name`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                body: JSON.stringify({ type: activeTab, id, name: editNameVal })
            });
            if(!res.ok) throw new Error('שגיאה בעדכון');
            setMessage('עודכן בהצלחה!');
            setEditingItem(null);
            fetchData();
        } catch (err) { alert(err.message); } finally { setSaving(false); }
    };

    // תצוגה: אפשרויות ב-Select
    const renderParentOptions = () => {
        if (activeTab === 'professions') {
            return data.mainCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>);
        }
        if (activeTab === 'specialties') {
            return (
                <>
                    <optgroup label="--- קטגוריות כלליות (משותף לכולם) ---">
                        {data.mainCategories.map(c => (
                            <option key={`cat-${c.id}`} value={`cat-${c.id}`}>{c.name} (כללי)</option>
                        ))}
                    </optgroup>
                    <optgroup label="--- מקצועות ספציפיים ---">
                        {data.professions.map(p => (
                            <option key={`prof-${p.id}`} value={`prof-${p.id}`}>{p.name}</option>
                        ))}
                    </optgroup>
                </>
            );
        }
        return data.professions.map(p => <option key={p.id} value={p.id}>{p.name}</option>);
    };

    const handleSelectChange = (e) => {
        const val = e.target.value;
        if (activeTab === 'specialties') {
            if (val.startsWith('cat-')) {
                setParentType('category');
                setSelectedParentId(val.replace('cat-', ''));
            } else {
                setParentType('profession');
                setSelectedParentId(val.replace('prof-', ''));
            }
        } else {
            setSelectedParentId(val);
        }
    };

    // תצוגה: שם הורה בטבלה
    const getParentName = (item) => {
        if (activeTab === 'professions') {
            return data.mainCategories.find(c => c.id === item.main_category_id)?.name || '-';
        }
        if (activeTab === 'specialties') {
            if (item.main_category_id) {
                const cat = data.mainCategories.find(c => c.id === item.main_category_id);
                return cat ? `🔵 ${cat.name} (כללי)` : 'כללי';
            }
            const prof = data.professions.find(p => p.id === item.profession_id);
            return prof ? prof.name : '-';
        }
        const prof = data.professions.find(p => p.id === item.profession_id);
        return prof ? prof.name : '-';
    };

    const getFilteredList = () => {
        switch (activeTab) {
            case 'professions': return data.professions || [];
            case 'specialties': return data.specialties || [];
            case 'symptoms': return data.symptoms || [];
            default: return [];
        }
    };

    const list = getFilteredList();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center"><h3 className="text-2xl font-bold text-text-dark">ניהול נתונים (CMS)</h3></div>
            
            {message && <AlertMessage type="success" message={message} onDismiss={() => setMessage(null)} />}
            {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}
            
            <div className="flex border-b border-gray-200 bg-white rounded-t-lg overflow-hidden">
                <TabButton text="מקצועות" isActive={activeTab === 'professions'} onClick={() => {setActiveTab('professions'); setEditingItem(null);}} />
                <TabButton text="התמחויות" isActive={activeTab === 'specialties'} onClick={() => {setActiveTab('specialties'); setEditingItem(null);}} />
                <TabButton text="סימפטומים" isActive={activeTab === 'symptoms'} onClick={() => {setActiveTab('symptoms'); setEditingItem(null);}} />
            </div>

            {/* טופס הוספה */}
            <form onSubmit={handleCreate} className="bg-white p-6 rounded-b-lg shadow space-y-4 border-t-0">
                <h4 className="text-lg font-semibold text-gray-700">
                    {activeTab === 'professions' ? 'הוספת מקצוע' : activeTab === 'specialties' ? 'הוספת התמחות' : 'הוספת סימפטום'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {activeTab === 'specialties' ? 'שייך ל- (כללי או ספציפי)' : 'שייך ל-'}
                        </label>
                        <select onChange={handleSelectChange} className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white" defaultValue="">
                            <option value="" disabled>-- בחר --</option>
                            {renderParentOptions()}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">שם הפריט</label>
                        <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="הקלד שם..." />
                    </div>
                    <div className="self-end">
                        <button type="submit" disabled={loading || saving} className="w-full py-2 px-4 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition disabled:opacity-50">{saving ? 'שומר...' : '+ הוסף'}</button>
                    </div>
                </div>
            </form>

            {/* טבלה */}
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-right font-semibold text-gray-600 w-16">ID</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-600">שם</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-600">שיוך</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-600 w-32">פעולות</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {list.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono text-gray-400">#{item.id}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                        {editingItem === item.id ? (
                                            <input type="text" value={editNameVal} onChange={(e) => setEditNameVal(e.target.value)} className="border border-blue-400 rounded px-2 py-1 w-full" autoFocus />
                                        ) : item.name}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{getParentName(item)}</td>
                                    <td className="px-4 py-3 flex gap-2">
                                        {editingItem === item.id ? (
                                            <> <button onClick={() => saveEdit(item.id)} className="text-green-600 font-bold">שמור</button> <button onClick={cancelEdit} className="text-gray-500">ביטול</button> </>
                                        ) : (
                                            <> 
                                                <button onClick={() => startEdit(item)} className="text-blue-600 text-lg" title="ערוך">✎</button>
                                                <button onClick={() => handleDelete(item.id)} className="text-red-500 text-lg" title="מחק">🗑️</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProfessionManager;