// src/components/QuestionNode.jsx - (v2 - Editable)
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
  background: '#fff',
  border: '1px solid #999',
  borderRadius: '5px',
  padding: '10px 15px',
  fontSize: '12px',
  width: 180,
  textAlign: 'right',
  direction: 'rtl',
};

// הרכיב המותאם אישית
function QuestionNode({ data }) {
  
  // פונקציה שתופעל כשמשנים את הטקסט
  const onLabelChange = (evt) => {
    // קורא לפונקציה (onNodeDataChange) שקיבלנו מהרכיב האבא (FlowBuilder)
    // ומעדכן את ה-state שם
    data.onNodeDataChange(data.id, { label: evt.target.value });
  };

  return (
    <div style={nodeStyle}>
      {/* 1. ידית כניסה (Target) בצד שמאל */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ ...handleStyle, left: '-6px' }} 
      />
      
      {/* 2. התוכן (הטקסט של השאלה) - עכשיו ניתן לעריכה */}
      <div>
        <label style={{ fontSize: '10px', color: '#555' }}>טקסט שאלה:</label>
        <input 
          type="text" 
          value={data.label} 
          onChange={onLabelChange}
          style={{ width: '100%', border: '1px solid #ddd', padding: '2px', fontSize: '12px' }}
        />
      </div>

      {/* 3. ידית יציאה (Source) בצד ימין */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="a" // מזהה ייחודי ליציאה
        style={{ ...handleStyle, right: '-6px' }}
      />
    </div>
  );
}

export default React.memo(QuestionNode); // React.memo מונע רינדורים מיותרים