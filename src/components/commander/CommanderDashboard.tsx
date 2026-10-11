import React, { useState } from 'react';
import { 
  UserProfile, 
  UnitMetrics, 
  TrainingSessionResult, 
  TraineeAssessment 
} from '../../types';
import { 
  Shield, 
  BarChart3, 
  Download, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  FileSpreadsheet, 
  Printer, 
  Clock, 
  Target,
  FileCode
} from 'lucide-react';

interface CommanderDashboardProps {
  commander: UserProfile;
  metrics: UnitMetrics;
  history: TrainingSessionResult[];
  assessments: TraineeAssessment[];
  onExport: (format: 'json' | 'csv') => void;
}

export const CommanderDashboard: React.FC<CommanderDashboardProps> = ({
  commander,
  metrics,
  history,
  assessments,
  onExport
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json'>('csv');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleDownloadClick = async () => {
    onExport(selectedFormat);
    setExportNotice(`Export generated successfully as ${selectedFormat.toUpperCase()}. Check your download.`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* COMMANDER HEADER */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <span>BRIGADE READINESS COMMAND</span>
              <span className="text-slate-600">·</span>
              <span>{commander.unit}</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">
              {commander.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Unit-Level C-UAS Training Completion, Aggregate Readiness & Skill-Gap Analysis
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setSelectedFormat('csv')}
                className={`px-3 py-1.5 rounded font-medium transition-colors ${
                  selectedFormat === 'csv'
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                CSV Table
              </button>
              <button
                onClick={() => setSelectedFormat('json')}
                className={`px-3 py-1.5 rounded font-medium transition-colors ${
                  selectedFormat === 'json'
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                JSON Raw
              </button>
            </div>

            <button
              onClick={handleDownloadClick}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Readiness Report</span>
            </button>
          </div>
        </div>

        {exportNotice && (
          <div className="mt-4 p-2.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportNotice}</span>
          </div>
        )}
      </div>

      {/* SECTION 1: UNIT-LEVEL TRAINING COMPLETION CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Unit Certification Rate</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold font-mono text-emerald-400 tabular-nums mt-2">
            {metrics.certificationRate}%
          </p>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
            <div 
              className="h-full bg-emerald-400 rounded-full" 
              style={{ width: `${metrics.certificationRate}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {metrics.certifiedCount} of {metrics.totalPersonnel} personnel certified
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Aggregate Accuracy</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold font-mono text-white tabular-nums mt-2">
            {metrics.aggregateAccuracy}%
          </p>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
            <div 
              className="h-full bg-emerald-400 rounded-full" 
              style={{ width: `${metrics.aggregateAccuracy}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Target benchmark: &ge; 85%
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Simulation Flight Hours</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold font-mono text-white tabular-nums mt-2">
            {metrics.totalSimulationHours}h
          </p>
          <p className="text-[11px] text-slate-400 mt-5">
            Avg 6.7 hours per active trainee
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Trainees in Pipeline</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold font-mono text-white tabular-nums mt-2">
            {metrics.activeTrainees}
          </p>
          <p className="text-[11px] text-slate-400 mt-5">
            4 training cohorts active in simulator
          </p>
        </div>
      </div>

      {/* SECTION 2: AGGREGATE PERFORMANCE CHARTS & BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Competency Distribution by Domain */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Regiment Competency Domain Breakdown
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluated across 4 primary counter-UAS observation disciplines.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Optical Day Classification (Micro & Rotary)</span>
                <span className="font-mono text-emerald-400 font-bold">91%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: '91%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Friendly IFF Strobe & Transponder Verification</span>
                <span className="font-mono text-emerald-400 font-bold">94%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: '94%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>FLIR Thermal White-Hot / Black-Hot in Adverse Fog</span>
                <span className="font-mono text-amber-400 font-bold">78%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: '78%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Coordinated Swarm Cluster Separation & Tracking</span>
                <span className="font-mono text-rose-400 font-bold">72%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-400 rounded-full" style={{ width: '72%' }} />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400">
            <span className="font-semibold text-white">Commander Insight:</span> Optical daytime drills meet operational readiness standards. Night thermal operations and multi-drone swarm dispersion represent the two critical training gaps.
          </div>
        </div>

        {/* 6-Week Qualification Trend (SVG Chart) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Weekly Training Qualification Trajectory
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Percentage of brigade personnel certified over past 6 weeks.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                +24% Growth
              </span>
            </div>

            {/* SVG Visual Sparkline Chart */}
            <div className="h-44 w-full flex items-end justify-between gap-3 pt-6 pb-2">
              {[
                { week: 'Wk 36', pct: 54, sessions: 28 },
                { week: 'Wk 37', pct: 60, sessions: 34 },
                { week: 'Wk 38', pct: 65, sessions: 42 },
                { week: 'Wk 39', pct: 69, sessions: 48 },
                { week: 'Wk 40', pct: 74, sessions: 58 },
                { week: 'Wk 41', pct: 78, sessions: 64 },
              ].map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[11px] font-mono font-bold text-white tabular-nums">
                    {item.pct}%
                  </span>
                  <div className="w-full bg-slate-800 rounded-t overflow-hidden flex items-end h-28">
                    <div 
                      className="w-full bg-emerald-500/80 hover:bg-emerald-400 transition-all rounded-t"
                      style={{ height: `${item.pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {item.week}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
            <span>Minimum Readiness Threshold: 75%</span>
            <span className="text-emerald-400 font-semibold">Standard Achieved (78.1%)</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: SKILL-GAP SUMMARIES WITH ACTIONABLE DIRECTIVES */}
      <section aria-labelledby="skillgaps-heading">
        <div className="mb-4">
          <h2 id="skillgaps-heading" className="text-lg font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Brigade Skill-Gap Summaries & Priority Interventions
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Operational bottlenecks identified across simulation session logs requiring training lead directives.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.skillGaps.map((gap, index) => (
            <div 
              key={index}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                    gap.priority === 'High' ? 'bg-rose-950 text-rose-300 border border-rose-500/30' :
                    gap.priority === 'Medium' ? 'bg-amber-950 text-amber-300 border border-amber-500/30' :
                    'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {gap.priority} Priority Gap
                  </span>
                  <span className="text-slate-400">
                    {gap.affectedTraineesCount} personnel affected
                  </span>
                </div>

                <h3 className="font-bold text-white text-sm">
                  {gap.area}
                </h3>

                <div className="mt-3 flex items-center gap-3 text-xs">
                  <div className="flex-1">
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Proficiency:</span>
                      <span className="font-mono text-white font-bold">{gap.currentProficiency}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          gap.priority === 'High' ? 'bg-rose-400' :
                          gap.priority === 'Medium' ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${gap.currentProficiency}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-slate-500 text-[10px]">Benchmark</span>
                    <p className="font-mono font-bold text-emerald-400 text-xs">
                      {gap.benchmarkTarget}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">Recommended Action:</span>{' '}
                {gap.priority === 'High' 
                  ? 'Mandate 3 tactical swarm cluster drills before field rotation.'
                  : gap.priority === 'Medium'
                  ? 'Schedule scheduled nighttime adverse fog simulator sessions.'
                  : 'Maintain bi-weekly calibration refresher drills.'}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: EXPORT & REPORTING INTERFACE */}
      <section aria-labelledby="export-heading">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 id="export-heading" className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                Air Defense Training Records Export & Archival
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Generate audit-compliant training logs formatted for defense headquarters record-keeping.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onExport('csv')}
                className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Download CSV Audit Log</span>
              </button>

              <button
                onClick={() => onExport('json')}
                className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors flex items-center gap-1.5"
              >
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span>Download JSON Payload</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
