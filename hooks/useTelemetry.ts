
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics } from '../services/analyticsService';
import { useAuthStore } from '../stores/useAuthStore';
import { InteractionType, AnalyticsEvent } from '../types/analytics';

export const useTelemetry = () => {
  const { currentUser } = useAuthStore();
  const location = useLocation();
  const userId = currentUser?.id || 'anonymous';

  // Helper to log manual events
  const logEvent = (
    type: InteractionType,
    contextData: Partial<AnalyticsEvent['context']> = {},
    payload?: AnalyticsEvent['payload']
  ) => {
    analytics.logEvent(
      type,
      userId,
      {
        pageUrl: window.location.pathname,
        ...contextData
      },
      payload
    );
  };

  // Automatic Page View Tracking
  useEffect(() => {
    logEvent('PAGE_VIEW', {
      pageTitle: document.title
    });
  }, [location.pathname]); // Trigger on route change

  return { logEvent };
};

/**
 * A specialized hook to track time spent on a component/view
 */
export const useTimeTracker = (componentName: string, contextData?: any) => {
    const { logEvent } = useTelemetry();
    const startTime = useRef(Date.now());

    useEffect(() => {
        startTime.current = Date.now();

        return () => {
            const duration = Date.now() - startTime.current;
            // Only log significant durations (> 100ms)
            if (duration > 100) {
                logEvent('SLIDE_VIEW', // Or GENERIC_VIEW, reusing SLIDE_VIEW for timed components
                    { component: componentName, ...contextData }, 
                    { duration }
                );
            }
        };
    }, [componentName, JSON.stringify(contextData)]); // Reset timer if context changes
};
