// src/components/FlowBuilder.jsx - v17 (Type Selection & Clean Lines)
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
const defaultViewport = { x: 0, y: 0, zoom: 0.85 };
const flowStyles = { height: '750px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' };

// --- פונקציית המרה ---
const convertTreeToFlow = (tree, initialData) => {
  const nodes = [];
  const edges = [];
  
  // מיקומים
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
    if (nodeData.optionsKey) {
        if (typeof nodeData.optionsKey === 'string') {
          const dataKey = nodeData.optionsKey;
          if (initialData && initialData[dataKey]) {
            return initialData[dataKey].map(opt => ({
              id: opt.id || opt.region_key, 
              label: opt.name || opt.region_name_he
            }));
          }
        }
        if (typeof nodeData.optionsKey === 'function') {
          if (nodeId === 'profession' && initialData?.professions) {
              return initialData.professions.map(p => ({ id: p.id, label: p.name }));
          }
          if (nodeId === 'symptoms' && initialData?.symptoms) {
              return initialData.symptoms.slice(0, 15).map(s => ({ id: s.search_key, label: s.name })).concat([{ id: 'more', label: '...ועוד' }]);
          }
          return [{ id: 'dynamic', label: '(תלוי בחירה קודמת)' }];
        }
    }
    if (nodeData.options) {
      return nodeData.options.map(opt => ({ id: opt.value, label: opt.label }));
    }
    return [{ id: 'default', label: 'המשך' }];
  };

  for (const [nodeId, nodeData] of Object.entries(tree)) {
    nodes.push({
      id: nodeId,
      data: { 
        label: nodeData.text,
        questionType: nodeData.type || 'single', // <-- הוספת סוג השאלה
        outputs: getOutputsForNode(nodeId, nodeData),
      }, 
      position: positions[nodeId] || { x: 100, y: 100 + nodes.length * 50 },
      type: 'questionNode',
    });
  }

  // --- יצירת חיצים (נקיים, בלי צבעים מבלבלים) ---
  const addEdgeClean = (id, source, sourceHandle, target, label = '') => {
      edges.push({
        id, source, sourceHandle, target, label,
        type: 'smoothstep', // קווים מעוגלים יפים
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#94a3b8', strokeWidth: 2 } // צבע אפור אחיד
      });
  };

  addEdgeClean('e1', 'start', 2, 'targetEntity', 'נפש');
  addEdgeClean('e2', 'start', 1, 'audience', 'גוף');
  
  // ... (חיבור שאר הקווים בצורה דומה ללא לוגיקה מסובכת כרגע) ...
  // אנו מוסיפים חיבורים גנריים כדי שהתרשים ייראה מלא
  addEdgeClean('e3', 'targetEntity', 'individual', 'audience');
  addEdgeClean('e4', 'audience', 'default', 'profession');
  addEdgeClean('e5', 'profession', 'default', 'symptoms');
  addEdgeClean('e6', 'symptoms', 'default', 'preferences');
  addEdgeClean('e7', 'preferences', 'is_accessible', 'region');

  return { initialNodes: nodes, initialEdges: edges };
};


