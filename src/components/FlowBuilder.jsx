// src/components/FlowBuilder.jsx - v7 (Editable Multi-Handle Nodes)
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

// הגדרת סוגי הרכיבים המותאמים אישית
const nodeTypes = { 
  questionNode: QuestionNode 
};

// מיקום ברירת מחדל לתצוגה
const defaultViewport = { x: 0, y: 0, zoom: 1 };

// פונקציית המרה משודרגת
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

  // יצירת רשימות התשובות (יציאות)
  const outputs = {
    start: ['אם נפש (2)', 'אחר'],
    targetEntity: ['טיפול יחידני', 'זוגיות', 'משפחה', 'קבוצה'],
    audience: ['המשך'],
    profession: ['רגיל', 'דילוג (4,5,6)'],
    symptoms: ['המשך'],
    preferences: ['המשך'],
    region: ['סיום'], // אין המשך
  };
  
  // (התאמה קטנה של התשובות למה שהיה ב-questionsTree)
  outputs.targetEntity = tree.targetEntity.options.map(opt => opt.label);

  for (const [nodeId, nodeData] of Object.entries(tree)) {
    nodes.push({
      id: nodeId,
      data: { 
        label: nodeData.text,
        outputs: outputs[nodeId] || ['המשך'], // העבר את רשימת התשובות
        onNodeDataChange: onNodeDataChange,
        id: nodeId 
      }, 
      position: positions[nodeId] || { x: 100, y: 100 + nodes.length * 50 },
      type: (nodeId === 'start') ? 'questionNode' : 'questionNode', // הפכנו הכל לסוג החדש
    });
  }

  // יצירת החיצים (Edges) - עכשיו עם חיבור לידיות ספציפיות
  edges.push({
    id: 'start-to-targetEntity', 
    source: 'start', 
    sourceHandle: 'אם נפש (2)', // <-- התחבר ליציאה "אם נפש"
    target: 'targetEntity', 
    markerEnd: { type: MarkerType.ArrowClosed },
  });
  edges.push({
    id: 'start-to-audience', 
    source: 'start', 
    sourceHandle: 'אחר', // <-- התחבר ליציאה "אחר"
    target: 'audience', 
    markerEnd: { type: MarkerType.ArrowClosed },
  });
  edges.push({
    id: 'targetEntity-to-audience', 
    source: 'targetEntity', 
    sourceHandle: outputs.targetEntity[0], // מתחבר מהיציאה הראשונה (כולם מובילים לאותו מקום)
    target: 'audience', 
    markerEnd: { type: MarkerType.ArrowClosed },
  });
  // (דוגמה לחיבור כל היציאות מאותו סוג)
  outputs.targetEntity.slice(1).forEach(label => {
      edges.push({
        id: `targetEntity-${label}-to-audience`,
        source: 'targetEntity',
        sourceHandle: label,
        target: 'audience',
        markerEnd: { type: MarkerType.ArrowClosed },
      });
  });

  edges.push({
    id: 'audience-to-profession', 
    source: 'audience', 
    sourceHandle: 'המשך',
    target: 'profession',
    markerEnd: { type: MarkerType.ArrowClosed },
  });
  edges.push({
    id: 'profession-to-symptoms', 
    source: 'profession', 
    sourceHandle: 'רגיל',
    target: 'symptoms', 
    markerEnd: { type: MarkerType.ArrowClosed },
  });
  edges.push({
    id: 'profession-to-preferences', 
    source: 'profession', 
    sourceHandle: 'דילוג (4,5,6)',
    target: 'preferences', 
    markerEnd: { type: MarkerType.ArrowClosed },
  });
  edges.push({
    id: 'symptoms-to-preferences', 
    source: 'symptoms', 
    sourceHandle: 'המשך',
    target: 'preferences',
    markerEnd: { type: MarkerType.ArrowClosed },
  });
  edges.push({
    id: 'preferences-to-region', 
    source: 'preferences', 
    sourceHandle: 'המשך',
    target: 'region',
    markerEnd: { type: MarkerType.ArrowClosed },
  });

  return { initialNodes: nodes, initialEdges: edges };
};

const flowStyles = { height: '700px', border: '1px solid #ddd', borderRadius: '8px', background: '#fefefe' };

function FlowBuilder() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [nodeId, setNodeId] = useState(1); 

  // --- !!! פונקציית העדכון המשודרגת !!! ---
  const onNodeDataChange = useCallback((id, newData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          // אם שינינו את רשימת היציאות, צריך לעדכן גם את החיצים
          if (newData.outputs) {
              const oldOutputs = node.data.outputs || [];
              const newOutputs = newData.outputs;
              
              // עדכון חיצים קיימים אם שם התשובה השתנה
              setEdges((eds) => eds.map(edge => {
                  if (edge.source === id) {
                      const oldHandleIndex = oldOutputs.indexOf(edge.sourceHandle);
                      if (oldHandleIndex !== -1 && newOutputs[oldHandleIndex]) {
                          // שם הידית השתנה, עדכן את החץ
                          return { ...edge, sourceHandle: newOutputs[oldHandleIndex] };
                      }
                  }
                  return edge;
              }));
          }

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
  }, [setNodes, setEdges]);
  
  // טעינה ראשונית
  useEffect(() => {
    const { initialNodes, initialEdges } = convertTreeToFlow(questionsTree, onNodeDataChange);
    setNodes(initialNodes);
    setEdges(initialEdges);
    setNodeId(initialNodes.length + 1);
  }, [onNodeDataChange]); 

  // פונקציות בסיסיות של React Flow (גרירה, מחיקה)
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );
  
  // פונקציה לחיבור בין מלבנים
  const onConnect = useCallback(
    (connection) => {
      // עכשיו החץ מגיע מידית ספציפית (תשובה)
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
        outputs: ['תשובה 1'], // הוספנו תשובה ראשונית
        onNodeDataChange: onNodeDataChange,
        id: newId
      },
      position: { x: 50, y: 50 },
      type: 'questionNode'
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeId(nodeId + 1);
  };
  
  // שמירה (עדיין מדפיס ל-Console)
  const onSave = () => {
    // בלוגיקת השמירה, אנו מנקים את הפונקציה onNodeDataChange
    // כדי לא לשמור אותה ב-JSON
    const cleanNodes = nodes.map(n => {
        const { onNodeDataChange, ...cleanData } = n.data;
        return { ...n, data: cleanData };
    });
    
    const flowData = {
      nodes: cleanNodes,
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