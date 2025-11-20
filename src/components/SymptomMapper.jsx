// src/components/SymptomMapper.jsx - V9.0 (Node-RED Style / Palette & Canvas)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Panel,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import LoadingSpinner from './LoadingSpinner';
import ContextMenu from './ContextMenu';

// מידות
const BOX_WIDTH = 280;
const BOX_HEIGHT = 280;

// --- 1. רכיבי צמתים (עיצוב) ---

const SpecialtyBoxNode = ({ data }) => {
    const isHighlighted = data.isHighlighted;
    return (
        <div style={{ 
            width: `${BOX_WIDTH}px`, height: `${BOX_HEIGHT}px`, 
            backgroundColor: isHighlighted ? '#eff6ff' : (data.color || '#f8fafc'), 
            border: isHighlighted ? '3px dashed #2563EB' : '1px solid #cbd5e1', 
            borderRadius: '16px', 
            boxShadow: isHighlighted ? '0 0 15px rgba(37, 99, 235, 0.2)' : '0 4px 6px -1px rgba(0,0,0,0.05)',
            display: 'flex', flexDirection: 'column',
            transition: 'all 0.2s ease',
            zIndex: -1
        }}>
            <div style={{ 
                background: isHighlighted ? '#2563EB' : 'rgba(255,255,255,0.8)', 
                color: isHighlighted ? 'white' : '#1e293b',
                padding: '10px', borderBottom: '1px solid rgba(0,0,0,0.05)', 
                fontWeight: 'bold', textAlign: 'center', fontSize: '15px',
                borderTopLeftRadius: '14px', borderTopRightRadius: '14px'
            }}>
                {data.label}
            </div>
            {isHighlighted && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', fontWeight: 'bold', opacity: 0.5 }}>
                    שחרר כאן 🎯
                </div>
            )}
        </div>
    );
};

const SymptomPillNode = ({ data }) => (
  <div style={{ 
      background: 'white', border: '1px solid #64748b', borderRadius: '99px', 
      padding: '6px 14px', fontSize: '12px', fontWeight: '600', color: '#334155',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)', cursor: 'grab', width: 'max-content',
      zIndex: 1000
  }}>
    {data.label}
  </div>
);

const nodeTypes = { specialtyBox: SpecialtyBoxNode, symptomPill: SymptomPillNode };
const colors = ['#dbeafe', '#dcfce7', '#fef9c3', '#fee2e2', '#f3e8ff', '#ffedd5'];

// --- 2. רכיב צד (הבנק) ---
const Sidebar = ({ symptoms }) => {
    const onDragStart = (event, symptom) => {
        // שומרים את המידע של הסימפטום כדי שנוכל לקרוא אותו ב-Drop
        event.dataTransfer.setData('application/reactflow', JSON.stringify(symptom));
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div style={{ 
            width: '250px', borderLeft: '1px solid #e2e8f0', padding: '15px', 
            background: 'white', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px'
        }}>
            <h4 style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '10px' }}>בנק סימפטומים</h4>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                גרור סימפטום למשטח כדי ליצור עותק.
            </div>
            {symptoms.map((sym) => (
                <div 
                    key={sym.id}
                    onDragStart={(event) => onDragStart(event, sym)}
                    draggable
                    style={{
                        padding: '8px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1',
                        borderRadius: '8px', cursor: 'grab', fontSize: '13px', color: '#334155',
                        fontWeight: '500', userSelect: 'none'
                    }}
                >
                    {sym.name}
                </div>
            ))}
        </div>
    );
};