// --- רכיב חלון העריכה המשודרג ---
const NodeInspector = ({ node, setNodes, setEdges }) => {
  const [label, setLabel] = useState(node.data.label);
  const [questionType, setQuestionType] = useState(node.data.questionType || 'single'); // <-- סטייט לסוג
  const [outputs, setOutputs] = useState(node.data.outputs || []);

  useEffect(() => {
    setLabel(node.data.label);
    setQuestionType(node.data.questionType || 'single');
    setOutputs(node.data.outputs || []);
  }, [node]); 

  // עדכון נתונים כללי
  const updateNodeData = (key, value) => {
    setNodes(nds => nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, [key]: value } } : n));
  };

  // עדכון שם של תשובה
  const updateOutputLabel = (index, newLabel) => {
    const newOutputs = [...outputs];
    newOutputs[index] = { ...newOutputs[index], label: newLabel };
    setOutputs(newOutputs);
    updateNodeData('outputs', newOutputs);
  };
  
  const addOutput = () => {
    const newId = `opt_${Date.now()}`;
    const newOutputs = [...outputs, { id: newId, label: 'אופציה חדשה' }];
    setOutputs(newOutputs);
    updateNodeData('outputs', newOutputs);
  };
  
  const deleteOutput = (index) => {
    const newOutputs = outputs.filter((_, i) => i !== index);
    setOutputs(newOutputs);
    updateNodeData('outputs', newOutputs);
  };

  return (
    <div style={{ width: '320px', background: 'white', borderRight: '1px solid #e5e7eb', padding: '24px', direction: 'rtl', textAlign: 'right', overflowY: 'auto', boxShadow: '-4px 0 15px rgba(0,0,0,0.05)', zIndex: 10 }}>
      <h4 style={{ fontWeight: '800', fontSize: '18px', color: '#1e293b', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
        הגדרות שאלה
      </h4>
      
      {/* שדה טקסט השאלה */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>נוסח השאלה</label>
        <textarea
          value={label}
          onChange={(e) => { setLabel(e.target.value); updateNodeData('label', e.target.value); }}
          rows={2}
          style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', fontSize: '14px', resize: 'none', outline: 'none', transition: 'border 0.2s' }}
        />
      </div>

      {/* --- בחירת סוג השאלה --- */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>סוג השאלה</label>
        <select
            value={questionType}
            onChange={(e) => { setQuestionType(e.target.value); updateNodeData('questionType', e.target.value); }}
            style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px', fontSize: '14px', background: 'white' }}
        >
            <option value="single">בחירה יחידה (Single Choice)</option>
            <option value="multiple">בחירה מרובה (Multiple Choice)</option>
            <option value="slider">סליידר / טווח (Slider)</option>
        </select>
        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            {questionType === 'single' && 'המשתמש בוחר תשובה אחת שקובעת את המשך המסלול.'}
            {questionType === 'multiple' && 'המשתמש יכול לסמן מספר אפשרויות (למשל סימפטומים).'}
            {questionType === 'slider' && 'המשתמש בוחר ערך מספרי על סקאלה (למשל גיל).'}
        </p>
      </div>

      {/* ניהול תשובות */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '10px' }}>
            תשובות / יציאות
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {outputs.map((output, index) => (
            <div key={output.id || index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ background: '#f1f5f9', padding: '6px', borderRadius: '6px', flexGrow: 1 }}>
                  <input
                    type="text"
                    value={output.label}
                    onChange={(e) => updateOutputLabel(index, e.target.value)}
                    style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '13px', outline: 'none' }}
                  />
              </div>
              <button 
                onClick={() => deleteOutput(index)} 
                style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', transition: 'background 0.2s' }}
                title="מחק תשובה"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button 
            onClick={addOutput} 
            style={{ width: '100%', marginTop: '15px', padding: '10px', background: '#eff6ff', color: '#3b82f6', border: '1px dashed #3b82f6', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}
        >
          + הוסף תשובה חדשה
        </button>
      </div>
    </div>
  );
};


// --- FlowBuilderWrapper ---
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

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), [setNodes]);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), [setEdges]);
  
  const onNodesDelete = useCallback((deleted) => {
      setEdges((eds) => deleted.reduce((acc, node) => acc.filter((edge) => edge.source !== node.id && edge.target !== node.id), eds));
      if (deleted.find(n => n.id === selectedNode?.id)) setSelectedNode(null);
  }, [selectedNode]);
  
  const onConnect = useCallback((connection) => {
      const sourceNode = nodes.find(n => n.id === connection.source);
      const sourceHandleLabel = sourceNode.data.outputs.find(o => o.id === connection.sourceHandle)?.label || '';
      const newEdge = { 
        ...connection, 
        label: sourceHandleLabel, // מציג את שם התשובה על החץ
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#94a3b8', strokeWidth: 2 }
      };
      setEdges((eds) => addEdge(newEdge, eds))
    }, [nodes]);

  const addNode = () => {
    const newId = `new_${nodeId}`;
    const newNode = {
      id: newId,
      data: { 
        label: `שאלה חדשה ${nodeId}`,
        questionType: 'single', // ברירת מחדל
        outputs: [{ id: 'opt1', label: 'כן' }, { id: 'opt2', label: 'לא' }],
      },
      position: { x: 50, y: 50 },
      type: 'questionNode'
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeId(nodeId + 1);
  };
  
  const onSave = () => {
    const flowData = {
      nodes: nodes.map(n => ({ id: n.id, data: n.data, position: n.position, type: n.type })),
      edges: edges.map(e => ({ id: e.id, source: e.source, sourceHandle: e.sourceHandle, target: e.target, label: e.label })),
    };
    console.log('[DEBUG] Saving Flow JSON:', JSON.stringify(flowData, null, 2));
    alert('תרשים נשמר (ראה Console). בשלב הבא נחבר את זה ל-DB.');
  };

  if (!initialData) return <div className="p-10 text-center text-gray-500">טוען...</div>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
        <h3 className="text-xl font-bold text-gray-800">עורך שאלון האבחון</h3>
        <div className="flex gap-3">
            <button onClick={addNode} className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-bold hover:bg-green-100 transition border border-green-200">+ שאלה חדשה</button>
            <button onClick={onSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow-sm">שמור שינויים</button>
        </div>
      </div>

      <div className="flex-grow flex relative" style={{ minHeight: '600px' }}>
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
          >
            <Controls />
            <Background color="#cbd5e1" gap={20} />
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