// src/components/ProfessionManager.jsx
import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from './LoadingSpinner';
import AlertMessage from './AlertMessage';

const ProfessionManager = ({ API_URL, onLogout }) => {
    const [professions, setProfessions] = useState([]);
    const [mainCategories, setMainCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    
    // State for the "Add New" form
    const [newProfName, setNewProfName] = useState('');
    const [newProfCat, setNewProfCat] = useState('');

    // --- 1. טעינת נתונים ראשונית (מקצועות וקטגוריות) ---
    const fetchData = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            // טעינת שתי הרשימות במקביל
            const [profRes, catRes] = await Promise.all([
                fetch(`${API_URL}/api/admin/professions`, { credentials: 'include' }),
                fetch(`${API_URL}/api/initial-data`) // זה נתיב ציבורי, לא צריך אימות
            ]);

            if (profRes.status === 401 || profRes.status === 403) {
                onLogout(); return;
            }
            if (!profRes.ok || !catRes.ok) {
                throw new Error('שגיאה בטעינת הנתונים');
            }

            const profData = await profRes.json();
            const catData = await catRes.json();
            
            setProfessions(profData);
            setMainCategories(catData.mainCategories || []);
            
            // הגדרת ערך ברירת מחדל לטופס
            if (catData.mainCategories && catData.mainCategories.length > 0) {
                setNewProfCat(catData.mainCategories[0].id);
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [API_URL, onLogout]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- 2. פונקציה ליצירת מקצוע חדש ---
    const handleCreate = async (e) => {
        e.preventDefault();
        setError(null); setMessage(null);
        if (!newProfName.trim() || !newProfCat) {
            setError('יש למלא את כל השדות.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/professions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    name: newProfName,
                    main_category_id: parseInt(newProfCat, 10)
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'שגיאה ביצירת המקצוע');
            }
            
            setMessage('מקצוע חדש נוצר בהצלחה!');
            setNewProfName(''); // איפוס הטופס
            fetchData(); // טעינה מחדש של הרשימה

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    // --- (נוסיף עריכה ומחיקה בשלב הבא) ---

    return (
        <div className="space-y-6">
            <h3 className="text-2xl font-bold text-text-dark">מסך 1: ניהול נתונים (מקצועות)</h3>
            
            {message && <AlertMessage type="success" message={message} onDismiss={() => setMessage(null)} />}
            {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}

            {/* --- טופס הוספת מקצוע חדש --- */}
            <form onSubmit={handleCreate} className="bg-white p-6 rounded-lg shadow space-y-4">
                <h4 className="text-lg font-semibold">הוספת מקצוע חדש</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="newProfName" className="block text-sm font-medium text-gray-700 mb-1">שם המקצוע</label>
                        <input
                            id="newProfName"
                            type="text"
                            value={newProfName}
                            onChange={(e) => setNewProfName(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label htmlFor="newProfCat" className="block text-sm font-medium text-gray-700 mb-1">קטגוריה ראשית</label>
                        <select
                            id="newProfCat"
                            value={newProfCat}
                            onChange={(e) => setNewProfCat(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                        >
                            {mainCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="self-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="py-2 px-4 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition disabled:opacity-50"
                        >
                            {loading ? 'יוצר...' : 'צור מקצוע'}
                        </button>
                    </div>
                </div>
            </form>

            {/* --- טבלת מקצועות קיימים --- */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h4 className="text-lg font-semibold mb-4">מקצועות קיימים</h4>
                {loading && <LoadingSpinner />}
                {!loading && professions.length === 0 && <p>לא נמצאו מקצועות.</p>}
                {!loading && professions.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-right font-medium text-gray-500">שם המקצוע</th>
                                    <th className="px-4 py-2 text-right font-medium text-gray-500">קטגוריה ראשית</th>
                                    <th className="px-4 py-2 text-right font-medium text-gray-500">ID</th>
                                    <th className="px-4 py-2 text-right font-medium text-gray-500">פעולות</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {professions.map(prof => (
                                    <tr key={prof.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium">{prof.name}</td>
                                        <td className="px-4 py-3">{prof.main_category_name}</td>
                                        <td className="px-4 py-3 font-mono">{prof.id}</td>
                                        <td className="px-4 py-3">
                                            <button className="text-primary-blue hover:underline text-xs">ערוך</button>
                                            {/* (נוסיף מחיקה בהמשך) */}
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