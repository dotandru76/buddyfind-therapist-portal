// src/components/QuestionNode.jsx
import React from 'react';
import { Handle, Position } from 'reactflow';

const nodeStyle = {
  background: 'white',
  border: '1px solid var(--primary-blue)',
  borderRadius: '8px',
  minWidth: 250, // רוחב מינימלי כדי להכיל טקסט
  textAlign: 'right',
  direction: 'rtl',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  overflow: 'hidden',
};

const nodeHeaderStyle = {
  background: 'var(--primary-blue)',
  color: 'white',
  padding: '10px 15px',
  fontSize: '14px',
  fontWeight: '600',
  borderBottom: '1px solid rgba(0,0,0,0.1)'
};

const nodeBodyStyle = {
  padding: '10px',
  background: '#f8fafc',
  maxHeight: '300px', // הגבלת גובה למקרה של הרבה סימפטומים
  overflowY: 'auto'   // גלילה אם יש הרבה
};

const OutputHandle = ({ label, id }) => (
  <div style={{ position: 'relative', padding: '6px 0', paddingRight: '15px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
    <span style={{ fontSize: '12px', color: '#334155', marginRight: '5px' }}>{label}</span>
    <Handle 
      type="source" 
      position={Position.Right} 
      id={String(id)} 
      style={{ background: '#3b82f6', width: '8px', height: '8px', right: '-4px' }}
    />
  </div>
);

function QuestionNode({ data, selected }) {
  const customNodeStyle = {
    ...nodeStyle,
    border: selected ? '2px solid #2563EB' : nodeStyle.border,
    boxShadow: selected ? '0 0 0 4px rgba(59, 130, 246, 0.2)' : nodeStyle.boxShadow,
  };

  return (
    <div style={customNodeStyle}>
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ background: '#64748b', width: '10px', height: '10px', left: '-5px' }} 
      />
      
      <div style={nodeHeaderStyle}>
        {data.label}
      </div>

      <div style={nodeBodyStyle}>
        {(data.outputs || []).map((output, index) => (
          <OutputHandle 
            key={`${output.id}-${index}`} 
            label={output.label} 
            id={output.id} 
          />
        ))}
      </div>
    </div>
  );
}

export default React.memo(QuestionNode);