import React from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from '@/components/ui/toaster';
import RundownIndex from '@/pages/RundownIndex';
import SharedRundown from '@/pages/SharedRundown';
import Blueprint from '@/pages/Blueprint';
import Teleprompter from '@/pages/Teleprompter';

import ExternalReview from '@/pages/ExternalReview';

const queryClient = new QueryClient();

function App() {
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-background font-sans antialiased">
          <Toaster />
          <Routes>
            <Route path="/" element={<RundownIndex />} />
            <Route path="/rundown/:id" element={<RundownIndex />} />
            <Route path="/shared/rundown/:id" element={<SharedRundown />} />
            <Route path="/blueprint/:id" element={<Blueprint />} />
            <Route path="/teleprompter/:id" element={<Teleprompter />} />
            
            <Route path="/external-review/:id" element={<ExternalReview />} />
            
          </Routes>
        </div>
      </QueryClientProvider>
    </Router>
  );
}

export default App;
