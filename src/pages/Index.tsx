
import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import RundownIndexContent from '@/components/RundownIndexContent';
import { useRundownStorage } from '@/hooks/useRundownStorage';

const Index = () => {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const { savedRundowns, loading } = useRundownStorage();

  console.log('Index page: Current route and params:', {
    pathname: window.location.pathname,
    paramsId: params.id,
    hasRundowns: savedRundowns.length > 0,
    loading
  });

  // Check if we're on the root route without a rundown ID
  useEffect(() => {
    // If we're on the exact root route ("/") and not on "/rundown" or "/rundown/:id"
    if (!params.id && window.location.pathname === '/') {
      console.log('Index page: On root route, redirecting to dashboard');
      navigate('/dashboard');
      return;
    }

    // If we're on "/rundown" without an ID, allow new rundown creation
    // Don't redirect - this is the intended behavior for creating new rundowns
    if (!params.id && window.location.pathname === '/rundown') {
      console.log('Index page: On /rundown without ID, allowing new rundown creation');
      return;
    }
  }, [params.id, navigate]);

  // If we're on "/rundown" without an ID, render the content for new rundown creation
  if (!params.id && window.location.pathname === '/rundown') {
    console.log('Index page: Rendering new rundown creation interface');
    return (
      <div className="min-h-screen bg-gray-50">
        <RundownIndexContent />
      </div>
    );
  }

  // Only show loading state if we have a rundown ID but are still loading
  if (!params.id) {
    console.log('Index page: No rundown ID, showing loading state');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Loading...</h2>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Validate that the rundown ID is not a placeholder
  if (params.id === ':id') {
    console.log('Index page: Invalid placeholder ID, redirecting to dashboard');
    navigate('/dashboard');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Invalid Route</h2>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  console.log('Index page: Rendering RundownIndexContent for ID:', params.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <RundownIndexContent />
    </div>
  );
};

export default Index;
