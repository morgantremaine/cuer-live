
import React from 'react';

interface RundownFooterProps {
  totalSegments: number;
}

const RundownFooter = ({ totalSegments }: RundownFooterProps) => {
  return (
    <div className="bg-gray-50 p-4 border-t">
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>{totalSegments} segments total</span>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Current</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-400 rounded"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Upcoming</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RundownFooter;
