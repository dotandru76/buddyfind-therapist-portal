import React, { useState } from 'react';

const AdminDebugTool = ({ API_URL }) => {
    const [logs, setLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);

    const addLog = (msg, type = 'info') => {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { time, msg, type }]);
    };

    const runDiagnostics = async () => {
        setIsRunning(true);
        setLogs([]);
        addLog('מתחיל בדיקת מערכת...', 'info');

        const endpointsToCheck = [
            { name: 'Admin Stats', url: `${API_URL}/api/admin/stats`, method: 'GET' },
            { name: 'Definitions', url: `${API_URL}/api/admin/data/all-definitions`, method: 'GET' },
            { name: 'Mappings', url: `${API_URL}/api/admin/mappings`, method: 'GET' },
            { name: 'Flow', url: `${API_URL}/api/admin/flow`, method: 'GET' },
        ];

        try {
            for (const ep of endpointsToCheck) {
                addLog(`בודק נתיב: ${ep.name}...`, 'pending');
                try {
                    const res = await fetch(ep.url, { 
                        method: ep.method,
                        credentials: 'include' 
                    });
                    
                    if (res.status === 200) {
                        addLog(`✅ ${ep.name}: תקין (200 OK)`, 'success');
                    } else if (res.status === 404) {
                        addLog(`❌ ${ep.name}: לא נמצא (404) - השרת לא מעודכן!`, 'error');
                    } else if (res.status === 401 || res.status === 403) {
                        addLog(`⚠️ ${ep.name}: בעיית הרשאה (${res.status}) - האם אתה מחובר כמנהל?`, 'warning');
                    } else {
                        addLog(`❌ ${ep.name}: שגיאה (${res.status})`, 'error');
                    }
                } catch (err) {
                    addLog(`💥 ${ep.name}: שגיאת רשת (${err.message})`, 'error');
                }
            }
        } catch (e) {
            addLog(`שגיאה קריטית בדיאגנוסטיקה: ${e.message}`, 'error');
        } finally {
            setIsRunning(false);
            addLog('הבדיקה הסתיימה.', 'info');
        }
    };

    return (
        <div style={{ 
            position: 'fixed', bottom: '20px', left: '20px', zIndex: 9999, 
            background: 'rgba(0,0,0,0.85)', color: '#0f0', padding: '20px', 
            borderRadius: '10px', width: '400px', fontFamily: 'monospace', direction: 'ltr',
            boxShadow: '0 0 20px rgba(0,0,0,0.5)', border: '1px solid #333'
        }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#fff', borderBottom: '1px solid #555', paddingBottom: '5px' }}>
                🕵️‍♂️ System Debugger
            </h3>
            
            <div style={{ height: '200px', overflowY: 'auto', marginBottom: '10px', fontSize: '12px' }}>
                {logs.length === 0 && <div style={{color: '#777'}}>לחץ על "הרץ בדיקה" להתחלת סריקה...</div>}
                {logs.map((l, i) => (
                    <div key={i} style={{ 
                        marginBottom: '4px', 
                        color: l.type === 'error' ? '#ff5555' : l.type === 'success' ? '#50fa7b' : l.type === 'warning' ? '#f1fa8c' : '#f8f8f2' 
                    }}>
                        <span style={{color: '#6272a4'}}>[{l.time}]</span> {l.msg}
                    </div>
                ))}
            </div>

            <button 
                onClick={runDiagnostics} 
                disabled={isRunning}
                style={{
                    width: '100%', padding: '8px', background: isRunning ? '#44475a' : '#bd93f9', 
                    color: isRunning ? '#6272a4' : '#282a36', border: 'none', borderRadius: '4px', 
                    fontWeight: 'bold', cursor: isRunning ? 'wait' : 'pointer'
                }}
            >
                {isRunning ? 'Running...' : 'הרץ בדיקה (Run Diagnostics)'}
            </button>
        </div>
    );
};

export default AdminDebugTool;