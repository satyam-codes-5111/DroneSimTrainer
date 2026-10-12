import React from 'react';
import { TrainingSessionResult } from '../../types';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Award, 
  ArrowRight, 
  RotateCcw, 
  Download,
  Crosshair
} from 'lucide-react';

interface AfterActionReviewModalProps {
  result: TrainingSessionResult;
  onRetake: () => void;
  onReturnToLobby: () => void;
  onExport: () => void;
}

export const AfterActionReviewModal: React.FC<AfterActionReviewModalProps> = ({
  result,
  onRetake,
  onReturnToLobby,
  onExport
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <span>AFTER-ACTION REVIEW (AAR)</span>
              <span className="text-slate-600">·</span>
              <span>SESSION ID: {result.id}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white mt-1">
              {result.scenarioTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Observer: {result.traineeName} ({result.traineeId}) · Evaluated on {result.date}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-950 px-5 py-3 rounded-lg border border-slate-800 shrink-0">
            <div className="text-center">
              <p className="text-[10px] text-slate-400 font-medium">MISSION RATING</p>
              <p className={`text-3xl font-extrabold font-mono tabular-nums ${getScoreColor(result.overallScore)}`}>
                {result.overallScore}
                <span className="text-sm font-normal text-slate-500">/100</span>
              </p>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-center">
              <p className="text-[10px] text-slate-400 font-medium">STATUS</p>
              <p className={`text-xs font-bold font-mono px-2 py-1 rounded mt-1 ${
                result.passed 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' 
                  : 'bg-rose-950 text-rose-300 border border-rose-500/40'
              }`}>
                {result.passed ? 'QUALIFIED' : 'RETEST NEEDED'}
              </p>
            </div>
          </div>
        </div>

        {/* Core Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <p className="text-xs text-slate-400">Identification Accuracy</p>
            <p className="text-2xl font-bold font-mono text-white tabular-nums mt-1">
              {result.accuracyRate}%
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {result.identifiedTargets} of {result.totalTargets} classified correctly
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <p className="text-xs text-slate-400">Avg. Response Time</p>
            <p className="text-2xl font-bold font-mono text-white tabular-nums mt-1">
              {result.avgIdentificationTimeSec}s
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              From contact lock to report
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <p className="text-xs text-slate-400">Perimeter Safety Score</p>
            <p className="text-2xl font-bold font-mono text-emerald-400 tabular-nums mt-1">
              {result.perimeterSafetyScore}%
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Stand-off perimeter maintained
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <p className="text-xs text-slate-400">False Alarm Rate</p>
            <p className={`text-2xl font-bold font-mono tabular-nums mt-1 ${
              result.falseAlarmCount === 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {result.falseAlarmCount}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Misidentified civilian/friendly
            </p>
          </div>
        </div>

        {/* Tactical Decision-Quality Metrics Strip */}
        <div className="mt-4 p-4 rounded-lg bg-slate-950/80 border border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              Decision-Quality & Threat Assessment Metrics
            </span>
            <span className="text-[11px] font-mono text-emerald-400 font-semibold">
              EVALUATION MATRIX
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 text-[11px]">Threat Level Prioritization</span>
              <p className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                {Math.min(100, Math.round(result.overallScore * 0.96))}%
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Accurate severity escalation</p>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 text-[11px]">Acquisition Efficiency Index</span>
              <p className="text-base font-bold font-mono text-white mt-0.5">
                {result.avgIdentificationTimeSec <= 4 ? 'Optimal (Fast)' : result.avgIdentificationTimeSec <= 6.5 ? 'Nominal' : 'Delayed Acquisition'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Contact-to-classification speed</p>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 text-[11px]">IFF Verification Discipline</span>
              <p className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                {result.falseAlarmCount === 0 ? '100% (Flawless)' : 'Discrepancy Logged'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Friendly transponder respect</p>
            </div>
          </div>
        </div>

        {/* Detailed Target Classification Log */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <Crosshair className="w-4 h-4 text-emerald-400" />
            Airspace Target Observation & Classification Log
          </h3>

          <div className="border border-slate-800 rounded-lg overflow-x-auto bg-slate-950/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 font-medium">
                <tr>
                  <th className="py-2.5 px-3">Target ID</th>
                  <th className="py-2.5 px-3">Actual Class</th>
                  <th className="py-2.5 px-3">Actual Threat</th>
                  <th className="py-2.5 px-3">Trainee Classification</th>
                  <th className="py-2.5 px-3">Reported Threat</th>
                  <th className="py-2.5 px-3 text-right">Detection Time</th>
                  <th className="py-2.5 px-3 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {result.observationLogs.map((log, index) => (
                  <tr key={index} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3 font-mono font-medium text-white">
                      {log.targetId}
                    </td>
                    <td className="py-2.5 px-3 capitalize">
                      {log.actualType.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                        log.actualThreat === 'critical' ? 'bg-rose-950 text-rose-300' :
                        log.actualThreat === 'high' ? 'bg-amber-950 text-amber-300' :
                        log.actualThreat === 'medium' ? 'bg-yellow-950 text-yellow-300' :
                        'bg-emerald-950 text-emerald-300'
                      }`}>
                        {log.actualThreat}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 capitalize">
                      {log.userType ? log.userType.replace(/_/g, ' ') : <span className="text-slate-500">Unclassified</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      {log.userThreat ? (
                        <span className="font-mono text-[11px] text-slate-300">
                          {log.userThreat}
                        </span>
                      ) : (
                        <span className="text-slate-500">None</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-400">
                      {log.timestampSec}s
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold">
                      {log.isCorrectType && log.isCorrectThreat ? (
                        <span className="text-emerald-400 flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Match</span>
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center justify-end gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Discrepancy</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Evaluator Notes & Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <h4 className="font-semibold text-white text-xs flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Instructor Assessment Observations
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              {result.evaluatorNotes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400 shrink-0">·</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <h4 className="font-semibold text-white text-xs flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              AI Training Feedback & Practice Directives
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              {result.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-400 shrink-0">→</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onExport}
            className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Session Record (CSV/JSON)</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onRetake}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Drill</span>
            </button>
            <button
              onClick={onReturnToLobby}
              className="px-5 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded transition-colors flex items-center gap-1.5"
            >
              <span>Return to Mission Lobby</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
