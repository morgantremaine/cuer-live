import { useEffect, useCallback } from 'react';
import { useResponsiveLayout } from './use-mobile';

/**
 * Mobile viewport management hook
 * 
 * Handles dynamic viewport height calculation for mobile devices
 * and sets CSS custom properties for stable layout calculations
 */
export const useMobileViewport = () => {
  const { isMobile, isTablet, isMobileOrTablet } = useResponsiveLayout();

  const updateViewportHeight = useCallback(() => {
    if (!isMobileOrTablet) return;

    // Get the actual viewport height
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    
    // Calculate usable height (excluding potential browser chrome)
    // For mobile browsers, we want the stable viewport height
    const documentHeight = document.documentElement.clientHeight;
    const actualHeight = Math.min(vh, documentHeight);
    
    // Set CSS custom properties for stable mobile layout
    document.documentElement.style.setProperty('--app-height', `${actualHeight}px`);
    document.documentElement.style.setProperty('--viewport-height', `${vh}px`);
    document.documentElement.style.setProperty('--viewport-width', `${vw}px`);
    
    // Prevent body scrolling on mobile to avoid viewport conflicts
    if (isMobileOrTablet) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      
      // iOS Safari specific fixes
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        (document.body.style as any).webkitOverflowScrolling = 'touch';
        // Prevent zoom on input focus
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
        }
      }
    } else {
      // Reset body styles for desktop
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    }

    console.log('📱 Mobile viewport updated:', {
      isMobile,
      isTablet,
      vh,
      actualHeight,
      userAgent: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
    });
  }, [isMobile, isTablet, isMobileOrTablet]);

  useEffect(() => {
    // Initial setup
    updateViewportHeight();

    // Handle viewport changes
    const handleResize = () => {
      // Debounce resize events to avoid excessive calculations
      setTimeout(updateViewportHeight, 100);
    };

    const handleOrientationChange = () => {
      // Handle orientation changes with longer delay to let browser settle
      setTimeout(updateViewportHeight, 300);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Handle visual viewport API if available (newer mobile browsers)
    if (window.visualViewport) {
      const handleVisualViewportChange = () => {
        updateViewportHeight();
      };
      
      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
      window.visualViewport.addEventListener('scroll', handleVisualViewportChange);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleOrientationChange);
        window.visualViewport?.removeEventListener('resize', handleVisualViewportChange);
        window.visualViewport?.removeEventListener('scroll', handleVisualViewportChange);
      };
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [updateViewportHeight]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isMobileOrTablet) {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
      }
    };
  }, [isMobileOrTablet]);

  return {
    isMobileViewport: isMobileOrTablet,
    updateViewportHeight
  };
};