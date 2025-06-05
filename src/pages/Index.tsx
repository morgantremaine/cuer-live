
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

    // If we're on "/rundown" without an ID, and we have saved rundowns, redirect to the first one
    if (!params.id && window.location.pathname === '/rundown' && !loading && savedRundowns.length > 0) {
      console.log('Index page: On /rundown without ID, redirecting to first rundown');
      navigate(`/rundown/${savedRundowns[0].id}`);
      return;
    }

    // If we're on "/rundown" without an ID and no saved rundowns, redirect to dashboard
    if (!params.id && window.location.pathname === '/rundown' && !loading && savedRundowns.length === 0) {
      console.log('Index page: On /rundown with no saved rundowns, redirecting to dashboard');
      navigate('/dashboard');
      return;
    }
  }, [params.id, navigate, savedRundowns, loading]);

  // Only render RundownIndexContent if we have a valid rundown ID
  if (!params.id) {
    console.log('Index page: No rundown ID, showing loading state');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Loading...</h2>
          <p className="text-gray-600">Redirecting...</p>
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
      );
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
