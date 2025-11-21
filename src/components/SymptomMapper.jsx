// src/components/SymptomMapper.jsx - V13.0 (Full Screen + Visible Trash + Scrollable Bank)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import LoadingSpinner from './LoadingSpinner';
import ContextMenu from './ContextMenu';

const BOX_WIDTH = 280;
const BOX_HEIGHT = 280;

// --- 1. צמתים ---
const SpecialtyBoxNode = ({ data }) => {
    const isHighlighted = data.isHighlighted;
    return (
        <div style={{ 
            width: `${BOX_WIDTH}px`, height: `${BOX_HEIGHT}px`, 
            backgroundColor: isHighlighted ? '#eff6ff' : (data.color || '#f8fafc'), 
            border: isHighlighted ? '3px dashed #2563EB' : '1px solid #cbd5e1', 
            borderRadius: '16px', 
            boxShadow: isHighlighted ? '0 0 20px rgba(37, 99, 235, 0.3)' : '0 4px 10px rgba(0,0,0,0.08)',
            display: 'flex', flexDirection: 'column',
            transition: 'all 0.2s ease', zIndex: -1, cursor: 'grab'
        }}>
            <div style={{ 
                background: isHighlighted ? '#2563EB' : 'rgba(255,255,255,0.8)', 
                color: isHighlighted ? 'white' : '#1e293b',
                padding: '12px', borderBottom: '1px solid rgba(0,0,0,0.05)', 
                fontWeight: 'bold', textAlign: 'center', fontSize: '16px',
                borderTopLeftRadius: '14px', borderTopRightRadius: '14px'
            }}>
                {data.label}
            </div>
            {isHighlighted && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', fontWeight: 'bold', opacity: 0.6, fontSize: '1.2em' }}>
                    שחרר כאן 🎯
                </div>
            )}
        </div>
    );
};

const SymptomPillNode = ({ data, selected }) => (
  <div style={{ 
      background: 'white', 
      border: selected ? '2px solid #ef4444' : '1px solid #64748b', 
      borderRadius: '99px', 
      padding: '8px 16px', fontSize: '13px', fontWeight: '600', color: '#334155',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)', cursor: 'grab', width: 'max-content',
      zIndex: 1000
  }}>
    {data.label}
  </div>
);

const nodeTypes = { specialtyBox: SpecialtyBoxNode, symptomPill: SymptomPillNode };
const colors = ['#dbeafe', '#dcfce7', '#fef9c3', '#fee2e2', '#f3e8ff', '#ffedd5'];

// --- 2. בנק עם גלילה ---
const Sidebar = ({ symptoms }) => {
    const onDragStart = (event, symptom) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify(symptom));
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="sidebar-container" style={{ 
            width: '320px', borderRight: '1px solid #e2e8f0', 
            background: 'white', display: 'flex', flexDirection: 'column', 
            height: '100%', zIndex: 20, boxShadow: '-2px 0 15px rgba(0,0,0,0.05)'
        }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #eee', backgroundColor: '#f8fafc' }}>
                <h4 style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '18px', marginBottom: '5px' }}>בנק סימפטומים</h4>
                <div style={{ fontSize: '13px', color: '#64748b' }}>גרור למשטח כדי לשייך.</div>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {symptoms.map((sym) => (
                    <div 
                        key={sym.id}
                        onDragStart={(event) => onDragStart(event, sym)}
                        draggable
                        style={{
                            padding: '12px 16px', background: 'white', border: '1px solid #cbd5e1',
                            borderRadius: '10px', cursor: 'grab', fontSize: '14px', color: '#334155',
                            fontWeight: '500', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '10px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.03)', transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.transform = 'translateX(-2px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.transform = 'translateX(0)'; }}
                    >
                        <span style={{ width:'10px', height:'10px', background:'#cbd5e1', borderRadius:'50%' }}></span>
                        {sym.name}
                    </div>
                ))}
                <div style={{ height: '60px' }}></div> {/* מרווח תחתון */}
            </div>
        </div>
    );
};

