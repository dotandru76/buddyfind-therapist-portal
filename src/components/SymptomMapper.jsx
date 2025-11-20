// src/components/SymptomMapper.jsx - V5.0 (Fixed Drag & Drop Logic)
import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import LoadingSpinner from './LoadingSpinner';

// --- 1. הגדרת הצמתים (עיצוב) ---
const SpecialtyBoxNode = ({ data, selected }) => (
  <div style={{ 
      width: '100%', height: '100%', 
      backgroundColor: data.color || '#e0f2fe', 
      border: selected ? '2px solid #2563EB' : '1px solid #94a3b8',
      borderRadius: '12px', 
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
      display: 'flex', flexDirection: 'column',
      zIndex: -1 // תמיד מאחור
  }}>
    <div style={{ 
        background: 'rgba(255,255,255,0.6)', padding: '8px', 
        borderBottom: '1px solid rgba(0,0,0,0.1)', fontWeight: 'bold', 
        textAlign: 'center', fontSize: '14px', color: '#1e293b'
    }}>
      {data.label}
    </div>
  </div>
);

const SymptomPillNode = ({ data, selected }) => (
  <div style={{ 
      background: 'white', 
      border: selected ? '2px solid #2563EB' : '1px solid #cbd5e1', 
      borderRadius: '99px', 
      padding: '6px 14px', 
      fontSize: '12px', fontWeight: '600', color: '#334155',
      boxShadow: '0 2px 5px rgba(0,0,0,0.15)', 
      cursor: 'grab', width: 'max-content',
      zIndex: 100 // תמיד מקדימה
  }}>
    {data.label}
  </div>
);

const nodeTypes = { specialtyBox: SpecialtyBoxNode, symptomPill: SymptomPillNode };
const colors = ['#dbeafe', '#dcfce7', '#fef9c3', '#fee2e2', '#f3e8ff', '#ffedd5'];

