// src/components/FlowBuilder.jsx - v16 (Better Dynamic Options)
import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css'; 

import { questionsTree } from '../constants/questionsTree.js';
import QuestionNode from './QuestionNode.jsx';

const nodeTypes = { questionNode: QuestionNode };
const defaultViewport = { x: 0, y: 0, zoom: 0.8 }; // זום החוצה קצת כדי לראות הכל
const flowStyles = { height: '750px', border: '1px solid #ddd', borderRadius: '8px', background: '#f8fafc' };

// --- פונקציית המרה משודרגת ---
const convertTreeToFlow = (tree, initialData) => {
  const nodes = [];
  const edges = [];
  
  // מיקומים מרווחים יותר
  const positions = {
    start: { x: 50, y: 250 },
    targetEntity: { x: 400, y: 50 },
    audience: { x: 400, y: 450 },
    profession: { x: 800, y: 250 },
    symptoms: { x: 1200, y: 50 },
    preferences: { x: 1200, y: 450 },
    region: { x: 1600, y: 250 },
  };

  const getOutputsForNode = (nodeId, nodeData) => {
    // לוגיקה חכמה יותר לטעינת אופציות
    if (nodeData.optionsKey) {
        // 1. אופציות סטטיות (כמו קטגוריות ראשיות, אזורים)
        if (typeof nodeData.optionsKey === 'string') {
          const dataKey = nodeData.optionsKey;
          if (initialData && initialData[dataKey]) {
            return initialData[dataKey].map(opt => ({
              id: opt.id || opt.region_key,
              label: opt.name || opt.region_name_he
            }));
          }
        }
        
        // 2. אופציות דינמיות (מקצועות, סימפטומים)
        if (typeof nodeData.optionsKey === 'function') {
          if (nodeId === 'profession' && initialData?.professions) {
              // הצג את כל המקצועות (במקום "דינמי")
              return initialData.professions.map(p => ({ id: p.id, label: p.name }));
          }
          if (nodeId === 'symptoms' && initialData?.symptoms) {
              // הצג את כל הסימפטומים (מקובצים או רשימה חלקית)
              // נציג מדגם כדי לא להעמיס, או את כולם אם הרשימה סבירה
              return initialData.symptoms.slice(0, 10).map(s => ({ id: s.search_key, label: s.name })).concat([{ id: 'more', label: '...ועוד סימפטומים' }]);
          }
          return [{ id: 'dynamic', label: '(תלוי בחירה קודמת)' }];
        }
    }
    
    // 3. אופציות מקודדות (רדיו/צ'קבוקס)
    if (nodeData.options) {
      return nodeData.options.map(opt => ({ id: opt.value, label: opt.label }));
    }
    
    // 4. ברירת מחדל (סליידר וכו')
    return [{ id: 'default', label: 'המשך' }];
  };

  for (const [nodeId, nodeData] of Object.entries(tree)) {
    nodes.push({
      id: nodeId,
      data: { 
        label: nodeData.text,
        outputs: getOutputsForNode(nodeId, nodeData),
      }, 
      position: positions[nodeId] || { x: 100, y: 100 + nodes.length * 50 },
      type: 'questionNode',
    });
  }

  // --- חיצים (Edges) ---
  // כאן אנחנו מחברים בצורה כללית יותר, כי הלוגיקה המלאה מורכבת
  
  // 1. מהתחלה לקטגוריות
  edges.push({ id: 'e1', source: 'start', target: 'targetEntity', label: 'אם תחום הנפש', sourceHandle: 2 }); 
  edges.push({ id: 'e2', source: 'start', target: 'audience', label: 'כל השאר', sourceHandle: 1 });

  // 2. מקהל יעד למקצוע
  edges.push({ id: 'e3', source: 'targetEntity', target: 'audience', sourceHandle: 'individual' });
  edges.push({ id: 'e4', source: 'audience', target: 'profession', sourceHandle: 'default' });

  // 3. ממקצוע לסימפטומים (ברירת מחדל)
  edges.push({ id: 'e5', source: 'profession', target: 'symptoms', label: 'רוב המקצועות', animated: true });
  
  // 4. דילוג על סימפטומים (למשל, עו"ס)
  edges.push({ id: 'e6', source: 'profession', target: 'preferences', label: 'מקצועות ללא סימפטומים', style: { stroke: '#f87171' } });

  // 5. המשך הזרם
  edges.push({ id: 'e7', source: 'symptoms', target: 'preferences', sourceHandle: 'default' });
  edges.push({ id: 'e8', source: 'preferences', target: 'region', sourceHandle: 'is_accessible' });

  return { initialNodes: nodes, initialEdges: edges };
};


