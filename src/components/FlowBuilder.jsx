// src/components/FlowBuilder.jsx - AUTOMATIC SPLIT VERSION
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
const defaultViewport = { x: 0, y: 0, zoom: 0.65 };
const flowStyles = { height: '750px', border: '1px solid #ddd', borderRadius: '8px', background: '#f8fafc' };

// --- פונקציית המרה שמפצלת את הסימפטומים לפי מקצוע ---
const convertTreeToFlow = (tree, initialData) => {
  const nodes = [];
  const edges = [];

  // 1. יצירת הצמתים הקבועים (התחלה, קהל יעד, מקצוע)
  
  // צומת התחלה
  nodes.push({
    id: 'start',
    type: 'questionNode',
    position: { x: 50, y: 300 },
    data: { 
        label: 'מהו תחום הטיפול העיקרי?', 
        outputs: [
            { id: 2, label: 'טיפולים רגשיים (נפש)' }, 
            { id: 1, label: 'טיפולים פיזיים (גוף)' },
            { id: 3, label: 'שפה ותקשורת' },
            { id: 4, label: 'תזונה' }
        ] 
    },
  });

  // צומת קהל יעד (מחובר רק לנפש כרגע, לפי הלוגיקה הקיימת)
  nodes.push({
    id: 'targetEntity',
    type: 'questionNode',
    position: { x: 450, y: 100 },
    data: { 
        label: 'עבור מי הטיפול?', 
        outputs: tree.targetEntity.options 
    },
  });

  // צומת גיל (משותף לכולם)
  nodes.push({
    id: 'audience',
    type: 'questionNode',
    position: { x: 450, y: 500 },
    data: { 
        label: 'מהו גיל המטופל? (סליידר)', 
        outputs: [{ id: 'default', label: 'המשך' }] 
    },
  });
  
  // צומת בחירת מקצוע (מציג את כל המקצועות)
  nodes.push({
    id: 'profession',
    type: 'questionNode',
    position: { x: 850, y: 300 },
    data: { 
        label: 'בחירת מקצוע ספציפי', 
        outputs: initialData.professions.map(p => ({ id: p.id, label: p.name })) 
    },
  });

  // --- חיבורי הבסיס (כמו בעץ הנוכחי) ---
  const addEdgeClean = (source, target, sourceHandle = null, label = '') => {
    edges.push({
      id: `e_${source}-${target}_${sourceHandle || ''}`,
      source, target, sourceHandle: sourceHandle ? String(sourceHandle) : null, label,
      type: 'smoothstep', 
      markerEnd: { type: MarkerType.ArrowClosed }, 
      style: { stroke: '#94a3b8', strokeWidth: 2 }
    });
  };

  addEdgeClean('start', 'targetEntity', 2); // נפש -> עבור מי
  addEdgeClean('start', 'audience', 1); // גוף -> גיל
  addEdgeClean('start', 'audience', 3); // שפה -> גיל
  addEdgeClean('start', 'audience', 4); // תזונה -> גיל
  
  addEdgeClean('targetEntity', 'audience', 'individual');
  addEdgeClean('targetEntity', 'audience', 'couple');
  addEdgeClean('targetEntity', 'audience', 'family');
  addEdgeClean('targetEntity', 'audience', 'group');

  addEdgeClean('audience', 'profession', 'default');


  // --- 2. הפיצול הגדול: יצירת צומת סימפטומים לכל מקצוע ---
  
  // מרכז הצמתים הסופיים (העדפות ואזור) כדי שיהיה לאן לחבר
  const preferencesNodeId = 'preferences';
  const regionNodeId = 'region';

  // נחשב מיקום אנכי דינמי כדי שהמלבנים לא יעלו אחד על השני
  let currentY = 0;
  const SPACING_Y = 400; // מרווח בין קבוצות סימפטומים

  initialData.professions.forEach((prof) => {
      // מצא את הסימפטומים ששייכים למקצוע הזה
      const profSymptoms = initialData.symptoms
          .filter(s => s.profession_id === prof.id)
          .map(s => ({ id: s.search_key, label: s.name }));

      if (profSymptoms.length > 0) {
          // --- יש סימפטומים: צור צומת ייעודי ---
          const symNodeId = `symptoms_prof_${prof.id}`;
          
          nodes.push({
              id: symNodeId,
              type: 'questionNode',
              position: { x: 1300, y: currentY },
              data: { 
                  label: `סימפטומים: ${prof.name}`, // שם המקצוע בכותרת
                  outputs: profSymptoms.concat([{ id: 'default', label: 'המשך (ללא בחירה)' }]) 
              },
          });

          // חבר את המקצוע הספציפי לצומת הסימפטומים שלו
          addEdgeClean('profession', symNodeId, prof.id);
          
          // חבר את צומת הסימפטומים להעדפות (המשך הזרימה)
          // מחברים את ה-"המשך" וגם את כל הסימפטומים (לוגית כולם מובילים לאותו מקום כרגע)
          addEdgeClean(symNodeId, preferencesNodeId, 'default');

          currentY += SPACING_Y; // רד למטה למקצוע הבא
      } else {
          // --- אין סימפטומים: דלג ישר להעדפות ---
          // קו מקווקו ואדום לסימון דילוג
          edges.push({
            id: `e_skip_${prof.id}`,
            source: 'profession', sourceHandle: String(prof.id), target: preferencesNodeId,
            label: '(ללא סימפטומים)',
            type: 'smoothstep', 
            markerEnd: { type: MarkerType.ArrowClosed }, 
            style: { stroke: '#f87171', strokeDasharray: '5,5' },
            animated: true
          });
      }
  });

  // 3. צמתים סופיים (ממוקמים באמצע הגובה הכולל)
  const centerY = currentY / 2;

  nodes.push({
    id: preferencesNodeId,
    type: 'questionNode',
    position: { x: 1700, y: centerY },
    data: { 
        label: 'האם יש דרישות נוספות?', 
        outputs: [{id: 'is_accessible', label: 'נגישות'}, {id: 'offers_reduced_fee', label: 'מחיר מוזל'}, {id: 'default', label: 'המשך'}] 
    },
  });

  nodes.push({
    id: regionNodeId,
    type: 'questionNode',
    position: { x: 2100, y: centerY },
    data: { 
        label: 'בחירת אזור גיאוגרפי', 
        outputs: initialData.regions.map(r => ({ id: r.region_key, label: r.region_name_he })) 
    },
  });

  addEdgeClean(preferencesNodeId, regionNodeId, 'default');
  addEdgeClean(preferencesNodeId, regionNodeId, 'is_accessible');
  addEdgeClean(preferencesNodeId, regionNodeId, 'offers_reduced_fee');

  return { initialNodes: nodes, initialEdges: edges };
};


// --- העטיפה הראשית (ללא שינוי מהותי, רק וידוא שהכל מחובר) ---
const FlowBuilderWrapper = ({ API_URL, onLogout }) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [initialData, setInitialData] = useState(null);
  
  // טעינת נתונים
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

  // הפעלת ההמרה כשיש נתונים
  useEffect(() => {
    if (initialData) {
      const { initialNodes, initialEdges } = convertTreeToFlow(questionsTree, initialData);
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [initialData]); 

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  if (!initialData) return <div className="p-10 text-center">טוען נתונים...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 border-b pb-3">
         <h3 className="text-2xl font-bold text-text-dark">תרשים זרימת האבחון (מפוצל לפי מקצועות)</h3>
         <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded text-sm">מצב צפייה וסידור</div>
      </div>
      <div style={{ flexGrow: 1, ...flowStyles }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          defaultViewport={defaultViewport}
          fitView
        >
          <Controls />
          <Background color="#cbd5e1" gap={20} />
        </ReactFlow>
      </div>
    </div>
  );
}

export default ({ API_URL, onLogout }) => (
  <ReactFlowProvider>
    <FlowBuilderWrapper API_URL={API_URL} onLogout={onLogout} />
  </ReactFlowProvider>
);