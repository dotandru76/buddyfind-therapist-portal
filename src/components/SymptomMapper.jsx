// src/components/SymptomMapper.jsx - V6.0 (Visual Feedback & Highlighting)
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

// מידות קבועות לחישובים מדויקים
const BOX_WIDTH = 280;
const BOX_HEIGHT = 280;

// --- 1. רכיבי צמתים עם עיצוב דינמי ---

const SpecialtyBoxNode = ({ data }) => {
    // שינוי סגנון דינמי אם הקופסה "מודגשת" (בזמן גרירה מעליה)
    const isHighlighted = data.isHighlighted;

    return (
        <div style={{ 
            width: `${BOX_WIDTH}px`, height: `${BOX_HEIGHT}px`, 
            backgroundColor: isHighlighted ? '#eff6ff' : (data.color || '#f8fafc'), // שינוי רקע בהיילייט
            border: isHighlighted ? '3px dashed #2563EB' : '1px solid #cbd5e1', // מסגרת מודגשת
            borderRadius: '16px', 
            boxShadow: isHighlighted ? '0 0 15px rgba(37, 99, 235, 0.2)' : '0 4px 6px -1px rgba(0,0,0,0.05)',
            display: 'flex', flexDirection: 'column',
            transition: 'all 0.2s ease', // אנימציה חלקה
            zIndex: -1
        }}>
            <div style={{ 
                background: isHighlighted ? '#2563EB' : 'rgba(255,255,255,0.8)', 
                color: isHighlighted ? 'white' : '#1e293b',
                padding: '10px', 
                borderBottom: '1px solid rgba(0,0,0,0.05)', 
                fontWeight: 'bold', textAlign: 'center', fontSize: '15px',
                borderTopLeftRadius: '14px', borderTopRightRadius: '14px',
                transition: 'all 0.2s ease'
            }}>
                {data.label}
            </div>
            
            {/* טקסט עזר שמופיע רק בגרירה מעל */}
            {isHighlighted && (
                <div style={{ 
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    color: '#2563EB', fontWeight: 'bold', opacity: 0.5 
                }}>
                    שחרר כדי לשייך 🎯
                </div>
            )}
        </div>
    );
};

