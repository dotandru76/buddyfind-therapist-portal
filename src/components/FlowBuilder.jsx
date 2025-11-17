// src/components/FlowBuilder.jsx - v8 (With Inspector Panel)
import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css'; // ייבוא ה-CSS

import { questionsTree } from '../constants/questionsTree';
import QuestionNode from './QuestionNode.jsx';

const nodeTypes = { questionNode: QuestionNode };
const defaultViewport = { x: 0, y: 0, zoom: 1 };
const flowStyles = { height: '700px', border: '1px solid #ddd', borderRadius: '8px', background: '#fefefe' };

// --- פונקציית המרה משודרגת ---
const convertTreeToFlow = (tree) => {
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
    // --- זו הלוגיקה שיוצרת את התשובות ---
    if (nodeId === 'start') {
      return [
        { id: 'start-opt-1', label: "אם 'נפש' (2)" },
        { id: 'start-opt-2', label: 'אחר' }
      ];
    }
    if (nodeId === 'targetEntity' && nodeData.options) {
      return nodeData.options.map(opt => ({ id: opt.value, label: opt.label }));
    }
    if (nodeId === 'profession') {
       return [
        { id: 'prof-opt-1', label: 'רגיל' },
        { id: 'prof-opt-2', label: 'דילוג (4,5,6)' }
      ];
    }
    // ברירת מחדל
    return [{ id: 'default', label: 'המשך' }];
  };

  for (const [nodeId, nodeData] of Object.entries(tree)) {
    nodes.push({
      id: nodeId,
      data: { 
        label: nodeData.text,
        outputs: getOutputsForNode(nodeId, nodeData), // יצירת רשימת תשובות
      }, 
      position: positions[nodeId] || { x: 100, y: 100 + nodes.length * 50 },
      type: 'questionNode',
    });
  }

  // יצירת החיצים (Edges)
  edges.push({
    id: 'start-to-targetEntity', source: 'start', sourceHandle: 'start-opt-1', target: 'targetEntity', 
    markerEnd: { type: MarkerType.ArrowClosed },
  });
  edges.push({
    id: 'start-to-audience', source: 'start', sourceHandle: 'start-opt-2', target: 'audience', 
    markerEnd: { type: MarkerType.ArrowClosed },
  });
  // חיבור כל היציאות של targetEntity ל-audience
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
  edges.push({
    id: 'profession-to-symptoms', source: 'profession', sourceHandle: 'prof-opt-1', target: 'symptoms', 
    markerEnd: { type: MarkerType.ArrowClosed },
  });
  edges.push({
    id: 'profession-to-preferences', source: 'profession', sourceHandle: 'prof-opt-2', target: 'preferences', 
    markerEnd: { type: MarkerType.ArrowClosed },
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


// --- !!! רכיב חדש: חלון העריכה הצדדי !!! ---
const NodeInspector = ({ node, setNodes }) => {
  const [label, setLabel] = useState(node.data.label);
  const [outputs, setOutputs] = useState(node.data.outputs || []);

  useEffect(() => {
    setLabel(node.data.label);
    setOutputs(node.data.outputs || []);
  }, [node]); // עדכן את הטופס כשהמשתמש בוחר מלבן אחר

  // עדכון טקסט השאלה
  const updateNodeLabel = () => {
    setNodes(nds => nds.map(n => {
      if (n.id === node.id) {
        return { ...n, data: { ...n.data, label } };
      }
      return n;
    }));
  };

  // עדכון שם של תשובה
  const updateOutputLabel = (index, newLabel) => {
    const newOutputs = outputs.map((out, i) => i === index ? { ...out, label: newLabel } : out);
    setOutputs(newOutputs);
    setNodes(nds => nds.map(n => {
      if (n.id === node.id) {
        return { ...n, data: { ...n.data, outputs: newOutputs } };
      }
      return n;
    }));
  };
  
  // הוספת תשובה חדשה
  const addOutput = () => {
    const newId = `output_${Date.now()}`;
    const newOutput = { id: newId, label: 'תשובה חדשה' };
    const newOutputs = [...outputs, newOutput];
    setOutputs(newOutputs);
    setNodes(nds => nds.map(n => {
      if (n.id === node.id) {
        return { ...n, data: { ...n.data, outputs: newOutputs } };
      }
      return n;
    }));
  };
  
  // מחיקת תשובה
  const deleteOutput = (indexToDelete) => {
    const newOutputs = outputs.filter((_, i) => i !== indexToDelete);
    setOutputs(newOutputs);
    setNodes(nds => nds.map(n => {
      if (n.id === node.id) {
        return { ...n, data: { ...n.data, outputs: newOutputs } };
      }
      return n;
    }));
  };

  return (
    <div style={{ width: '250px', background: '#f9f9f9', borderRight: '1px solid #ddd', padding: '15px', direction: 'rtl', textAlign: 'right' }}>
      <h4 style={{ fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>עריכת שאלה</h4>
      
      <div style={{ marginTop: '15px' }}>
        <label style={{ fontSize: '12px', fontWeight: '500' }}>טקסט שאלה:</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={updateNodeLabel} // שמור כשהמשתמש יוצא מהשדה
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
// --- !!! סוף רכיב חלון העריכה !!! ---


function FlowBuilder() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [nodeId, setNodeId] = useState(1); 
  const [selectedNode, setSelectedNode] = useState(null); // --- !!! 1. מצב חדש לבחירה !!! ---

  // טעינה ראשונית
  useEffect(() => {
    const { initialNodes, initialEdges } = convertTreeToFlow(questionsTree);
    setNodes(initialNodes);
    setEdges(initialEdges);
    setNodeId(initialNodes.length + 1);
  }, []); 

  // --- !!! 2. עדכון לבחירת מלבן ---
  const onNodeClick = (event, node) => {
    setSelectedNode(node);
  };

  // פונקציות בסיסיות של React Flow (גרירה, מחיקה)
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  // --- !!! 3. לוגיקה למחיקת קווים ---
  const onEdgesChange = useCallback(
    (changes) => {
      console.log("[DEBUG] Edge changes:", changes);
      setEdges((eds) => applyEdgeChanges(changes, eds))
    },
    [setEdges]
  );
  
  // פונקציה לחיבור בין מלבנים
  const onConnect = useCallback(
    (connection) => {
      const newEdge = { 
        ...connection, 
        labelText: `מ-'${connection.sourceHandle}'`,
        markerEnd: { type: MarkerType.ArrowClosed }
      };
      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges]
  );

  // הוספת מלבן שאלה חדש
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
  
  // שמירה (עדיין מדפיס ל-Console)
  const onSave = () => {
    const flowData = {
      nodes: nodes.map(n => ({ id: n.id, data: n.data, position: n.position, type: n.type })),
      edges: edges.map(e => ({ id: e.id, source: e.source, sourceHandle: e.sourceHandle, target: e.target, labelText: e.labelText })),
    };
    console.log('[DEBUG] שמירת תרשים:', JSON.stringify(flowData, null, 2));
    alert('מבנה התרשים נשמר (בדוק ב-Console)');
  };

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

      {/* --- !!! 4. חלוקה של המסך לעורך וחלון עריכה --- */}
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
            onNodeClick={onNodeClick} // לכידת לחיצה
            onPaneClick={() => setSelectedNode(null)} // ביטול בחירה
            deleteKeyCode={['Backspace', 'Delete']} // --- !!! 5. הפעלת מקש מחיקה !!! ---
          >
            <Controls />
            <Background />
          </ReactFlow>
        </div>
        
        {/* הצג את חלון העריכה רק אם נבחר מלבן */}
        {selectedNode && (
          <NodeInspector 
            key={selectedNode.id} // מאלץ רינדור מחדש כשהבחירה משתנה
            node={selectedNode} 
            setNodes={setNodes} 
          />
        )}
      </div>
    </div>
  );
}

export default FlowBuilder;