import React, { useState } from 'react';
import { 
  UserProfile, 
  Scenario, 
  TrainingSessionResult, 
  Achievement 
} from '../../types';
import { 
  Play, 
  Award, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Target, 
  Layers, 
  Eye, 
  Zap,
  ArrowRight,
  TrendingUp,
  RotateCcw
} from 'lucide-react';

interface TraineeDashboardProps {
  user: UserProfile;
  scenarios: Scenario[];
  history: TrainingSessionResult[];
  achievements: Achievement[];
  onStartScenario: (scenario: Scenario) => void;
  onViewAAR: (result: TrainingSessionResult) => void;
}

export const TraineeDashboard: React.FC<TraineeDashboardProps> = ({
  user,
  scenarios,
  history,
  achievements,
  onStartScenario,
  onViewAAR
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const filteredScenarios = selectedDifficulty === 'all'
    ? scenarios
    : scenarios.filter(s => s.difficulty.toLowerCase() === selectedDifficulty.toLowerCase());

  const xpPercentage = Math.min(100, Math.round((user.xp / user.nextLevelXp) * 100));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* SECTION 1: SOLDIER TACTICAL PROFILE & LEVEL CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          {/* Avatar & Callsign */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-slate-950 border-2 border-emerald-500/50 flex items-center justify-center font-bold text-2xl text-emerald-400 font-mono shadow-inner">
              {user.avatarInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
                  Callsign: {user.callsign}
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-xs text-slate-400">
                  Service ID: {user.serviceId}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white mt-0.5">
                {user.name}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {user.rank} · {user.unit}
              </p>
            </div>
          </div>

          {/* Level & XP progression */}
          <div className="w-full md:w-80 bg-slate-950 p-4 rounded-lg border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                Specialist Level {user.level}
              </span>
              <span className="font-mono text-slate-400 tabular-nums">
                {user.xp} / {user.nextLevelXp} XP
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-400 rounded-full transition-all duration-500" 
                style={{ width: `${xpPercentage}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
              <span>Tier 2 Observer</span>
              <span>Next Rank at {user.nextLevelXp} XP</span>
            </div>
          </div>

          {/* Primary Quick Start Action */}
          <div className="shrink-0">
            <button
              onClick={() => onStartScenario(scenarios[0])}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-sm flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/10 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch Drill</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-400">Total Missions Completed</span>
            <p className="text-lg font-bold font-mono text-white tabular-nums mt-0.5">
              {user.totalMissions}
            </p>
          </div>
          <div>
            <span className="text-slate-400">Identification Accuracy</span>
            <p className="text-lg font-bold font-mono text-emerald-400 tabular-nums mt-0.5">
              {user.accuracyRate}%
            </p>
          </div>
          <div>
            <span className="text-slate-400">Avg. Response Time</span>
            <p className="text-lg font-bold font-mono text-white tabular-nums mt-0.5">
              {user.avgResponseTimeSec}s
            </p>
          </div>
          <div>
            <span className="text-slate-400">Readiness Status</span>
            <p className="text-sm font-semibold text-emerald-400 mt-0.5">
              {user.qualificationStatus}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: MISSION SELECTION */}
      <section aria-labelledby="missions-heading">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 id="missions-heading" className="text-lg font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" />
              Virtual Mission Scenarios
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select an observation and counter-drone classification mission drill to practice.
            </p>
          </div>

          {/* Segmented Filter */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
            {['all', 'basic', 'intermediate', 'tactical swarm'].map(diff => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-3 py-1.5 rounded font-medium capitalize transition-colors ${
                  selectedDifficulty === diff
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Mission Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredScenarios.map(scenario => (
            <div
              key={scenario.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-mono text-emerald-400 font-semibold">
                    {scenario.code}
                  </span>
                  <span className="text-slate-400 font-medium">
                    {scenario.difficulty}
                  </span>
                </div>

                <h3 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors">
                  {scenario.title}
                </h3>

                <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                  {scenario.description}
                </p>

                {/* Scenario Metadata */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Environment:</span>
                    <span className="text-slate-200 capitalize">
                      {scenario.environment.timeOfDay} · {scenario.environment.weather}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Target Contacts:</span>
                    <span className="font-mono text-slate-200">
                      {scenario.targets.length} Aerial Objects
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Allotted Time:</span>
                    <span className="font-mono text-slate-200">
                      {Math.floor(scenario.durationSec / 60)} mins
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3">
                <button
                  onClick={() => onStartScenario(scenario)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 font-semibold text-xs rounded transition-colors flex items-center justify-center gap-2 group-hover:bg-emerald-500 group-hover:text-slate-950"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Mission</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3: TRAINING HISTORY & PERFORMANCE REVIEW */}
      <section aria-labelledby="history-heading">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 id="history-heading" className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              Recent Training History & After-Action Reports
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review completed sessions, identification accuracy, and instructor critiques.
            </p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
            No completed training sessions found yet. Launch a mission to record your first after-action review.
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-medium">
                <tr>
                  <th className="py-3 px-4">Session Date</th>
                  <th className="py-3 px-4">Scenario</th>
                  <th className="py-3 px-4 text-center">Contacts</th>
                  <th className="py-3 px-4 text-right">Accuracy</th>
                  <th className="py-3 px-4 text-right">Avg Response</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4 text-center">Outcome</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {history.map(session => (
                  <tr key={session.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {session.date}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {session.scenarioTitle}
                    </td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums">
                      {session.identifiedTargets} / {session.totalTargets}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400">
                      {session.accuracyRate}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-400">
                      {session.avgIdentificationTimeSec}s
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-white tabular-nums">
                      {session.overallScore}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        session.passed 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' 
                          : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                      }`}>
                        {session.passed ? 'PASSED' : 'RETRY'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onViewAAR(session)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium"
                      >
                        View AAR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 4: ACHIEVEMENTS GALLERY */}
      <section aria-labelledby="achievements-heading">
        <div className="mb-4">
          <h2 id="achievements-heading" className="text-lg font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-400" />
            Tactical Qualification Badges & Achievements
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Operational milestones awarded by the Counter-UAS Training Directorate.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {achievements.map(ach => (
            <div
              key={ach.id}
              className={`p-4 rounded-lg border text-center transition-all ${
                ach.unlocked
                  ? 'bg-slate-900 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-950/40 border-slate-800/80 opacity-60'
              }`}
            >
              <div className="w-10 h-10 mx-auto rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400 mb-2">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-white text-xs">
                {ach.title}
              </h4>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                {ach.description}
              </p>
              <div className="mt-2 text-[10px] font-mono">
                {ach.unlocked ? (
                  <span className="text-emerald-400">Unlocked · {ach.unlockedDate}</span>
                ) : (
                  <span className="text-slate-500">Locked</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
