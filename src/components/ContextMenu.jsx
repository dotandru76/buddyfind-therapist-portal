// src/components/ContextMenu.jsx
import React, { useCallback } from 'react';

const ContextMenu = ({ top, left, type, onDuplicate, onDelete, onClose }) => {
  const deleteNode = useCallback(() => {
    onDelete();
    onClose();
  }, [onDelete, onClose]);

  const duplicate = useCallback(() => {
    if (onDuplicate) onDuplicate();
    onClose();
  }, [onDuplicate, onClose]);

  return (
    <div
      style={{ top, left, zIndex: 50, position: 'absolute' }}
      className="bg-white border border-gray-200 rounded-lg shadow-xl py-1 w-48 overflow-hidden"
    >
      {type === 'symptomPill' && onDuplicate && (
        <button 
            onClick={duplicate} 
            className="w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-2"
        >
            <span>🔁</span> שכפל סימפטום
        </button>
      )}

      <button 
        onClick={deleteNode} 
        className="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-2 border-t border-gray-100"
      >
        <span>🗑️</span> מחיקה
      </button>
    </div>
  );
};

export default ContextMenu;