const SymptomPillNode = ({ data }) => (
  <div style={{ 
      background: 'white', 
      border: '1px solid #64748b', 
      borderRadius: '99px', 
      padding: '6px 14px', 
      fontSize: '12px', fontWeight: '600', color: '#334155',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
      cursor: 'grab', width: 'max-content',
      zIndex: 1000
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

    // טעינת נתונים ראשונית
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
                
                // יצירת קופסאות
                (defs.specialties || []).forEach((spec, index) => {
                    initialNodes.push({
                        id: `spec-${spec.id}`,
                        type: 'specialtyBox',
                        data: { label: spec.name, color: colors[index % colors.length], id: spec.id, isHighlighted: false },
                        position: { x: (index % 3) * (BOX_WIDTH + 50) + 350, y: Math.floor(index / 3) * (BOX_HEIGHT + 50) + 50 },
                        style: { width: BOX_WIDTH, height: BOX_HEIGHT },
                        draggable: false
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
                        extent = 'parent';
                        position = { x: 20 + (index % 2) * 120, y: 50 + Math.floor((index % 10) / 2) * 40 };
                    } else {
                        position = { x: 30, y: 80 + unassignedY * 50 };
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

    // --- לוגיקת זיהוי חפיפה (משותפת) ---
    const findTargetBox = useCallback((node, currentNodes) => {
        // חישוב מיקום אבסולוטי של הסימפטום
        let absX = node.position.x;
        let absY = node.position.y;

        if (node.parentNode) {
            const parent = currentNodes.find(n => n.id === node.parentNode);
            if (parent) {
                absX += parent.position.x;
                absY += parent.position.y;
            }
        }

        const centerX = absX + 50; 
        const centerY = absY + 20;

        // בדיקה מול כל הקופסאות
        return currentNodes.find(n => 
            n.type === 'specialtyBox' &&
            centerX >= n.position.x && 
            centerX <= n.position.x + BOX_WIDTH &&
            centerY >= n.position.y && 
            centerY <= n.position.y + BOX_HEIGHT
        );
    }, []);

    // --- אירוע 1: בזמן הגרירה (Highlight Logic) ---
    const onNodeDrag = useCallback((event, node) => {
        // אופטימיזציה: עדכון State רק אם יש שינוי בקופסה המודגשת
        setNodes((nds) => {
            const targetBox = findTargetBox(node, nds);
            const targetId = targetBox ? targetBox.id : null;

            // בדיקה אם צריך לעדכן כדי למנוע רינדורים מיותרים
            const needsUpdate = nds.some(n => 
                n.type === 'specialtyBox' && 
                ((n.id === targetId && !n.data.isHighlighted) || (n.id !== targetId && n.data.isHighlighted))
            );

            if (!needsUpdate) return nds;

            return nds.map(n => {
                if (n.type === 'specialtyBox') {
                    return {
                        ...n,
                        data: { ...n.data, isHighlighted: n.id === targetId } // מדליק/מכבה אור
                    };
                }
                return n;
            });
        });
    }, [findTargetBox, setNodes]);

    // --- אירוע 2: סיום גרירה (Drop Logic) ---
    const onNodeDragStop = useCallback((event, node) => {
        if (node.type !== 'symptomPill') return;

        setNodes((nds) => {
            // 1. נקה את כל ההדגשות (Highlight)
            const cleanNodes = nds.map(n => n.type === 'specialtyBox' ? { ...n, data: { ...n.data, isHighlighted: false } } : n);

            // 2. מצא את הקופסה
            const targetBox = findTargetBox(node, cleanNodes);

            return cleanNodes.map((n) => {
                if (n.id === node.id) {
                    // חישוב מיקום אבסולוטי נוכחי
                    let currentAbsX = node.position.x;
                    let currentAbsY = node.position.y;
                    const oldParent = cleanNodes.find(p => p.id === node.parentNode);
                    if (oldParent) {
                        currentAbsX += oldParent.position.x;
                        currentAbsY += oldParent.position.y;
                    }

                    // אם נפלנו לתוך קופסה
                    if (targetBox) {
                        const relX = currentAbsX - targetBox.position.x;
                        const relY = currentAbsY - targetBox.position.y;
                        
                        return {
                            ...n,
                            parentNode: targetBox.id,
                            extent: 'parent',
                            position: { x: Math.max(10, relX), y: Math.max(40, relY) }
                        };
                    } 
                    // אם יצאנו החוצה (ניתוק)
                    else {
                        return {
                            ...n,
                            parentNode: undefined,
                            extent: undefined,
                            position: { x: 30, y: currentAbsY } // מחזיר לעמודה השמאלית בערך באותו גובה
                        };
                    }
                }
                return n;
            });
        });
    }, [findTargetBox, setNodes]);

    // שמירה
    const handleSave = async () => {
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
            if (res.ok) {
                alert(`✅ נשמר בהצלחה! (${mappings.length} קישורים)`);
                // רענון כדי לוודא סנכרון
                window.location.reload();
            } else alert('❌ שגיאה בשמירה');
        } catch (err) { alert('שגיאת תקשורת'); }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="bg-white p-6 rounded-lg shadow h-full flex flex-col relative">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h3 className="text-2xl font-bold text-text-dark">מפת האבחון (עם פידבק ויזואלי)</h3>
                <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 shadow-md transition hover:scale-105">
                    💾 שמור שינויים
                </button>
            </div>
            
            <div style={{ flexGrow: 1, height: '700px', border: '1px solid #e2e8f0', borderRadius: '16px', background: '#f8fafc', position: 'relative' }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeDrag={onNodeDrag}       // הוספנו את זה לפידבק בזמן אמת
                    onNodeDragStop={onNodeDragStop}
                    nodeTypes={nodeTypes}
                    fitView
                >
                    <Background color="#cbd5e1" gap={25} />
                    <Controls />
                    <Panel position="top-left" className="bg-white/90 p-3 rounded-xl border shadow-lg">
                        <p className="font-bold text-sm mb-1">הוראות:</p>
                        <ul className="text-xs text-gray-600 list-disc pl-4 space-y-1">
                            <li>גרור סימפטום משמאל לתוך קופסה.</li>
                            <li>הקופסה <strong>תאיר בכחול</strong> כשתהיה מעליה.</li>
                            <li>שחרר כדי לשייך.</li>
                            <li>גרור החוצה כדי לבטל שיוך.</li>
                        </ul>
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