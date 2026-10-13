/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { 
  UserRole, 
  UserProfile, 
  Scenario, 
  TrainingSessionResult, 
  TraineeAssessment, 
  UnitMetrics, 
  Achievement 
} from './types';
import { 
  apiService, 
  INITIAL_USERS, 
  INITIAL_SCENARIOS, 
  INITIAL_TRAINING_HISTORY, 
  INITIAL_ACHIEVEMENTS, 
  INITIAL_ASSESSMENTS, 
  INITIAL_UNIT_METRICS 
} from './services/api';
import { Header } from './components/layout/Navbar';
import { PrototypeNotice } from './components/common/PrototypeNotice';
import { RoleSwitcherModal } from './components/common/RoleSwitcherModal';
import { ArchitectureModal } from './components/common/ArchitectureModal';
import { TraineeDashboard } from './components/trainee/TraineeDashboard';
import { InstructorDashboard } from './components/instructor/InstructorDashboard';
import { CommanderDashboard } from './components/commander/CommanderDashboard';
import { VirtualTrainingScene } from './components/simulation/VirtualTrainingScene';
import { AfterActionReviewModal } from './components/simulation/AfterActionReviewModal';
import { AlertTriangle, RotateCcw } from 'lucide-react';

// Error Boundary to prevent black screen on unexpected runtime exceptions
interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AppErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-lg w-full text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Simulation Interface Recovered</h1>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              An unexpected render issue was safely intercepted. You can reset to the default Trainee Station to resume training.
            </p>
            <div className="text-left bg-slate-950 p-3 rounded border border-slate-800 text-[11px] font-mono text-rose-300 mb-6 max-h-32 overflow-y-auto">
              {this.state.error?.message || 'Unknown runtime error'}
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload Trainer Interface</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // Navigation & Role State
  const [currentTab, setCurrentTab] = useState<'trainee' | 'instructor' | 'commander' | 'simulation'>('trainee');
  const [currentRole, setCurrentRole] = useState<UserRole>('trainee');
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_USERS.trainee);

  // Synchronous initial data to prevent undefined states on first render
  const [scenarios, setScenarios] = useState<Scenario[]>(INITIAL_SCENARIOS);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(INITIAL_SCENARIOS[0]);
  const [history, setHistory] = useState<TrainingSessionResult[]>(INITIAL_TRAINING_HISTORY);
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [assessments, setAssessments] = useState<TraineeAssessment[]>(INITIAL_ASSESSMENTS);
  const [unitMetrics, setUnitMetrics] = useState<UnitMetrics | null>(INITIAL_UNIT_METRICS);

  // Modals
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isArchModalOpen, setIsArchModalOpen] = useState(false);
  const [activeAAR, setActiveAAR] = useState<TrainingSessionResult | null>(null);

  // Load stored/dynamic state on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const role = apiService.getCurrentRole();
        setCurrentRole(role);
        const user = await apiService.getUserProfile(role);
        setCurrentUser(user);

        const scnList = await apiService.getScenarios();
        if (scnList && scnList.length > 0) {
          setScenarios(scnList);
          setActiveScenario(scnList[0]);
        }

        const histList = await apiService.getTrainingHistory();
        if (histList) setHistory(histList);

        const achList = await apiService.getAchievements();
        if (achList) setAchievements(achList);

        const assessList = await apiService.getInstructorAssessments();
        if (assessList) setAssessments(assessList);

        const metrics = await apiService.getUnitMetrics();
        if (metrics) setUnitMetrics(metrics);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };

    loadInitialData();
  }, []);

  // Handle switching user role
  const handleSelectRole = async (role: UserRole) => {
    setCurrentRole(role);
    const updatedUser = await apiService.switchUserRole(role);
    setCurrentUser(updatedUser);

    // Auto-navigate to respective dashboard view
    if (role === 'trainee') {
      setCurrentTab('trainee');
    } else if (role === 'instructor') {
      setCurrentTab('instructor');
    } else if (role === 'commander') {
      setCurrentTab('commander');
    }
  };

  // Launch simulation scenario
  const handleStartScenario = (scenario: Scenario) => {
    setActiveScenario(scenario);
    setCurrentTab('simulation');
  };

  // Completed simulation result submission
  const handleFinishSimulation = async (result: TrainingSessionResult) => {
    try {
      const saved = await apiService.submitTrainingSession(result);
      setHistory(prev => [saved, ...prev.filter(s => s.id !== saved.id)]);
      setActiveAAR(saved);
    } catch (err) {
      console.error('Error persisting training session to backend:', err);
      // Keep local session display active so user can review their AAR report
      setHistory(prev => [result, ...prev.filter(s => s.id !== result.id)]);
      setActiveAAR(result);
    }
  };

  // Create custom scenario from instructor dashboard
  const handleCreateScenario = async (newScenarioData: Omit<Scenario, 'id'>) => {
    const created = await apiService.createCustomScenario(newScenarioData);
    setScenarios(prev => [created, ...prev]);
  };

  // Update assessment notes
  const handleUpdateAssessment = async (assessment: TraineeAssessment) => {
    const updated = await apiService.updateAssessment(assessment);
    setAssessments(prev => prev.map(a => a.traineeId === updated.traineeId ? updated : a));
  };

  // Export data handler
  const handleExportData = async (format: 'json' | 'csv') => {
    const content = await apiService.exportData(format);
    const blob = new Blob([content], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `c-uas-training-export-${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AppErrorBoundary>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
        {/* Prototype Status Bar */}
        <PrototypeNotice onOpenDetails={() => setIsArchModalOpen(true)} />

        {/* Top Bar Navigation */}
        <Header
          currentTab={currentTab}
          onNavigate={tab => setCurrentTab(tab)}
          currentUser={currentUser}
          onOpenRoleSwitcher={() => setIsRoleModalOpen(true)}
          onOpenArchitectureInfo={() => setIsArchModalOpen(true)}
          activeScenarioTitle={activeScenario?.code}
        />

        {/* Main View Area */}
        <main className="flex-1 flex flex-col">
          {currentTab === 'simulation' ? (
            activeScenario ? (
              <VirtualTrainingScene
                scenario={activeScenario}
                onFinishSimulation={handleFinishSimulation}
                onExitWithoutSaving={() => setCurrentTab('trainee')}
                traineeId={currentUser.id}
                traineeName={currentUser.name}
              />
            ) : (
              <div className="max-w-7xl mx-auto p-12 text-center text-slate-400">
                <p>No active scenario selected. Return to Trainee Station to choose a mission.</p>
                <button
                  onClick={() => setCurrentTab('trainee')}
                  className="mt-4 px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded text-xs"
                >
                  Back to Trainee Station
                </button>
              </div>
            )
          ) : currentTab === 'trainee' ? (
            <TraineeDashboard
              user={currentUser}
              scenarios={scenarios}
              history={history}
              achievements={achievements}
              onStartScenario={handleStartScenario}
              onViewAAR={res => setActiveAAR(res)}
            />
          ) : currentTab === 'instructor' ? (
            <InstructorDashboard
              instructor={currentUser}
              scenarios={scenarios}
              history={history}
              assessments={assessments}
              onCreateScenario={handleCreateScenario}
              onUpdateAssessment={handleUpdateAssessment}
              onViewAAR={res => setActiveAAR(res)}
              onLaunchDrill={handleStartScenario}
            />
          ) : (
            unitMetrics && (
              <CommanderDashboard
                commander={currentUser}
                metrics={unitMetrics}
                history={history}
                assessments={assessments}
                onExport={handleExportData}
              />
            )
          )}
        </main>

        {/* Footer */}
        <footer className="bg-slate-950 border-t border-slate-900 py-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-400">
                AI-Enabled Drone & Counter-Drone Threat Simulation Trainer
              </span>
              <span className="text-slate-700">·</span>
              <span className="font-mono">SIH 2026 Problem Statement 26247</span>
            </div>

            <div className="flex items-center gap-4 text-slate-400">
              <button
                onClick={() => setIsArchModalOpen(true)}
                className="hover:text-emerald-400 transition-colors"
              >
                System Architecture & VS Code Guide
              </button>
              <span>·</span>
              <button
                onClick={() => setIsRoleModalOpen(true)}
                className="hover:text-emerald-400 transition-colors"
              >
                Role Selector
              </button>
            </div>
          </div>
        </footer>

        {/* MODALS */}
        <RoleSwitcherModal
          isOpen={isRoleModalOpen}
          onClose={() => setIsRoleModalOpen(false)}
          currentRole={currentRole}
          onSelectRole={handleSelectRole}
        />

        <ArchitectureModal
          isOpen={isArchModalOpen}
          onClose={() => setIsArchModalOpen(false)}
        />

        {activeAAR && (
          <AfterActionReviewModal
            result={activeAAR}
            onRetake={() => {
              setActiveAAR(null);
              if (activeScenario) {
                setCurrentTab('simulation');
              }
            }}
            onReturnToLobby={() => {
              setActiveAAR(null);
              setCurrentTab('trainee');
            }}
            onExport={() => handleExportData('json')}
          />
        )}
      </div>
    </AppErrorBoundary>
  );
}
