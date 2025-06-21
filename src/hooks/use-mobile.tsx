
import * as React from "react"

const MOBILE_BREAKPOINT = 768  // Changed back to 768 for better tablet detection
const TABLET_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      // Consider it mobile if:
      // 1. Width is less than 768px (mobile/tablet breakpoint)
      // 2. OR if it's a touch device with width less than 900px
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      
      const shouldUseMobileLayout = 
        width < MOBILE_BREAKPOINT || 
        (isTouchDevice && width < 900)
      
      setIsMobile(shouldUseMobileLayout)
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
