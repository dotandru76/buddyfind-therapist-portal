// src/components/FlowBuilder.jsx - v7 (FIXED CSS IMPORT)
import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MarkerType,
} from 'reactflow';

// --- !!! התיקון הקריטי כאן: ייבוא ישיר של ה-CSS !!! ---
import 'reactflow/dist/style.css';

import { questionsTree } from '../constants/questionsTree';
import QuestionNode from './QuestionNode.jsx';

// הגדרת סוגי הרכיבים המותאמים אישית
const nodeTypes = { 
  questionNode: QuestionNode 
};

// מיקום ברירת מחדל לתצוגה
const defaultViewport = { x: 0, y: 0, zoom: 1 };

// פונקציית המרה
const convertTreeToFlow = (tree, onNodeDataChange) => {
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

  for (const [nodeId, nodeData] of Object.entries(tree)) {
    nodes.push({
      id: nodeId,
      data: { 
        label: nodeData.text,
        onNodeDataChange: onNodeDataChange,
        id: nodeId 
      }, 
      position: positions[nodeId] || { x: 100, y: 100 + nodes.length * 50 },
      type: (nodeId === 'start') ? 'input' : 'questionNode',
    });
  }

  // יצירת החיצים (Edges)
  edges.push({
    id: 'start-to-targetEntity', source: 'start', target: 'targetEntity', label: "אם 'נפש' (2)",
    markerEnd: { type: MarkerType.ArrowClosed },
  });
  edges.push({
    id: 'start-to-audience', source: 'start', target: 'audience', label: 'אחר',
    markerEnd: { type: MarkerType.ArrowClosed },
  });
  edges.push({
    id: 'targetEntity-to-audience', source: 'targetEntity', target: 'audience',
    markerEnd: { type: MarkerType.ArrowClosed },
  });
  edges.push({
    id: 'audience-to-profession', source: 'audience', target: 'profession',
    markerEnd: { type: MarkerType.ArrowClosed },
  });
  edges.push({
    id: 'profession-to-symptoms', source: 'profession', target: 'symptoms', label: 'רגיל',
    markerEnd: { type: MarkerType.ArrowClosed },
  });
  edges.push({
    id: 'profession-to-preferences', source: 'profession', target: 'preferences', label: 'דילוג (4,5,6)',
    markerEnd: { type: MarkerType.ArrowClosed },
  });
  edges.push({
    id: 'symptoms-to-preferences', source: 'symptoms', target: 'preferences',
    markerEnd: { type: MarkerType.ArrowClosed },
  });
  edges.push({
    id: 'preferences-to-region', source: 'preferences', target: 'region',
    markerEnd: { type: MarkerType.ArrowClosed },
  });

  return { initialNodes: nodes, initialEdges: edges };
};

const flowStyles = { height: '700px', border: '1px solid #ddd', borderRadius: '8px', background: '#fefefe' };

function FlowBuilder() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [nodeId, setNodeId] = useState(1); 

  const onNodeDataChange = useCallback((id, newData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...newData,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);
  
  useEffect(() => {
    const { initialNodes, initialEdges } = convertTreeToFlow(questionsTree, onNodeDataChange);
    setNodes(initialNodes);
    setEdges(initialEdges);
    setNodeId(initialNodes.length + 1);
  }, [onNodeDataChange]); 

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );
  
  const onConnect = useCallback(
    (connection) => {
      const newEdge = { 
        ...connection, 
        labelText: prompt('מה התנאי למעבר? (למשל: "תשובה=כן")'),
        markerEnd: { type: MarkerType.ArrowClosed }
      };
      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges]
  );

  const addNode = () => {
    const newId = `new_${nodeId}`;
    const newNode = {
      id: newId,
      data: { 
        label: `שאלה חדשה ${nodeId}`,
        onNodeDataChange: onNodeDataChange,
        id: newId
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
      edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, labelText: e.labelText })),
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

      <div style={flowStyles}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          defaultViewport={defaultViewport}
        >
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}

export default FlowBuilder;