// src/components/SymptomMapper.jsx - FINAL VERSION (Full Screen Studio Mode)
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

// מידות הקופסאות
const BOX_WIDTH = 280;
const BOX_HEIGHT = 280;

// --- 1. רכיבי צמתים (Nodes) ---

const SpecialtyBoxNode = ({ data }) => {
    const isHighlighted = data.isHighlighted;
    return (
        <div style={{ 
            width: `${BOX_WIDTH}px`, height: `${BOX_HEIGHT}px`, 
            backgroundColor: isHighlighted ? '#eff6ff' : (data.color || '#f8fafc'), 
            border: isHighlighted ? '3px dashed #2563EB' : '1px solid #cbd5e1', 
            borderRadius: '16px', 
            boxShadow: isHighlighted ? '0 0 20px rgba(37, 99, 235, 0.2)' : '0 4px 10px rgba(0,0,0,0.05)',
            display: 'flex', flexDirection: 'column',
            transition: 'all 0.2s ease',
            zIndex: -1, cursor: 'grab'
        }}>
            <div style={{ 
                background: isHighlighted ? '#2563EB' : 'rgba(255,255,255,0.9)', 
                color: isHighlighted ? 'white' : '#1e293b',
                padding: '12px', borderBottom: '1px solid rgba(0,0,0,0.05)', 
                fontWeight: 'bold', textAlign: 'center', fontSize: '15px',
                borderTopLeftRadius: '14px', borderTopRightRadius: '14px'
            }}>
                {data.label}
            </div>
            {isHighlighted && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', fontWeight: 'bold', opacity: 0.6 }}>
                    שחרר כאן 🎯
                </div>
            )}
        </div>
    );
};

const SymptomPillNode = ({ data }) => (
  <div style={{ 
      background: 'white', border: '1px solid #64748b', borderRadius: '99px', 
      padding: '8px 16px', fontSize: '13px', fontWeight: '600', color: '#334155',
      boxShadow: '0 4px 6px rgba(0,0,0,0.15)', cursor: 'grab', width: 'max-content',
      zIndex: 1000, whiteSpace: 'nowrap'
  }}>
    {data.label}
  </div>
);

const nodeTypes = { specialtyBox: SpecialtyBoxNode, symptomPill: SymptomPillNode };
const colors = ['#dbeafe', '#dcfce7', '#fef9c3', '#fee2e2', '#f3e8ff', '#ffedd5'];

// --- 2. בנק הסימפטומים (צד ימין) ---
const Sidebar = ({ symptoms }) => {
    const onDragStart = (event, symptom) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify(symptom));
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-xl z-20 w-80 flex-shrink-0">
            <div className="p-5 bg-gray-50 border-b border-gray-200">
                <h4 className="font-bold text-gray-800 text-lg">בנק סימפטומים</h4>
                <p className="text-xs text-gray-500 mt-1">גרור סימפטום למשטח כדי לשייך אותו.</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {symptoms.map((sym) => (
                    <div 
                        key={sym.id}
                        onDragStart={(event) => onDragStart(event, sym)}
                        draggable
                        className="p-3 bg-white border border-gray-300 rounded-lg cursor-grab hover:border-blue-500 hover:shadow-md transition-all text-sm text-gray-700 font-medium flex items-center gap-3 select-none"
                    >
                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                        {sym.name}
                    </div>
                ))}
                <div className="h-20"></div> {/* מרווח בסוף */}
            </div>
        </div>
    );
};

