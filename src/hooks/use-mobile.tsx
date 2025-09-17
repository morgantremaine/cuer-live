
import * as React from "react"

const MOBILE_BREAKPOINT = 640  // sm breakpoint for phones
const TABLET_BREAKPOINT = 768  // md breakpoint for tablets
const DESKTOP_BREAKPOINT = 1024 // lg breakpoint for desktop

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      
      // Consider it mobile if width is less than 640px (phones)
      const shouldUseMobileLayout = width < MOBILE_BREAKPOINT
      
      // Only update state if the value actually changed
      setIsMobile(prev => prev !== shouldUseMobileLayout ? shouldUseMobileLayout : prev)
    }
    
    checkDevice()
    
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    mql.addEventListener("change", checkDevice)
    window.addEventListener("orientationchange", checkDevice)
    window.addEventListener("resize", checkDevice)
    
    return () => {
      mql.removeEventListener("change", checkDevice)
      window.removeEventListener("orientationchange", checkDevice)
      window.removeEventListener("resize", checkDevice)
    }
  }, [])

  return !!isMobile
}

// New hook for tablet detection
export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      
      // Consider it tablet if width is between 640px and 1024px
      const shouldUseTabletLayout = width >= MOBILE_BREAKPOINT && width < DESKTOP_BREAKPOINT
      
      // Only update state if the value actually changed
      setIsTablet(prev => prev !== shouldUseTabletLayout ? shouldUseTabletLayout : prev)
    }
    
    checkDevice()
    
    const mql = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${DESKTOP_BREAKPOINT - 1}px)`)
    mql.addEventListener("change", checkDevice)
    window.addEventListener("orientationchange", checkDevice)
    window.addEventListener("resize", checkDevice)
    
    return () => {
      mql.removeEventListener("change", checkDevice)
      window.removeEventListener("orientationchange", checkDevice)
      window.removeEventListener("resize", checkDevice)
    }
  }, [])

  return !!isTablet
}

// Combined hook for responsive layout decisions
export function useResponsiveLayout() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  
  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    isMobileOrTablet: isMobile || isTablet
  }
}
