// src/components/SymptomMapper.jsx - V9.1 (Trash Can & Keyboard Delete)
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

// --- 1. רכיבי צמתים ---

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

const SymptomPillNode = ({ data, selected }) => (
  <div style={{ 
      background: 'white', 
      border: selected ? '2px solid #ef4444' : '1px solid #64748b', // סימון אדום כשנבחר למחיקה
      borderRadius: '99px', 
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
        event.dataTransfer.setData('application/reactflow', JSON.stringify(symptom));
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div style={{ 
            width: '250px', borderRight: '1px solid #e2e8f0', padding: '15px', 
            background: 'white', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px',
            height: '100%', zIndex: 20, boxShadow: '-2px 0 10px rgba(0,0,0,0.05)'
        }}>
            <h4 style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '5px' }}>בנק סימפטומים</h4>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px', lineHeight: '1.4' }}>
                גרור סימפטום למשטח.<br/>
                כדי למחוק: גרור לפח או לחץ Delete.
            </div>
            {symptoms.map((sym) => (
                <div 
                    key={sym.id}
                    onDragStart={(event) => onDragStart(event, sym)}
                    draggable
                    style={{
                        padding: '8px 12px', background: '#f8fafc', border: '1px solid #cbd5e1',
                        borderRadius: '8px', cursor: 'grab', fontSize: '13px', color: '#334155',
                        fontWeight: '500', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                >
                    <span style={{ width:'8px', height:'8px', background:'#cbd5e1', borderRadius:'50%' }}></span>
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
    const [allSymptoms, setAllSymptoms] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [contextMenu, setContextMenu] = useState(null);
    const [trashHighlighted, setTrashHighlighted] = useState(false); // האם הפח פעיל?
    
    const reactFlowWrapper = useRef(null);
    const { project } = useReactFlow(); 

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
                
                setAllSymptoms(defs.symptoms || []); 

                const initialNodes = [];
                
                // קופסאות
                (defs.specialties || []).forEach((spec, index) => {
                    initialNodes.push({
                        id: `spec-${spec.id}`,
                        type: 'specialtyBox',
                        data: { label: spec.name, color: colors[index % colors.length], id: spec.id, isHighlighted: false },
                        position: { x: (index % 3) * (BOX_WIDTH + 50) + 50, y: Math.floor(index / 3) * (BOX_HEIGHT + 50) + 50 },
                        style: { width: BOX_WIDTH, height: BOX_HEIGHT },
                        draggable: false,
                        selectable: false // שלא יבחרו בטעות את הקופסה
                    });
                });

                // סימפטומים קיימים
                (maps || []).forEach((map, index) => {
                    const symptom = defs.symptoms.find(s => s.id === map.symptom_id);
                    if (symptom) {
                        const uniqueId = `assigned-${map.symptom_id}-${map.specialty_id}-${index}`;
                        const parentId = `spec-${map.specialty_id}`;
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

    // --- חישובים ---
    const findTargetBox = useCallback((x, y, currentNodes) => {
        return currentNodes.find(n => 
            n.type === 'specialtyBox' &&
            x >= n.position.x && x <= n.position.x + BOX_WIDTH &&
            y >= n.position.y && y <= n.position.y + BOX_HEIGHT
        );
    }, []);

    // בדיקה האם הפתקית מעל הפח
    const checkTrashIntersection = useCallback((nodeAbsX, nodeAbsY) => {
        // מיקום הפח: תחתית המסך משמאל (קבוע)
        // אזור הפח הוא בערך: left: 20-100px, bottom: 20-100px
        // נשתמש בחישוב יחסי לגודל הקנבס
        if (!reactFlowWrapper.current) return false;
        const bounds = reactFlowWrapper.current.getBoundingClientRect();
        
        // המרת קואורדינטות מסך לקואורדינטות פנימיות של ה-Flow לא תעזור כאן,
        // כי הפח הוא "סטטי" על המסך (Overlay), וה-Nodes זזים ב-Zoom/Pan.
        // *פתרון:* אנחנו בודקים את מיקום העכבר (Event) ולא את מיקום ה-Node.
        return false; 
    }, []);

    // --- Drag Over (HTML5) ---
    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    // --- Drop (HTML5 - יצירה מהבנק) ---
    const onDrop = useCallback((event) => {
        event.preventDefault();
        const symptomDataStr = event.dataTransfer.getData('application/reactflow');
        if (!symptomDataStr) return;
        const symptom = JSON.parse(symptomDataStr);

        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        const position = project({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
        });

        setNodes((nds) => {
            const targetBox = findTargetBox(position.x, position.y, nds);
            const newNode = {
                id: `new-${symptom.id}-${Date.now()}`,
                type: 'symptomPill',
                data: { label: symptom.name, id: symptom.id },
                position: position,
                zIndex: 1000
            };
            if (targetBox) {
                newNode.parentNode = targetBox.id;
                newNode.position = { x: position.x - targetBox.position.x, y: position.y - targetBox.position.y };
            }
            return nds.concat(newNode);
        });
    }, [project, findTargetBox, setNodes]);

    // --- Node Drag (בתוך הקנבס) ---
    const onNodeDrag = useCallback((event, node) => {
        // 1. בדיקת פח: נשתמש במיקום העכבר מה-event
        // הפח נמצא בפינה השמאלית התחתונה של הקונטיינר
        const containerBounds = reactFlowWrapper.current.getBoundingClientRect();
        const mouseX = event.clientX - containerBounds.left;
        const mouseY = event.clientY - containerBounds.top;
        const containerHeight = containerBounds.height;
        
        // אזור הפח: 20px משמאל, 20px מלמטה, גודל 60x60
        const isOverTrash = (mouseX < 100 && mouseY > containerHeight - 100);
        setTrashHighlighted(isOverTrash);

        // 2. בדיקת קופסאות (Highlight)
        setNodes(nds => {
            let absX = node.position.x;
            let absY = node.position.y;
            if (node.parentNode) {
                 const p = nds.find(n => n.id === node.parentNode);
                 if (p) { absX += p.position.x; absY += p.position.y; }
            }
            const targetBox = findTargetBox(absX + 50, absY + 20, nds);
            const targetId = targetBox ? targetBox.id : null;

            return nds.map(n => {
                if (n.type === 'specialtyBox') {
                    const shouldHighlight = n.id === targetId;
                    if (n.data.isHighlighted !== shouldHighlight) return { ...n, data: { ...n.data, isHighlighted: shouldHighlight } };
                }
                return n;
            });
        });
    }, [findTargetBox, setNodes]);

    // --- סיום גרירה ---
    const onNodeDragStop = useCallback((event, node) => {
        // בדיקה אם שחררנו על הפח
        const containerBounds = reactFlowWrapper.current.getBoundingClientRect();
        const mouseX = event.clientX - containerBounds.left;
        const mouseY = event.clientY - containerBounds.top;
        const containerHeight = containerBounds.height;
        const isOverTrash = (mouseX < 100 && mouseY > containerHeight - 100);

        if (isOverTrash) {
            // מחיקה!
            setNodes((nds) => nds.filter((n) => n.id !== node.id));
            setTrashHighlighted(false);
            return;
        }

        setTrashHighlighted(false);

        setNodes((nds) => {
            const cleanNodes = nds.map(n => n.type === 'specialtyBox' ? { ...n, data: { ...n.data, isHighlighted: false } } : n);
            
            let absX = node.position.x;
            let absY = node.position.y;
            const oldParent = cleanNodes.find(p => p.id === node.parentNode);
            if (oldParent) { absX += oldParent.position.x; absY += oldParent.position.y; }

            const targetBox = findTargetBox(absX + 50, absY + 20, cleanNodes);

            return cleanNodes.map((n) => {
                if (n.id === node.id) {
                    if (targetBox) {
                        const relX = absX - targetBox.position.x;
                        const relY = absY - targetBox.position.y;
                        return { ...n, parentNode: targetBox.id, position: { x: Math.max(10, relX), y: Math.max(40, relY) } };
                    } 
                    return { ...n, parentNode: undefined, position: { x: absX, y: absY } };
                }
                return n;
            });
        });
    }, [findTargetBox, setNodes]);

    // --- ניהול ---
    const onNodeContextMenu = useCallback((event, node) => {
        event.preventDefault();
        setContextMenu({ id: node.id, type: node.type, top: event.clientY, left: event.clientX });
    }, []);
    const onPaneClick = useCallback(() => setContextMenu(null), []);
    const handleDelete = (nodeId) => {
        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setContextMenu(null);
    };

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
            <div className="flex justify-between items-center p-4 border-b bg-white z-10">
                <h3 className="text-2xl font-bold text-text-dark">מיפוי סימפטומים</h3>
                <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 shadow-md">💾 שמור שינויים</button>
            </div>
            
            <div className="flex flex-grow relative" style={{ height: '100%' }}>
                
                {/* אזור המשטח - משמאל */}
                <div className="flex-grow relative h-full" ref={reactFlowWrapper}>
                    <ReactFlow
                        nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                        onNodeDrag={onNodeDrag} onNodeDragStop={onNodeDragStop}
                        onNodeContextMenu={onNodeContextMenu} onPaneClick={onPaneClick}
                        onDragOver={onDragOver} onDrop={onDrop}
                        nodeTypes={nodeTypes} fitView
                        deleteKeyCode={['Backspace', 'Delete']} // הפעלת מחיקה במקלדת
                    >
                        <Background color="#cbd5e1" gap={25} />
                        <Controls position="top-right" />
                        
                        {/* --- הפח! --- */}
                        <div 
                            style={{
                                position: 'absolute', bottom: '20px', left: '20px',
                                width: trashHighlighted ? '80px' : '60px', 
                                height: trashHighlighted ? '80px' : '60px',
                                borderRadius: '50%',
                                backgroundColor: trashHighlighted ? '#fee2e2' : 'white',
                                border: trashHighlighted ? '3px solid #ef4444' : '1px solid #cbd5e1',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                zIndex: 2000, pointerEvents: 'none' // קריטי: pointerEvents כדי לא להפריע לגרירה
                            }}
                        >
                            <span style={{ fontSize: trashHighlighted ? '40px' : '30px', transition: 'all 0.2s' }}>🗑️</span>
                        </div>
                    </ReactFlow>

                    {contextMenu && (
                        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999, pointerEvents: 'none' }}>
                            <div style={{ position: 'absolute', top: contextMenu.top, left: contextMenu.left, pointerEvents: 'auto' }}>
                                <ContextMenu {...contextMenu} onClose={onPaneClick} onDelete={handleDelete} />
                            </div>
                        </div>
                    )}
                </div>

                {/* הבנק - מימין */}
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