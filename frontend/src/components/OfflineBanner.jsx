import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #EF4444, #DC2626)',
      color: '#FFFFFF',
      padding: '8px 16px',
      fontSize: 12,
      fontWeight: 700,
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justify: 'center',
      gap: 8,
      position: 'sticky',
      top: 0,
      zIndex: 9999,
      boxShadow: '0 2px 10px rgba(239, 68, 68, 0.3)'
    }} className="animate-fade-in">
      <WifiOff size={16} />
      <span>⚠ Internet Disconnected — Viewing Cached Data Only. AI generation features disabled.</span>
    </div>
  );
}
