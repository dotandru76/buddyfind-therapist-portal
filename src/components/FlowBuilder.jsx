// src/components/FlowBuilder.jsx - v21 (Domain-Specific Profession Split)
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
const defaultViewport = { x: 0, y: 0, zoom: 0.55 }; // זום רחב יותר
const flowStyles = { height: '750px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' };

// --- פונקציית המרה חכמה ומפוצלת ---
const convertTreeToFlow = (tree, initialData) => {
  const nodes = [];
  const edges = [];

  const addEdgeClean = (source, target, sourceHandle = null, label = '') => {
    edges.push({
      id: `e_${source}-${target}_${sourceHandle || 'def'}`,
      source, target, sourceHandle: sourceHandle ? String(sourceHandle) : null, label,
      type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#94a3b8', strokeWidth: 2 }
    });
  };

  // 1. התחלה (בחירת תחום)
  nodes.push({
    id: 'start', type: 'questionNode', position: { x: 50, y: 300 },
    data: { 
        label: 'מהו תחום הטיפול העיקרי?', questionType: 'single',
        outputs: initialData.mainCategories.map(c => ({ id: c.id, label: c.name }))
    },
  });

  // 2. שאלות ביניים (קהל יעד וגיל)
  // נמקם אותם במרכז, אבל החיבורים יהיו חכמים
  nodes.push({
    id: 'targetEntity', type: 'questionNode', position: { x: 450, y: 50 },
    data: { label: 'עבור מי הטיפול?', questionType: 'single', outputs: tree.targetEntity.options },
  });

  nodes.push({
    id: 'audience', type: 'questionNode', position: { x: 450, y: 450 },
    data: { 
        label: 'מהו גיל המטופל?', questionType: 'slider', 
        minVal: 0, maxVal: 120, outputs: [{id: 'default', label: 'הבא'}] 
    },
  });

  // חיבורים ראשוניים
  // קטגוריה 2 (נפש) הולכת ל'עבור מי' ואז ל'גיל'
  addEdgeClean('start', 'targetEntity', 2, 'נפש');
  addEdgeClean('targetEntity', 'audience', 'individual');
  addEdgeClean('targetEntity', 'audience', 'couple');
  addEdgeClean('targetEntity', 'audience', 'family');
  addEdgeClean('targetEntity', 'audience', 'group');

  // שאר הקטגוריות הולכות ישר ל'גיל'
  initialData.mainCategories.forEach(c => { 
      if (c.id !== 2) addEdgeClean('start', 'audience', c.id, c.name); 
  });


  // --- 3. הפיצול הגדול: יצירת מלבן "מקצועות" נפרד לכל קטגוריה ---
  
  // נשתמש במפה כדי לזכור איזה מלבן מקצועות שייך לאיזה ID של מקצוע
  // כדי שנוכל לחבר את הסימפטומים אחר כך
  const professionNodeMap = {}; 

  let currentY_Prof = 0;
  const SPACING_Y_PROF = 400;

  initialData.mainCategories.forEach((category, index) => {
      // סינון המקצועות ששייכים לקטגוריה זו בלבד
      const catProfessions = initialData.professions.filter(p => p.main_category_id === category.id);
      
      if (catProfessions.length > 0) {
          const profNodeId = `professions_cat_${category.id}`;
          
          nodes.push({
              id: profNodeId,
              type: 'questionNode',
              position: { x: 900, y: currentY_Prof },
              data: { 
                  label: `מקצועות: ${category.name}`, // כותרת ברורה
                  questionType: 'single',
                  outputs: catProfessions.map(p => ({ id: p.id, label: p.name })) 
              },
          });

          // חיבור ה"גיל" למלבן המקצועות המתאים
          // הערה: בתרשים ליניארי פשוט זה קשה לייצג את הפיצול המדויק של "אם בחרת X ב-Start תגיע לפה",
          // אז לצורך הוויזואליזציה נחבר את כולם מ"גיל".
          // במערכת האמיתית השרת ידע לנתב לפי הבחירה הראשונה.
          addEdgeClean('audience', profNodeId, 'default');

          // שמירת המיפוי לשימוש בשלב הסימפטומים
          catProfessions.forEach(p => {
              professionNodeMap[p.id] = profNodeId;
          });

          currentY_Prof += SPACING_Y_PROF;
      }
  });


  // --- 4. פיצול סימפטומים (מחובר למלבן המקצועות הנכון) ---
  
  const preferencesNodeId = 'preferences';
  const regionNodeId = 'region';
  let currentY_Sym = 0;
  const SPACING_Y_SYM = 350;

  initialData.professions.forEach((prof) => {
      const profSymptoms = initialData.symptoms
          .filter(s => s.profession_id === prof.id)
          .map(s => ({ id: s.search_key, label: s.name }));

      // מציאת מלבן המקצועות שממנו יוצאים (לפי המפה שיצרנו קודם)
      const sourceNodeId = professionNodeMap[prof.id];

      if (profSymptoms.length > 0 && sourceNodeId) {
          const symNodeId = `symptoms_prof_${prof.id}`;
          
          nodes.push({
              id: symNodeId,
              type: 'questionNode',
              position: { x: 1400, y: currentY_Sym },
              data: { 
                  label: `סימפטומים: ${prof.name}`, 
                  questionType: 'multiple',
                  outputs: profSymptoms.concat([{ id: 'next', label: 'סיום בחירה' }]) 
              },
          });

          // חיבור: ממלבן המקצועות הספציפי -> לצומת הסימפטומים
          addEdgeClean(sourceNodeId, symNodeId, prof.id);
          
          // חיבור: מסימפטומים -> להעדפות
          addEdgeClean(symNodeId, preferencesNodeId, 'next');

          currentY_Sym += SPACING_Y_SYM; 
      } else if (sourceNodeId) {
          // דילוג: ממלבן המקצועות -> להעדפות
          edges.push({
            id: `e_skip_${prof.id}`,
            source: sourceNodeId, sourceHandle: String(prof.id), target: preferencesNodeId,
            label: '',
            type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, 
            style: { stroke: '#94a3b8', strokeWidth: 2 }
          });
      }
  });

  // --- 5. סיום ---
  const centerY = Math.max(currentY_Sym / 2, 300);
  
  nodes.push({
    id: preferencesNodeId, type: 'questionNode', position: { x: 1900, y: centerY },
    data: { 
        label: 'העדפות נוספות', questionType: 'multiple', 
        outputs: [{id: 'is_accessible', label: 'נגישות'}, {id: 'offers_reduced_fee', label: 'מחיר מוזל'}, {id: 'next', label: 'הבא'}] 
    },
  });

  nodes.push({
    id: 'region', type: 'questionNode', position: { x: 2300, y: centerY },
    data: { 
        label: 'בחירת אזור גיאוגרפי', questionType: 'single',
        outputs: initialData.regions.map(r => ({ id: r.region_key, label: r.region_name_he })) 
    },
  });

  addEdgeClean(preferencesNodeId, regionNodeId, 'next');

  return { initialNodes: nodes, initialEdges: edges };
};


