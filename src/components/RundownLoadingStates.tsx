
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface RundownLoadingStatesProps {
  isCreatingNew: boolean;
  loading: boolean;
  hasParamsId: boolean;
}

const RundownLoadingStates = ({ isCreatingNew, loading, hasParamsId }: RundownLoadingStatesProps) => {
  const navigate = useNavigate();

  // Show loading state while creating new rundown
  if (!hasParamsId && (isCreatingNew || loading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Creating New Rundown...</h2>
          <p className="text-gray-600">Please wait while we set up your rundown.</p>
        </div>
      </div>
    );
  }

  // If we're still on /rundown without an ID and not creating, something went wrong
  if (!hasParamsId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Error</h2>
          <p className="text-gray-600">Unable to create new rundown. Please try again.</p>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default RundownLoadingStates;
