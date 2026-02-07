import { useState, useEffect } from 'react';

export type Orientation = 'portrait' | 'landscape';

/**
 * Checks if the user is in landscape mode on a mobile device.
 * Used to prompt the user to rotate their device for better experience if needed.
 */
export function useScreenOrientation() {
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const isMobile = window.innerWidth <= 768; // Tablet/Mobile breakpoint
      
      setOrientation(isLandscape ? 'landscape' : 'portrait');
      setIsMobileLandscape(isMobile && isLandscape);
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return { orientation, isMobileLandscape };
}
