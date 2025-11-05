// src/components/QuestionnaireTemplateEditor.jsx
// --- רכיב חדש ליצירת תבנית ---

import React, { useState } from 'react';

// (רכיבי עזר פנימיים שהעתקנו מ-AdminDashboard)
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


const QuestionnaireTemplateEditor = ({ authToken, API_URL, template, onBack, onSave }) => {
    const [name, setName] = useState(template?.name || '');
    const [description, setDescription] = useState(template?.description || '');
    const [questions, setQuestions] = useState(template?.questions_json || []);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const handleAddQuestion = () => {
        const newQuestion = {
            id: `q_${Date.now()}`,
            text: '',
            type: 'text', // סוגי ברירת מחדל: 'text', 'textarea', 'radio'
            options: [] // עבור סוג 'radio'
        };
        setQuestions([...questions, newQuestion]);
    };

    const handleQuestionChange = (id, field, value) => {
        setQuestions(prev => 
            prev.map(q => 
                q.id === id ? { ...q, [field]: value } : q
            )
        );
    };

    const handleRemoveQuestion = (id) => {
        setQuestions(prev => prev.filter(q => q.id !== id));
    };
    
    const handleSaveTemplate = async () => {
        if (!name) {
            setError("חובה למלא שם תבנית.");
            return;
        }
        if (questions.length === 0) {
            setError("חובה להוסיף לפחות שאלה אחת.");
            return;
        }
        
        setSaving(true); setError(null);
        
        const payload = {
            name,
            description,
            questions_json: JSON.stringify(questions) // השרת מצפה למחרוזת JSON
        };
        
        try {
            // (בעתיד נוסיף כאן לוגיקת PUT לעריכה)
            const res = await fetch(`${API_URL}/api/admin/questionnaires`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(payload)
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'שגיאה בשמירת התבנית');
            }
            
            onSave(); // הצלחה - חזור לרשימה
            
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white p-6 md:p-8 rounded-lg shadow w-full mx-auto text-right">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
                <h3 className="text-2xl font-bold text-text-dark">
                    {template ? 'עריכת תבנית שאלון' : 'יצירת תבנית שאלון חדשה'}
                </h3>
                <button
                    onClick={onBack}
                    className="py-2 px-4 bg-gray-500 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 transition"
                >
                    חזור לרשימה
                </button>
            </div>
            
            {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}

            <div className="space-y-6">
                {/* --- פרטי תבנית --- */}
                <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="text-lg font-semibold mb-3">פרטי תבנית</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 mb-1">שם התבנית (חובה)</label>
                            <input
                                type="text"
                                id="templateName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="templateDesc" className="block text-sm font-medium text-gray-700 mb-1">תיאור (פנימי)</label>
                            <input
                                type="text"
                                id="templateDesc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* --- ניהול שאלות --- */}
                <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="text-lg font-semibold mb-3">שאלות</h4>
                    <div className="space-y-4">
                        {questions.map((q, index) => (
                            <div key={q.id} className="p-3 bg-gray-50 rounded-md border border-gray-200">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-semibold text-gray-600">שאלה {index + 1}</span>
                                    <button 
                                        onClick={() => handleRemoveQuestion(q.id)}
                                        className="text-xs text-red-500 hover:text-red-700"
                                    >
                                        הסר
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    placeholder="נוסח השאלה"
                                    value={q.text}
                                    onChange={(e) => handleQuestionChange(q.id, 'text', e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                                {/* (בעתיד נוסיף כאן לוגיקה לבחירת סוג שאלה ואפשרויות) */}
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={handleAddQuestion}
                        className="mt-4 py-2 px-4 bg-primary-blue text-white rounded-lg text-sm font-semibold hover:bg-secondary-purple transition"
                    >
                        + הוסף שאלה
                    </button>
                </div>
                
                {/* --- שמירה --- */}
                <div className="pt-4 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={handleSaveTemplate}
                        disabled={saving}
                        className="py-2.5 px-6 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition disabled:opacity-50"
                    >
                        {saving ? <LoadingSpinner /> : 'שמור תבנית'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuestionnaireTemplateEditor;