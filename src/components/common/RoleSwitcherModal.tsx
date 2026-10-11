import React from 'react';
import { UserRole, UserProfile } from '../../types';
import { INITIAL_USERS } from '../../services/api';
import { User, CheckCircle2, Shield, Award, Users, X } from 'lucide-react';

interface RoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  onSelectRole
}) => {
  if (!isOpen) return null;

  const rolesList: Array<{
    role: UserRole;
    user: UserProfile;
    title: string;
    description: string;
    features: string[];
    icon: React.ReactNode;
  }> = [
    {
      role: 'trainee',
      user: INITIAL_USERS.trainee,
      title: 'Trainee Soldier',
      description: 'Frontline air defense observer undergoing virtual drone identification and classification training.',
      features: [
        'Tactical soldier profile, level & XP progression',
        'Mission selection and difficulty tiers',
        'Interactive 3D Virtual Training Simulator',
        'Personal performance review & achievement badges'
      ],
      icon: <User className="w-5 h-5 text-emerald-400" />
    },
    {
      role: 'instructor',
      user: INITIAL_USERS.instructor,
      title: 'Instructor / Trainer',
      description: 'Supervises trainee cohorts, manages simulation scenarios, and reviews after-action reports.',
      features: [
        'Cohort progress & session oversight',
        'Custom scenario builder & difficulty tuning',
        'Trainee competency assessment rubrics',
        'After-action review feedback injector'
      ],
      icon: <Award className="w-5 h-5 text-emerald-400" />
    },
    {
      role: 'commander',
      user: INITIAL_USERS.commander,
      title: 'Unit Training Lead / Commander',
      description: 'Monitors brigade/unit readiness, evaluates aggregate metrics, and analyzes operational skill gaps.',
      features: [
        'Regiment-level qualification milestones',
        'Aggregate accuracy & simulation hours charts',
        'Actionable skill-gap priority analysis',
        'Executive reports & data export (JSON / CSV)'
      ],
      icon: <Users className="w-5 h-5 text-emerald-400" />
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              Role Selection & Session Identity
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select one of the 3 role interfaces defined for SIH 2026 Problem Statement 26247.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 p-3 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
          <span className="font-semibold shrink-0">Note:</span>
          <span>
            This prototype demonstrates role-based permission routing in client demonstration mode. In production deployment, authentication will connect via real military CAC/SSO or secure JWT tokens.
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {rolesList.map(item => {
            const isSelected = item.role === currentRole;
            return (
              <div
                key={item.role}
                onClick={() => {
                  onSelectRole(item.role);
                  onClose();
                }}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-950/30 border-emerald-500/60 ring-1 ring-emerald-500/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white text-sm">
                          {item.title}
                        </h3>
                        {isSelected && (
                          <span className="text-[11px] font-mono text-emerald-400">
                            (Active)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {item.user.name} · {item.user.rank} ({item.user.unit})
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-1" />
                  )}
                </div>

                <p className="text-xs text-slate-300 mt-3">
                  {item.description}
                </p>

                <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-400">
                  {item.features.map((feat, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-emerald-400">✓</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded transition-colors"
          >
            Confirm & Continue
          </button>
        </div>
      </div>
    </div>
  );
};
