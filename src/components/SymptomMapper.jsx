// src/components/SymptomMapper.jsx - FINAL LOGIC VERSION
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  useReactFlow,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import LoadingSpinner from './LoadingSpinner';
import ContextMenu from './ContextMenu';

// --- 1. רכיבי צמתים (Nodes) ---

const SpecialtyBoxNode = ({ data, selected }) => {
  return (
    <div style={{ 
        width: '100%', height: '100%', 
        backgroundColor: data.color || '#e0f2fe', 
        border: selected ? '2px solid #2563EB' : '1px solid #94a3b8',
        borderRadius: '12px', 
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        display: 'flex', flexDirection: 'column'
    }}>
      {/* כותרת הקופסה */}
      <div style={{ 
          background: 'rgba(255,255,255,0.5)', padding: '8px', 
          borderBottom: '1px solid rgba(0,0,0,0.05)', fontWeight: 'bold', 
          textAlign: 'center', fontSize: '14px', color: '#1e293b'
      }}>
        {data.label}
      </div>
      {/* אזור תוכן שקוף */}
      <div style={{ flex: 1, minHeight: '100px' }}></div>
    </div>
  );
};

const SymptomPillNode = ({ data, selected }) => (
  <div style={{ 
      background: 'white', 
      border: selected ? '2px solid #2563EB' : '1px solid #cbd5e1', 
      borderRadius: '99px', 
      padding: '6px 16px', 
      fontSize: '12px', fontWeight: '600', color: '#334155',
      boxShadow: '0 2px 4px rgba(0,0,0,0.08)', 
      cursor: 'grab', width: 'max-content',
      transition: 'transform 0.1s'
  }}>
    {data.label}
  </div>
);

const nodeTypes = { specialtyBox: SpecialtyBoxNode, symptomPill: SymptomPillNode };

// --- 2. פונקציות עזר לחישוב חפיפה ---
const checkIntersection = (nodeA, nodeB) => {
    // נשתמש במידות ברירת מחדל אם חסרות (ReactFlow מעדכן מידות רק אחרי רינדור)
    const aW = nodeA.width || 120; const aH = nodeA.height || 40;
    const bW = nodeB.width || 280; const bH = nodeB.height || 200;

    return (
        nodeA.position.x < nodeB.position.x + bW &&
        nodeA.position.x + aW > nodeB.position.x &&
        nodeA.position.y < nodeB.position.y + bH &&
        nodeA.position.y + aH > nodeB.position.y
    );
};

