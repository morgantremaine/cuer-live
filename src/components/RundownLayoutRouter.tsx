import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Index from '@/pages/Index';
import Blueprint from '@/pages/Blueprint';
import CameraPlotEditor from '@/pages/CameraPlotEditor';
import Teleprompter from '@/pages/Teleprompter';

const RundownLayoutRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/blueprint" element={<Blueprint />} />
      <Route path="/camera-plot-editor" element={<CameraPlotEditor />} />
      <Route path="/teleprompter" element={<Teleprompter />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default RundownLayoutRouter;