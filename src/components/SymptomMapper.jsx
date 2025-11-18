// src/components/SymptomMapper.jsx - v3 (Boxes & Pills)
import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  NodeResizer 
} from 'reactflow';
import 'reactflow/dist/style.css';

const LoadingSpinner = () => ( <div className="text-center p-5"><div className="spinner w-8 h-8 mx-auto border-t-primary-blue border-r-primary-blue"></div></div> );

// --- 1. צומת התמחות (הקופסה) ---
const SpecialtyBoxNode = ({ data, selected }) => {
  return (
    <div style={{ 
        width: '100%', height: '100%', 
        backgroundColor: data.color || '#e0f2fe', 
        border: selected ? '2px solid #2563EB' : '1px solid #94a3b8',
        borderRadius: '12px', 
        padding: '10px',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
    }}>
      <NodeResizer minWidth={200} minHeight={100} isVisible={selected} />
      <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b', marginBottom: '5px', textAlign: 'center' }}>
        {data.label}
      </div>
      {/* אזור גרירה מסומן */}
      <div style={{ flexGrow: 1, fontSize: '10px', color: '#64748b', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #cbd5e1', borderRadius: '8px', background: 'rgba(255,255,255,0.4)' }}>
        גרור סימפטומים לכאן
      </div>
    </div>
  );
};

// --- 2. צומת סימפטום (הפתקית) ---
const SymptomPillNode = ({ data }) => (
  <div style={{ 
      background: 'white', border: '1px solid #cbd5e1', borderRadius: '20px', 
      padding: '4px 12px', fontSize: '12px', textAlign: 'center', fontWeight: '500',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)', cursor: 'grab', minWidth: '80px'
  }}>
    {data.label}
  </div>
);

const nodeTypes = { specialtyBox: SpecialtyBoxNode, symptomPill: SymptomPillNode };

const SymptomMapper = ({ API_URL, onLogout }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]); 
    const [loading, setLoading] = useState(true);
    
    const colors = ['#dbeafe', '#dcfce7', '#fef9c3', '#fee2e2', '#f3e8ff', '#ffedd5'];

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
                const maps = await mapsRes.json(); // [{symptom_id, specialty_id}]
                
                const initialNodes = [];
                
                // 2. יצירת קופסאות (התמחויות) - מסודרות בגריד
                defs.specialties.forEach((spec, index) => {
                    initialNodes.push({
                        id: `spec-${spec.id}`,
                        type: 'specialtyBox',
                        data: { label: spec.name, color: colors[index % colors.length] },
                        position: { x: (index % 3) * 320, y: Math.floor(index / 3) * 250 },
                        style: { width: 280, height: 200 }, 
                        zIndex: 0
                    });
                });

                // 3. יצירת פתקיות (סימפטומים)
                defs.symptoms.forEach((sym, index) => {
                    const mapping = maps.find(m => m.symptom_id === sym.id);
                    let parentNode = mapping ? `spec-${mapping.specialty_id}` : null;
                    
                    let position = { x: 0, y: 0 }; 
                    if (!parentNode) {
                        // לא משויך: שים בצד ימין ברשימה
                        position = { x: -200, y: index * 40 }; 
                    } else {
                        // משויך: מיקום יחסי בתוך ההורה
                        position = { x: 20, y: 40 + (index % 5) * 30 };
                    }

                    initialNodes.push({
                        id: `sym-${sym.id}`,
                        type: 'symptomPill',
                        data: { label: sym.name, id: sym.id },
                        position: position,
                        parentNode: parentNode, // שיוך להורה
                        extent: parentNode ? 'parent' : undefined, 
                        zIndex: 10
                    });
                });

                setNodes(initialNodes);

            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchData();
    }, [API_URL, onLogout]);

    const handleSave = async () => {
        // המרת המבנה הגרפי (מי בתוך מי) למבנה מסד נתונים
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
            if (res.ok) alert('המיפוי נשמר בהצלחה!');
        } catch (err) { alert('שגיאה בשמירה'); }
    };

    const addNewItem = () => {
        alert('כדי להוסיף סימפטום או התמחות חדשה, השתמש במסך "ניהול נתונים (CMS)".');
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="bg-white p-6 rounded-lg shadow h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h3 className="text-2xl font-bold text-text-dark">מפת האבחון החכמה (Drag & Drop)</h3>
                <div className="flex gap-3">
                    <button onClick={addNewItem} className="px-4 py-2 bg-gray-100 text-gray-700 rounded font-bold hover:bg-gray-200 border border-gray-300">+ הוסף חדש</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow-md">שמור שינויים</button>
                </div>
            </div>
            
            <div style={{ flexGrow: 1, height: '700px', border: '1px solid #eee', borderRadius: '12px', background: '#f8fafc' }}>
                <ReactFlow
                    nodes={nodes}
                    edges={[]} // בלי קווים!
                    onNodesChange={onNodesChange}
                    nodeTypes={nodeTypes}
                    fitView
                >
                    <Background color="#e2e8f0" gap={20} />
                    <Controls />
                </ReactFlow>
            </div>
            <p className="text-sm text-gray-500 mt-2 text-center">
                הסימפטומים הלא-משויכים נמצאים בצד שמאל. גרור אותם לתוך הקופסאות הצבעוניות כדי לשייך.
            </p>
        </div>
    );
};

export default SymptomMapper;