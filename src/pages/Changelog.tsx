
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Changelog = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link to="/dashboard">
            <Button variant="ghost" className="mb-4 text-gray-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Changelog</h1>
          <p className="text-gray-400">Track all updates and improvements to Cuer Live</p>
        </div>

        {/* Changelog entries will be added here when requested */}
        <div className="space-y-8">
          <div className="text-center text-gray-400 py-12">
            <p>Changelog entries will be published here as updates are made.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Changelog;
