// src/components/FlowBuilder.jsx - V21.0 (Full Studio Mode - Edge to Edge)
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
// זום ברירת מחדל ומיקום התחלתי ממורכז יותר
const defaultViewport = { x: 0, y: 0, zoom: 0.7 }; 

// --- פונקציית המרה (לוגיקה לטעינת ברירת מחדל) ---
const convertTreeToFlow = (tree, initialData) => {
  const nodes = [];
  const edges = [];
  
  // ריווח גדול יותר בין האלמנטים
  const positions = {
    start: { x: 100, y: 300 },
    targetEntity: { x: 600, y: 50 },
    audience: { x: 600, y: 500 },
    profession: { x: 1100, y: 300 },
    symptoms: { x: 1600, y: 50 }, 
    preferences: { x: 2100, y: 300 },
    region: { x: 2600, y: 300 },
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

  addEdgeClean('start', 'targetEntity', 2, 'נפש'); 
  if(initialData.mainCategories) initialData.mainCategories.forEach(c => { if (c.id !== 2) addEdgeClean('start', 'audience', c.id, c.name); });
  addEdgeClean('targetEntity', 'audience', 'individual');
  addEdgeClean('targetEntity', 'audience', 'couple');
  addEdgeClean('targetEntity', 'audience', 'family');
  addEdgeClean('targetEntity', 'audience', 'group');
  addEdgeClean('audience', 'profession', 'default');
  
  if(initialData.professions) {
      initialData.professions.forEach((prof) => {
          const profSymptoms = initialData.symptoms.filter(s => s.profession_id === prof.id);
          if (profSymptoms.length > 0) {
              const symNodeId = `symptoms_prof_${prof.id}`;
              addEdgeClean('profession', symNodeId, prof.id);
              addEdgeClean(symNodeId, 'preferences', 'next');
          } else {
              addEdgeClean('profession', 'preferences', prof.id, '(ללא סימפטומים)');
          }
      });
  }
  addEdgeClean('preferences', 'region', 'next');

  return { initialNodes: nodes, initialEdges: edges };
};

// --- רכיב חלון העריכה (Inspector) - סרגל צד ---
const NodeInspector = ({ node, setNodes, setEdges, onClose }) => {
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
    updateNodeData('outputs', newOutputs);
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
    <div className="flex flex-col w-80 bg-white border-r border-gray-200 h-full shadow-xl z-20">
      <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
          <h4 className="font-bold text-lg text-gray-800">עריכת שאלה</h4>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 text-2xl leading-none">&times;</button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">נוסח השאלה</label>
            <textarea value={label} onChange={(e) => { setLabel(e.target.value); updateNodeData('label', e.target.value); }} rows={3} className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">סוג השאלה</label>
            <select value={questionType} onChange={(e) => { setQuestionType(e.target.value); updateNodeData('questionType', e.target.value); }} className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="single">בחירה יחידה (Single Choice)</option>
                <option value="multiple">בחירה מרובה (Multiple Choice)</option>
                <option value="slider">סליידר / טווח (Slider)</option>
            </select>
          </div>

          {questionType === 'slider' && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <label className="block text-sm font-semibold text-green-800 mb-2">טווח ערכים</label>
                  <div className="flex gap-2">
                      <div><span className="text-xs text-green-700">מינימום</span><input type="number" value={minVal} onChange={(e) => { setMinVal(e.target.value); updateNodeData('minVal', e.target.value); }} className="w-full p-1 border rounded text-sm" /></div>
                      <div><span className="text-xs text-green-700">מקסימום</span><input type="number" value={maxVal} onChange={(e) => { setMaxVal(e.target.value); updateNodeData('maxVal', e.target.value); }} className="w-full p-1 border rounded text-sm" /></div>
                  </div>
              </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
                {questionType === 'slider' ? 'יציאה (לשלב הבא)' : 'תשובות / יציאות'}
            </label>
            <div className="space-y-2">
              {outputs.map((output, index) => (
                <div key={output.id || index} className="flex items-center gap-2">
                  <div className="flex-grow bg-gray-50 p-2 rounded border border-gray-200">
                      <input type="text" value={output.label} onChange={(e) => updateOutputLabel(index, e.target.value)} className="w-full bg-transparent border-none text-sm focus:outline-none" />
                  </div>
                  {questionType !== 'slider' && (
                      <button onClick={() => deleteOutput(index)} className="text-red-500 hover:bg-red-50 p-1 rounded">✕</button>
                  )}
                </div>
              ))}
            </div>
            {questionType !== 'slider' && (
                <button onClick={addOutput} className="w-full mt-3 py-2 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition">+ הוסף תשובה</button>
            )}
          </div>
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
        } catch (e) { console.error("Failed to load flow:", e); }

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
        type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#94a3b8', strokeWidth: 2 }
      };
      setEdges((eds) => addEdge(newEdge, eds))
    }, [nodes]);

  const addNode = () => {
    const newId = `new_${nodeId}`;
    const newNode = {
      id: newId,
      data: { 
        label: `שאלה חדשה`,
        questionType: 'single', 
        outputs: [{ id: 'opt1', label: 'כן' }, { id: 'opt2', label: 'לא' }],
      },
      position: { x: 100, y: 100 },
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
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(flowData)
        });
        if (!res.ok) throw new Error('שגיאה בשמירה בשרת');
        alert('התרשים נשמר בהצלחה!');
    } catch (err) { alert('שגיאה: ' + err.message); }
  };

  if (!initialData) return <div className="p-10 text-center text-gray-500">טוען...</div>;

  // --- התיקון הגדול: Layout מלא ללא שוליים ---
  return (
    <div className="flex flex-col w-full bg-white border-t border-gray-200" style={{ height: 'calc(100vh - 80px)' }}>
      {/* סרגל כלים עליון */}
      <div className="flex justify-between items-center px-6 py-3 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <h3 className="text-2xl font-bold text-gray-800">עורך שאלון (Studio Mode)</h3>
        <div className="flex gap-3">
            <button onClick={addNode} className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-bold hover:bg-green-100 transition border border-green-200">+ שאלה חדשה</button>
            <button onClick={onSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow-md">שמור שינויים</button>
        </div>
      </div>

      {/* אזור עבודה ראשי (Row) */}
      <div className="flex flex-grow overflow-hidden relative">
        
        {/* הקנבס - תופס את כל המקום שנשאר */}
        <div className="flex-grow h-full relative bg-gray-50">
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
            minZoom={0.1} maxZoom={2}
          >
            <Controls />
            <Background color="#cbd5e1" gap={25} size={1} />
          </ReactFlow>
        </div>
        
        {/* סרגל עריכה צדדי (מופיע רק כשלוחצים על שאלה) */}
        {selectedNode && (
          <NodeInspector 
            key={selectedNode.id} 
            node={selectedNode} 
            setNodes={setNodes} 
            setEdges={setEdges}
            onClose={() => setSelectedNode(null)}
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