// --- 3. משטח ---
const SymptomMapperContent = ({ API_URL, onLogout }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]); 
    const [allSymptoms, setAllSymptoms] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [contextMenu, setContextMenu] = useState(null);
    const [trashHighlighted, setTrashHighlighted] = useState(false);
    
    const reactFlowWrapper = useRef(null);
    const { project } = useReactFlow(); 

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
                (defs.specialties || []).forEach((spec, index) => {
                    initialNodes.push({
                        id: `spec-${spec.id}`, type: 'specialtyBox',
                        data: { label: spec.name, color: colors[index % colors.length], id: spec.id, isHighlighted: false },
                        position: { x: (index % 3) * (BOX_WIDTH + 80) + 100, y: Math.floor(index / 3) * (BOX_HEIGHT + 80) + 50 },
                        style: { width: BOX_WIDTH, height: BOX_HEIGHT },
                        draggable: true, zIndex: -1
                    });
                });

                (maps || []).forEach((map, index) => {
                    const symptom = defs.symptoms.find(s => s.id === map.symptom_id);
                    if (symptom) {
                        const uniqueId = `assigned-${map.symptom_id}-${map.specialty_id}-${index}`;
                        const parentId = `spec-${map.specialty_id}`;
                        const randX = 20 + Math.random() * (BOX_WIDTH - 140);
                        const randY = 60 + Math.random() * (BOX_HEIGHT - 100);
                        initialNodes.push({
                            id: uniqueId, type: 'symptomPill',
                            data: { label: symptom.name, id: symptom.id },
                            position: { x: randX, y: randY },
                            parentNode: parentId, draggable: true, zIndex: 100
                        });
                    }
                });
                setNodes(initialNodes);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchData();
    }, [API_URL, onLogout, setNodes]);

    const findTargetBox = useCallback((x, y, currentNodes) => {
        return currentNodes.find(n => n.type === 'specialtyBox' && x >= n.position.x && x <= n.position.x + BOX_WIDTH && y >= n.position.y && y <= n.position.y + BOX_HEIGHT);
    }, []);

    const onDragOver = useCallback((event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }, []);

    const onDrop = useCallback((event) => {
        event.preventDefault();
        const symptomDataStr = event.dataTransfer.getData('application/reactflow');
        if (!symptomDataStr) return;
        const symptom = JSON.parse(symptomDataStr);
        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        const position = project({ x: event.clientX - reactFlowBounds.left, y: event.clientY - reactFlowBounds.top });
        setNodes((nds) => {
            const targetBox = findTargetBox(position.x, position.y, nds);
            const newNode = {
                id: `new-${symptom.id}-${Date.now()}`, type: 'symptomPill',
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

    const onNodeDrag = useCallback((event, node) => {
        if (!reactFlowWrapper.current) return;
        const containerBounds = reactFlowWrapper.current.getBoundingClientRect();
        const mouseXInCanvas = event.clientX - containerBounds.left;
        const mouseYInCanvas = event.clientY - containerBounds.top;
        const width = containerBounds.width;
        const height = containerBounds.height;
        
        // אזור הפח: ימין למטה (מוגבה)
        const isOverTrash = (mouseXInCanvas > width - 180 && mouseYInCanvas > height - 250);
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

        const containerBounds = reactFlowWrapper.current.getBoundingClientRect();
        const mouseX = event.clientX - containerBounds.left;
        const mouseY = event.clientY - containerBounds.top;
        const width = containerBounds.width;
        const height = containerBounds.height;

        // מחיקה בפח
        if (mouseX > width - 180 && mouseY > height - 250) {
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

    const onNodeContextMenu = useCallback((event, node) => { event.preventDefault(); setContextMenu({ id: node.id, type: node.type, top: event.clientY, left: event.clientX }); }, []);
    const onPaneClick = useCallback(() => setContextMenu(null), []);
    const handleDelete = (nodeId) => { setNodes((nds) => nds.filter((n) => n.id !== nodeId)); setContextMenu(null); };

    const handleSave = async () => {
        const mappings = nodes.filter(n => n.type === 'symptomPill' && n.parentNode).map(n => ({ symptom_id: parseInt(n.data.id), specialty_id: parseInt(n.parentNode.replace('spec-', '')) }));
        try {
            const res = await fetch(`${API_URL}/api/admin/mappings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ mappings }) });
            if (res.ok) { alert(`✅ נשמר! (${mappings.length} קישורים)`); window.location.reload(); } else alert('❌ שגיאה');
        } catch (err) { alert('שגיאת תקשורת'); }
    };

    if (loading) return <LoadingSpinner />;

    // המסך המלא (calc)
    return (
        <div className="bg-white shadow h-full flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 100px)' }}>
            <div className="flex justify-between items-center p-4 border-b bg-white z-10 shadow-sm">
                <h3 className="text-2xl font-bold text-text-dark">מיפוי סימפטומים (מסך מלא)</h3>
                <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 shadow-md transform hover:scale-105 transition">💾 שמור שינויים</button>
            </div>
            
            <div className="flex flex-grow relative" style={{ height: '100%' }}>
                <div className="flex-grow relative h-full" ref={reactFlowWrapper}>
                    <ReactFlow
                        nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                        onNodeDrag={onNodeDrag} onNodeDragStop={onNodeDragStop}
                        onNodeContextMenu={onNodeContextMenu} onPaneClick={onPaneClick}
                        onDragOver={onDragOver} onDrop={onDrop}
                        nodeTypes={nodeTypes} fitView minZoom={0.1} maxZoom={2} deleteKeyCode={['Backspace', 'Delete']}
                    >
                        <Background color="#cbd5e1" gap={30} />
                        <Controls position="top-left" />
                        
                        {/* פח אשפה בולט ומוגבה בימין */}
                        <div style={{
                                position: 'absolute', bottom: '80px', right: '40px',
                                width: trashHighlighted ? '100px' : '80px', height: trashHighlighted ? '100px' : '80px',
                                borderRadius: '50%', backgroundColor: trashHighlighted ? '#fee2e2' : 'white',
                                border: trashHighlighted ? '4px solid #ef4444' : '2px solid #e2e8f0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.15)', transition: 'all 0.2s',
                                zIndex: 2000, pointerEvents: 'none' 
                        }}>
                            <span style={{ fontSize: trashHighlighted ? '50px' : '40px', transition: 'all 0.2s' }}>🗑️</span>
                        </div>
                    </ReactFlow>
                    {contextMenu && <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999, pointerEvents: 'none' }}><div style={{ position: 'absolute', top: contextMenu.top, left: contextMenu.left, pointerEvents: 'auto' }}><ContextMenu {...contextMenu} onClose={onPaneClick} onDelete={handleDelete} /></div></div>}
                </div>
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