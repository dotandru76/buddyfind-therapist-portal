// src/components/FlowBuilder.jsx - FINAL VERSION (All Imports Guaranteed)
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
const defaultViewport = { x: 0, y: 0, zoom: 0.6 }; 
const flowStyles = { height: '750px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' };

// ... (convertTreeToFlow function logic - נשאר זהה) ...
const convertTreeToFlow = (tree, initialData) => {
  const nodes = [];
  const edges = [];
  
  const positions = {
    start: { x: 50, y: 300 },
    targetEntity: { x: 500, y: 50 },
    audience: { x: 500, y: 450 },
    profession: { x: 900, y: 300 },
    symptoms: { x: 1400, y: 0 }, 
    preferences: { x: 1900, y: 0 },
    region: { x: 2300, y: 0 },
  };

  const addEdgeClean = (source, target, sourceHandle = null, label = '') => {
    edges.push({
      id: `e_${source}-${target}_${sourceHandle || 'def'}`,
      source, target, sourceHandle: sourceHandle ? String(sourceHandle) : null, label,
      type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#94a3b8', strokeWidth: 2 }
    });
  };

  const getOutputsForNode = (nodeId, nodeData) => {
    if (nodeData.optionsKey) {
        if (typeof nodeData.optionsKey === 'string') {
          const dataKey = nodeData.optionsKey; 
          if (initialData && initialData[dataKey]) {
            return initialData[dataKey].map(opt => ({ id: opt.id || opt.region_key, label: opt.name || opt.region_name_he }));
          }
          return [{ id: 'loading', label: 'טוען...' }];
        }
        if (typeof nodeData.optionsKey === 'function') {
          const dataKey = (nodeId === 'profession') ? 'professions' : 'symptoms';
          if (initialData && initialData[dataKey]) {
             return initialData[dataKey].map(opt => ({ id: opt.id || opt.search_key, label: opt.name }));
          }
          return [{ id: 'dynamic_output', label: '(תשובות דינמיות)' }];
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
        questionType: nodeData.type || 'single',
        outputs: getOutputsForNode(nodeId, nodeData),
        minVal: nodeData.min || 0,
        maxVal: nodeData.max || 120,
      }, 
      position: positions[nodeId] || { x: 100, y: 100 + nodes.length * 50 },
      type: 'questionNode',
    });
  }

  // --- חיבורים (למען תאימות) ---
  addEdgeClean('start', 'targetEntity', 2, 'נפש'); 
  initialData.mainCategories.forEach(c => { if (c.id !== 2) addEdgeClean('start', 'audience', c.id, c.name); });
  addEdgeClean('targetEntity', 'audience', 'individual');
  addEdgeClean('targetEntity', 'audience', 'couple');
  addEdgeClean('targetEntity', 'audience', 'family');
  addEdgeClean('targetEntity', 'audience', 'group');
  addEdgeClean('audience', 'profession', 'default');
  
  const preferencesNodeId = 'preferences';
  const regionNodeId = 'region';

  initialData.professions.forEach((prof) => {
      const profSymptoms = initialData.symptoms.filter(s => s.profession_id === prof.id).map(s => ({ id: s.search_key, label: s.name }));
      if (profSymptoms.length > 0) {
          const symNodeId = `symptoms_prof_${prof.id}`;
          addEdgeClean('profession', symNodeId, prof.id);
          addEdgeClean(symNodeId, preferencesNodeId, 'next');
      } else {
          addEdgeClean('profession', preferencesNodeId, prof.id, '(ללא סימפטומים)');
      }
  });

  addEdgeClean(preferencesNodeId, regionNodeId, 'next');

  return { initialNodes: nodes, initialEdges: edges };
};


