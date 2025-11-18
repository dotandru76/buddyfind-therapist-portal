// src/components/QuestionNode.jsx - (v6 - With Types)
import React from 'react';
import { Handle, Position } from 'reactflow';

const nodeStyle = {
  background: 'white',
  border: '1px solid var(--primary-blue)',
  borderRadius: '8px',
  width: 240,
  textAlign: 'right',
  direction: 'rtl',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  overflow: 'hidden',
};

const nodeHeaderStyle = {
  background: 'var(--primary-blue)',
  color: 'white',
  padding: '8px 12px',
  fontSize: '13px',
  fontWeight: '600',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const typeBadgeStyle = {
    fontSize: '10px',
    background: 'rgba(255,255,255,0.2)',
    padding: '2px 6px',
    borderRadius: '4px',
    marginLeft: '8px'
};

const nodeBodyStyle = {
  padding: '12px',
  fontSize: '12px',
  background: '#f8fafc',
};

const OutputHandle = ({ label, id }) => (
  <div style={{ position: 'relative', padding: '6px 0', paddingRight: '12px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
    <span style={{ fontSize: '12px', color: '#334155' }}>{label}</span>
    <Handle 
      type="source" 
      position={Position.Right} 
      id={id} 
      style={{ background: '#3b82f6', width: '8px', height: '8px', right: '-5px' }}
    />
  </div>
);

function QuestionNode({ data, selected }) {
  const customNodeStyle = {
    ...nodeStyle,
    border: selected ? '2px solid #2563EB' : nodeStyle.border,
    boxShadow: selected ? '0 0 0 4px rgba(59, 130, 246, 0.2)' : nodeStyle.boxShadow,
  };

  // תרגום סוג השאלה לעברית
  const getTypeLabel = (type) => {
      switch(type) {
          case 'single': return 'בחירה יחידה ◉';
          case 'multiple': return 'בחירה מרובה ☑';
          case 'slider': return 'סליידר ⸏';
          default: return 'כללי';
      }
  };

  return (
    <div style={customNodeStyle}>
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ background: '#64748b', width: '10px', height: '10px', left: '-6px' }} 
      />
      
      <div style={nodeHeaderStyle}>
        <span>{data.label}</span>
        <span style={typeBadgeStyle}>{getTypeLabel(data.questionType)}</span>
      </div>

      <div style={nodeBodyStyle}>
        {(data.outputs || []).map((output, index) => (
          <OutputHandle key={index} label={output.label} id={output.id} />
        ))}
      </div>
    </div>
  );
}

export default React.memo(QuestionNode);