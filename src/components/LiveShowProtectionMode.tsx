import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck } from 'lucide-react';
import { localShadowStore } from '@/stores/localShadowStore';

interface LiveShowProtectionModeProps {
  className?: string;
}

const PROTECTION_MODE_KEY = 'liveshow_protection_mode';
const PROTECTION_MODE_URL_PARAM = 'protection';

export const LiveShowProtectionMode = ({ className }: LiveShowProtectionModeProps) => {
  const [isProtectionMode, setIsProtectionMode] = useState(() => {
    // Check URL params first
    const urlParams = new URLSearchParams(window.location.search);
    const urlProtection = urlParams.get(PROTECTION_MODE_URL_PARAM);
    if (urlProtection === 'true') return true;
    if (urlProtection === 'false') return false;
    
    // Check localStorage
    const stored = localStorage.getItem(PROTECTION_MODE_KEY);
    return stored === 'true';
  });

  useEffect(() => {
    // Apply protection settings
    if (isProtectionMode) {
      localShadowStore.setProtectionWindow(5000); // 5s protection window
      console.log('🛡️ Live Show Protection Mode: ENABLED (5s typing protection)');
    } else {
      localShadowStore.setProtectionWindow(3000); // Standard 3s protection
      console.log('🛡️ Live Show Protection Mode: disabled (3s typing protection)');
    }
  }, [isProtectionMode]);

  useEffect(() => {
    // Listen for URL parameter changes
    const handleUrlChange = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlProtection = urlParams.get(PROTECTION_MODE_URL_PARAM);
      if (urlProtection !== null) {
        const newMode = urlProtection === 'true';
        setIsProtectionMode(newMode);
        localStorage.setItem(PROTECTION_MODE_KEY, newMode.toString());
      }
    };

    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', handleUrlChange);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  const toggleProtectionMode = () => {
    const newMode = !isProtectionMode;
    setIsProtectionMode(newMode);
    localStorage.setItem(PROTECTION_MODE_KEY, newMode.toString());
    
    // Update URL parameter
    const url = new URL(window.location.href);
    if (newMode) {
      url.searchParams.set(PROTECTION_MODE_URL_PARAM, 'true');
    } else {
      url.searchParams.delete(PROTECTION_MODE_URL_PARAM);
    }
    window.history.replaceState(null, '', url);
  };

  if (!isProtectionMode) {
    return (
      <Badge 
        variant="outline" 
        className={`cursor-pointer hover:bg-accent ${className}`}
        onClick={toggleProtectionMode}
      >
        <Shield className="h-3 w-3 mr-1" />
        Protection: Off
      </Badge>
    );
  }

  return (
    <Badge 
      variant="default" 
      className={`cursor-pointer bg-green-600 hover:bg-green-700 text-white ${className}`}
      onClick={toggleProtectionMode}
    >
      <ShieldCheck className="h-3 w-3 mr-1" />
      Protected
    </Badge>
  );
};