// src/components/SymptomMapper.jsx - v4 (Box Dragging & Right-Click)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  NodeResizer,
  getRectOfNodes,
  getTransformForBounds
} from 'reactflow';
import 'reactflow/dist/style.css';
import LoadingSpinner from './LoadingSpinner';
import ContextMenu from './ContextMenu'; // ייבוא רכיב תפריט לחיצה ימנית

// --- רכיבי צמתים ---
const SpecialtyBoxNode = ({ data, selected }) => {
  return (
    <div style={{ 
        width: '100%', height: '100%', 
        backgroundColor: data.color || '#e0f2fe', 
        border: selected ? '2px solid #2563EB' : '1px solid #94a3b8',
        borderRadius: '12px', padding: '10px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        overflow: 'hidden'
    }}>
      <NodeResizer minWidth={250} minHeight={100} isVisible={selected} />
      <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b', marginBottom: '5px', textAlign: 'center' }}>
        {data.label}
      </div>
    </div>
  );
};

const SymptomPillNode = ({ data, selected }) => (
  <div style={{ 
      background: 'white', border: selected ? '2px solid #2563EB' : '1px solid #cbd5e1', borderRadius: '20px', 
      padding: '4px 12px', fontSize: '12px', fontWeight: '500',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)', cursor: 'grab', width: 'max-content',
      opacity: data.isNew ? 0.7 : 1 // מראה את החדשים שנוספו
  }}>
    {data.label}
  </div>
);

const nodeTypes = { specialtyBox: SpecialtyBoxNode, symptomPill: SymptomPillNode };


