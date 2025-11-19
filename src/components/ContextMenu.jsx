// src/components/ContextMenu.jsx
import React, { useCallback } from 'react';

const ContextMenu = ({ id, top, left, type, onDuplicate, onDelete, onClose }) => {
  // פונקציית העתקה כדי לסגור את התפריט אחרי הפעולה
  const duplicate = useCallback(() => {
    onDuplicate(id, type);
    onClose();
  }, [id, type, onDuplicate, onClose]);

  // פונקציית מחיקה
  const deleteNode = useCallback(() => {
    if (window.confirm(`האם למחוק את הפריט ${id} לצמיתות?`)) {
      onDelete(id);
      onClose();
    }
  }, [id, onDelete, onClose]);

  // הגדרת כותרת לפי סוג הפריט
  const title = type === 'symptomPill' ? 'ניהול סימפטום' : 'ניהול התמחות';
  const deleteText = type === 'symptomPill' ? 'מחק סימפטום' : 'מחק התמחות';

  return (
    <div
      style={{ top, left, zIndex: 50, position: 'absolute', background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '8px 0', width: '180px', direction: 'rtl', textAlign: 'right' }}
      className="context-menu"
    >
      <div style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 'bold', color: '#667eea', borderBottom: '1px solid #eee', marginBottom: '4px' }}>
        {title}
      </div>
      
      {type === 'symptomPill' && (
        <button onClick={duplicate} className="context-menu-item">
          שכפל סימפטום 🔄
        </button>
      )}

      <button onClick={deleteNode} className="context-menu-item delete-item">
        {deleteText} 🗑️
      </button>

      {/* CSS עבור context-menu-item */}
      <style>{`
        .context-menu-item {
          display: block;
          width: 100%;
          text-align: right;
          padding: 8px 12px;
          border: none;
          background: none;
          font-size: 14px;
          cursor: pointer;
          transition: background-color 0.1s;
          color: #1e293b;
        }
        .context-menu-item:hover {
          background-color: #f1f5f9;
        }
        .context-menu-item.delete-item {
          color: #ef4444;
          border-top: 1px solid #eee;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
};

export default ContextMenu;