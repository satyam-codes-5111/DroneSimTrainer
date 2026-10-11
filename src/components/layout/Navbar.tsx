import React from 'react';
import { UserProfile, UserRole } from '../../types';
import { Shield, ChevronDown, User, Play, Info } from 'lucide-react';

interface HeaderProps {
  currentTab: 'trainee' | 'instructor' | 'commander' | 'simulation';
  onNavigate: (tab: 'trainee' | 'instructor' | 'commander' | 'simulation') => void;
  currentUser: UserProfile;
  onOpenRoleSwitcher: () => void;
  onOpenArchitectureInfo: () => void;
  activeScenarioTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  currentUser,
  onOpenRoleSwitcher,
  onOpenArchitectureInfo,
  activeScenarioTitle
}) => {
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'trainee':
        return 'Trainee Soldier';
      case 'instructor':
        return 'Instructor / Trainer';
      case 'commander':
        return 'Unit Lead / Commander';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
                  Counter-UAS Threat Trainer
                </span>
                <span className="text-xs text-emerald-400 font-mono">
                  SIH-26247
                </span>
              </div>
            </div>
          </div>

          {/* Zone 2: Concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              onClick={() => onNavigate('trainee')}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 ${
                currentTab === 'trainee'
                  ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Trainee Station
            </button>
            <button
              onClick={() => onNavigate('instructor')}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 ${
                currentTab === 'instructor'
                  ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Instructor Command
            </button>
            <button
              onClick={() => onNavigate('commander')}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 ${
                currentTab === 'commander'
                  ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Unit Lead
            </button>
            <button
              onClick={() => onNavigate('simulation')}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 flex items-center gap-1.5 ${
                currentTab === 'simulation'
                  ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>Virtual Simulator</span>
              {activeScenarioTitle && (
                <span className="text-xs text-slate-400 truncate max-w-[120px]">
                  ({activeScenarioTitle})
                </span>
              )}
            </button>
          </nav>

          {/* Zone 3: 1 primary action / active role profile button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onOpenArchitectureInfo}
              title="Architecture & SIH Problem Statement Info"
              className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Info className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">SIH Spec</span>
            </button>

            <button
              onClick={onOpenRoleSwitcher}
              className="flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded transition-colors whitespace-nowrap shrink-0"
              aria-label="Switch User Role"
            >
              <div className="w-6 h-6 rounded bg-emerald-900/60 border border-emerald-500/30 flex items-center justify-center text-xs font-semibold text-emerald-300">
                {currentUser.avatarInitials}
              </div>
              <div className="text-left hidden sm:block">
                <p className="font-semibold text-white leading-none">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-slate-400 leading-none mt-1">
                  {getRoleBadge(currentUser.role)}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
