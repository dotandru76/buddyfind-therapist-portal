// src/components/QuestionNode.jsx - (v3 - Editable Outputs)
import React from 'react';
import { Handle, Position } from 'reactflow';

// עיצוב הידית (הנקודה האפורה)
const handleStyle = {
    background: '#fff',
    border: '1px solid #777',
    width: '10px',
    height: '10px',
};

// עיצוב המלבן עצמו
const nodeStyle = {
  background: 'white',
  border: '1px solid var(--primary-blue)',
  borderRadius: '5px',
  width: 200, // רוחב אחיד
  textAlign: 'right',
  direction: 'rtl',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};

const nodeHeaderStyle = {
  background: 'var(--primary-blue)',
  color: 'white',
  padding: '8px 12px',
  borderTopLeftRadius: '4px',
  borderTopRightRadius: '4px',
  fontSize: '13px',
  fontWeight: '600',
};

const nodeBodyStyle = {
  padding: '10px 15px',
  fontSize: '12px',
};

// הרכיב המותאם אישית
function QuestionNode({ data, id }) {
  
  // פונקציה לעדכון טקסט השאלה
  const onLabelChange = (evt) => {
    data.onNodeDataChange(id, { label: evt.target.value });
  };

  // פונקציה לעדכון טקסט של תשובה
  const onOutputChange = (outputIndex, newLabel) => {
    const newOutputs = [...data.outputs]; // העתק את המערך
    newOutputs[outputIndex] = newLabel; // שנה את הפריט
    data.onNodeDataChange(id, { outputs: newOutputs }); // שלח עדכון
  };

  // פונקציה להוספת תשובה חדשה
  const addOutput = () => {
    const newOutputs = [...(data.outputs || []), `תשובה ${ (data.outputs || []).length + 1}`];
    data.onNodeDataChange(id, { outputs: newOutputs });
  };

  return (
    <div style={nodeStyle}>
      {/* 1. ידית כניסה (Target) בצד שמאל */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ ...handleStyle, left: '-6px' }} 
      />
      
      {/* 2. כותרת (טקסט השאלה - ניתן לעריכה) */}
      <div style={nodeHeaderStyle}>
        <input 
          type="text" 
          value={data.label} 
          onChange={onLabelChange}
          style={{ width: '100%', background: 'none', border: 'none', color: 'white', fontSize: '13px', outline: 'none' }}
        />
      </div>

      {/* 3. גוף (רשימת התשובות והיציאות) */}
      <div style={nodeBodyStyle}>
        {(data.outputs || []).map((outputLabel, index) => (
          <div key={index} style={{ position: 'relative', padding: '5px 0', paddingRight: '15px' }}>
            <input
              type="text"
              value={outputLabel}
              onChange={(e) => onOutputChange(index, e.target.value)}
              style={{ width: '100%', border: '1px solid #ddd', padding: '2px', fontSize: '11px' }}
            />
            {/* ידית יציאה (Source) בצד ימין - אחת לכל תשובה */}
            <Handle 
              type="source" 
              position={Position.Right} 
              id={outputLabel} // המזהה של הידית הוא הטקסט של התשובה
              style={{ ...handleStyle, right: '-6px', top: '50%' }}
            />
          </div>
        ))}
        <button 
          onClick={addOutput}
          style={{ fontSize: '10px', color: 'var(--primary-blue)', cursor: 'pointer', background: 'none', border: 'none', padding: '5px 0' }}
        >
          + הוסף תשובה
        </button>
      </div>
    </div>
  );
}

export default React.memo(QuestionNode);