// --- רכיב חלון העריכה (ללא שינוי) ---
const NodeInspector = ({ node, setNodes, setEdges }) => {
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
                  <div>
                      <span style={{ fontSize: '11px' }}>מינימום</span>
                      <input type="number" value={minVal} onChange={(e) => { setMinVal(e.target.value); updateNodeData('minVal', e.target.value); }} style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }} />
                  </div>
                  <div>
                      <span style={{ fontSize: '11px' }}>מקסימום</span>
                      <input type="number" value={maxVal} onChange={(e) => { setMaxVal(e.target.value); updateNodeData('maxVal', e.target.value); }} style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }} />
                  </div>
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
    if (initialData && nodes.length === 0) {
      const { initialNodes, initialEdges } = convertTreeToFlow(questionsTree, initialData);
      setNodes(initialNodes);
      setEdges(initialEdges);
      setNodeId(initialNodes.length + 1);
    }
  }, [initialData]); 

  const onNodeClick = (event, node) => setSelectedNode(node);
  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  
  const onNodesDelete = useCallback((deleted) => {
      setEdges((eds) => deleted.reduce((acc, node) => acc.filter((edge) => edge.source !== node.id && edge.target !== node.id), eds));
      if (deleted.find(n => n.id === selectedNode?.id)) setSelectedNode(null);
  }, [selectedNode]);
  
  const onConnect = useCallback((connection) => {
      const sourceNode = nodes.find(n => n.id === connection.source);
      const sourceHandleLabel = sourceNode.data.outputs.find(o => o.id === connection.sourceHandle)?.label || '';
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
  
  const onSave = () => {
    const cleanNodes = nodes.map(n => ({ id: n.id, data: n.data, position: n.position, type: n.type }));
    const flowData = {
      nodes: cleanNodes,
      edges: edges.map(e => ({ id: e.id, source: e.source, sourceHandle: e.sourceHandle, target: e.target, label: e.label })),
    };
    console.log('[DEBUG] Saving Flow JSON:', JSON.stringify(flowData, null, 2));
    alert('מבנה התרשים נשמר (בדוק ב-Console).');
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