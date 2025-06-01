
import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      // Consider it mobile/tablet if:
      // 1. Width is less than 1024px (tablet breakpoint)
      // 2. OR if it's a touch device with width less than 1100px (but not iPad horizontal at 1112px)
      // 3. OR if height > width (portrait orientation) and width < 1100px
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isPortrait = height > width
      
      const shouldUseMobileLayout = 
        width < TABLET_BREAKPOINT || 
        (isTouchDevice && width < 1100) ||
        (isPortrait && width < 1100)
      
      setIsMobile(shouldUseMobileLayout)
    }
    
    checkDevice()
    
    const mql = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT - 1}px)`)
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
