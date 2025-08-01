import React from 'react';
import { RundownModification } from '@/hooks/useCuerModifications/types';
import InlineModificationRequest from './InlineModificationRequest';

interface ModificationDisplayProps {
  modifications: RundownModification[];
  onApply: (modifications: RundownModification[]) => void;
  onCancel: () => void;
}

const ModificationDisplay = ({ modifications, onApply, onCancel }: ModificationDisplayProps) => {
  const handleConfirm = () => {
    onApply(modifications);
  };

  return (
    <div className="mt-3">
      <InlineModificationRequest
        modifications={modifications}
        onConfirm={handleConfirm}
        onCancel={onCancel}
      />
    </div>
  );
};

export default ModificationDisplay;