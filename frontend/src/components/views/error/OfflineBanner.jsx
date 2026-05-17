/**
 * Offline detector banner. Subscribes to the browser's online / offline
 * events and renders a small fixed-position bar when the network drops.
 *
 * We deliberately don't take over the screen with a full OfflinePage —
 * users may have unsaved local state, and a banner that retries on its
 * own is friendlier than a hard interstitial.
 */

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import './css/error.css';

export default function OfflineBanner() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="offline-banner" role="status">
      <WifiOff size={14} />
      <span>You&apos;re offline. Some changes may not save until you reconnect.</span>
    </div>
  );
}
