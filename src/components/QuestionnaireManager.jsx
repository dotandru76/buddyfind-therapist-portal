// src/components/QuestionnaireManager.jsx - v3.1 (Delete sent questionnaires)
import React, { useState, useEffect, useCallback } from 'react';
import QuestionnaireTemplateEditor from './QuestionnaireTemplateEditor'; 
import SendQuestionnaireModal from './SendQuestionnaireModal';
import moment from 'moment';

// (רכיבי עזר)
const LoadingSpinner = () => ( <div className="text-center p-5"><div className="spinner w-8 h-8 mx-auto border-t-primary-blue border-r-primary-blue"></div></div> );
const AlertMessage = ({ type, message, onDismiss }) => { /* ... */ }; // השארתי ריק לקיצור, זה לא השתנה
const TabButton = ({ text, isActive, onClick }) => ( <button onClick={onClick} className={`px-6 py-2 rounded-t-lg font-semibold ${isActive ? 'bg-white text-primary-blue border-b-0' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{text}</button> );


const QuestionnaireManager = ({ API_URL, onBack, onLogout }) => {
    const [view, setView] = useState('list'); 
    const [currentTab, setCurrentTab] = useState('track'); 
    const [templates, setTemplates] = useState([]);
    const [sentQuestionnaires, setSentQuestionnaires] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null); 

    const fetchData = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const [templatesRes, sentRes] = await Promise.all([
                fetch(`${API_URL}/api/admin/questionnaires?full=true`, { credentials: 'include' }),
                fetch(`${API_URL}/api/admin/questionnaires/sent`, { credentials: 'include' })
            ]);
            if (templatesRes.status === 401 || sentRes.status === 401) { onLogout(); return; }
            if (!templatesRes.ok || !sentRes.ok) throw new Error('שגיאה בטעינת נתונים');
            
            setTemplates(await templatesRes.json());
            setSentQuestionnaires(await sentRes.json());
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    }, [API_URL, onLogout]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleEditTemplate = (template) => { setSelectedTemplate(template); setView('editor'); };
    const handleCreateNewTemplate = () => { setSelectedTemplate(null); setView('editor'); };
    const onSaveTemplateComplete = () => { setView('list'); fetchData(); };
    const onSendComplete = () => { setIsSendModalOpen(false); fetchData(); };

    // --- !!! פונקציית מחיקה חדשה !!! ---
    const handleDeleteSent = async (id) => {
        if (!window.confirm('האם אתה בטוח שברצונך למחוק את השאלון שנשלח? פעולה זו אינה הפיכה.')) return;
        try {
            const res = await fetch(`${API_URL}/api/admin/questionnaires/sent/${id}`, { 
                method: 'DELETE', credentials: 'include' 
            });
            if (res.ok) {
                fetchData(); // רענון לאחר מחיקה
            } else {
                alert('שגיאה במחיקה.');
            }
        } catch (e) { console.error(e); }
    };

    if (view === 'editor') {
        return <QuestionnaireTemplateEditor API_URL={API_URL} template={selectedTemplate} onBack={() => setView('list')} onSave={onSaveTemplateComplete} onLogout={onLogout} />;
    }
    
    return (
        <>
            {isSendModalOpen && <SendQuestionnaireModal API_URL={API_URL} onClose={() => setIsSendModalOpen(false)} onSend={onSendComplete} templates={templates} onLogout={onLogout} />}
        
            <div className="bg-white p-6 md:p-8 rounded-lg shadow w-full mx-auto text-right">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-text-dark">ניהול שאלונים</h3>
                    <button onClick={onBack} className="py-2 px-4 bg-gray-500 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 transition">חזור לדשבורד</button>
                </div>

                <div className="flex border-b border-gray-200">
                    <TabButton text="מעקב שאלונים" isActive={currentTab === 'track'} onClick={() => setCurrentTab('track')} />
                    <TabButton text="רשימת תבניות" isActive={currentTab === 'templates'} onClick={() => setCurrentTab('templates')} />
                </div>

                {loading && <LoadingSpinner />}
                {!loading && !error && (
                    <div className="mt-6">
                        {currentTab === 'track' && (
                            <div>
                                <button onClick={() => setIsSendModalOpen(true)} className="mb-4 py-2 px-4 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition">+ שלח שאלון חדש</button>
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">סטטוס</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">לקוח</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">שאלון</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">מטפל</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">נשלח ב-</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">פעולות</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {sentQuestionnaires.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.status === 'completed' ? 'bg-green-100 text-green-800' : item.status === 'viewed' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{item.status}</span></td>
                                                <td className="px-4 py-3">{item.client_email}</td>
                                                <td className="px-4 py-3">{item.questionnaire_name}</td>
                                                <td className="px-4 py-3">{item.professional_name}</td>
                                                <td className="px-4 py-3">{moment(item.sent_at).format('DD/MM/YY')}</td>
                                                {/* --- כפתור מחיקה --- */}
                                                <td className="px-4 py-3">
                                                    <button onClick={() => handleDeleteSent(item.id)} className="text-red-500 hover:text-red-700 text-xs font-bold border border-red-200 px-2 py-1 rounded bg-red-50">מחק</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        
                        {currentTab === 'templates' && (
                            <div>
                                <button onClick={handleCreateNewTemplate} className="mb-4 py-2 px-4 bg-primary-blue text-white rounded-lg text-sm font-semibold hover:bg-secondary-purple transition">+ צור תבנית חדשה</button>
                                {/* ... (טבלת תבניות - ללא שינוי) ... */}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default QuestionnaireManager;