// --- 2. רכיב התוכן ---
const SymptomMapperContent = ({ API_URL, onLogout }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]); 
    const [loading, setLoading] = useState(true);

    // טעינת נתונים
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [defsRes, mapsRes] = await Promise.all([
                    fetch(`${API_URL}/api/admin/data/all-definitions`, { credentials: 'include' }),
                    fetch(`${API_URL}/api/admin/mappings`, { credentials: 'include' })
                ]);

                if (defsRes.status === 401) { onLogout(); return; }
                if (!defsRes.ok || !mapsRes.ok) throw new Error("API Error");

                const defs = await defsRes.json();
                const maps = await mapsRes.json();
                
                const initialNodes = [];
                
                // יצירת קופסאות (התמחויות)
                (defs.specialties || []).forEach((spec, index) => {
                    initialNodes.push({
                        id: `spec-${spec.id}`,
                        type: 'specialtyBox',
                        data: { label: spec.name, color: colors[index % colors.length], id: spec.id },
                        // סידור בשורות של 3
                        position: { x: (index % 3) * 320 + 300, y: Math.floor(index / 3) * 280 + 50 },
                        style: { width: 280, height: 220 },
                        draggable: false // הקופסאות קבועות כדי למנוע בלאגן
                    });
                });

                // יצירת סימפטומים
                let unassignedY = 0;
                (defs.symptoms || []).forEach((sym, index) => {
                    const mapping = Array.isArray(maps) ? maps.find(m => m.symptom_id === sym.id) : null;
                    const isAssigned = !!mapping;
                    
                    let position = { x: 0, y: 0 }; 
                    let parentNode = undefined;
                    let extent = undefined;

                    if (isAssigned) {
                        parentNode = `spec-${mapping.specialty_id}`;
                        extent = 'parent'; // ננעל בתוך הקופסה
                        // מיקום יחסי בתוך הקופסה
                        position = { x: 20 + (index % 2) * 120, y: 50 + Math.floor((index % 10) / 2) * 40 };
                    } else {
                        // בצד שמאל (לא משויכים)
                        position = { x: 20, y: 50 + unassignedY * 45 };
                        unassignedY++;
                    }

                    initialNodes.push({
                        id: `sym-${sym.id}`,
                        type: 'symptomPill',
                        data: { label: sym.name, id: sym.id },
                        position: position,
                        parentNode: parentNode,
                        extent: extent,
                        draggable: true,
                        zIndex: 100
                    });
                });

                setNodes(initialNodes);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchData();
    }, [API_URL, onLogout, setNodes]);

    // --- לוגיקת גרירה חכמה ---
    const onNodeDragStop = useCallback((event, node) => {
        if (node.type !== 'symptomPill') return;

        // חישוב מרכז הפתקית
        const nodeCenterX = node.position.x + (node.width || 100) / 2;
        const nodeCenterY = node.position.y + (node.height || 40) / 2;

        // האם הפתקית נמצאת כרגע במצב "ילד" (בתוך קופסה)?
        // אם כן, הקואורדינטות הן יחסיות, וצריך להמיר אותן לאבסולוטיות כדי לבדוק חפיפה עם קופסאות אחרות
        // (בגרסה פשוטה זו נניח שאם גוררים החוצה זה מתאפס, ואם גוררים פנימה זה נתפס)

        // מציאת קופסה שנמצאת מתחת למיקום הנוכחי
        // (הערה: ב-ReactFlow המיקומים הם מוחלטים אלא אם יש parentNode)
        
        // נשתמש בבדיקה פשוטה: האם המשתמש גרר מעל קופסה כלשהי?
        // לשם כך צריך להשתמש ב-event.target האמיתי מהדפדפן, או לחשב לפי מיקומי ה-Nodes.
        
        // פתרון יציב:
        // 1. קבלת כל הקופסאות
        const boxes = nodes.filter(n => n.type === 'specialtyBox');
        
        // 2. חישוב מיקום אבסולוטי משוער של הפתקית הנגררת
        let absoluteNodeX = node.position.x;
        let absoluteNodeY = node.position.y;
        
        if (node.parentNode) {
            const parent = nodes.find(n => n.id === node.parentNode);
            if (parent) {
                absoluteNodeX += parent.position.x;
                absoluteNodeY += parent.position.y;
            }
        }

        // 3. בדיקת חיתוך
        let targetBox = null;
        for (const box of boxes) {
            if (
                absoluteNodeX > box.position.x &&
                absoluteNodeX < box.position.x + box.width &&
                absoluteNodeY > box.position.y &&
                absoluteNodeY < box.position.y + box.height
            ) {
                targetBox = box;
                break;
            }
        }

        setNodes((nds) => nds.map((n) => {
            if (n.id === node.id) {
                // מקרה א': גררנו לתוך קופסה (חדשה או קיימת)
                if (targetBox) {
                    // חישוב מיקום יחסי חדש בתוך הקופסה
                    const relX = absoluteNodeX - targetBox.position.x;
                    const relY = absoluteNodeY - targetBox.position.y;
                    
                    return {
                        ...n,
                        parentNode: targetBox.id,
                        extent: 'parent',
                        position: { x: relX, y: relY }
                    };
                }
                // מקרה ב': גררנו לשטח ריק (ניתוק)
                else {
                    return {
                        ...n,
                        parentNode: undefined,
                        extent: undefined,
                        position: { x: 20, y: absoluteNodeY } // זורק אותו לצד שמאל באותו גובה בערך
                    };
                }
            }
            return n;
        }));

    }, [nodes, setNodes]);

    const handleSave = async () => {
        // אוספים רק את אלו שיש להם הורה
        const mappings = nodes
            .filter(n => n.type === 'symptomPill' && n.parentNode) 
            .map(n => ({
                symptom_id: parseInt(n.data.id),
                specialty_id: parseInt(n.parentNode.replace('spec-', ''))
            }));

        try {
            const res = await fetch(`${API_URL}/api/admin/mappings`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                body: JSON.stringify({ mappings })
            });
            if (res.ok) alert('✅ נשמר בהצלחה!');
            else alert('❌ שגיאה בשמירה');
        } catch (err) { alert('שגיאת תקשורת'); }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="bg-white p-6 rounded-lg shadow h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h3 className="text-2xl font-bold text-text-dark">מיפוי סימפטומים (גרסה יציבה)</h3>
                <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 shadow-md">
                    💾 שמור מיפוי
                </button>
            </div>
            <div style={{ flexGrow: 1, height: '700px', border: '1px solid #e2e8f0', borderRadius: '16px', background: '#f8fafc' }}>
                <ReactFlow
                    nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                    onNodeDragStop={onNodeDragStop} nodeTypes={nodeTypes} fitView
                >
                    <Background color="#cbd5e1" gap={25} />
                    <Controls />
                    <Panel position="top-left" className="bg-white/80 p-2 rounded border">
                        גרור סימפטומים מהצד לקופסאות
                    </Panel>
                </ReactFlow>
            </div>
        </div>
    );
};

export default ({ API_URL, onLogout }) => (
  <ReactFlowProvider>
    <SymptomMapperContent API_URL={API_URL} onLogout={onLogout} />
  </ReactFlowProvider>
);