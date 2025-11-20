// src/components/SymptomMapper.jsx - V7.0 (Full Features: Drag, Drop, Unassign, ContextMenu)
import React, { useState, useEffect, useCallback } from 'react';
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
import ContextMenu from './ContextMenu'; // וודא שהקובץ הזה קיים בתיקיית components

const BOX_WIDTH = 280;
const BOX_HEIGHT = 280;
const SIDEBAR_WIDTH = 320; // רוחב אזור ה"בנק" בצד שמאל

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
                    שחרר לשיוך 🎯
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

// --- 2. רכיב התוכן ---
const SymptomMapperContent = ({ API_URL, onLogout }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]); 
    const [loading, setLoading] = useState(true);
    const [contextMenu, setContextMenu] = useState(null); // תפריט קליק ימנית
    const [isSidebarHighlighted, setSidebarHighlighted] = useState(false); // להארת אזור השחרור

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
                
                // קופסאות
                (defs.specialties || []).forEach((spec, index) => {
                    initialNodes.push({
                        id: `spec-${spec.id}`,
                        type: 'specialtyBox',
                        data: { label: spec.name, color: colors[index % colors.length], id: spec.id, isHighlighted: false },
                        position: { x: (index % 3) * (BOX_WIDTH + 50) + (SIDEBAR_WIDTH + 50), y: Math.floor(index / 3) * (BOX_HEIGHT + 50) + 50 },
                        style: { width: BOX_WIDTH, height: BOX_HEIGHT },
                        draggable: false
                    });
                });

                // סימפטומים
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

    // --- פונקציות חישוב ---
    const findTargetBox = useCallback((node, currentNodes) => {
        let absX = node.position.x;
        let absY = node.position.y;
        if (node.parentNode) {
            const parent = currentNodes.find(n => n.id === node.parentNode);
            if (parent) { absX += parent.position.x; absY += parent.position.y; }
        }
        const centerX = absX + 50; 
        const centerY = absY + 20;

        return currentNodes.find(n => 
            n.type === 'specialtyBox' &&
            centerX >= n.position.x && centerX <= n.position.x + BOX_WIDTH &&
            centerY >= n.position.y && centerY <= n.position.y + BOX_HEIGHT
        );
    }, []);

    const isOverSidebar = useCallback((node, currentNodes) => {
        let absX = node.position.x;
        if (node.parentNode) {
            const parent = currentNodes.find(n => n.id === node.parentNode);
            if (parent) absX += parent.position.x;
        }
        return absX < SIDEBAR_WIDTH;
    }, []);

    // --- גרירה (Highlight) ---
    const onNodeDrag = useCallback((event, node) => {
        setNodes((nds) => {
            const targetBox = findTargetBox(node, nds);
            const overSidebar = isOverSidebar(node, nds);
            
            setSidebarHighlighted(overSidebar); // עדכון ויזואלי ל"בנק"

            const targetId = targetBox ? targetBox.id : null;
            const needsUpdate = nds.some(n => n.type === 'specialtyBox' && ((n.id === targetId && !n.data.isHighlighted) || (n.id !== targetId && n.data.isHighlighted)));

            if (!needsUpdate) return nds;
            return nds.map(n => {
                if (n.type === 'specialtyBox') return { ...n, data: { ...n.data, isHighlighted: n.id === targetId } };
                return n;
            });
        });
    }, [findTargetBox, isOverSidebar, setNodes]);

    // --- סיום גרירה (Drop) ---
    const onNodeDragStop = useCallback((event, node) => {
        setSidebarHighlighted(false); // כיבוי אורות

        setNodes((nds) => {
            const cleanNodes = nds.map(n => n.type === 'specialtyBox' ? { ...n, data: { ...n.data, isHighlighted: false } } : n);
            const targetBox = findTargetBox(node, cleanNodes);
            const overSidebar = isOverSidebar(node, cleanNodes);

            return cleanNodes.map((n) => {
                if (n.id === node.id) {
                    let absX = node.position.x;
                    let absY = node.position.y;
                    const oldParent = cleanNodes.find(p => p.id === node.parentNode);
                    if (oldParent) { absX += oldParent.position.x; absY += oldParent.position.y; }

                    // 1. שיוך לקופסה
                    if (targetBox) {
                        const relX = absX - targetBox.position.x;
                        const relY = absY - targetBox.position.y;
                        return { ...n, parentNode: targetBox.id, extent: 'parent', position: { x: Math.max(10, relX), y: Math.max(40, relY) } };
                    } 
                    
                    // 2. שחרור ל"בנק" (ניתוק)
                    if (overSidebar) {
                        return { ...n, parentNode: undefined, extent: undefined, position: { x: 30, y: absY } };
                    }

                    // 3. זריקה לשטח מת - נחזיר למקום האחרון או ל"בנק" כברירת מחדל
                    return { ...n, parentNode: undefined, extent: undefined, position: { x: 30, y: absY } };
                }
                return n;
            });
        });
    }, [findTargetBox, isOverSidebar, setNodes]);

    // --- ניהול (קליק ימני) ---
    const onNodeContextMenu = useCallback((event, node) => {
        event.preventDefault();
        setContextMenu({ id: node.id, type: node.type, top: event.clientY, left: event.clientX });
    }, []);

    const onPaneClick = useCallback(() => setContextMenu(null), []);

    const handleDelete = (nodeId) => {
        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setContextMenu(null);
    };

    const handleDuplicate = (nodeId) => {
        setContextMenu(null);
        const nodeToClone = nodes.find(n => n.id === nodeId);
        if (!nodeToClone) return;
        const newId = `clone-${Date.now()}`;
        // מיקום מעט מוזז
        const newPos = { x: nodeToClone.position.x + 20, y: nodeToClone.position.y + 20 };
        
        setNodes(nds => nds.concat({
            ...nodeToClone,
            id: newId,
            position: newPos,
            data: { ...nodeToClone.data, label: `${nodeToClone.data.label} (עותק)` }
        }));
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
        <div className="bg-white p-6 rounded-lg shadow h-full flex flex-col relative">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h3 className="text-2xl font-bold text-text-dark">מפת האבחון</h3>
                <div className="flex gap-2">
                     <div className="text-xs text-gray-500 flex flex-col justify-center text-right px-2">
                        <span>קליק ימני למחיקה/שכפול</span>
                        <span>גרירה שמאלה לניתוק</span>
                     </div>
                    <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 shadow-md">
                        💾 שמור שינויים
                    </button>
                </div>
            </div>
            
            <div style={{ flexGrow: 1, height: '700px', border: '1px solid #e2e8f0', borderRadius: '16px', background: '#f8fafc', position: 'relative' }}>
                <ReactFlow
                    nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                    onNodeDrag={onNodeDrag} onNodeDragStop={onNodeDragStop}
                    onNodeContextMenu={onNodeContextMenu} onPaneClick={onPaneClick}
                    nodeTypes={nodeTypes} fitView
                >
                    <Background color="#cbd5e1" gap={25} />
                    <Controls />
                    
                    {/* אזור ה"בנק" השמאלי - מואר בזמן גרירה */}
                    <div 
                        style={{
                            position: 'absolute', left: 0, top: 0, bottom: 0, width: `${SIDEBAR_WIDTH}px`,
                            background: isSidebarHighlighted ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                            borderRight: '2px dashed #cbd5e1', pointerEvents: 'none',
                            transition: 'background 0.2s', zIndex: 0,
                            display: 'flex', justifyContent: 'center', paddingTop: '20px'
                        }}
                    >
                        {isSidebarHighlighted && <span style={{ color: '#059669', fontWeight: 'bold', background:'white', padding:'4px 10px', borderRadius:'20px', height:'fit-content' }}>שחרר כאן לניתוק 🔓</span>}
                    </div>
                </ReactFlow>

                {contextMenu && (
                    <ContextMenu 
                        {...contextMenu} 
                        onClose={onPaneClick} 
                        onDelete={handleDelete} 
                        onDuplicate={handleDuplicate}
                    />
                )}
            </div>
        </div>
    );
};

export default ({ API_URL, onLogout }) => (
  <ReactFlowProvider>
    <SymptomMapperContent API_URL={API_URL} onLogout={onLogout} />
  </ReactFlowProvider>
);