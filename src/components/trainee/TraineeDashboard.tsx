import React, { useState } from 'react';
import { 
  UserProfile, 
  Scenario, 
  TrainingSessionResult, 
  Achievement 
} from '../../types';
import { INITIAL_SCENARIOS } from '../../services/api';
import { TraineeAvatarScene } from './TraineeAvatarScene';
import { ObservationReportsPanel } from '../reports/ObservationReportsPanel';
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
  RotateCcw,
  User,
  Shield,
  Crosshair,
  Sliders,
  ChevronRight,
  Sparkles,
  Flame,
  Radio,
  Compass,
  FileText,
  Database
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
  // Navigation tabs within Trainee Lobby
  const [activeTab, setActiveTab] = useState<'lobby' | 'missions' | 'records' | 'reports' | 'achievements' | 'profile'>('lobby');

  // Safe scenarios list with immediate fallback to INITIAL_SCENARIOS
  const safeScenarios = (scenarios && scenarios.length > 0) ? scenarios : INITIAL_SCENARIOS;

  // Active selected scenario for quick start
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(safeScenarios[0]?.id || 'SCN-101');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [camoStyle, setCamoStyle] = useState<'charcoal' | 'desert' | 'woodland'>('charcoal');

  const selectedScenario = safeScenarios.find(s => s.id === selectedScenarioId) || safeScenarios[0] || INITIAL_SCENARIOS[0];

  const filteredScenarios = selectedDifficulty === 'all'
    ? safeScenarios
    : safeScenarios.filter(s => s.difficulty.toLowerCase() === selectedDifficulty.toLowerCase());

  const xpPercentage = Math.min(100, Math.round((user.xp / user.nextLevelXp) * 100));

  // Daily training challenges
  const dailyDirectives = [
    { title: 'Classify 4 Micro-UAVs', progress: '3/4', completed: false, xpReward: '+150 XP' },
    { title: 'Complete Thermal Fog Drill', progress: '1/1', completed: true, xpReward: '+200 XP' },
    { title: 'Maintain Zero False Alarms', progress: '2/2', completed: true, xpReward: '+120 XP' }
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* LOBBY SUB-NAVBAR */}
      <nav aria-label="Trainee Sections" className="bg-slate-950/90 border-b border-slate-800/80 px-4 sm:px-8 py-2.5 z-30 flex items-center justify-between gap-4 backdrop-blur">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('lobby')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'lobby'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Lobby (Home)</span>
          </button>

          <button
            onClick={() => setActiveTab('missions')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'missions'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Missions ({scenarios.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('records')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'records'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Training Records ({history.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Observation Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'achievements'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Achievements ({achievements.filter(a => a.unlocked).length}/{achievements.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Operator Profile</span>
          </button>
        </div>

        {/* Season Rank Tag */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span className="text-emerald-400">●</span>
          <span>AIR DEFENSE SEASON 2026</span>
          <span className="text-slate-700">·</span>
          <span className="text-white font-semibold">GOLD TIER II</span>
        </div>
      </nav>

      {/* ========================================================= */}
      {/* TAB 1: IMMERSIVE GAMING LOBBY (HOME)                      */}
      {/* ========================================================= */}
      {activeTab === 'lobby' && (
        <div className="relative flex-1 w-full min-h-[calc(100vh-8.5rem)] flex flex-col justify-between overflow-hidden">
          {/* BACKGROUND 3D AVATAR CANVAS */}
          <div className="absolute inset-0 z-0">
            <TraineeAvatarScene camoStyle={camoStyle} />
          </div>

          {/* VIGNETTE & TACTICAL OVERLAYS */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(2,6,23,0.85)_100%)] z-1" />
          <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-slate-950/90 to-transparent pointer-events-none z-1" />
          <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none z-1" />

          {/* TOP HUD ROW: PLAYER DOSSIER & QUICK STATS */}
          <div className="relative z-10 p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pointer-events-none">
            {/* Player Card (BGMI/Free Fire Lobby Style) */}
            <div 
              onClick={() => setActiveTab('profile')}
              className="bg-slate-950/80 border border-slate-800/90 hover:border-emerald-500/50 p-3 rounded-xl backdrop-blur-md shadow-2xl flex items-center gap-3.5 pointer-events-auto transition-all cursor-pointer group max-w-sm"
            >
              {/* Level Crown & Badge */}
              <div className="relative shrink-0">
                <div className="w-13 h-13 rounded-lg bg-slate-900 border-2 border-emerald-500/60 flex items-center justify-center font-bold text-lg text-emerald-400 font-mono shadow-inner group-hover:border-emerald-400 transition-colors">
                  {user.avatarInitials}
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-slate-950 font-black text-[10px] font-mono px-1.5 py-0.5 rounded shadow">
                  LVL {user.level}
                </div>
              </div>

              {/* Name & Season Status */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-bold text-sm truncate group-hover:text-emerald-300 transition-colors">
                    {user.name}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 shrink-0">
                    [{user.callsign}]
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {user.rank} · {user.unit}
                </p>

                {/* Level XP Bar */}
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-400 rounded-full transition-all duration-500" 
                      style={{ width: `${xpPercentage}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 tabular-nums shrink-0">
                    {user.xp}/{user.nextLevelXp} XP
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Readiness Strip */}
            <div className="bg-slate-950/80 border border-slate-800/90 p-2.5 px-4 rounded-xl backdrop-blur-md shadow-2xl flex items-center gap-4 sm:gap-6 text-xs pointer-events-auto">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Accuracy</span>
                <span className="font-mono font-bold text-emerald-400 text-sm tabular-nums">
                  {user.accuracyRate}%
                </span>
              </div>
              <div className="w-px h-6 bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Response</span>
                <span className="font-mono font-bold text-white text-sm tabular-nums">
                  {user.avgResponseTimeSec}s
                </span>
              </div>
              <div className="w-px h-6 bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Drills</span>
                <span className="font-mono font-bold text-white text-sm tabular-nums">
                  {user.totalMissions}
                </span>
              </div>
              <div className="w-px h-6 bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Status</span>
                <span className="font-semibold text-emerald-400 text-xs">
                  {user.qualificationStatus}
                </span>
              </div>
            </div>
          </div>

          {/* MIDDLE ROW: SIDEBAR WIDGETS */}
          <div className="relative z-10 px-4 sm:px-6 flex-1 flex justify-between items-center pointer-events-none">
            {/* LEFT WIDGET: Selected Mission & Uniform Selector */}
            <div className="w-72 max-w-full flex flex-col gap-3 pointer-events-auto">
              {/* Selected Mission Card */}
              <div className="bg-slate-950/85 border border-slate-800/90 rounded-xl p-3.5 backdrop-blur-md shadow-2xl">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                    TARGET MISSION
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                    {selectedScenario.difficulty}
                  </span>
                </div>

                <h3 className="font-bold text-white text-sm line-clamp-1">
                  {selectedScenario.title}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {selectedScenario.description}
                </p>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <div>
                    <span>Targets:</span> <strong className="text-white font-mono">{selectedScenario.targets.length}</strong>
                  </div>
                  <div>
                    <span>Time:</span> <strong className="text-white font-mono">{Math.floor(selectedScenario.durationSec / 60)}m</strong>
                  </div>
                  <div>
                    <span>Time of Day:</span> <strong className="text-white capitalize">{selectedScenario.environment.timeOfDay}</strong>
                  </div>
                  <div>
                    <span>Optics:</span> <strong className="text-emerald-400 capitalize">{selectedScenario.environment.weather}</strong>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('missions')}
                  className="w-full mt-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Change Scenario</span>
                </button>

                <button
                  onClick={() => setActiveTab('reports')}
                  className="w-full mt-2 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Observation Reports Database</span>
                </button>
              </div>

              {/* Uniform Camo Selector */}
              <div className="bg-slate-950/85 border border-slate-800/90 rounded-xl p-3 backdrop-blur-md shadow-2xl">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
                  Operator Camouflage
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => setCamoStyle('charcoal')}
                    className={`py-1 text-[10px] font-medium rounded transition-colors ${
                      camoStyle === 'charcoal'
                        ? 'bg-slate-800 text-emerald-400 border border-emerald-500/50 font-bold'
                        : 'bg-slate-900/60 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    Night Tac
                  </button>
                  <button
                    onClick={() => setCamoStyle('desert')}
                    className={`py-1 text-[10px] font-medium rounded transition-colors ${
                      camoStyle === 'desert'
                        ? 'bg-slate-800 text-amber-400 border border-amber-500/50 font-bold'
                        : 'bg-slate-900/60 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    Desert
                  </button>
                  <button
                    onClick={() => setCamoStyle('woodland')}
                    className={`py-1 text-[10px] font-medium rounded transition-colors ${
                      camoStyle === 'woodland'
                        ? 'bg-slate-800 text-emerald-400 border border-emerald-500/50 font-bold'
                        : 'bg-slate-900/60 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    Woodland
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT WIDGET: Daily Directives */}
            <div className="hidden md:flex w-72 flex-col gap-3 pointer-events-auto">
              <div className="bg-slate-950/85 border border-slate-800/90 rounded-xl p-3.5 backdrop-blur-md shadow-2xl">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Daily Directives
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    2/3 DONE
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {dailyDirectives.map((d, i) => (
                    <div key={i} className="p-2 rounded bg-slate-900/60 border border-slate-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {d.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
                        )}
                        <div>
                          <p className={`text-[11px] font-medium leading-none ${d.completed ? 'text-slate-300' : 'text-white'}`}>
                            {d.title}
                          </p>
                          <span className="text-[9px] text-slate-500 font-mono">{d.progress}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-400">
                        {d.xpReward}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM BAR: LARGE BGMI / FREE FIRE STYLE START BUTTON */}
          <div className="relative z-10 p-4 sm:p-6 flex items-end justify-end pointer-events-auto">
            <div className="flex items-center gap-3">
              {/* Massive Tactical START TRAINING Button */}
              <button
                onClick={() => onStartScenario(selectedScenario)}
                className="relative group px-8 sm:px-12 py-4 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-xl text-lg sm:text-xl flex items-center gap-3 transition-all duration-200 shadow-[0_0_35px_rgba(16,185,129,0.35)] hover:shadow-[0_0_50px_rgba(16,185,129,0.6)] cursor-pointer active:scale-95"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-950/20 flex items-center justify-center shrink-0">
                  <Play className="w-6 h-6 fill-current text-slate-950 ml-0.5" />
                </div>
                <div className="text-left">
                  <span className="block text-[11px] font-mono font-bold tracking-widest text-slate-900/80 uppercase leading-none">
                    {selectedScenario.code} · READY
                  </span>
                  <span className="block text-xl sm:text-2xl font-black tracking-tight leading-none mt-0.5">
                    START TRAINING
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MISSIONS SELECTION SCREEN                          */}
      {/* ========================================================= */}
      {activeTab === 'missions' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Target className="w-6 h-6 text-emerald-400" />
                Counter-UAS Mission Scenarios
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Select an airspace observation and counter-drone classification mission drill to launch in the virtual simulator.
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {filteredScenarios.map(scenario => {
              const isSelected = scenario.id === selectedScenarioId;
              return (
                <div
                  key={scenario.id}
                  className={`bg-slate-900 rounded-xl p-5 border flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'border-emerald-500/70 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-mono text-emerald-400 font-bold">
                        {scenario.code}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                        {scenario.difficulty}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-base">
                      {scenario.title}
                    </h3>

                    <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                      {scenario.description}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>Environment:</span>
                        <span className="text-white capitalize">
                          {scenario.environment.timeOfDay} · {scenario.environment.weather}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Aerial Objects:</span>
                        <span className="font-mono text-white">
                          {scenario.targets.length} Contacts
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Allotted Time:</span>
                        <span className="font-mono text-white">
                          {Math.floor(scenario.durationSec / 60)} minutes
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedScenarioId(scenario.id);
                        setActiveTab('lobby');
                      }}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded transition-colors"
                    >
                      Set as Primary
                    </button>
                    <button
                      onClick={() => onStartScenario(scenario)}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded transition-colors flex items-center gap-1.5 shadow"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Deploy</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: TRAINING RECORDS & SESSION LOGS                    */}
      {/* ========================================================= */}
      {activeTab === 'records' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Clock className="w-6 h-6 text-emerald-400" />
                Training Records & After-Action Review Reports
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Complete session logs with target identification accuracy, response time, and instructor feedback.
              </p>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 text-xs">
              No completed training sessions found yet. Launch a mission in the Lobby to record your first after-action review.
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto shadow-xl">
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
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400 font-bold">
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
                          className="text-xs text-emerald-400 hover:text-emerald-300 underline font-semibold cursor-pointer"
                        >
                          View AAR Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3.5: PERSISTENT OBSERVATION REPORTS (BACKEND DATABASE)*/}
      {/* ========================================================= */}
      {activeTab === 'reports' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <ObservationReportsPanel traineeId={user.id} />
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: ACHIEVEMENTS & QUALIFICATION BADGES                */}
      {/* ========================================================= */}
      {activeTab === 'achievements' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Award className="w-6 h-6 text-emerald-400" />
              Tactical Qualification Badges & Medals
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Operational milestones awarded by the Counter-UAS Training Directorate for mastery of aerial threat observation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {achievements.map(ach => (
              <div
                key={ach.id}
                className={`p-5 rounded-xl border text-center transition-all flex flex-col justify-between ${
                  ach.unlocked
                    ? 'bg-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                    : 'bg-slate-950/60 border-slate-800/80 opacity-60'
                }`}
              >
                <div>
                  <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3 ${
                    ach.unlocked 
                      ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-400' 
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-white text-xs">
                    {ach.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                    {ach.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] font-mono">
                  {ach.unlocked ? (
                    <span className="text-emerald-400 font-semibold">Unlocked · {ach.unlockedDate}</span>
                  ) : (
                    <span className="text-slate-500">Locked Milestone</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: OPERATOR PROFILE & COMPETENCIES                    */}
      {/* ========================================================= */}
      {activeTab === 'profile' && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-slate-950 border-2 border-emerald-500/60 flex items-center justify-center font-bold text-2xl text-emerald-400 font-mono shadow-inner">
                  {user.avatarInitials}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {user.rank} · {user.unit}
                  </p>
                  <p className="text-xs font-mono text-emerald-400 mt-1">
                    Service ID: {user.serviceId} · Callsign: {user.callsign}
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-right w-full sm:w-auto">
                <span className="text-[10px] text-slate-400 block uppercase">Specialist Level</span>
                <p className="text-3xl font-extrabold font-mono text-emerald-400 mt-0.5">
                  LVL {user.level}
                </p>
                <span className="text-[11px] text-slate-500 font-mono">{user.xp} / {user.nextLevelXp} XP</span>
              </div>
            </div>

            {/* Core Competencies Breakdown */}
            <div className="mt-8 pt-6 border-t border-slate-800">
              <h3 className="text-sm font-bold text-white mb-4">
                Observation Discipline Competency Metrics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300">Optical Daytime Classification</span>
                    <span className="font-mono text-emerald-400 font-bold">92%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400" style={{ width: '92%' }} />
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300">FLIR Thermal Discrimination (Fog/Night)</span>
                    <span className="font-mono text-emerald-400 font-bold">84%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400" style={{ width: '84%' }} />
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300">Coordinated Swarm Cluster Separation</span>
                    <span className="font-mono text-amber-400 font-bold">79%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: '79%' }} />
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300">Perimeter Stand-off Defense Integrity</span>
                    <span className="font-mono text-emerald-400 font-bold">94%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400" style={{ width: '94%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
