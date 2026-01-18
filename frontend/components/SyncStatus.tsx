/**
 * Sync Status Indicator
 * Shows when data is being synced to Supabase or using local storage
 */

import React, { useState, useEffect } from 'react';

interface SyncStatusProps {
  isOnline?: boolean;
  isSyncing?: boolean;
  lastSyncTime?: number;
}

const SyncStatus: React.FC<SyncStatusProps> = ({ 
  isOnline = navigator.onLine,
  isSyncing = false,
  lastSyncTime 
}) => {
  const [onlineStatus, setOnlineStatus] = useState(isOnline);

  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Only show if offline or syncing
  if (onlineStatus && !isSyncing) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
      {!onlineStatus ? (
        <>
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
          <span>Offline - Using local storage</span>
        </>
      ) : isSyncing ? (
        <>
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
          <span>Syncing...</span>
        </>
      ) : null}
    </div>
  );
};

export default SyncStatus;
