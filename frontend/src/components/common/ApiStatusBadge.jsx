import React, { useState, useEffect } from 'react';
import { Globe, Server, Check, RefreshCw, ChevronDown, Wifi } from 'lucide-react';
import { getApiMode, setApiMode, getActiveConfig, pingLocalBackend, ONLINE_API_URL, LOCAL_API_URL } from '../../config/api';

export const ApiStatusBadge = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [localAvailable, setLocalAvailable] = useState(null);
  const [checking, setChecking] = useState(false);
  const [activeConfig, setActiveConfig] = useState(getActiveConfig());

  const checkStatus = async () => {
    setChecking(true);
    const alive = await pingLocalBackend();
    setLocalAvailable(alive);
    setChecking(false);
  };

  useEffect(() => {
    const handleModeChange = () => {
      setActiveConfig(getActiveConfig());
    };
    window.addEventListener('jts_api_mode_changed', handleModeChange);
    return () => window.removeEventListener('jts_api_mode_changed', handleModeChange);
  }, []);

  const currentMode = getApiMode();

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shadow-sm ${
          activeConfig.isOnline
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
        } hover:opacity-90`}
        title={`Backend: ${activeConfig.isOnline ? 'Online Cloud API' : 'Local Machine API'}`}
      >
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            activeConfig.isOnline ? 'bg-emerald-400' : 'bg-indigo-400'
          }`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            activeConfig.isOnline ? 'bg-emerald-600' : 'bg-indigo-600'
          }`} />
        </span>

        <span className="hidden sm:inline">
          {activeConfig.isOnline ? 'Online API' : 'Local API'}
        </span>
        <ChevronDown size={13} className="text-muted-foreground opacity-70" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl bg-card border shadow-xl ring-1 ring-black/5 focus:outline-none z-50 p-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Server size={14} className="text-primary" />
                Backend Connection Setup
              </div>
              <button
                type="button"
                onClick={checkStatus}
                disabled={checking}
                className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                title="Check local server"
              >
                <RefreshCw size={12} className={checking ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              {/* Online Option */}
              <button
                type="button"
                onClick={() => setApiMode('online')}
                className={`w-full text-left p-2 rounded-lg flex items-center justify-between transition-colors ${
                  currentMode === 'online'
                    ? 'bg-emerald-100 text-emerald-950 dark:bg-emerald-900/30 dark:text-emerald-200 font-bold'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe size={15} className="text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-semibold">Online Cloud Backend</div>
                    <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[170px]">
                      erpapi.jtsonline.shop
                    </div>
                  </div>
                </div>
                {currentMode === 'online' && <Check size={15} className="text-emerald-600 shrink-0" />}
              </button>

              {/* Local Option */}
              <button
                type="button"
                onClick={() => setApiMode('local')}
                className={`w-full text-left p-2 rounded-lg flex items-center justify-between transition-colors ${
                  currentMode === 'local'
                    ? 'bg-indigo-100 text-indigo-950 dark:bg-indigo-900/30 dark:text-indigo-200 font-bold'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Server size={15} className="text-indigo-600 shrink-0" />
                  <div>
                    <div className="font-semibold flex items-center gap-1.5">
                      Local Backend
                      {localAvailable === true && (
                        <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.2 rounded font-semibold">Active</span>
                      )}
                      {localAvailable === false && (
                        <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.2 rounded font-semibold">Offline</span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[170px]">
                      http://localhost:5000/api
                    </div>
                  </div>
                </div>
                {currentMode === 'local' && <Check size={15} className="text-indigo-600 shrink-0" />}
              </button>

              {/* Auto Option */}
              <button
                type="button"
                onClick={() => setApiMode('auto')}
                className={`w-full text-left p-2 rounded-lg flex items-center justify-between transition-colors ${
                  currentMode === 'auto'
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Wifi size={15} className="text-primary shrink-0" />
                  <div>
                    <div className="font-semibold">Auto Switching</div>
                    <div className="text-[10px] text-muted-foreground">
                      Online by default / Local when active
                    </div>
                  </div>
                </div>
                {currentMode === 'auto' && <Check size={15} className="text-primary shrink-0" />}
              </button>
            </div>

            <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground">
              Connected to:{' '}
              <span className="font-mono text-foreground font-bold">
                {activeConfig.apiUrl}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ApiStatusBadge;
