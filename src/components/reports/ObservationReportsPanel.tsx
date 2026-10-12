import React, { useState, useEffect } from 'react';
import { ObservationReport, ThreatLevel, ObservationReportStatus } from '../../types';
import { apiService } from '../../services/api';
import { 
  FileText, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Search, 
  Trash2, 
  Filter, 
  Download,
  Crosshair,
  User,
  ShieldCheck,
  ChevronDown,
  Database
} from 'lucide-react';

interface ObservationReportsPanelProps {
  traineeId?: string;
  sessionId?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export const ObservationReportsPanel: React.FC<ObservationReportsPanelProps> = ({
  traineeId,
  sessionId,
  onClose,
  isModal = false
}) => {
  const [reports, setReports] = useState<ObservationReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterThreat, setFilterThreat] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);
  const [dbInfo, setDbInfo] = useState<{
    engine: 'postgresql' | 'filesystem_json';
    pgConnected: boolean;
    databaseName?: string;
  }>({
    engine: 'filesystem_json',
    pgConnected: false
  });

  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/database/status');
      const data = await res.json();
      if (data.activeStorageEngine) {
        setDbInfo({
          engine: data.activeStorageEngine,
          pgConnected: data.postgres?.isConnected || false,
          databaseName: data.postgres?.databaseName
        });
      }
    } catch {
      // Fallback
    }
  };

  const fetchReports = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      fetchDbStatus();
      const data = await apiService.getObservationReports({
        traineeId: traineeId || undefined,
        sessionId: sessionId || undefined
      });
      setReports(data);
    } catch (err: any) {
      console.error('Failed to load observation reports from backend:', err);
      setErrorMessage(err.message || 'Unable to connect to database backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchDbStatus();
  }, [traineeId, sessionId]);

  const handleDeleteReport = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete report ${id}?`)) return;
    setDeletingId(id);
    try {
      await apiService.deleteObservationReport(id);
      setReports(prev => prev.filter(r => r.id !== id));
      setActionSuccessNotice(`Report ${id} deleted from database.`);
      setTimeout(() => setActionSuccessNotice(null), 3000);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch = 
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.droneClassification.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.observationNotes && r.observationNotes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.targetDisplayName && r.targetDisplayName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesThreat = filterThreat === 'all' || r.threatRating === filterThreat;
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;

    return matchesSearch && matchesThreat && matchesStatus;
  });

  const getThreatBadge = (threat: ThreatLevel) => {
    switch (threat) {
      case 'critical':
        return 'bg-rose-950 text-rose-300 border-rose-500/40';
      case 'high':
        return 'bg-amber-950 text-amber-300 border-amber-500/40';
      case 'medium':
        return 'bg-yellow-950 text-yellow-300 border-yellow-500/40';
      case 'low':
        return 'bg-emerald-950 text-emerald-300 border-emerald-500/40';
      case 'friendly':
        return 'bg-blue-950 text-blue-300 border-blue-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getStatusBadge = (status: ObservationReportStatus) => {
    switch (status) {
      case 'FLAGGED':
        return 'bg-rose-900/50 text-rose-300 border-rose-500/50';
      case 'VERIFIED':
        return 'bg-emerald-900/50 text-emerald-300 border-emerald-500/50';
      case 'PENDING_REVIEW':
        return 'bg-amber-900/50 text-amber-300 border-amber-500/50';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(filteredReports, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `observation_reports_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl ${
      isModal ? 'max-w-5xl w-full max-h-[85vh]' : 'w-full'
    }`}>
      {/* Header */}
      <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Crosshair className="w-4 h-4" />
              <span>AIR DEFENSE LOGISTICS · BACKEND PERSISTENCE</span>
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            {dbInfo.pgConnected ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[11px]">
                <Database className="w-3 h-3 text-emerald-400" />
                <span>POSTGRESQL {dbInfo.databaseName ? `(${dbInfo.databaseName})` : 'CONNECTED'}</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-[11px]"
                title="Persisting to /data/observation_reports.json. PostgreSQL pool configured and ready (awaiting DATABASE_URL)."
              >
                <Database className="w-3 h-3 text-cyan-400" />
                <span>FILESYSTEM JSON STORE (PG READY)</span>
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-white mt-0.5">
            Tactical Observation Reports Database
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {dbInfo.pgConnected
              ? 'Production PostgreSQL active. Records persisted across distributed sessions and trainers.'
              : 'Server-side JSON store active. PostgreSQL integration initialized, awaiting DATABASE_URL configuration.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={fetchReports}
            disabled={isLoading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={handleExportJSON}
            disabled={reports.length === 0}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            title="Export filtered records as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs font-medium cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Notice Bar */}
      {actionSuccessNotice && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/40 text-emerald-300 text-xs px-4 py-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionSuccessNotice}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-3 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search report ID, target, classification, or notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Threat:</span>
            <select
              value={filterThreat}
              onChange={e => setFilterThreat(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-emerald-500"
            >
              <option value="all">All Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="friendly">Friendly</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Status:</span>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="VERIFIED">Verified</option>
              <option value="FLAGGED">Flagged</option>
              <option value="PENDING_REVIEW">Pending Review</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-h-[580px]">
        {/* 1. LOADING STATE */}
        {isLoading && (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-white">
              Connecting to Backend Database...
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Fetching persistent observation reports from Express backend storage (/api/reports).
            </p>
          </div>
        )}

        {/* 2. ERROR STATE */}
        {!isLoading && errorMessage && (
          <div className="p-6 rounded-xl bg-rose-950/40 border border-rose-500/40 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">Database Retrieval Error</h3>
            <p className="text-xs text-rose-300 font-mono max-w-md mx-auto">
              {errorMessage}
            </p>
            <button
              onClick={fetchReports}
              className="px-4 py-2 bg-rose-900/60 hover:bg-rose-900 text-rose-200 rounded text-xs font-semibold cursor-pointer"
            >
              Retry Database Connection
            </button>
          </div>
        )}

        {/* 3. EMPTY STATE */}
        {!isLoading && !errorMessage && reports.length === 0 && (
          <div className="py-16 text-center space-y-3 bg-slate-950/40 rounded-xl border border-slate-800 p-8">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No Observation Reports in Database</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              No observation reports have been persisted to the backend yet. Launch a mission drill in the Virtual Simulator and click <strong className="text-emerald-400">Log Observation Report</strong> to record real persistent field reports.
            </p>
          </div>
        )}

        {/* 4. FILTERED EMPTY STATE */}
        {!isLoading && !errorMessage && reports.length > 0 && filteredReports.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-xs">
            No observation reports match the selected filters or search query.
          </div>
        )}

        {/* 5. SUCCESS / POPULATED STATE (REPORT LIST) */}
        {!isLoading && !errorMessage && filteredReports.length > 0 && (
          <div className="space-y-3">
            {filteredReports.map(report => (
              <div
                key={report.id}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      {report.id}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-xs text-slate-400 font-mono">
                      Session: {report.sessionId}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-xs text-slate-400">
                      Trainee: {report.traineeName || report.traineeId}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-white capitalize">
                      {report.droneClassification.replace(/_/g, ' ')}
                    </span>
                    {report.targetDisplayName && (
                      <span className="text-xs text-slate-400">
                        ({report.targetDisplayName})
                      </span>
                    )}

                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getThreatBadge(report.threatRating)}`}>
                      Threat: {report.threatRating}
                    </span>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getStatusBadge(report.status)}`}>
                      {report.status}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                    <p className="font-sans italic">
                      "{report.observationNotes}"
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{new Date(report.createdAt).toLocaleString()}</span>
                    </span>
                    {report.distanceMeters !== undefined && (
                      <span>Range: {report.distanceMeters}m</span>
                    )}
                    {report.azimuthDeg !== undefined && (
                      <span>Az: {report.azimuthDeg}°</span>
                    )}
                  </div>
                </div>

                <div className="flex md:flex-col items-center justify-end gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => handleDeleteReport(report.id)}
                    disabled={deletingId === report.id}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded transition-colors disabled:opacity-50 cursor-pointer"
                    title="Delete record from persistent storage"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 px-4 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
        <div>
          <span>Total Persisted Records: <strong className="text-white font-mono">{reports.length}</strong></span>
          <span className="text-slate-600 mx-2">·</span>
          <span>Storage: <code className="text-emerald-400 font-mono">/data/observation_reports.json</code></span>
        </div>
        <div className="text-slate-500">
          Backend: Express REST API (/api/reports)
        </div>
      </div>
    </div>
  );
};
