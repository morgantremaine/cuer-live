import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Changelog: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mr-4 text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl font-bold text-white">Changelog</h1>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-8">
            <div className="text-center text-gray-400">
              <h2 className="text-2xl font-semibold mb-4">Coming Soon</h2>
              <p className="text-lg mb-4">
                We'll publish our latest updates and improvements here.
              </p>
              <p className="text-sm opacity-75">
                Check back soon for the latest changelog entries.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Changelog;