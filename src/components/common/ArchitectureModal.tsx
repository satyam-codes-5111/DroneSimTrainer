import React from 'react';
import { Shield, Database, Cpu, Server, X, Code, Terminal, CheckCircle } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-emerald-400">
                SIH 2026 Problem Statement 26247
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              AI-Enabled Drone & Counter-Drone Threat Simulation Trainer
            </h2>
            <p className="text-xs text-slate-400">
              System Architecture, Backend Readiness & Developer Instructions
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

        <div className="mt-4 space-y-5 text-xs text-slate-300">
          {/* Section 1: SIH 2026 Problem Statement Alignment */}
          <div>
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Problem Statement Scope & Operational Boundary
            </h3>
            <p className="mt-1 text-slate-400 leading-relaxed">
              Designed for the training of forward observation personnel in modern anti-drone (C-UAS) defense. Focusing on <strong>visual/thermal electro-optical observation, threat classification, acoustic and radar cross-section analysis, and safety perimeter evaluation</strong>. In accordance with safety parameters, this simulator strictly focuses on virtual detection and classification workflows and intentionally does not implement operational physical firing mechanisms.
            </p>
          </div>

          {/* Section 2: Architecture Layers */}
          <div className="border border-slate-800 rounded-lg p-4 bg-slate-950/60">
            <h4 className="font-semibold text-white mb-3">System Architecture Pipeline</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded border border-slate-800 bg-slate-900">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                  <Cpu className="w-4 h-4" />
                  <span>Frontend Client</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  React 19, TypeScript, Tailwind CSS, and Three.js 3D WebGL engine with FLIR thermal colormaps, azimuth/elevation tracking, and gaming lobby dashboard.
                </p>
                <div className="mt-2 text-[10px] text-emerald-300 font-mono">Status: Fully Operational</div>
              </div>

              <div className="p-3 rounded border border-slate-800 bg-slate-900">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                  <Server className="w-4 h-4" />
                  <span>Backend REST API</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Full-stack Express server (<code className="text-emerald-300">server.ts</code>) handling <code className="text-emerald-300">/api/reports</code> and <code className="text-emerald-300">/api/health</code> with strict validation.
                </p>
                <div className="mt-2 text-[10px] text-emerald-400 font-mono">Status: Connected & Verified</div>
              </div>

              <div className="p-3 rounded border border-slate-800 bg-slate-900">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                  <Database className="w-4 h-4" />
                  <span>Persistence Storage</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Atomic JSON file database at <code className="text-emerald-300">/data/observation_reports.json</code> for reliable disk writes and full audit trail.
                </p>
                <div className="mt-2 text-[10px] text-emerald-400 font-mono">Status: Connected & Operational</div>
              </div>
            </div>
          </div>

          {/* Section 3: How to Run and Open in VS Code */}
          <div>
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              How to Run Locally & Open in VS Code
            </h3>
            <div className="mt-2 bg-slate-950 border border-slate-800 rounded p-3 font-mono text-[11px] text-slate-300 space-y-1">
              <div className="text-slate-500"># 1. Clone or export the repository files to your local machine</div>
              <div className="text-emerald-400">git clone &lt;repo-url&gt; &amp;&amp; cd &lt;project-folder&gt;</div>
              <div className="text-slate-500 mt-2"># 2. Open project in VS Code</div>
              <div className="text-emerald-400">code .</div>
              <div className="text-slate-500 mt-2"># 3. Install dependencies</div>
              <div className="text-emerald-400">npm install</div>
              <div className="text-slate-500 mt-2"># 4. Start development server</div>
              <div className="text-emerald-400">npm run dev</div>
              <div className="text-slate-500 mt-2"># 5. Open in browser</div>
              <div className="text-slate-400">http://localhost:3000</div>
            </div>
          </div>

          {/* Section 4: Three User Roles Summary */}
          <div>
            <h3 className="font-semibold text-white text-sm mb-2">Role Interfaces Included</h3>
            <ul className="space-y-1 text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Trainee Soldier:</strong> Profile, XP/Leveling, scenario selection, interactive 3D virtual simulation, and after-action review.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Instructor / Trainer:</strong> Scenario management, custom drill builder, cohort assessment matrix, and performance evaluation notes.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Unit Training Lead / Commander:</strong> Unit readiness %, aggregate accuracy metrics, skill-gap analysis, and CSV/JSON reporting export.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded transition-colors"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
};
