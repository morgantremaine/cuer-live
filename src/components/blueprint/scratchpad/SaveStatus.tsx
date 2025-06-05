
import React from 'react';

interface SaveStatusProps {
  status: 'saved' | 'saving' | 'unsaved';
}

const SaveStatus = ({ status }: SaveStatusProps) => {
  switch (status) {
    case 'saving':
      return <span className="text-xs text-blue-400">Saving...</span>;
    case 'unsaved':
      return <span className="text-xs text-orange-400">Unsaved changes</span>;
    case 'saved':
      return <span className="text-xs text-green-400">Saved</span>;
    default:
      return null;
  }
};

export default SaveStatus;