// --- 3. רכיב המשטח ---
const SymptomMapperContent = ({ API_URL, onLogout }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]); 
    const [allSymptoms, setAllSymptoms] = useState([]); // רשימת הבנק
    const [loading, setLoading] = useState(true);
    const [contextMenu, setContextMenu] = useState(null);
    const reactFlowWrapper = useRef(null);
    const { project } = useReactFlow(); // המרה לקואורדינטות

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
                
                setAllSymptoms(defs.symptoms || []); // שמירת הבנק

                const initialNodes = [];
                
                // 1. יצירת קופסאות (התמחויות)
                (defs.specialties || []).forEach((spec, index) => {
                    initialNodes.push({
                        id: `spec-${spec.id}`,
                        type: 'specialtyBox',
                        data: { label: spec.name, color: colors[index % colors.length], id: spec.id, isHighlighted: false },
                        // מיקום התחלתי של הקופסאות
                        position: { x: (index % 3) * (BOX_WIDTH + 50) + 50, y: Math.floor(index / 3) * (BOX_HEIGHT + 50) + 50 },
                        style: { width: BOX_WIDTH, height: BOX_HEIGHT },
                        draggable: false // קופסאות נעולות
                    });
                });

                // 2. יצירת סימפטומים *שכבר משויכים* (היסטוריה)
                // אנחנו עוברים על המיפויים הקיימים ויוצרים nodes
                (maps || []).forEach((map, index) => {
                    const symptom = defs.symptoms.find(s => s.id === map.symptom_id);
                    if (symptom) {
                        const uniqueId = `assigned-${map.symptom_id}-${map.specialty_id}-${index}`;
                        const parentId = `spec-${map.specialty_id}`;
                        
                        // פיזור רנדומלי יפה בתוך הקופסה
                        const randX = 20 + Math.random() * (BOX_WIDTH - 140);
                        const randY = 50 + Math.random() * (BOX_HEIGHT - 80);

                        initialNodes.push({
                            id: uniqueId,
                            type: 'symptomPill',
                            data: { label: symptom.name, id: symptom.id },
                            position: { x: randX, y: randY },
                            parentNode: parentId,
                            draggable: true,
                            zIndex: 100
                        });
                    }
                });

                setNodes(initialNodes);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchData();
    }, [API_URL, onLogout, setNodes]);

    // --- פונקציות עזר ---
    const findTargetBox = useCallback((x, y, currentNodes) => {
        return currentNodes.find(n => 
            n.type === 'specialtyBox' &&
            x >= n.position.x && x <= n.position.x + BOX_WIDTH &&
            y >= n.position.y && y <= n.position.y + BOX_HEIGHT
        );
    }, []);

    // --- אירועי Drag & Drop מהבנק למשטח ---
    
    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback((event) => {
        event.preventDefault();

        // קריאת הנתונים מהבנק
        const symptomDataStr = event.dataTransfer.getData('application/reactflow');
        if (!symptomDataStr) return;
        
        const symptom = JSON.parse(symptomDataStr);

        // חישוב המיקום במשטח
        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        const position = project({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
        });

        // בדיקה אם נפלנו על קופסה
        // שים לב: בשלב זה אין לנו את ה-nodes המעודכנים בתוך ה-callback בצורה ישירה,
        // אז נשתמש ב-setNodes עם פונקציה כדי לקבל את המצב העדכני
        setNodes((nds) => {
            const targetBox = findTargetBox(position.x, position.y, nds);
            
            // יצירת הצומת החדש
            const newNode = {
                id: `new-${symptom.id}-${Date.now()}`,
                type: 'symptomPill',
                data: { label: symptom.name, id: symptom.id },
                position: position, // מיקום זמני
                zIndex: 1000
            };

            if (targetBox) {
                // אם נפלנו על קופסה, נחשב מיקום יחסי ונהפוך לילד שלה
                newNode.parentNode = targetBox.id;
                newNode.position = {
                    x: position.x - targetBox.position.x,
                    y: position.y - targetBox.position.y
                };
            }

            return nds.concat(newNode);
        });

    }, [project, findTargetBox, setNodes]);

    // --- גרירה בתוך המשטח (סידור מחדש) ---
    const onNodeDrag = useCallback((event, node) => {
        // כאן אפשר להוסיף Highlight לקופסאות כמו קודם
        setNodes(nds => {
            let absX = node.position.x;
            let absY = node.position.y;
            if (node.parentNode) {
                 const p = nds.find(n => n.id === node.parentNode);
                 if (p) { absX += p.position.x; absY += p.position.y; }
            }
            const targetBox = findTargetBox(absX + 50, absY + 20, nds);
            const targetId = targetBox ? targetBox.id : null;

            const needsUpdate = nds.some(n => n.type === 'specialtyBox' && ((n.id === targetId && !n.data.isHighlighted) || (n.id !== targetId && n.data.isHighlighted)));
            if (!needsUpdate) return nds;

            return nds.map(n => {
                if (n.type === 'specialtyBox') return { ...n, data: { ...n.data, isHighlighted: n.id === targetId } };
                return n;
            });
        });
    }, [findTargetBox, setNodes]);

    const onNodeDragStop = useCallback((event, node) => {
        setNodes((nds) => {
            const cleanNodes = nds.map(n => n.type === 'specialtyBox' ? { ...n, data: { ...n.data, isHighlighted: false } } : n);
            
            // חישוב מיקום אבסולוטי נוכחי
            let absX = node.position.x;
            let absY = node.position.y;
            const oldParent = cleanNodes.find(p => p.id === node.parentNode);
            if (oldParent) { absX += oldParent.position.x; absY += oldParent.position.y; }

            const targetBox = findTargetBox(absX + 50, absY + 20, cleanNodes);

            return cleanNodes.map((n) => {
                if (n.id === node.id) {
                    // אם גררנו לקופסה (אפילו אחרת)
                    if (targetBox) {
                        const relX = absX - targetBox.position.x;
                        const relY = absY - targetBox.position.y;
                        return { ...n, parentNode: targetBox.id, position: { x: relX, y: relY } };
                    }
                    // אם גררנו לשטח ריק -> להפוך לעצמאי (Unassigned)
                    return { ...n, parentNode: undefined, position: { x: absX, y: absY } };
                }
                return n;
            });
        });
    }, [findTargetBox, setNodes]);

    // --- ניהול (קליק ימני - מחיקה בלבד) ---
    const onNodeContextMenu = useCallback((event, node) => {
        event.preventDefault();
        setContextMenu({ id: node.id, type: node.type, top: event.clientY, left: event.clientX });
    }, []);

    const onPaneClick = useCallback(() => setContextMenu(null), []);

    const handleDelete = (nodeId) => {
        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setContextMenu(null);
    };

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
            if (res.ok) { alert(`✅ נשמר! (${mappings.length} קישורים)`); window.location.reload(); }
            else alert('❌ שגיאה');
        } catch (err) { alert('שגיאת תקשורת'); }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="bg-white rounded-lg shadow h-full flex flex-col overflow-hidden" style={{ height: '85vh' }}>
            {/* כותרת */}
            <div className="flex justify-between items-center p-4 border-b bg-white z-10">
                <h3 className="text-2xl font-bold text-text-dark">מפת האבחון (שיטת הבנק)</h3>
                <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 shadow-md">
                    💾 שמור שינויים
                </button>
            </div>
            
            {/* אזור העבודה - Flex Row */}
            <div className="flex flex-grow relative" style={{ height: '100%' }}>
                
                {/* אזור המשטח (Canvas) - משמאל */}
                <div className="flex-grow relative h-full" ref={reactFlowWrapper}>
                    <ReactFlow
                        nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                        onNodeDrag={onNodeDrag} onNodeDragStop={onNodeDragStop}
                        onNodeContextMenu={onNodeContextMenu} onPaneClick={onPaneClick}
                        onDragOver={onDragOver} onDrop={onDrop} // אירועי HTML5 DnD
                        nodeTypes={nodeTypes} fitView
                    >
                        <Background color="#cbd5e1" gap={25} />
                        <Controls position="top-left" />
                        <Panel position="top-right" className="bg-white/80 p-2 rounded border text-xs text-gray-500">
                            גרור סימפטומים מהרשימה מימין לתוך הקופסאות
                        </Panel>
                    </ReactFlow>

                    {contextMenu && (
                        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999, pointerEvents: 'none' }}>
                            <div style={{ position: 'absolute', top: contextMenu.top, left: contextMenu.left, pointerEvents: 'auto' }}>
                                <ContextMenu 
                                    {...contextMenu} 
                                    onClose={onPaneClick} 
                                    onDelete={handleDelete} 
                                    // אין צורך בכפתור שכפול בתפריט כי גוררים מהבנק
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* אזור הבנק (Sidebar) - מימין */}
                <Sidebar symptoms={allSymptoms} />
                
            </div>
        </div>
    );
};

export default ({ API_URL, onLogout }) => (
  <ReactFlowProvider>
    <SymptomMapperContent API_URL={API_URL} onLogout={onLogout} />
  </ReactFlowProvider>
);