// --- רכיב חלון העריכה (ללא שינוי מהותי, רק סגנון) ---
const NodeInspector = ({ node, setNodes, setEdges }) => {
  // ... (אותו קוד כמו קודם, העתק מהתשובה הקודמת אם צריך, או השאר את זה)
  // למען הקיצור אני משאיר את זה זהה לקוד הקודם שלך, הוא עובד מצוין.
  const [label, setLabel] = useState(node.data.label);
  const [outputs, setOutputs] = useState(node.data.outputs || []);

  useEffect(() => {
    setLabel(node.data.label);
    setOutputs(node.data.outputs || []);
  }, [node]); 

  const updateNodeLabel = () => {
    setNodes(nds => nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, label } } : n));
  };

  const updateOutputLabel = (index, newLabel) => {
    const oldId = outputs[index].id;
    const newOutputs = outputs.map((out, i) => i === index ? { ...out, label: newLabel } : out);
    setOutputs(newOutputs);
    
    setNodes(nds => nds.map(n => {
      if (n.id === node.id) {
        return { ...n, data: { ...n.data, outputs: newOutputs } };
      }
      return n;
    }));
  };
  
  const addOutput = () => {
    const newId = `output_${Date.now()}`;
    const newOutput = { id: newId, label: 'תשובה חדשה' };
    const newOutputs = [...outputs, newOutput];
    setOutputs(newOutputs);
    setNodes(nds => nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, outputs: newOutputs } } : n));
  };
  
  const deleteOutput = (indexToDelete) => {
    const outputToRemove = outputs[indexToDelete];
    const newOutputs = outputs.filter((_, i) => i !== indexToDelete);
    setOutputs(newOutputs);
    setNodes(nds => nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, outputs: newOutputs } } : n));
  };

  return (
    <div style={{ width: '300px', background: 'white', borderRight: '1px solid #e5e7eb', padding: '20px', direction: 'rtl', textAlign: 'right', overflowY: 'auto', boxShadow: '-2px 0 5px rgba(0,0,0,0.05)' }}>
      <h4 style={{ fontWeight: 'bold', fontSize: '16px', color: '#111827', marginBottom: '15px' }}>עריכת שאלה</h4>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>טקסט השאלה</label>
        <textarea
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={updateNodeLabel} 
          rows={3}
          style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '8px', fontSize: '14px' }}
        />
      </div>
      
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '10px' }}>תשובות (יציאות)</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {outputs.map((output, index) => (
            <div key={output.id || index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={output.label}
                onChange={(e) => updateOutputLabel(index, e.target.value)}
                style={{ flexGrow: 1, border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', fontSize: '13px' }}
              />
              <button 
                onClick={() => deleteOutput(index)} 
                style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}
                title="מחק תשובה"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button 
            onClick={addOutput} 
            style={{ width: '100%', marginTop: '12px', padding: '8px', background: '#eff6ff', color: '#3b82f6', border: '1px dashed #3b82f6', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
        >
          + הוסף תשובה חדשה
        </button>
      </div>
    </div>
  );
};


// --- עטיפה ל-FlowBuilder ---
const FlowBuilderWrapper = ({ API_URL, onLogout }) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [nodeId, setNodeId] = useState(1); 
  const [selectedNode, setSelectedNode] = useState(null);
  const [initialData, setInitialData] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/data/all-definitions`, { 
                credentials: 'include' 
            });
            if (res.status === 401 || res.status === 403) { onLogout(); return; }
            if (!res.ok) throw new Error('Failed to fetch initial data');
            const data = await res.json();
            setInitialData(data);
        } catch (err) {
            console.error("Error fetching initial data:", err);
        }
    };
    fetchInitialData();
  }, [API_URL, onLogout]);

  useEffect(() => {
    if (initialData) {
      const { initialNodes, initialEdges } = convertTreeToFlow(questionsTree, initialData);
      setNodes(initialNodes);
      setEdges(initialEdges);
      setNodeId(initialNodes.length + 1);
    }
  }, [initialData]); 

  const onNodeClick = (event, node) => {
    setSelectedNode(node);
  };

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  
  const onEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => applyEdgeChanges(changes, eds))
    },
    [setEdges]
  );
  
  const onNodesDelete = useCallback(
    (deleted) => {
      setEdges((eds) =>
        deleted.reduce((acc, node) => {
          return acc.filter((edge) => edge.source !== node.id && edge.target !== node.id);
        }, eds)
      );
    },
    [setNodes, setEdges]
  );
  
  const onConnect = useCallback(
    (connection) => {
      const sourceNode = nodes.find(n => n.id === connection.source);
      const sourceHandleLabel = sourceNode.data.outputs.find(o => o.id === connection.sourceHandle)?.label || '';
      
      const newEdge = { 
        ...connection, 
        labelText: sourceHandleLabel ? `מ-'${sourceHandleLabel}'` : '',
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 2 }
      };
      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges, nodes]
  );

  const addNode = () => {
    const newId = `new_${nodeId}`;
    const newNode = {
      id: newId,
      data: { 
        label: `שאלה חדשה ${nodeId}`,
        outputs: [{ id: 'default', label: 'תשובה 1' }],
      },
      position: { x: 50, y: 50 },
      type: 'questionNode'
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeId(nodeId + 1);
  };
  
  const onSave = () => {
    const cleanNodes = nodes.map(n => ({ ...n }));
    const flowData = {
      nodes: cleanNodes,
      edges: edges.map(e => ({ id: e.id, source: e.source, sourceHandle: e.sourceHandle, target: e.target, labelText: e.labelText })),
    };
    console.log('[DEBUG] שמירת תרשים:', JSON.stringify(flowData, null, 2));
    alert('מבנה התרשים נשמר (בדוק ב-Console)');
  };

  if (!initialData) {
      return (
          <div className="bg-white p-6 md:p-8 rounded-lg shadow w-full mx-auto text-center">
              <div className="spinner w-8 h-8 mx-auto border-t-primary-blue border-r-primary-blue"></div>
              <p className="mt-2 text-gray-500">טוען נתוני שאלון...</p>
          </div>
      );
  }

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow w-full mx-auto text-right">
      <h3 className="text-2xl font-bold text-text-dark mb-4 border-b pb-3">
        עורך שאלון האבחון (Drag & Drop)
      </h3>

      <div className="mb-4 flex gap-4">
        <button
          onClick={addNode}
          className="py-2 px-4 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition shadow-sm"
        >
          + הוסף שאלה חדשה
        </button>
        <button
          onClick={onSave}
          className="py-2 px-4 bg-primary-blue text-white rounded-lg text-sm font-semibold hover:bg-secondary-purple transition shadow-sm"
        >
          שמור תרשים
        </button>
      </div>

      <div style={{ display: 'flex', height: '750px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ flexGrow: 1, ...flowStyles }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodesDelete={onNodesDelete} 
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            defaultViewport={defaultViewport}
            onNodeClick={onNodeClick}
            onPaneClick={() => setSelectedNode(null)} 
            deleteKeyCode={['Backspace', 'Delete']} 
            fitView
          >
            <Controls />
            <Background color="#f1f5f9" gap={16} />
          </ReactFlow>
        </div>
        
        {selectedNode && (
          <NodeInspector 
            key={selectedNode.id} 
            node={selectedNode} 
            setNodes={setNodes} 
            setEdges={setEdges}
          />
        )}
      </div>
    </div>
  );
}

export default ({ API_URL, onLogout }) => (
  <ReactFlowProvider>
    <FlowBuilderWrapper API_URL={API_URL} onLogout={onLogout} />
  </ReactFlowProvider>
);