// --- רכיב חלון העריכה (Inspector) ---
const NodeInspector = ({ node, setNodes, setEdges }) => {
    // ... (קוד חלון העריכה נשאר זהה) ...
  const [label, setLabel] = useState(node.data.label);
  const [questionType, setQuestionType] = useState(node.data.questionType || 'single');
  const [minVal, setMinVal] = useState(node.data.minVal || 0);
  const [maxVal, setMaxVal] = useState(node.data.maxVal || 100);
  const [outputs, setOutputs] = useState(node.data.outputs || []);

  useEffect(() => {
    setLabel(node.data.label);
    setQuestionType(node.data.questionType || 'single');
    setMinVal(node.data.minVal || 0);
    setMaxVal(node.data.maxVal || 100);
    setOutputs(node.data.outputs || []);
  }, [node]); 

  const updateNodeData = (key, value) => {
    setNodes(nds => nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, [key]: value } } : n));
  };

  const updateOutputLabel = (index, newLabel) => {
    const oldId = outputs[index].id; 
    const newOutputs = outputs.map((out, i) => i === index ? { ...out, label: newLabel } : out);
    setOutputs(newOutputs);
    setNodes(nds => nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, outputs: newOutputs } } : n));
    setEdges(eds => eds.map(e => {
        if (e.source === node.id && e.sourceHandle === String(oldId)) {
            return { ...e, label: newLabel }; 
        }
        return e;
    }));
  };
  
  const addOutput = () => {
    const newId = `opt_${Date.now()}`;
    const newOutput = { id: newId, label: 'אופציה חדשה' };
    const newOutputs = [...outputs, newOutput];
    setOutputs(newOutputs);
    updateNodeData('outputs', newOutputs);
  };
  
  const deleteOutput = (index) => {
    const outputToRemove = outputs[index];
    const newOutputs = outputs.filter((_, i) => i !== index);
    setOutputs(newOutputs);
    updateNodeData('outputs', newOutputs);
    setEdges(eds => eds.filter(e => !(e.source === node.id && e.sourceHandle === String(outputToRemove.id))));
  };

  return (
    <div style={{ width: '320px', background: 'white', borderRight: '1px solid #e5e7eb', padding: '24px', direction: 'rtl', textAlign: 'right', overflowY: 'auto', boxShadow: '-4px 0 15px rgba(0,0,0,0.05)', zIndex: 10 }}>
      <h4 style={{ fontWeight: '800', fontSize: '18px', color: '#1e293b', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>הגדרות שאלה</h4>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>נוסח השאלה</label>
        <textarea value={label} onChange={(e) => { setLabel(e.target.value); updateNodeData('label', e.target.value); }} rows={2} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', fontSize: '14px', resize: 'none', outline: 'none' }} />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>סוג השאלה</label>
        <select value={questionType} onChange={(e) => { setQuestionType(e.target.value); updateNodeData('questionType', e.target.value); }} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px', fontSize: '14px', background: 'white' }}>
            <option value="single">בחירה יחידה (Single Choice)</option>
            <option value="multiple">בחירה מרובה (Multiple Choice)</option>
            <option value="slider">סליידר / טווח (Slider)</option>
        </select>
      </div>

      {questionType === 'slider' && (
          <div style={{ marginBottom: '20px', padding: '10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#166534', marginBottom: '10px' }}>טווח ערכים</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                  <div><span style={{ fontSize: '11px' }}>מינימום</span><input type="number" value={minVal} onChange={(e) => { setMinVal(e.target.value); updateNodeData('minVal', e.target.value); }} style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }} /></div>
                  <div><span style={{ fontSize: '11px' }}>מקסימום</span><input type="number" value={maxVal} onChange={(e) => { setMaxVal(e.target.value); updateNodeData('maxVal', e.target.value); }} style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }} /></div>
              </div>
          </div>
      )}

      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '10px' }}>
            {questionType === 'slider' ? 'יציאה (לשלב הבא)' : 'תשובות / יציאות'}
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {outputs.map((output, index) => (
            <div key={output.id || index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ background: '#f1f5f9', padding: '6px', borderRadius: '6px', flexGrow: 1 }}>
                  <input type="text" value={output.label} onChange={(e) => updateOutputLabel(index, e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '13px', outline: 'none' }} />
              </div>
              {questionType !== 'slider' && (
                  <button onClick={() => deleteOutput(index)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>✕</button>
              )}
            </div>
          ))}
        </div>
        {questionType !== 'slider' && (
            <button onClick={addOutput} style={{ width: '100%', marginTop: '15px', padding: '10px', background: '#eff6ff', color: '#3b82f6', border: '1px dashed #3b82f6', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>+ הוסף תשובה</button>
        )}
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
            const res = await fetch(`${API_URL}/api/admin/data/all-definitions`, { credentials: 'include' });
            if (res.status === 401 || res.status === 403) { onLogout(); return; }
            const data = await res.json();
            setInitialData(data);
        } catch (err) { console.error(err); }
    };
    fetchInitialData();
  }, [API_URL, onLogout]);

  useEffect(() => {
    if (!initialData) return;

    const loadFlow = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/flow`, { credentials: 'include' });
            if (res.ok) {
                const savedFlow = await res.json();
                if (savedFlow && savedFlow.nodes && savedFlow.nodes.length > 0) {
                    setNodes(savedFlow.nodes);
                    setEdges(savedFlow.edges);
                    const maxId = savedFlow.nodes.reduce((max, node) => {
                        const idNum = parseInt(node.id.replace('new_', ''));
                        return !isNaN(idNum) && idNum > max ? idNum : max;
                    }, 0);
                    setNodeId(maxId + 100);
                    return;
                }
            }
        } catch (e) {
            console.error("Failed to load flow:", e);
        }

        // Fallback: יצירה מהתחלה
        const { initialNodes, initialEdges } = convertTreeToFlow(questionsTree, initialData);
        setNodes(initialNodes);
        setEdges(initialEdges);
        setNodeId(initialNodes.length + 1);
    };

    loadFlow();
  }, [initialData]); 

  const onNodeClick = (event, node) => setSelectedNode(node);
  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), [setNodes]);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), [setEdges]);
  
  const onNodesDelete = useCallback((deleted) => {
      setEdges((eds) => deleted.reduce((acc, node) => acc.filter((edge) => edge.source !== node.id && edge.target !== node.id), eds));
      if (deleted.find(n => n.id === selectedNode?.id)) setSelectedNode(null);
  }, [selectedNode]);
  
  const onConnect = useCallback((connection) => {
      const sourceNode = nodes.find(n => n.id === connection.source);
      const sourceHandleLabel = sourceNode.data.outputs.find(o => String(o.id) === connection.sourceHandle)?.label || '';
      const newEdge = { 
        ...connection, 
        label: sourceHandleLabel, 
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
        questionType: 'single', 
        outputs: [{ id: 'opt1', label: 'כן' }, { id: 'opt2', label: 'לא' }],
      },
      position: { x: 50, y: 50 },
      type: 'questionNode'
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeId(nodeId + 1);
  };
  
  const onSave = async () => {
    const cleanNodes = nodes.map(n => ({ id: n.id, data: n.data, position: n.position, type: n.type }));
    const flowData = {
      nodes: cleanNodes,
      edges: edges.map(e => ({ id: e.id, source: e.source, sourceHandle: e.sourceHandle, target: e.target, label: e.label })),
    };

    try {
        const res = await fetch(`${API_URL}/api/admin/flow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(flowData)
        });
        
        if (!res.ok) throw new Error('שגיאה בשמירה בשרת');
        
        alert('התרשים נשמר בהצלחה בשרת!');
    } catch (err) {
        console.error(err);
        alert('שגיאה בשמירת התרשים: ' + err.message);
    }
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