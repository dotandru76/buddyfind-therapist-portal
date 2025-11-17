// src/components/FlowBuilder.jsx - v9 (Fetches real data)
import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css'; 

import { questionsTree } from '../constants/questionsTree.js';
import QuestionNode from './QuestionNode.jsx';

const nodeTypes = { questionNode: QuestionNode };
const defaultViewport = { x: 0, y: 0, zoom: 1 };
const flowStyles = { height: '700px', border: '1px solid #ddd', borderRadius: '8px', background: '#fefefe' };

// --- פונקציית המרה משודרגת (מקבלת initialData) ---
const convertTreeToFlow = (tree, initialData) => {
  const nodes = [];
  const edges = [];
  
  const positions = {
    start: { x: 50, y: 200 },
    targetEntity: { x: 300, y: 100 },
    audience: { x: 300, y: 300 },
    profession: { x: 550, y: 200 },
    symptoms: { x: 800, y: 100 },
    preferences: { x: 800, y: 300 },
    region: { x: 1050, y: 200 },
  };

  const getOutputsForNode = (nodeId, nodeData) => {
    // --- !!! התיקון: קורא את התשובות האמיתיות מה-initialData !!! ---
    if (nodeData.optionsKey) {
        // המרה של פונקציה (כמו ב-profession)
        if (typeof nodeData.optionsKey === 'function') {
            // הדמיה של answers ריק, רק כדי לקבל את רשימת המקצועות
            const mockAnswers = { mainCategory: 2 }; // (דוגמה)
            return nodeData.optionsKey(mockAnswers, initialData)
                           .map(opt => ({ id: opt.value, label: opt.label }));
        }
        // המרה של מפתח פשוט (כמו 'mainCategories')
        return (initialData[nodeData.optionsKey] || []).map(opt => ({ id: opt.id || opt.region_key, label: opt.name || opt.region_name_he }));
    }
    // המרה של תשובות סטטיות (כמו targetEntity)
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
        outputs: getOutputsForNode(nodeId, nodeData),
      }, 
      position: positions[nodeId] || { x: 100, y: 100 + nodes.length * 50 },
      type: 'questionNode',
    });
  }

  // יצירת החיצים (Edges)
  edges.push({
    id: 'start-to-targetEntity', source: 'start', sourceHandle: 2, target: 'targetEntity', 
    labelText: "טיפולים רגשיים...", markerEnd: { type: MarkerType.ArrowClosed },
  });
  edges.push({
    id: 'start-to-audience', source: 'start', sourceHandle: 1, target: 'audience', 
    labelText: 'טיפולים פיזיים...', markerEnd: { type: MarkerType.ArrowClosed },
  });
  edges.push({
    id: 'start-to-audience-3', source: 'start', sourceHandle: 3, target: 'audience', 
    labelText: 'טיפולי שפה ותזונה...', markerEnd: { type: MarkerType.ArrowClosed },
  });

  tree.targetEntity.options.forEach(opt => {
      edges.push({
        id: `targetEntity-${opt.value}-to-audience`,
        source: 'targetEntity', sourceHandle: opt.value, target: 'audience',
        markerEnd: { type: MarkerType.ArrowClosed },
      });
  });
  
  edges.push({
    id: 'audience-to-profession', source: 'audience', sourceHandle: 'default', target: 'profession',
    markerEnd: { type: MarkerType.ArrowClosed },
  });
  
  // (דוגמה לחיבורי מקצועות - זה ידרוש לוגיקה מורכבת יותר בהמשך)
  edges.push({
    id: 'profession-to-symptoms', source: 'profession', sourceHandle: 3, target: 'symptoms', 
    labelText: "פסיכולוגיה", markerEnd: { type: MarkerType.ArrowClosed },
  });
  edges.push({
    id: 'profession-to-preferences', source: 'profession', sourceHandle: 4, target: 'preferences', 
    labelText: "עו\"ס", markerEnd: { type: MarkerType.ArrowClosed },
  });

  edges.push({
    id: 'symptoms-to-preferences', source: 'symptoms', sourceHandle: 'default', target: 'preferences',
    markerEnd: { type: MarkerType.ArrowClosed },
  });
  edges.push({
    id: 'preferences-to-region', source: 'preferences', sourceHandle: 'default', target: 'region',
    markerEnd: { type: MarkerType.ArrowClosed },
  });

  return { initialNodes: nodes, initialEdges: edges };
};


