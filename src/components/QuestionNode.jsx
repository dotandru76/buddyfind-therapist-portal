// src/components/QuestionNode.jsx
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
  return (
    <div style={nodeStyle}>
      {/* 1. ידית כניסה (Target) בצד שמאל */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ ...handleStyle, left: '-6px' }} 
      />
      
      {/* 2. התוכן (הטקסט של השאלה) */}
      <div>{data.label}</div>

      {/* 3. ידית יציאה (Source) בצד ימין */}
      {/* כרגע זו ידית אחת. בשלב הבא, נוכל להפוך את זה 
        לרשימה דינמית של תשובות (כן/לא וכו')
      */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="a" // מזהה ייחודי ליציאה
        style={{ ...handleStyle, right: '-6px' }}
      />
    </div>
  );
}

export default QuestionNode;