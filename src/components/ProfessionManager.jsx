// src/components/ProfessionManager.jsx - v3 (With Edit Mode)
import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from './LoadingSpinner';
import AlertMessage from './AlertMessage';

const ProfessionManager = ({ API_URL, onLogout }) => {
    const [professions, setProfessions] = useState([]);
    const [mainCategories, setMainCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    
    const [newProfName, setNewProfName] = useState('');
    const [newProfCat, setNewProfCat] = useState('');
    
    // --- !!! מצב עריכה !!! ---
    const [editingId, setEditingId] = useState(null); // ה-ID של המקצוע שנערך כרגע
    const [editName, setEditName] = useState('');
    const [editCat, setEditCat] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${API_URL}/api/admin/data/all-definitions`, { 
                credentials: 'include' 
            });
            if (res.status === 401 || res.status === 403) { onLogout(); return; }
            if (!res.ok) throw new Error('שגיאה בטעינת הנתונים');
            const data = await res.json();
            setProfessions(data.professions || []);
            setMainCategories(data.mainCategories || []);
            if (data.mainCategories && data.mainCategories.length > 0) {
                setNewProfCat(data.mainCategories[0].id);
            }
        } catch (err) { setError(err.message); } 
        finally { setLoading(false); }
    }, [API_URL, onLogout]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setError(null); setMessage(null);
        if (!newProfName.trim() || !newProfCat) { setError('יש למלא את כל השדות.'); return; }
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/professions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: newProfName, main_category_id: parseInt(newProfCat, 10) })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'שגיאה ביצירה');
            setMessage('מקצוע חדש נוצר בהצלחה!');
            setNewProfName('');
            setProfessions(prev => [...prev, data.newProfession].sort((a, b) => a.name.localeCompare(b.name)));
        } catch (err) { setError(err.message); } 
        finally { setSaving(false); }
    };
    
    // --- התחלת עריכה ---
    const startEdit = (prof) => {
        setEditingId(prof.id);
        setEditName(prof.name);
        setEditCat(prof.main_category_id);
        setMessage(null); setError(null);
    };
    
    // --- ביטול עריכה ---
    const cancelEdit = () => {
        setEditingId(null);
    };
    
    // --- שמירת שינויים ---
    const saveEdit = async (id) => {
        setSaving(true); setError(null);
        try {
            const res = await fetch(`${API_URL}/api/admin/professions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: editName, main_category_id: parseInt(editCat, 10) })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'שגיאה בעדכון');
            
            setMessage('המקצוע עודכן בהצלחה.');
            // עדכון הרשימה המקומית
            setProfessions(prev => prev.map(p => p.id === id ? data.updatedProfession : p));
            setEditingId(null);
        } catch (err) { setError(err.message); } 
        finally { setSaving(false); }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-2xl font-bold text-text-dark">מסך 1: ניהול נתונים (מקצועות)</h3>
            
            {message && <AlertMessage type="success" message={message} onDismiss={() => setMessage(null)} />}
            {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}

            <form onSubmit={handleCreate} className="bg-white p-6 rounded-lg shadow space-y-4 border-t-4 border-green-500">
                <h4 className="text-lg font-semibold">הוספת מקצוע חדש</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">שם המקצוע</label>
                        <input type="text" value={newProfName} onChange={(e) => setNewProfName(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="למשל: פסיכותרפיה" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">קטגוריה ראשית</label>
                        <select value={newProfCat} onChange={(e) => setNewProfCat(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
                            {mainCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </div>
                    <div className="self-end">
                        <button type="submit" disabled={saving} className="py-2 px-4 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition disabled:opacity-50">
                            {saving ? 'שומר...' : 'צור מקצוע'}
                        </button>
                    </div>
                </div>
            </form>

            <div className="bg-white p-6 rounded-lg shadow">
                <h4 className="text-lg font-semibold mb-4">מקצועות קיימים ({professions.length})</h4>
                {loading && professions.length === 0 && <LoadingSpinner />}
                
                {!loading && professions.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-600 bg-gray-100">שם המקצוע</th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-600 bg-gray-100">קטגוריה ראשית</th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-600 bg-gray-100 w-24">פעולות</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {professions.map(prof => (
                                    <tr key={prof.id} className="hover:bg-gray-50">
                                        {editingId === prof.id ? (
                                            // --- שורת עריכה ---
                                            <>
                                                <td className="px-4 py-3">
                                                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-2 py-1 border border-blue-300 rounded" />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select value={editCat} onChange={(e) => setEditCat(e.target.value)} className="w-full px-2 py-1 border border-blue-300 rounded">
                                                        {mainCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3 flex gap-2">
                                                    <button onClick={() => saveEdit(prof.id)} disabled={saving} className="text-green-600 hover:text-green-800 font-medium">שמור</button>
                                                    <button onClick={cancelEdit} disabled={saving} className="text-gray-500 hover:text-gray-700">ביטול</button>
                                                </td>
                                            </>
                                        ) : (
                                            // --- שורת תצוגה ---
                                            <>
                                                <td className="px-4 py-3 font-medium text-gray-900">{prof.name}</td>
                                                <td className="px-4 py-3 text-gray-600">{prof.main_category_name}</td>
                                                <td className="px-4 py-3">
                                                    <button onClick={() => startEdit(prof)} className="text-primary-blue hover:text-secondary-purple font-medium transition">
                                                        ✏️ ערוך
                                                    </button>
                                                </td>
                                            </>
                                        )}
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