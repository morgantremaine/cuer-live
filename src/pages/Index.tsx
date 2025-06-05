
import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import RundownIndexContent from '@/components/RundownIndexContent';
import { useRundownStorage } from '@/hooks/useRundownStorage';

const Index = () => {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const { savedRundowns, loading } = useRundownStorage();

  // Check if we're on the root route without a rundown ID
  useEffect(() => {
    // If we're on the exact root route ("/") and not on "/rundown" or "/rundown/:id"
    if (!params.id && window.location.pathname === '/') {
      // Redirect to dashboard instead of trying to load rundown functionality
      navigate('/dashboard');
      return;
    }

    // If we're on "/rundown" without an ID, and we have saved rundowns, redirect to the first one
    if (!params.id && window.location.pathname === '/rundown' && !loading && savedRundowns.length > 0) {
      navigate(`/rundown/${savedRundowns[0].id}`);
      return;
    }
  }, [params.id, navigate, savedRundowns, loading]);

  // Only render RundownIndexContent if we have a rundown ID
  if (!params.id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Loading...</h2>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <RundownIndexContent />
    </div>
  );
};

export default Index;
