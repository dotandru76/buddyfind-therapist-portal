// src/components/QuestionNode.jsx
import React from 'react';
import { Handle, Position } from 'reactflow';

const nodeStyle = {
  background: 'white',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  minWidth: 280,
  textAlign: 'right',
  direction: 'rtl',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  overflow: 'hidden',
  fontFamily: 'sans-serif'
};

const nodeHeaderStyle = {
  background: 'linear-gradient(to left, #667eea, #764ba2)',
  color: 'white',
  padding: '10px 15px',
  fontSize: '14px',
  fontWeight: 'bold',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const typeBadgeStyle = {
    fontSize: '10px',
    background: 'rgba(255,255,255,0.25)',
    padding: '2px 8px',
    borderRadius: '10px',
    marginLeft: '0'
};

const nodeBodyStyle = {
  padding: '0',
  background: '#f8fafc',
};

const outputRowStyle = {
  position: 'relative',
  padding: '8px 15px',
  borderBottom: '1px solid #e2e8f0',
  display: 'flex',
  justifyContent: 'space-between', // מרווח בין הטקסט לידית
  alignItems: 'center',
  fontSize: '13px',
  color: '#334155'
};

const QuestionNode = ({ data, selected }) => {
  
  const customNodeStyle = {
    ...nodeStyle,
    border: selected ? '2px solid #764ba2' : nodeStyle.border,
    boxShadow: selected ? '0 0 0 4px rgba(118, 75, 162, 0.2)' : nodeStyle.boxShadow,
  };

  const getTypeLabel = (type) => {
      switch(type) {
          case 'single': return 'בחירה יחידה';
          case 'multiple': return 'בחירה מרובה';
          case 'slider': return 'טווח/סליידר';
          default: return 'כללי';
      }
  };

  return (
    <div style={customNodeStyle}>
      {/* נקודת כניסה ראשית (למעלה או שמאל) */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ background: '#64748b', width: '12px', height: '12px', left: '-6px' }} 
      />
      
      <div style={nodeHeaderStyle}>
        <span>{data.label}</span>
        <span style={typeBadgeStyle}>{getTypeLabel(data.questionType)}</span>
      </div>

      <div style={nodeBodyStyle}>
        {(data.outputs || []).map((output, index) => (
          <div key={`${output.id}-${index}`} style={outputRowStyle}>
            <span>{output.label}</span>
            {/* נקודת יציאה לכל תשובה */}
            <Handle 
              type="source" 
              position={Position.Right} 
              id={String(output.id)} 
              style={{ background: '#10b981', width: '10px', height: '10px', right: '-5px' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(QuestionNode);