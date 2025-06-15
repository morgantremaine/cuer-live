
import React from 'react';

interface RundownFooterProps {
  totalSegments: number;
}

const RundownFooter = ({ totalSegments }: RundownFooterProps) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-2 border-t border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
        <span>{totalSegments} segments</span>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Current</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span>Done</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Next</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RundownFooter;
