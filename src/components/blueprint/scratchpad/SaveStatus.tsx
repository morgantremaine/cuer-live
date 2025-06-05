
import React from 'react';

interface SaveStatusProps {
  status: 'saved' | 'saving' | 'error';
}

const SaveStatus = ({ status }: SaveStatusProps) => {
  switch (status) {
    case 'saving':
      return <span className="text-xs text-blue-400">Saving...</span>;
    case 'error':
      return <span className="text-xs text-red-400">Error saving</span>;
    case 'saved':
      return <span className="text-xs text-green-400">Saved</span>;
    default:
      return null;
  }
};

export default SaveStatus;
