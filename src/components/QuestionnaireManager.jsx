// src/components/QuestionnaireManager.jsx - SECURED
import React, { useState, useEffect, useCallback } from 'react';
import QuestionnaireTemplateEditor from './QuestionnaireTemplateEditor'; 
import SendQuestionnaireModal from './SendQuestionnaireModal';
import moment from 'moment';

// (רכיבי עזר פנימיים - ללא שינוי)
const LoadingSpinner = () => ( /* ... */ );
const AlertMessage = ({ type, message, onDismiss }) => { /* ... */ };
const TabButton = ({ text, isActive, onClick }) => ( /* ... */ );

// --- !!! התיקון: הסרת authToken והוספת onLogout ---
const QuestionnaireManager = ({ API_URL, onBack, onLogout }) => {
    const [view, setView] = useState('list'); 
    const [currentTab, setCurrentTab] = useState('track'); 
    
    const [templates, setTemplates] = useState([]);
    const [sentQuestionnaires, setSentQuestionnaires] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null); 

    // --- טעינת נתונים ---
    const fetchData = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            // --- !!! התיקון: שימוש בעוגיות ---
            const [templatesRes, sentRes] = await Promise.all([
                fetch(`${API_URL}/api/admin/questionnaires?full=true`, { 
                    credentials: 'include'
                }),
                fetch(`${API_URL}/api/admin/questionnaires/sent`, {
                    credentials: 'include'
                })
            ]);
            
            if (templatesRes.status === 401 || templatesRes.status === 403 || sentRes.status === 401 || sentRes.status === 403) {
                onLogout();
                return;
            }
            if (!templatesRes.ok || !sentRes.ok) {
                throw new Error('שגיאה בטעינת נתוני שאלונים');
            }
            
            const templatesData = await templatesRes.json();
            const sentData = await sentRes.json();
            
            setTemplates(templatesData);
            setSentQuestionnaires(sentData);
            
        } catch (err) { setError(err.message); } 
        finally { setLoading(false); }
    }, [API_URL, onLogout]); // <-- עדכון תלויות

    useEffect(() => { fetchData(); }, [fetchData]);

    // ... (פונקציות ניווט פנימיות - ללא שינוי) ...
    const handleEditTemplate = (template) => { /* ... */ };
    const handleCreateNewTemplate = () => { /* ... */ };
    const onSaveTemplateComplete = () => { /* ... */ };
    const onSendComplete = () => { /* ... */ };

    // --- !!! התיקון: החזרת ה-JSX המקורי ---
    if (view === 'editor') {
        return (
            <QuestionnaireTemplateEditor
                API_URL={API_URL}
                template={selectedTemplate}
                onBack={() => setView('list')}
                onSave={onSaveTemplateComplete}
                onLogout={onLogout} // העברה
            />
        );
    }
    
    return (
        <>
            {isSendModalOpen && (
                <SendQuestionnaireModal
                    API_URL={API_URL}
                    onClose={() => setIsSendModalOpen(false)}
                    onSend={onSendComplete}
                    templates={templates}
                    onLogout={onLogout} // העברה
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
                    <TabButton text="מעקב שאלונים" isActive={currentTab === 'track'} onClick={() => setCurrentTab('track')} />
                    <TabButton text="רשימת תבניות" isActive={currentTab === 'templates'} onClick={() => setCurrentTab('templates')} />
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