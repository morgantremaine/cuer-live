import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CollaborationTest } from '@/components/CollaborationTest';

// Create a simple test route
const TestRoutes = () => {
  return (
    <Routes>
      <Route path="/collaboration-test" element={<CollaborationTest />} />
      <Route path="*" element={<Navigate to="/collaboration-test" replace />} />
    </Routes>
  );
};

export default TestRoutes;