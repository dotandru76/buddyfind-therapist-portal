// src/components/SymptomMapper.jsx
import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  MarkerType,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import LoadingSpinner from './LoadingSpinner';

// --- סגנון המלבנים הפשוטים ---
const simpleNodeStyle = {
    background: 'white',
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '8px',
    fontSize: '12px',
    width: 180,
    textAlign: 'center'
};

// צומת סימפטום (יציאה בלבד מימין)
const SymptomNode = ({ data }) => (
    <div style={{ ...simpleNodeStyle, borderLeft: '4px solid #f87171' }}>
        {data.label}
        <Handle type="source" position={Position.Right} style={{ background: '#f87171' }} />
    </div>
);

// צומת התמחות (כניסה בלבד משמאל)
const SpecialtyNode = ({ data }) => (
    <div style={{ ...simpleNodeStyle, borderRight: '4px solid #60a5fa' }}>
        <Handle type="target" position={Position.Left} style={{ background: '#60a5fa' }} />
        {data.label}
    </div>
);

const nodeTypes = { symptom: SymptomNode, specialty: SpecialtyNode };


const SymptomMapper = ({ API_URL, onLogout }) => {
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // טעינת נתונים
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. טעינת הגדרות (סימפטומים והתמחויות)
                const defsRes = await fetch(`${API_URL}/api/admin/data/all-definitions`, { credentials: 'include' });
                if (defsRes.status === 401) { onLogout(); return; }
                const definitions = await defsRes.json();

                // 2. טעינת המיפוי הקיים
                const mapsRes = await fetch(`${API_URL}/api/admin/mappings`, { credentials: 'include' });
                const mappings = await mapsRes.json();

                // --- בניית התרשים ---
                const initialNodes = [];
                
                // עמודת סימפטומים (שמאל)
                definitions.symptoms.forEach((sym, index) => {
                    initialNodes.push({
                        id: `sym-${sym.id}`,
                        type: 'symptom',
                        data: { label: sym.name, id: sym.id },
                        position: { x: 50, y: index * 60 + 50 }
                    });
                });

                // עמודת התמחויות (ימין)
                definitions.specialties.forEach((spec, index) => {
                    initialNodes.push({
                        id: `spec-${spec.id}`,
                        type: 'specialty',
                        data: { label: spec.name, id: spec.id },
                        position: { x: 600, y: index * 60 + 50 }
                    });
                });

                // בניית הקווים מהמיפוי הקיים
                const initialEdges = mappings.map((m, i) => ({
                    id: `e-${m.symptom_id}-${m.specialty_id}`,
                    source: `sym-${m.symptom_id}`,
                    target: `spec-${m.specialty_id}`,
                    type: 'smoothstep',
                    markerEnd: { type: MarkerType.ArrowClosed },
                    style: { stroke: '#94a3b8' }
                }));

                setNodes(initialNodes);
                setEdges(initialEdges);

            } catch (err) {
                console.error(err);
                alert('שגיאה בטעינת נתונים');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [API_URL, onLogout]);

    // --- פונקציות React Flow ---
    const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
    const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
    const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }, eds)), []);

    // --- שמירה ---
    const handleSave = async () => {
        // המרת הקווים חזרה לפורמט של המסד נתונים
        const mappings = edges.map(edge => {
            const symptomId = parseInt(edge.source.replace('sym-', ''));
            const specialtyId = parseInt(edge.target.replace('spec-', ''));
            return { symptom_id: symptomId, specialty_id: specialtyId };
        });

        try {
            const res = await fetch(`${API_URL}/api/admin/mappings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ mappings })
            });
            if (res.ok) {
                alert('המיפוי נשמר בהצלחה!');
            } else {
                throw new Error('שגיאה בשמירה');
            }
        } catch (err) {
            alert('נכשל בשמירה');
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="bg-white p-6 rounded-lg shadow h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h3 className="text-2xl font-bold text-text-dark">עורך מיפוי אבחון (סימפטום -> התמחות)</h3>
                <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">שמור מיפוי</button>
            </div>
            <div style={{ flexGrow: 1, height: '700px', border: '1px solid #eee', borderRadius: '8px' }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    fitView
                >
                    <Background />
                    <Controls />
                </ReactFlow>
            </div>
            <p className="text-sm text-gray-500 mt-2 text-center">
                גרור קו מסימפטום (אדום) להתמחות מתאימה (כחול). זהו ה"מוח" שמחליט איזה מטפל מתאים לאיזו בעיה.
            </p>
        </div>
    );
};

export default SymptomMapper;