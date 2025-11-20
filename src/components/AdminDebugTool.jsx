// src/components/AdminDebugTool.jsx - V2.0 (Advanced Diagnostics)
import React, { useState } from 'react';

const AdminDebugTool = ({ API_URL }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [logs, setLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [systemStatus, setSystemStatus] = useState('idle'); // idle, checking, ok, error, warning

    const addLog = (msg, type = 'info', detail = null) => {
        const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
        setLogs(prev => [...prev, { time, msg, type, detail }]);
    };

    const runDiagnostics = async () => {
        setIsRunning(true);
        setSystemStatus('checking');
        setLogs([]); 
        
        let errorCount = 0;
        let warningCount = 0;

        addLog('🚀 מתחיל סריקת מערכת מלאה...', 'info');

        // --- 1. בדיקות סביבה (Client Side) ---
        addLog('🔍 בודק סביבת דפדפן...', 'info');
        if (!navigator.cookieEnabled) {
            addLog('Cookies חסומים! התחברות לא תעבוד.', 'error');
            errorCount++;
        } else {
            addLog('Cookies מאופשרים.', 'success');
        }
        addLog(`User Agent: ${navigator.userAgent.slice(0, 40)}...`, 'info');

        // --- 2. בדיקת אימות (Session Check) ---
        addLog('🔑 בודק סטטוס אימות...', 'pending');
        try {
            const authStart = performance.now();
            const authRes = await fetch(`${API_URL}/api/professionals/me`, { credentials: 'include' });
            const authEnd = performance.now();
            
            if (authRes.ok) {
                const userData = await authRes.json();
                addLog(`מחובר כ: ${userData.full_name || 'User'} (${userData.user_type})`, 'success', `${Math.round(authEnd - authStart)}ms`);
                if (userData.user_type !== 'admin') {
                    addLog('⚠️ שים לב: המשתמש אינו מנהל!', 'warning');
                    warningCount++;
                }
            } else if (authRes.status === 401 || authRes.status === 403) {
                addLog('משתמש לא מחובר (401/403)', 'warning');
                warningCount++;
            } else {
                addLog('שגיאה בבדיקת אימות', 'error');
                errorCount++;
            }
        } catch (e) {
            addLog('כישלון בבדיקת אימות', 'error');
            errorCount++;
        }

        // --- 3. בדיקת שרת ו-Database (Endpoints) ---
        const endpoints = [
            { name: 'DB Stats', url: `${API_URL}/api/admin/stats` },
            { name: 'CMS Data', url: `${API_URL}/api/admin/data/all-definitions` },
            { name: 'Flow Engine', url: `${API_URL}/api/admin/flow` },
        ];

        for (const ep of endpoints) {
            const start = performance.now();
            try {
                const res = await fetch(ep.url, { credentials: 'include' });
                const end = performance.now();
                const latency = Math.round(end - start);

                if (res.ok) {
                    addLog(`✅ ${ep.name}`, 'success', `${latency}ms`);
                } else {
                    if (res.status === 404) {
                        addLog(`❌ ${ep.name}: נתיב לא קיים (404)`, 'error', `${latency}ms`);
                        errorCount++;
                    } else if (res.status === 500) {
                        addLog(`🔥 ${ep.name}: קריסת שרת (500)`, 'error', `${latency}ms`);
                        errorCount++;
                    } else {
                        addLog(`⚠️ ${ep.name}: ${res.status}`, 'warning', `${latency}ms`);
                        warningCount++;
                    }
                }
            } catch (err) {
                addLog(`☠️ ${ep.name}: שגיאת רשת`, 'error');
                errorCount++;
            }
        }

        // --- 4. בדיקת עומס/מקביליות (Concurrency) ---
        addLog('⚡ בודק עומס מקבילי (3 בקשות)...', 'pending');
        try {
            const promises = [
                fetch(`${API_URL}/api/public/initial-data`),
                fetch(`${API_URL}/api/public/initial-data`),
                fetch(`${API_URL}/api/public/initial-data`)
            ];
            const start = performance.now();
            await Promise.all(promises);
            const end = performance.now();
            addLog(`הושלמו 3 בקשות במקביל`, 'success', `${Math.round(end - start)}ms total`);
        } catch (e) {
            addLog('נכשל בבדיקת עומס', 'error');
            errorCount++;
        }

        // --- סיכום ---
        setIsRunning(false);
        if (errorCount > 0) setSystemStatus('error');
        else if (warningCount > 0) setSystemStatus('warning');
        else setSystemStatus('ok');
        
        addLog('🏁 הסריקה הסתיימה.', 'info');
    };

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                title="פתח כלי דיאגנוסטיקה"
                style={{
                    position: 'fixed', bottom: '20px', left: '20px', zIndex: 9999,
                    width: '50px', height: '50px', borderRadius: '50%',
                    backgroundColor: systemStatus === 'error' ? '#ef4444' : systemStatus === 'warning' ? '#f59e0b' : systemStatus === 'ok' ? '#10b981' : '#1e293b',
                    color: 'white', border: '2px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    transition: 'transform 0.2s'
                }}
                onMouseEnter={e => e.target.style.transform = 'scale(1.1)'}
                onMouseLeave={e => e.target.style.transform = 'scale(1.0)'}
            >
                <span style={{ fontSize: '24px' }}>🩺</span>
            </button>
        );
    }

    return (
        <div style={{ 
            position: 'fixed', bottom: '20px', left: '20px', zIndex: 9999, 
            background: '#1e1e2d', color: '#e2e8f0', 
            borderRadius: '12px', width: '450px', maxHeight: '80vh',
            fontFamily: 'Consolas, monospace', direction: 'ltr',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)', border: '1px solid #334155',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
            <div style={{ 
                padding: '12px 16px', background: '#0f172a', borderBottom: '1px solid #334155',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🩺</span>
                    <span style={{ fontWeight: 'bold', color: '#fff' }}>System Monitor V2.0</span>
                </div>
                <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>

            <div style={{ 
                padding: '16px', overflowY: 'auto', flexGrow: 1, minHeight: '200px', 
                background: '#0f172a', fontSize: '13px', lineHeight: '1.5' 
            }}>
                {logs.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#64748b', marginTop: '60px' }}>
                        מוכן לסריקה.<br/>לחץ למטה להתחלה.
                    </div>
                )}
                {logs.map((l, i) => (
                    <div key={i} style={{ 
                        display: 'flex', justifyContent: 'space-between', marginBottom: '6px', borderBottom: '1px solid #1e293b', paddingBottom: '4px',
                        color: l.type === 'error' ? '#f87171' : l.type === 'success' ? '#4ade80' : l.type === 'warning' ? '#facc15' : '#e2e8f0' 
                    }}>
                        <div style={{ display: 'flex', gap: '10px', overflow: 'hidden' }}>
                            <span style={{ color: '#64748b', fontSize: '11px', minWidth: '50px' }}>{l.time}</span>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.msg}</span>
                        </div>
                        {l.detail && (
                            <span style={{ 
                                fontSize: '11px', fontWeight: 'bold', marginLeft: '10px',
                                color: '#94a3b8'
                            }}>
                                {l.detail}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            <div style={{ padding: '12px', borderTop: '1px solid #334155', background: '#1e1e2d' }}>
                <button 
                    onClick={runDiagnostics} 
                    disabled={isRunning}
                    style={{
                        width: '100%', padding: '10px', 
                        background: isRunning ? '#334155' : '#6366f1', 
                        color: 'white', border: 'none', borderRadius: '6px', 
                        fontWeight: 'bold', cursor: isRunning ? 'wait' : 'pointer',
                        transition: 'background 0.2s'
                    }}
                >
                    {isRunning ? 'Scanning...' : 'הרץ סריקה מלאה 🚀'}
                </button>
            </div>
        </div>
    );
};

export default AdminDebugTool;