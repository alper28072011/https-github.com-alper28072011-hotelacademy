
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from './firebase';
import { AnalyticsEvent, InteractionType } from '../types/analytics';

// --- CONFIGURATION ---
const BATCH_SIZE_THRESHOLD = 20; // 20 olayda bir gönder
const TIME_THRESHOLD_MS = 30000; // veya 30 saniyede bir gönder
const COLLECTION_NAME = 'analytics_events';

class AnalyticsEngine {
  private queue: AnalyticsEvent[] = [];
  private flushTimer: any = null;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupEmergencyFlush();
  }

  /**
   * Generates a unique session ID for this browser tab session.
   */
  private generateSessionId(): string {
    const stored = sessionStorage.getItem('analytics_session_id');
    if (stored) return stored;
    const newId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', newId);
    return newId;
  }

  /**
   * Captures basic device info.
   */
  private getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language,
      platform: navigator.platform
    };
  }

  /**
   * Removes undefined values from object tree using JSON serialization.
   * Firestore throws error on 'undefined'.
   */
  private sanitize(data: any): any {
    return JSON.parse(JSON.stringify(data));
  }

  /**
   * Main entry point to log an event.
   */
  public logEvent(
    type: InteractionType,
    userId: string,
    context: AnalyticsEvent['context'],
    payload?: AnalyticsEvent['payload']
  ) {
    const rawEvent: AnalyticsEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userId || 'anonymous',
      sessionId: this.sessionId,
      timestamp: Date.now(),
      type,
      context,
      payload,
      deviceInfo: this.getDeviceInfo()
    };

    const event = this.sanitize(rawEvent);

    this.queue.push(event);

    // Threshold checks
    if (this.queue.length >= BATCH_SIZE_THRESHOLD) {
      this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), TIME_THRESHOLD_MS);
    }
  }

  /**
   * Flushes the queue to Firestore using Batch Writes.
   */
  public async flush() {
    if (this.queue.length === 0) return;

    // 1. Swap queue to prevent race conditions during async write
    const eventsToSend = [...this.queue];
    this.queue = [];
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    try {
      // 2. Create Firestore Batch
      const batch = writeBatch(db);
      
      eventsToSend.forEach(event => {
        // Shard by Date/Hour to prevent hotspots if massive scale (YYYY-MM-DD)
        const dateKey = new Date().toISOString().split('T')[0]; 
        // Sub-collection pattern: analytics_shards/{date}/events/{eventId}
        // OR Flat collection for simplicity in this MVP:
        const ref = doc(collection(db, COLLECTION_NAME));
        batch.set(ref, event);
      });

      await batch.commit();
      
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[Analytics] Flushed ${eventsToSend.length} events.`);
      }

    } catch (error) {
      console.error("[Analytics] Flush failed, restoring queue.", error);
      // Restore events to queue to try again later
      this.queue = [...eventsToSend, ...this.queue];
    }
  }

  /**
   * Ensures data is sent even if the user closes the tab.
   */
  private setupEmergencyFlush() {
    if (typeof window === 'undefined') return;

    const emergencyHandler = () => {
      if (this.queue.length === 0) return;
      
      // Note: Firestore SDK might not complete in 'unload'.
      // The standard way is Navigator.sendBeacon, but that requires a REST endpoint.
      // Since we are client-side only with SDK, we try our best with a sync-like behavior or just trigger flush.
      // In a real high-end app, this would hit a Cloud Function via sendBeacon.
      
      // Attempt explicit flush
      this.flush(); 
      
      // Fallback for immediate "Beacon" style data preservation (e.g. to LocalStorage to send on next load)
      // localStorage.setItem('analytics_unsent', JSON.stringify(this.queue));
    };

    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            this.flush(); // Flush when user switches tabs
        }
    });

    window.addEventListener('beforeunload', emergencyHandler);
  }
}

// Singleton Instance
export const analytics = new AnalyticsEngine();
