import React, { useState } from 'react';
import { 
  UserProfile, 
  Scenario, 
  TrainingSessionResult, 
  TraineeAssessment,
  DroneType
} from '../../types';
import { ObservationReportsPanel } from '../reports/ObservationReportsPanel';
import { 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  FileText, 
  Award, 
  Clock, 
  Sliders, 
  X,
  Eye
} from 'lucide-react';

interface InstructorDashboardProps {
  instructor: UserProfile;
  scenarios: Scenario[];
  history: TrainingSessionResult[];
  assessments: TraineeAssessment[];
  onCreateScenario: (scenario: Omit<Scenario, 'id'>) => void;
  onUpdateAssessment: (assessment: TraineeAssessment) => void;
  onViewAAR: (result: TrainingSessionResult) => void;
  onLaunchDrill: (scenario: Scenario) => void;
}

export const InstructorDashboard: React.FC<InstructorDashboardProps> = ({
  instructor,
  scenarios,
  history,
  assessments,
  onCreateScenario,
  onUpdateAssessment,
  onViewAAR,
  onLaunchDrill
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'scenarios' | 'assessments' | 'history' | 'reports'>('overview');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTraineeForEdit, setSelectedTraineeForEdit] = useState<TraineeAssessment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Custom Scenario form state
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDifficulty, setNewDifficulty] = useState<'Basic' | 'Intermediate' | 'Advanced' | 'Tactical Swarm'>('Intermediate');
  const [newDescription, setNewDescription] = useState('');
  const [newTimeOfDay, setNewTimeOfDay] = useState<'day' | 'dusk' | 'night'>('day');
  const [newWeather, setNewWeather] = useState<'clear' | 'fog' | 'overcast'>('clear');
  const [newDurationMin, setNewDurationMin] = useState(3);
  const [newTargetCount, setNewTargetCount] = useState(4);

  const filteredAssessments = assessments.filter(a =>
    a.traineeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.rank.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.unit.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Generate sample targets matching parameters
    const mockTargets = Array.from({ length: newTargetCount }).map((_, i) => ({
      id: `TGT-CUSTOM-${i + 1}`,
      droneType: (['commercial_micro_quad', 'rotary_recon', 'fixed_wing_surveillance', 'swarm_cluster'][i % 4]) as DroneType,
      displayName: `Custom Target ${i + 1}`,
      threatLevel: (['medium', 'high', 'critical', 'friendly'][i % 4]) as any,
      distanceMeters: 300 + i * 150,
      altitudeMeters: 60 + i * 25,
      speedKnots: 20 + i * 10,
      azimuthDeg: (i * 70) % 360,
      elevationDeg: 12 + i * 4,
      isIdentified: false,
      position: { x: (i % 2 === 0 ? 1 : -1) * (150 + i * 50), y: 30 + i * 15, z: -(200 + i * 80) },
      velocity: { x: 0.1, y: 0.01, z: 0.05 },
      behavior: 'patrol' as const,
      visualSignature: 'Configured during instructor scenario design',
      acousticSignature: 'Acoustic frequency calibrated for drill',
      radarCrossSection: '0.02 m²'
    }));

    onCreateScenario({
      title: newTitle,
      code: newCode || `DRILL-${Math.floor(100 + Math.random() * 900)}`,
      difficulty: newDifficulty,
      description: newDescription || 'Instructor-authored custom tactical drone drill.',
      environment: {
        timeOfDay: newTimeOfDay,
        weather: newWeather,
        visibilityMeters: newWeather === 'fog' ? 800 : 4000,
        windKnots: 10
      },
      durationSec: newDurationMin * 60,
      targets: mockTargets,
      objectives: [
        { id: 'custom-obj-1', description: `Observe and classify ${newTargetCount} aerial targets`, requiredCount: newTargetCount, currentCount: 0, completed: false },
        { id: 'custom-obj-2', description: 'Prevent perimeter intrusion (<300m)', requiredCount: 1, currentCount: 0, completed: false }
      ],
      threatTypes: ['rotary_recon', 'fixed_wing_surveillance'],
      recommendedRoleLevel: 3
    });

    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewCode('');
    setNewDescription('');
  };

  const handleSaveTraineeNotes = () => {
    if (!selectedTraineeForEdit) return;
    onUpdateAssessment(selectedTraineeForEdit);
    setSelectedTraineeForEdit(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* INSTRUCTOR HEADER */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <span>INSTRUCTOR COMMAND PORTAL</span>
              <span className="text-slate-600">·</span>
              <span>{instructor.unit}</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">
              {instructor.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Supervising Counter-UAS Drill Sessions, Trainee Rubrics & Scenario Architecture
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Custom Scenario</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-slate-800 text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cohort Overview
          </button>
          <button
            onClick={() => setActiveTab('scenarios')}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              activeTab === 'scenarios'
                ? 'bg-slate-800 text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Scenario Management ({scenarios.length})
          </button>
          <button
            onClick={() => setActiveTab('assessments')}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              activeTab === 'assessments'
                ? 'bg-slate-800 text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Trainee Assessments ({assessments.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-slate-800 text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Session Records ({history.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              activeTab === 'reports'
                ? 'bg-slate-800 text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Observation Reports Database
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
              <span className="text-xs text-slate-400">Active Cadets in Cohort</span>
              <p className="text-2xl font-bold font-mono text-white tabular-nums mt-1">
                {assessments.length}
              </p>
              <p className="text-[11px] text-emerald-400 mt-1">
                3 Field-Ready · 1 Needs Recertification
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
              <span className="text-xs text-slate-400">Total Drills Supervised</span>
              <p className="text-2xl font-bold font-mono text-white tabular-nums mt-1">
                {history.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Across 3 tactical scenarios
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
              <span className="text-xs text-slate-400">Cohort Optical Accuracy</span>
              <p className="text-2xl font-bold font-mono text-emerald-400 tabular-nums mt-1">
                88.3%
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Benchmark requirement: &ge; 85%
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
              <span className="text-xs text-slate-400">Cohort Thermal Accuracy</span>
              <p className="text-2xl font-bold font-mono text-amber-400 tabular-nums mt-1">
                79.8%
              </p>
              <p className="text-[11px] text-amber-400/80 mt-1">
                Deficit in fog/night conditions
              </p>
            </div>
          </div>

          {/* Quick Scenario Spotlight */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-base font-bold text-white mb-4">
              Active Scenarios Ready for Cohort Deployment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {scenarios.map(sc => (
                <div key={sc.id} className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono text-emerald-400 font-bold">{sc.code}</span>
                    <span className="text-slate-400">{sc.difficulty}</span>
                  </div>
                  <h4 className="font-semibold text-white text-sm mt-1">{sc.title}</h4>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">{sc.description}</p>
                  <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-500">{sc.targets.length} Aerial Targets</span>
                    <button
                      onClick={() => onLaunchDrill(sc)}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      Launch Preview →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SCENARIOS MANAGEMENT */}
      {activeTab === 'scenarios' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">
              Simulation Scenario Library
            </h3>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-500 text-slate-950 text-xs font-bold rounded flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Drill</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scenarios.map(sc => (
              <div key={sc.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-semibold text-emerald-400">{sc.code}</span>
                    <h4 className="text-base font-bold text-white mt-0.5">{sc.title}</h4>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {sc.difficulty}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-2">{sc.description}</p>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400">
                  <div>
                    <span>Time of Day:</span> <strong className="text-white capitalize">{sc.environment.timeOfDay}</strong>
                  </div>
                  <div>
                    <span>Weather:</span> <strong className="text-white capitalize">{sc.environment.weather}</strong>
                  </div>
                  <div>
                    <span>Duration:</span> <strong className="text-white font-mono">{sc.durationSec / 60}m</strong>
                  </div>
                  <div>
                    <span>Aerial Targets:</span> <strong className="text-white font-mono">{sc.targets.length}</strong>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => onLaunchDrill(sc)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold rounded"
                  >
                    Launch Observation Simulator
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ASSESSMENTS */}
      {activeTab === 'assessments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h3 className="text-base font-bold text-white">
              Trainee Competency Evaluation & Grading Matrix
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by cadet name or rank..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-medium">
                <tr>
                  <th className="py-3 px-4">Trainee Soldier</th>
                  <th className="py-3 px-4">Unit Detachment</th>
                  <th className="py-3 px-4 text-center">Sessions</th>
                  <th className="py-3 px-4 text-right">Optical ID</th>
                  <th className="py-3 px-4 text-right">Thermal ID</th>
                  <th className="py-3 px-4 text-right">Swarm Track</th>
                  <th className="py-3 px-4 text-center">Overall</th>
                  <th className="py-3 px-4 text-center">Readiness Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {filteredAssessments.map(t => (
                  <tr key={t.traineeId} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-white">{t.traineeName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{t.rank} · {t.traineeId}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{t.unit}</td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums">{t.completedSessions}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400">{t.opticalIdScore}%</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">{t.thermalIdScore}%</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">{t.swarmTrackingScore}%</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-white tabular-nums">{t.overallCompetency}%</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        t.status === 'Ready for Field' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' :
                        t.status === 'Exceeds Standards' ? 'bg-blue-950 text-blue-300 border border-blue-500/30' :
                        'bg-amber-950 text-amber-300 border border-amber-500/30'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedTraineeForEdit(t)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium flex items-center justify-end gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Remarks</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ALL SESSIONS HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white">
            Comprehensive Session Records Across Cohort
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-medium">
                <tr>
                  <th className="py-3 px-4">Session Date</th>
                  <th className="py-3 px-4">Trainee</th>
                  <th className="py-3 px-4">Scenario</th>
                  <th className="py-3 px-4 text-right">Accuracy</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4 text-center">Result</th>
                  <th className="py-3 px-4 text-right">AAR Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {history.map(s => (
                  <tr key={s.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-slate-400">{s.date}</td>
                    <td className="py-3 px-4 font-semibold text-white">{s.traineeName}</td>
                    <td className="py-3 px-4 text-slate-300">{s.scenarioTitle}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400">{s.accuracyRate}%</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-white tabular-nums">{s.overallScore}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        s.passed ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                      }`}>
                        {s.passed ? 'PASSED' : 'RETEST'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onViewAAR(s)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium"
                      >
                        Inspect AAR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: PERSISTENT OBSERVATION REPORTS */}
      {activeTab === 'reports' && (
        <div className="w-full">
          <ObservationReportsPanel />
        </div>
      )}

      {/* CREATE SCENARIO MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Configure Custom Simulation Scenario
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="text-slate-300 block font-medium mb-1">Scenario Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Night Mountain Pass Quadcopter Surveillance"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block font-medium mb-1">Scenario Code</label>
                  <input
                    type="text"
                    placeholder="e.g., DELTA-12"
                    value={newCode}
                    onChange={e => setNewCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block font-medium mb-1">Difficulty Tier</label>
                  <select
                    value={newDifficulty}
                    onChange={e => setNewDifficulty(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="Basic">Basic</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Tactical Swarm">Tactical Swarm</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block font-medium mb-1">Time of Day</label>
                  <select
                    value={newTimeOfDay}
                    onChange={e => setNewTimeOfDay(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="day">Daylight</option>
                    <option value="dusk">Dusk / Sunset</option>
                    <option value="night">Night (FLIR/NVG Required)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block font-medium mb-1">Weather Condition</label>
                  <select
                    value={newWeather}
                    onChange={e => setNewWeather(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="clear">Clear Skies</option>
                    <option value="fog">Heavy Fog</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block font-medium mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newDurationMin}
                    onChange={e => setNewDurationMin(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block font-medium mb-1">Target Object Count</label>
                  <input
                    type="number"
                    min={2}
                    max={8}
                    value={newTargetCount}
                    onChange={e => setNewTargetCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block font-medium mb-1">Drill Objectives & Description</label>
                <textarea
                  rows={3}
                  placeholder="Outline specific observation directives and perimeter safety thresholds..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 text-slate-950 font-bold rounded"
                >
                  Create & Publish Scenario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TRAINEE NOTES MODAL */}
      {selectedTraineeForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">
                Evaluation Notes: {selectedTraineeForEdit.traineeName}
              </h3>
              <button
                onClick={() => setSelectedTraineeForEdit(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="text-slate-300 block font-medium mb-1">Field Readiness Status</label>
                <select
                  value={selectedTraineeForEdit.status}
                  onChange={e => setSelectedTraineeForEdit({ ...selectedTraineeForEdit, status: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-emerald-500"
                >
                  <option value="Ready for Field">Ready for Field</option>
                  <option value="Needs Night Training">Needs Night Training</option>
                  <option value="Exceeds Standards">Exceeds Standards</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block font-medium mb-1">Instructor Remarks & Directives</label>
                <textarea
                  rows={4}
                  value={selectedTraineeForEdit.instructorRemarks}
                  onChange={e => setSelectedTraineeForEdit({ ...selectedTraineeForEdit, instructorRemarks: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTraineeForEdit(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTraineeNotes}
                  className="px-5 py-2 bg-emerald-500 text-slate-950 font-bold rounded"
                >
                  Save Remarks
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