// --- רכיב חלון העריכה ---
const NodeInspector = ({ node, setNodes, setEdges }) => {
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
    const oldLabel = outputs[index].label;
    const oldId = outputs[index].id;
    const newOutputs = outputs.map((out, i) => i === index ? { ...out, label: newLabel } : out);
    setOutputs(newOutputs);
    
    setNodes(nds => nds.map(n => {
      if (n.id === node.id) {
        return { ...n, data: { ...n.data, outputs: newOutputs } };
      }
      return n;
    }));

    setEdges(eds => eds.map(e => {
        if (e.source === node.id && e.sourceHandle === oldId) {
            return { ...e, sourceHandle: oldId, labelText: `מ-'${newLabel}'` };
        }
        return e;
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
    setEdges(eds => eds.filter(e => !(e.source === node.id && e.sourceHandle === outputToRemove.id)));
  };

  return (
    <div style={{ width: '250px', background: '#f9f9f9', borderRight: '1px solid #ddd', padding: '15px', direction: 'rtl', textAlign: 'right', overflowY: 'auto' }}>
      <h4 style={{ fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>עריכת שאלה</h4>
      
      <div style={{ marginTop: '15px' }}>
        <label style={{ fontSize: '12px', fontWeight: '500' }}>טקסט שאלה:</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={updateNodeLabel} 
          style={{ width: '100%', border: '1px solid #ccc', padding: '5px' }}
        />
      </div>
      
      <div style={{ marginTop: '15px' }}>
        <label style={{ fontSize: '12px', fontWeight: '500' }}>תשובות (יציאות):</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '5px' }}>
          {outputs.map((output, index) => (
            <div key={index} style={{ display: 'flex', gap: '5px' }}>
              <input
                type="text"
                value={output.label}
                onChange={(e) => updateOutputLabel(index, e.target.value)}
                style={{ width: '100%', border: '1px solid #ccc', padding: '5px', fontSize: '11px' }}
              />
              <button onClick={() => deleteOutput(index)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', width: '25px', cursor: 'pointer' }}>X</button>
            </div>
          ))}
        </div>
        <button onClick={addOutput} style={{ fontSize: '11px', color: 'var(--primary-blue)', cursor: 'pointer', background: 'none', border: 'none', padding: '5px 0', marginTop: '5px' }}>
          + הוסף תשובה
        </button>
      </div>
    </div>
  );
};


function FlowBuilder({ API_URL, onLogout }) { // <-- !!! הוספת Props !!!
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [nodeId, setNodeId] = useState(1); 
  const [selectedNode, setSelectedNode] = useState(null);
  const [initialData, setInitialData] = useState(null); // <-- !!! מצב חדש לנתונים !!!

  // --- !!! טעינת הנתונים הראשוניים (קטגוריות וכו') ---
  useEffect(() => {
    const fetchInitialData = async () => {
        try {
            // משתמש בנתיב הקיים של עורך הפרופיל
            const res = await fetch(`${API_URL}/api/data/options`, { 
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

  // --- !!! אפקט זה ירוץ רק *אחרי* שהנתונים הגיעו ---
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
  
  const onConnect = useCallback(
    (connection) => {
      const sourceNode = nodes.find(n => n.id === connection.source);
      const sourceHandleLabel = sourceNode.data.outputs.find(o => o.id === connection.sourceHandle)?.label || '';
      
      const newEdge = { 
        ...connection, 
        labelText: `מ-'${sourceHandleLabel}'`,
        markerEnd: { type: MarkerType.ArrowClosed }
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
    const cleanNodes = nodes.map(n => {
        return { ...n };
    });
    
    const flowData = {
      nodes: cleanNodes,
      edges: edges.map(e => ({ id: e.id, source: e.source, sourceHandle: e.sourceHandle, target: e.target, labelText: e.labelText })),
    };
    console.log('[DEBUG] שמירת תרשים:', JSON.stringify(flowData, null, 2));
    alert('מבנה התרשים נשמר (בדוק ב-Console)');
  };

  // --- הצג טעינה עד ש-initialData מגיע ---
  if (!initialData) {
      return (
          <div className="bg-white p-6 md:p-8 rounded-lg shadow w-full mx-auto text-center">
              <div className="spinner w-8 h-8 mx-auto border-t-primary-blue border-r-primary-blue"></div>
              <p>טוען נתוני שאלון...</p>
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
          className="py-2 px-4 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition"
        >
          + הוסף שאלה חדשה
        </button>
        <button
          onClick={onSave}
          className="py-2 px-4 bg-primary-blue text-white rounded-lg text-sm font-semibold hover:bg-secondary-purple transition"
        >
          שמור תרשים
        </button>
      </div>

      <div style={{ display: 'flex', height: '700px' }}>
        <div style={{ flexGrow: 1, ...flowStyles }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            defaultViewport={defaultViewport}
            onNodeClick={onNodeClick}
            onPaneClick={() => setSelectedNode(null)} 
            deleteKeyCode={['Backspace', 'Delete']} 
          >
            <Controls />
            <Background />
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

export default FlowBuilder;