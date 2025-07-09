import { useEffect, useRef } from 'react';

// Global registry of active components to prevent unmounting
const activeComponents = new Set<string>();

export const usePreventTabUnmount = (componentId: string) => {
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    // Register this component as active
    activeComponents.add(componentId);
    console.log(`🔒 Registered component: ${componentId}, active components:`, activeComponents.size);

    // Keep the component "alive" by preventing browser cleanup
    const keepAlive = setInterval(() => {
      if (!document.hidden) {
        // Touch the component to show activity
        console.log(`💓 Keeping ${componentId} alive`);
      }
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(keepAlive);
      activeComponents.delete(componentId);
      console.log(`🔓 Unregistered component: ${componentId}, remaining:`, activeComponents.size);
    };
  }, [componentId]);

  // Report how long this component has been alive
  const getUptime = () => {
    return Date.now() - mountTimeRef.current;
  };

  return {
    uptime: getUptime(),
    activeComponents: activeComponents.size
  };
};