// --- 3. המנוע הראשי ---
const SymptomMapperContent = ({ API_URL, onLogout }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]); 
    const [allSymptoms, setAllSymptoms] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [contextMenu, setContextMenu] = useState(null);
    const [trashHighlighted, setTrashHighlighted] = useState(false);
    
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
                
                // קופסאות (התמחויות)
                (defs.specialties || []).forEach((spec, index) => {
                    initialNodes.push({
                        id: `spec-${spec.id}`,
                        type: 'specialtyBox',
                        data: { label: spec.name, color: colors[index % colors.length], id: spec.id, isHighlighted: false },
                        // מרווחים גדולים יותר
                        position: { x: (index % 3) * (BOX_WIDTH + 100) + 50, y: Math.floor(index / 3) * (BOX_HEIGHT + 100) + 50 },
                        style: { width: BOX_WIDTH, height: BOX_HEIGHT },
                        draggable: true, zIndex: -1
                    });
                });

                // מיפויים קיימים
                (maps || []).forEach((map, index) => {
                    const symptom = defs.symptoms.find(s => s.id === map.symptom_id);
                    if (symptom) {
                        const uniqueId = `assigned-${map.symptom_id}-${map.specialty_id}-${index}`;
                        const parentId = `spec-${map.specialty_id}`;
                        // פיזור רנדומלי בתוך הקופסה
                        const randX = 20 + Math.random() * (BOX_WIDTH - 150);
                        const randY = 60 + Math.random() * (BOX_HEIGHT - 100);

                        initialNodes.push({
                            id: uniqueId,
                            type: 'symptomPill',
                            data: { label: symptom.name, id: symptom.id },
                            position: { x: randX, y: randY },
                            parentNode: parentId,
                            draggable: true, zIndex: 100
                        });
                    }
                });

                setNodes(initialNodes);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchData();
    }, [API_URL, onLogout, setNodes]);

    // חישוב חפיפה
    const findTargetBox = useCallback((x, y, currentNodes) => {
        return currentNodes.find(n => 
            n.type === 'specialtyBox' &&
            x >= n.position.x && x <= n.position.x + BOX_WIDTH &&
            y >= n.position.y && y <= n.position.y + BOX_HEIGHT
        );
    }, []);

    // Drag & Drop (מהבנק)
    const onDragOver = useCallback((event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }, []);

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
                position: position, zIndex: 1000
            };
            if (targetBox) {
                newNode.parentNode = targetBox.id;
                newNode.position = { x: position.x - targetBox.position.x, y: position.y - targetBox.position.y };
            }
            return nds.concat(newNode);
        });
    }, [project, findTargetBox, setNodes]);

    // גרירה בקנבס (זיהוי פח וקופסאות)
    const onNodeDrag = useCallback((event, node) => {
        if (!reactFlowWrapper.current) return;
        
        const containerBounds = reactFlowWrapper.current.getBoundingClientRect();
        const mouseXInCanvas = event.clientX - containerBounds.left;
        const mouseYInCanvas = event.clientY - containerBounds.top;
        const width = containerBounds.width;
        const height = containerBounds.height;
        
        // פח בצד ימין למטה (אזור רגישות גדול)
        const isOverTrash = (mouseXInCanvas > width - 180 && mouseYInCanvas > height - 200);
        setTrashHighlighted(isOverTrash);

        if (node.type === 'symptomPill') {
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
        }
    }, [findTargetBox, setNodes]);

    const onNodeDragStop = useCallback((event, node) => {
        setTrashHighlighted(false);
        if (node.type === 'specialtyBox') return;

        // מחיקה בפח
        const containerBounds = reactFlowWrapper.current.getBoundingClientRect();
        const mouseX = event.clientX - containerBounds.left;
        const mouseY = event.clientY - containerBounds.top;
        const width = containerBounds.width;
        const height = containerBounds.height;

        if (mouseX > width - 180 && mouseY > height - 200) {
            setNodes((nds) => nds.filter((n) => n.id !== node.id));
            return;
        }

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
                        return { ...n, parentNode: targetBox.id, position: { x: Math.max(10, relX), y: Math.max(50, relY) } };
                    } 
                    return { ...n, parentNode: undefined, position: { x: absX, y: absY } };
                }
                return n;
            });
        });
    }, [findTargetBox, setNodes]);

    // תפריט קליק ימני
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
            if (res.ok) { alert(`✅ נשמר! (${mappings.length} קישורים)`); }
            else alert('❌ שגיאה');
        } catch (err) { alert('שגיאת תקשורת'); }
    };

    if (loading) return <LoadingSpinner />;

    // Layout ראשי: משתמש ב-Flex כדי לתפוס את כל הגובה הזמין
    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-100">
            {/* כותרת */}
            <div className="flex justify-between items-center px-6 py-3 bg-white shadow-sm z-30 flex-shrink-0 border-b border-gray-200">
                <h3 className="text-2xl font-bold text-gray-800">מנוע ההתאמה (Symptom Mapper)</h3>
                <div className="flex gap-4 text-sm text-gray-500 items-center">
                    <span>💡 טיפ: השתמש בגלגלת העכבר לזום, וגרירה כדי לזוז במרחב</span>
                    <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 shadow-lg transform hover:scale-105 transition">
                        💾 שמור שינויים
                    </button>
                </div>
            </div>
            
            {/* גוף העבודה */}
            <div className="flex flex-1 overflow-hidden relative">
                
                {/* אזור המשטח (Canvas) */}
                <div className="flex-1 relative h-full bg-slate-50" ref={reactFlowWrapper}>
                    <ReactFlow
                        nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                        onNodeDrag={onNodeDrag} onNodeDragStop={onNodeDragStop}
                        onNodeContextMenu={onNodeContextMenu} onPaneClick={onPaneClick}
                        onDragOver={onDragOver} onDrop={onDrop}
                        nodeTypes={nodeTypes} 
                        fitView 
                        minZoom={0.1} 
                        maxZoom={1.5}
                        deleteKeyCode={['Backspace', 'Delete']}
                    >
                        <Background color="#94a3b8" gap={40} size={1} />
                        <Controls position="top-left" className="m-4 shadow-lg border-none" />
                        
                        {/* פח אשפה - ממוקם בפינה ימנית תחתונה */}
                        <Panel position="bottom-right" style={{ margin: '30px' }}>
                            <div 
                                style={{
                                    width: trashHighlighted ? '100px' : '70px', 
                                    height: trashHighlighted ? '100px' : '70px',
                                    borderRadius: '50%',
                                    backgroundColor: trashHighlighted ? '#fee2e2' : 'white',
                                    border: trashHighlighted ? '4px solid #ef4444' : '2px solid #e2e8f0',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    pointerEvents: 'none' // כדי לא להפריע לזיהוי גרירה
                                }}
                            >
                                <span style={{ fontSize: trashHighlighted ? '50px' : '30px', transition: 'all 0.2s' }}>🗑️</span>
                            </div>
                        </Panel>
                    </ReactFlow>

                    {contextMenu && (
                        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999, pointerEvents: 'none' }}>
                            <div style={{ position: 'absolute', top: contextMenu.top, left: contextMenu.left, pointerEvents: 'auto' }}>
                                <ContextMenu {...contextMenu} onClose={onPaneClick} onDelete={handleDelete} />
                            </div>
                        </div>
                    )}
                </div>

                {/* אזור הבנק (מימין) */}
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