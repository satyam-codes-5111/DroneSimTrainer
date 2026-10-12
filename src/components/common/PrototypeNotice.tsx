import React, { useState, useEffect } from 'react';
import { Terminal, Database, Server, Cpu } from 'lucide-react';

interface PrototypeNoticeProps {
  onOpenDetails: () => void;
}

export const PrototypeNotice: React.FC<PrototypeNoticeProps> = ({ onOpenDetails }) => {
  const [dbStatus, setDbStatus] = useState<{
    storageEngine: 'postgresql' | 'filesystem_json';
    pgConnected: boolean;
  }>({
    storageEngine: 'filesystem_json',
    pgConnected: false
  });

  useEffect(() => {
    fetch('/api/database/status')
      .then(res => res.json())
      .then(data => {
        if (data.activeStorageEngine) {
          setDbStatus({
            storageEngine: data.activeStorageEngine,
            pgConnected: data.postgres?.isConnected || false
          });
        }
      })
      .catch(() => {
        // Fallback default
      });
  }, []);

  return (
    <aside aria-label="Prototype Status" className="bg-slate-900 border-b border-slate-800 text-xs text-slate-300 px-4 py-2">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-emerald-400">
            PROTOTYPE PREVIEW
          </span>
          <span className="text-slate-600 hidden sm:inline" aria-hidden="true">·</span>
          <span>SIH 2026 Problem Statement 26247</span>
          <span className="text-slate-600 hidden sm:inline" aria-hidden="true">·</span>
          <span className="text-slate-400">
            AI-Enabled Drone & Counter-Drone Threat Simulation Trainer
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span className="flex items-center gap-1">
              <Database className={`w-3 h-3 ${dbStatus.pgConnected ? 'text-emerald-400' : 'text-cyan-400'}`} />
              <span>
                {dbStatus.pgConnected
                  ? 'Storage: PostgreSQL (Connected)'
                  : 'Storage: Local JSON (PG Ready)'}
              </span>
            </span>
            <span className="text-slate-700" aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <Server className="w-3 h-3 text-emerald-400" />
              <span>Backend: Express REST API (Port 3000)</span>
            </span>
            <span className="text-slate-700 hidden sm:inline" aria-hidden="true">·</span>
            <span className="hidden sm:flex items-center gap-1">
              <Cpu className="w-3 h-3 text-emerald-500" />
              <span>Simulation: Three.js 3D Engine</span>
            </span>
          </div>

          <button
            onClick={onOpenDetails}
            className="text-emerald-400 hover:text-emerald-300 underline font-medium whitespace-nowrap ml-1 cursor-pointer"
          >
            Backend Architecture
          </button>
        </div>
      </div>
    </aside>
  );
};

