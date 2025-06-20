
import * as React from "react"

const MOBILE_BREAKPOINT = 640  // Changed from 768 to match sm: breakpoint
const TABLET_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      // Consider it mobile if:
      // 1. Width is less than 640px (mobile breakpoint)
      // 2. OR if it's a touch device with width less than 700px and in portrait
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isPortrait = height > width
      
      const shouldUseMobileLayout = 
        width < MOBILE_BREAKPOINT || 
        (isTouchDevice && isPortrait && width < 700)
      
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
