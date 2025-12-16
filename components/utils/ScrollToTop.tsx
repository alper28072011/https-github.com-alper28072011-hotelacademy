
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Modern browsers
    window.scrollTo(0, 0);
    
    // Fallback for edge cases where the main scroll container is different
    const mainElement = document.querySelector('main');
    if (mainElement) {
        mainElement.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
};

export default ScrollToTop;