// --- 3. רכיב התוכן הפנימי ---
const SymptomMapperContent = ({ API_URL, onLogout }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]); 
    const [loading, setLoading] = useState(true);
    const [contextMenu, setContextMenu] = useState(null);
    const { project } = useReactFlow(); // המרה מקואורדינטות מסך לקנבס

    const colors = ['#dbeafe', '#dcfce7', '#fef9c3', '#fee2e2', '#f3e8ff', '#ffedd5'];

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
                
                // הגנה: אם השרת לא מחזיר תשובה תקינה
                if (!defsRes.ok || !mapsRes.ok) {
                    console.error("API Error"); setLoading(false); return;
                }

                const defs = await defsRes.json();
                const maps = await mapsRes.json();
                
                const initialNodes = [];
                
                // 1. יצירת קופסאות (התמחויות)
                (defs.specialties || []).forEach((spec, index) => {
                    initialNodes.push({
                        id: `spec-${spec.id}`,
                        type: 'specialtyBox',
                        data: { label: spec.name, color: colors[index % colors.length], id: spec.id },
                        position: { x: (index % 3) * 320 + 250, y: Math.floor(index / 3) * 300 + 50 },
                        style: { width: 280, height: 250 },
                        zIndex: -1
                    });
                });

                // 2. יצירת סימפטומים
                let unassignedY = 0;
                (defs.symptoms || []).forEach((sym, index) => {
                    const mapping = Array.isArray(maps) ? maps.find(m => m.symptom_id === sym.id) : null;
                    const isAssigned = !!mapping;
                    
                    let position = { x: 0, y: 0 }; 
                    let parentNode = null;

                    if (isAssigned) {
                        parentNode = `spec-${mapping.specialty_id}`;
                        // מיקום יחסי בתוך הקופסה (פיזור אסתטי)
                        position = { x: 20 + (index % 2) * 120, y: 50 + Math.floor((index % 8) / 2) * 40 };
                    } else {
                        // ערימה בצד שמאל (לא משויכים)
                        position = { x: 20, y: 50 + unassignedY * 45 };
                        unassignedY++;
                    }

                    initialNodes.push({
                        id: `sym-${sym.id}`,
                        type: 'symptomPill',
                        data: { label: sym.name, id: sym.id },
                        position: position,
                        parentNode: parentNode, 
                        extent: parentNode ? 'parent' : undefined,
                        draggable: true,
                        zIndex: 10
                    });
                });

                setNodes(initialNodes);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchData();
    }, [API_URL, onLogout, setNodes]);

    // --- לוגיקת הגרירה (The Magic) ---
    const onNodeDragStop = useCallback(
        (_, node) => {
            // אם זה לא סימפטום, לא מעניין אותנו
            if (node.type !== 'symptomPill') return;

            // חיפוש קופסה חופפת
            const intersections = nodes.filter(
                (n) => n.type === 'specialtyBox' && checkIntersection(node, n)
            );
            const targetBox = intersections[0]; // לוקחים את הראשון שנמצא

            // אם מצאנו קופסה והיא שונה מההורה הנוכחי
            if (targetBox && targetBox.id !== node.parentNode) {
                // חישוב מיקום יחסי חדש (בתוך הקופסה)
                // הערה: זה חישוב פשוט. במערכת מורכבת צריך להשתמש ב-project()
                const relativePosition = {
                    x: Math.max(10, node.position.x - targetBox.position.x),
                    y: Math.max(40, node.position.y - targetBox.position.y),
                };

                setNodes((nds) =>
                    nds.map((n) => {
                        if (n.id === node.id) {
                            return {
                                ...n,
                                position: relativePosition,
                                parentNode: targetBox.id,
                                extent: 'parent', // נועל אותו בתוך הקופסה
                            };
                        }
                        return n;
                    })
                );
            } 
            // אם גררנו החוצה לשטח ריק (מחיקת שיוך)
            else if (!targetBox && node.parentNode) {
                 setNodes((nds) =>
                    nds.map((n) => {
                        if (n.id === node.id) {
                            // כאן צריך לוגיקה להפוך חזרה לאבסולוטי, זה מורכב.
                            // לבינתיים, אם גוררים החוצה, נחזיר אותו ל"בנק" בצד שמאל
                            return {
                                ...n,
                                position: { x: 20, y: 100 }, // זורק אותו להתחלה
                                parentNode: undefined,
                                extent: undefined,
                            };
                        }
                        return n;
                    })
                );
            }
        },
        [nodes, setNodes]
    );

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
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ mappings })
            });
            if (res.ok) alert('✅ המיפוי נשמר בהצלחה!');
            else alert('❌ שגיאה בשמירה');
        } catch (err) { alert('שגיאת תקשורת'); }
    };
    
    // קליק ימני
    const onNodeContextMenu = useCallback((event, node) => {
        event.preventDefault();
        // חישוב מיקום מדויק לתפריט
        setContextMenu({ id: node.id, type: node.type, top: event.clientY, left: event.clientX });
    }, []);

    const handleDelete = (nodeId) => {
        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setContextMenu(null);
    };
    
    // פונקציות ניהול
    const addNewSymptom = () => { 
        // הוספת פתקית חדשה זמנית
        const newId = `temp-${Date.now()}`;
        setNodes((prev) => [
            ...prev, 
            { 
                id: newId, 
                type: 'symptomPill', 
                data: { label: 'סימפטום חדש', id: null, isNew: true }, 
                position: { x: 50, y: 50 },
                draggable: true
            }
        ]);
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="bg-white p-6 rounded-lg shadow h-full flex flex-col relative">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h3 className="text-2xl font-bold text-text-dark">מפת האבחון (Drag & Drop)</h3>
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
                    onNodeDragStop={onNodeDragStop} // הפעלת הלוגיקה החדשה
                    onNodeContextMenu={onNodeContextMenu}
                    onPaneClick={() => setContextMenu(null)}
                    nodeTypes={nodeTypes}
                    fitView
                >
                    <Background color="#cbd5e1" gap={25} />
                    <Controls />
                    <Panel position="top-left" className="bg-white/80 p-2 rounded text-xs text-gray-500 border shadow-sm">
                        הסימפטומים הלא-משויכים כאן משמאל. <br/> גרור אותם לתוך הקופסאות.
                    </Panel>
                </ReactFlow>

                {contextMenu && (
                    <ContextMenu 
                        {...contextMenu} 
                        onClose={() => setContextMenu(null)} 
                        onDelete={handleDelete} 
                        onDuplicate={() => alert('שכפול עדיין לא נתמך בגרסה זו')}
                    />
                )}
            </div>
        </div>
    );
};

// --- ייצוא עם ה-Provider (חובה!) ---
export default ({ API_URL, onLogout }) => (
  <ReactFlowProvider>
    <SymptomMapperContent API_URL={API_URL} onLogout={onLogout} />
  </ReactFlowProvider>
);