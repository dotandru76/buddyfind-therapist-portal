// src/components/QuestionnaireManager.jsx
// --- גרסה V3.0 (כולל עריכה) ---

import React, { useState, useEffect, useCallback } from 'react';
import QuestionnaireTemplateEditor from './QuestionnaireTemplateEditor'; 
import SendQuestionnaireModal from './SendQuestionnaireModal';
import moment from 'moment';

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

const TabButton = ({ text, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-6 py-2 rounded-t-lg font-semibold ${
            isActive 
            ? 'bg-white text-primary-blue border-b-0' 
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
    >
        {text}
    </button>
);


const QuestionnaireManager = ({ authToken, API_URL, onBack }) => {
    const [view, setView] = useState('list'); // 'list' or 'editor'
    const [currentTab, setCurrentTab] = useState('track'); // 'track' or 'templates'
    
    const [templates, setTemplates] = useState([]);
    const [sentQuestionnaires, setSentQuestionnaires] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null); // אובייקט התבנית המלא לעריכה

    // --- טעינת נתונים ---
    const fetchData = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            // --- !!! שינוי: טוען עכשיו את כל נתוני התבניות (כולל JSON) ---
            const [templatesRes, sentRes] = await Promise.all([
                fetch(`${API_URL}/api/admin/questionnaires?full=true`, { // הוספנו פרמטר
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }),
                fetch(`${API_URL}/api/admin/questionnaires/sent`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                })
            ]);
            
            if (!templatesRes.ok || !sentRes.ok) {
                throw new Error('שגיאה בטעינת נתוני שאלונים');
            }
            
            const templatesData = await templatesRes.json();
            const sentData = await sentRes.json();
            
            setTemplates(templatesData);
            setSentQuestionnaires(sentData);
            
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [authToken, API_URL]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- !!! תיקון: פונקציה זו מופעלת כעת ---
    const handleEditTemplate = (template) => {
        setSelectedTemplate(template); // שמור את כל אובייקט התבנית
        setView('editor');
    };
    
    const handleCreateNewTemplate = () => {
        setSelectedTemplate(null); 
        setView('editor');
    };

    const onSaveTemplateComplete = () => {
        setView('list'); // חזור לרשימה
        fetchData(); // רענן את כל הנתונים
    };
    
    const onSendComplete = () => {
        setIsSendModalOpen(false);
        fetchData(); // רענן את כל הנתונים
    };

    // --- הצגת מסך עורך התבניות ---
    if (view === 'editor') {
        return (
            <QuestionnaireTemplateEditor
                authToken={authToken}
                API_URL={API_URL}
                template={selectedTemplate} // מעביר את התבנית הנבחרת (או null ליצירה)
                onBack={() => setView('list')}
                onSave={onSaveTemplateComplete}
            />
        );
    }
    
    // --- הצגת המסך הראשי (עם הטאבים) ---
    return (
        <>
            {isSendModalOpen && (
                <SendQuestionnaireModal
                    authToken={authToken}
                    API_URL={API_URL}
                    onClose={() => setIsSendModalOpen(false)}
                    onSend={onSendComplete}
                    templates={templates}
                />
            )}
        
            <div className="bg-white p-6 md:p-8 rounded-lg shadow w-full mx-auto text-right">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-text-dark">ניהול שאלונים</h3>
                    <button
                        onClick={onBack}
                        className="py-2 px-4 bg-gray-500 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 transition"
                    >
                        חזור לדשבורד
                    </button>
                </div>

                <div className="flex border-b border-gray-200">
                    <TabButton 
                        text="מעקב שאלונים" 
                        isActive={currentTab === 'track'} 
                        onClick={() => setCurrentTab('track')} 
                    />
                    <TabButton 
                        text="רשימת תבניות" 
                        isActive={currentTab === 'templates'} 
                        onClick={() => setCurrentTab('templates')} 
                    />
                </div>

                {loading && <LoadingSpinner />}
                {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}
                
                {!loading && !error && (
                    <div className="mt-6">
                        {currentTab === 'track' && (
                            <div>
                                <button
                                    onClick={() => setIsSendModalOpen(true)}
                                    className="mb-4 py-2 px-4 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition"
                                >
                                    + שלח שאלון חדש ללקוח
                                </button>
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    {/* ... (טבלת מעקב - ללא שינוי) ... */}
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סטטוס</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">לקוח</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">שם התבנית</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">מטפל משויך</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">נשלח בתאריך</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {sentQuestionnaires.length > 0 ? sentQuestionnaires.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                     <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                        item.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                        item.status === 'viewed' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {item.status === 'completed' ? 'הושלם' : item.status === 'viewed' ? 'נצפה' : 'ממתין'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-semibold">{item.client_email}</td>
                                                <td className="px-4 py-3">{item.questionnaire_name}</td>
                                                <td className="px-4 py-3">{item.professional_name}</td>
                                                <td className="px-4 py-3">{moment(item.sent_at).format('DD/MM/YYYY')}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="5" className="p-5 text-center text-gray-500">עדיין לא נשלחו שאלונים.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        
                        {currentTab === 'templates' && (
                            <div>
                                <button
                                    onClick={handleCreateNewTemplate}
                                    className="mb-4 py-2 px-4 bg-primary-blue text-white rounded-lg text-sm font-semibold hover:bg-secondary-purple transition"
                                >
                                    + צור תבנית חדשה
                                </button>
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    {/* ... (טבלת תבניות - ללא שינוי) ... */}
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">שם התבנית</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תיאור</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">נוצר בתאריך</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {templates.length > 0 ? templates.map(template => (
                                            <tr key={template.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-semibold">{template.name}</td>
                                                <td className="px-4 py-3 text-gray-600">{template.description}</td>
                                                <td className="px-4 py-3">{moment(template.created_at).format('DD/MM/YYYY')}</td>
                                                <td className="px-4 py-3">
                                                    <button 
                                                        onClick={() => handleEditTemplate(template)}
                                                        className="py-1 px-3 bg-primary-blue text-white rounded-md text-xs font-medium hover:bg-secondary-purple transition"
                                                    >
                                                        ערוך
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="4" className="p-5 text-center text-gray-500">לא נמצאו תבניות שאלונים.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default QuestionnaireManager;