const SymptomMapper = ({ API_URL, onLogout }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, edgesSet, onEdgesChange] = useEdgesState([]); 
    const [loading, setLoading] = useState(true);
    const reactFlowWrapper = useRef(null);
    const reactFlowInstance = useReactFlow();
    const [contextMenu, setContextMenu] = useState(null); // מצב לתפריט לחיצה ימנית

    const colors = ['#dbeafe', '#dcfce7', '#fef9c3', '#fee2e2', '#f3e8ff', '#ffedd5'];

    // --- טעינת נתונים ---
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [defsRes, mapsRes] = await Promise.all([
                    fetch(`${API_URL}/api/admin/data/all-definitions`, { credentials: 'include' }),
                    fetch(`${API_URL}/api/admin/mappings`, { credentials: 'include' })
                ]);
                if (defsRes.status === 401) { onLogout(); return; }
                const defs = await defsRes.json();
                const maps = await mapsRes.json();
                
                const initialNodes = [];
                const specialtyMap = new Map();

                // 2. יצירת קופסאות (התמחויות)
                defs.specialties.forEach((spec, index) => {
                    const nodeId = `spec-${spec.id}`;
                    initialNodes.push({
                        id: nodeId,
                        type: 'specialtyBox',
                        data: { label: spec.name, color: colors[index % colors.length], id: spec.id },
                        position: { x: (index % 3) * 350 + 200, y: Math.floor(index / 3) * 250 + 50 },
                        style: { width: 280, height: 200 }, 
                        zIndex: 0
                    });
                    specialtyMap.set(nodeId, { rect: null, data: spec });
                });

                // 3. יצירת פתקיות (סימפטומים)
                let unassignedY = 0;
                defs.symptoms.forEach((sym, index) => {
                    const mapping = maps.find(m => m.symptom_id === sym.id);
                    const isAssigned = !!mapping;
                    
                    let position = { x: 0, y: 0 }; 
                    let parentNode = null;

                    if (isAssigned) {
                        parentNode = `spec-${mapping.specialty_id}`;
                        // מיקום יחסי בתוך ההורה
                        position = { x: 20 + (index % 4) * 60, y: 40 + (index % 5) * 30 };
                    } else {
                        // אזור לא משויך בצד שמאל
                        position = { x: 50, y: unassignedY };
                        unassignedY += 40;
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
    }, [API_URL, onLogout]);

    // --- לוגיקה לחישוב שיוך בעת גרירה ---
    const onNodeDragStop = (event, node) => {
        const intersectionCheck = (nodes) => {
            const symptomRect = event.target.getBoundingClientRect(); // מיקום הסימפטום
            let newParent = null;

            // עבור על כל ההתמחויות ובדוק חפיפה
            nodes.forEach((n) => {
                if (n.type === 'specialtyBox' && n.width && n.height) {
                    const specialtyElement = document.querySelector(`[data-id="${n.id}"]`);
                    if (!specialtyElement) return;

                    const specialtyRect = specialtyElement.getBoundingClientRect();
                    
                    // בדיקת חפיפה (פונקציה פנימית)
                    const isIntersecting = (r1, r2) => {
                        return r1.left < r2.right && r1.right > r2.left &&
                               r1.top < r2.bottom && r1.bottom > r2.top;
                    };
                    
                    if (isIntersecting(symptomRect, specialtyRect)) {
                        newParent = n.id;
                    }
                }
            });
            return newParent;
        };

        const targetSpecialtyId = intersectionCheck(nodes);
        
        // --- עדכון המצב ---
        setNodes((nds) => nds.map((n) => {
            if (n.id !== node.id) return n;

            const isChangingParent = targetSpecialtyId !== n.parentNode;

            // אם הועבר לקופסה או הועבר החוצה למקום ריק
            if (isChangingParent) {
                // נטפל במיקום יחסי
                let newPos = { x: node.position.x, y: node.position.y };
                let newExtent = undefined;
                let newParent = null;

                if (targetSpecialtyId) {
                    // חישוב מיקום יחסי לתוך הקופסה (כדי לשמור על המיקום החזותי)
                    const parentNode = nodes.find(n => n.id === targetSpecialtyId);
                    if (parentNode) {
                        const parentPos = reactFlowInstance.project(parentNode.position);
                        newPos = { 
                           x: node.position.x - parentPos.x,
                           y: node.position.y - parentPos.y
                        };
                        newParent = targetSpecialtyId;
                        newExtent = 'parent';
                    }
                }

                return {
                    ...n,
                    parentNode: newParent,
                    extent: newExtent,
                    position: newPos,
                    data: { ...n.data, isNew: false }
                };
            }
            return n;
        }));
    };
    
    // --- !!! פונקציות ניהול (מחיקה ושכפול) !!! ---
    
    const handleDuplicate = (nodeId, nodeType) => {
        setContextMenu(null);
        if (nodeType !== 'symptomPill') return;

        const nodeToClone = nodes.find(n => n.id === nodeId);
        if (!nodeToClone) return;

        const newId = `clone-${Date.now()}`;
        const newPos = { x: nodeToClone.position.x + 20, y: nodeToClone.position.y + 20 };

        setNodes(nds => nds.concat({
            ...nodeToClone,
            id: newId,
            position: newPos,
            parentNode: nodeToClone.parentNode,
            data: { ...nodeToClone.data, isNew: true } // סימון כחדש
        }));
    };
    
    const handleDelete = (nodeId) => {
        setContextMenu(null);
        // מחיקה של הצומת ושל כל החיבורים שלו (אם היו)
        setNodes(nds => nds.filter(n => n.id !== nodeId));
        setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    };

    // --- שמירה ---
    const handleSave = async () => {
        const mappings = nodes
            .filter(n => n.type === 'symptomPill' && n.parentNode) // רק סימפטומים משויכים
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
            if (res.ok) alert('המיפוי נשמר בהצלחה!');
        } catch (err) { alert('שגיאה בשמירה'); }
    };
    
    // --- תפריט לחיצה ימנית ---
    const onNodeContextMenu = useCallback(
        (event, node) => {
            event.preventDefault();
            setContextMenu({
                id: node.id,
                type: node.type,
                top: event.clientY,
                left: event.clientX,
            });
        },
        [setContextMenu]
    );

    // סגירת תפריט לחיצה ימנית
    const onPaneClick = useCallback(() => setContextMenu(null), [setContextMenu]);

    // --- הצגת רכיבים חסרים (CRUD UI) ---
    const addNewSymptom = () => {
        alert('כדי להוסיף סימפטום חדש, השתמש במסך "ניהול נתונים (CMS)"');
    };
    const addNewSpecialty = () => {
        alert('כדי להוסיף התמחות חדשה, השתמש במסך "ניהול נתונים (CMS)"');
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="bg-white p-6 rounded-lg shadow h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h3 className="text-2xl font-bold text-text-dark">מפת האבחון החכמה (Drag & Drop)</h3>
                <div className="flex gap-3">
                    <button onClick={addNewSymptom} className="px-4 py-2 bg-gray-100 text-gray-700 rounded font-bold hover:bg-gray-200 border border-gray-300">+ סימפטום חדש</button>
                    <button onClick={addNewSpecialty} className="px-4 py-2 bg-gray-100 text-gray-700 rounded font-bold hover:bg-gray-200 border border-gray-300">+ התמחות חדשה</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow-md">שמור מיפוי</button>
                </div>
            </div>
            
            <div style={{ flexGrow: 1, height: '700px', border: '1px solid #eee', borderRadius: '12px', background: '#f8fafc' }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeDragStop={onNodeDragStop} // לוגיקת שיוך בעת סיום גרירה
                    onNodeContextMenu={onNodeContextMenu} // לכידת לחיצה ימנית
                    onPaneClick={onPaneClick} // סגירת תפריט
                    nodeTypes={nodeTypes}
                    fitView
                >
                    <Background color="#e2e8f0" gap={20} />
                    <Controls />
                </ReactFlow>
                
                {contextMenu && (
                    <ContextMenu
                        id={contextMenu.id}
                        type={contextMenu.type}
                        top={contextMenu.top}
                        left={contextMenu.left}
                        onClose={onPaneClick}
                        onDelete={handleDelete}
                        onDuplicate={handleDuplicate}
                    />
                )}
            </div>
            <p className="text-sm text-gray-500 mt-2 text-center">
                הסימפטומים הלא-משויכים נמצאים בצד שמאל. גרור אותם לתוך הקופסאות הצבעוניות. לחץ ימני על פתקית כדי לשכפל או למחוק.
            </p>
        </div>
    );
};

export default SymptomMapper;