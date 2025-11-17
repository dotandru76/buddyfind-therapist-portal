// src/components/QuestionNode.jsx - (v5 - Show Outputs)
import React from 'react';
import { Handle, Position } from 'reactflow';

// עיצוב הידית (הנקודה האפורה)
const handleStyle = {
    background: '#fff',
    border: '1px solid #777',
    width: '10px',
    height: '10px',
};

// עיצוב המלבן
const nodeStyle = {
  background: 'white',
  border: '1px solid var(--primary-blue)',
  borderRadius: '5px',
  width: 200,
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

// רכיב התשובה (יציאה)
const OutputHandle = ({ label, id }) => (
  <div style={{ position: 'relative', padding: '5px 0', paddingRight: '15px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
    {/* --- !!! התיקון: מציגים את הטקסט של התשובה --- */}
    <span style={{ fontSize: '11px', color: '#333' }}>{label}</span>
    
    <Handle 
      type="source" 
      position={Position.Right} 
      id={id} // המזהה של הידית
      style={{ ...handleStyle, right: '-6px', position: 'absolute', top: '50%' }}
    />
  </div>
);

// הרכיב המותאם אישית
function QuestionNode({ data, selected }) {
  
  const customNodeStyle = {
    ...nodeStyle,
    border: selected ? '2px solid #2563EB' : nodeStyle.border,
  };

  return (
    <div style={customNodeStyle}>
      {/* 1. ידית כניסה (Target) בצד שמאל */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ ...handleStyle, left: '-6px' }} 
      />
      
      {/* 2. כותרת (טקסט השאלה) */}
      <div style={nodeHeaderStyle}>
        {data.label}
      </div>

      {/* 3. גוף (רשימת התשובות והיציאות) */}
      <div style={nodeBodyStyle}>
        {(data.outputs || []).map((output, index) => (
          <OutputHandle 
            key={index} 
            label={output.label} // <-- מעבירים את הטקסט
            id={output.id} // <-- מעבירים את המזהה
          />
        ))}
      </div>
    </div>
  );
}

export default React.memo(QuestionNode);