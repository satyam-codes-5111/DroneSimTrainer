import {
  UserProfile,
  UserRole,
  Scenario,
  TrainingSessionResult,
  TraineeAssessment,
  UnitMetrics,
  Achievement,
  AerialTarget,
  ApiStatus
} from '../types';

// Mock Users for prototype demonstration
export const INITIAL_USERS: Record<UserRole, UserProfile> = {
  trainee: {
    id: 'TRN-2026-084',
    name: 'Havildar Rajesh Kumar',
    callsign: 'FALCON-04',
    role: 'trainee',
    rank: 'Havildar (AD)',
    unit: '14th Forward Air Defense Battery',
    serviceId: 'AD-884920-K',
    level: 7,
    xp: 3450,
    nextLevelXp: 4000,
    totalMissions: 18,
    accuracyRate: 88.5,
    avgResponseTimeSec: 4.8,
    qualificationStatus: 'In Training',
    avatarInitials: 'RK'
  },
  instructor: {
    id: 'INS-2026-012',
    name: 'Major Ananya Sharma',
    callsign: 'SENTINEL-LEAD',
    role: 'instructor',
    rank: 'Major',
    unit: 'Counter-UAS Training Directorate',
    serviceId: 'UAS-102934-S',
    level: 24,
    xp: 19800,
    nextLevelXp: 22000,
    totalMissions: 142,
    accuracyRate: 97.2,
    avgResponseTimeSec: 2.3,
    qualificationStatus: 'Qualified',
    avatarInitials: 'AS'
  },
  commander: {
    id: 'CMD-2026-001',
    name: 'Colonel Vikram Rathore',
    callsign: 'EAGLE-EYE-1',
    role: 'commander',
    rank: 'Colonel',
    unit: 'Northern Sector Air Defense Brigade',
    serviceId: 'HQ-001928-R',
    level: 30,
    xp: 32000,
    nextLevelXp: 35000,
    totalMissions: 260,
    accuracyRate: 96.0,
    avgResponseTimeSec: 2.1,
    qualificationStatus: 'Qualified',
    avatarInitials: 'VR'
  }
};

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach-1',
    title: 'First Contact',
    description: 'Successfully observe and classify your first aerial drone contact.',
    iconName: 'Eye',
    unlocked: true,
    unlockedDate: '2026-09-15',
    category: 'Classification'
  },
  {
    id: 'ach-2',
    title: 'Thermal Eyes',
    description: 'Complete a night-vision thermal mission with 100% classification accuracy.',
    iconName: 'ScanEye',
    unlocked: true,
    unlockedDate: '2026-09-22',
    category: 'Adverse Weather'
  },
  {
    id: 'ach-3',
    title: 'Swarm Interceptor',
    description: 'Track and isolate 4 distinct targets within a rapid micro-UAV swarm cluster.',
    iconName: 'Layers',
    unlocked: false,
    category: 'Tactical Mastery'
  },
  {
    id: 'ach-4',
    title: 'Perimeter Bastion',
    description: 'Identify 10 low-altitude threats before they enter the 300m safety perimeter.',
    iconName: 'ShieldCheck',
    unlocked: true,
    unlockedDate: '2026-10-02',
    category: 'Perimeter Defense'
  },
  {
    id: 'ach-5',
    title: 'Zero False Alarms',
    description: 'Execute a full patrol session without misidentifying any friendly or civilian crafts.',
    iconName: 'CheckCircle2',
    unlocked: false,
    category: 'Classification'
  }
];

export const INITIAL_SCENARIOS: Scenario[] = [
  {
    id: 'SCN-101',
    code: 'ALPHA-01',
    title: 'Perimeter Recon & Basic Classification',
    difficulty: 'Basic',
    description: 'Standard daylight observation drill. Detect, track, and classify commercial micro-quadcopters and single fixed-wing recon drones surveying the forward outpost line.',
    environment: {
      timeOfDay: 'day',
      weather: 'clear',
      visibilityMeters: 5000,
      windKnots: 8
    },
    durationSec: 180,
    threatTypes: ['commercial_micro_quad', 'rotary_recon', 'friendly_logistics'],
    recommendedRoleLevel: 1,
    objectives: [
      { id: 'obj-1', description: 'Observe & identify all aerial contacts in the airspace', requiredCount: 4, currentCount: 0, completed: false },
      { id: 'obj-2', description: 'Verify friendly supply drone before classification timeout', requiredCount: 1, currentCount: 0, completed: false },
      { id: 'obj-3', description: 'Maintain zero false alarms on perimeter markers', requiredCount: 1, currentCount: 0, completed: false }
    ],
    targets: [
      {
        id: 'TGT-101-A',
        droneType: 'commercial_micro_quad',
        displayName: 'Target Alpha (DJI-Class Quadcopter)',
        threatLevel: 'medium',
        distanceMeters: 420,
        altitudeMeters: 85,
        speedKnots: 22,
        azimuthDeg: 35,
        elevationDeg: 14,
        isIdentified: false,
        position: { x: 120, y: 35, z: -250 },
        velocity: { x: 0.15, y: 0.02, z: 0.08 },
        behavior: 'patrol',
        visualSignature: '4-rotor carbon composite frame, high-pitch propeller sound, compact camera pod below gimbal',
        acousticSignature: 'High frequency whine (5.8 kHz), low motor harmonics',
        radarCrossSection: '0.01 m² (Micro-UAS)'
      },
      {
        id: 'TGT-101-B',
        droneType: 'fixed_wing_surveillance',
        displayName: 'Target Bravo (Tactical Fixed-Wing)',
        threatLevel: 'high',
        distanceMeters: 850,
        altitudeMeters: 210,
        speedKnots: 55,
        azimuthDeg: 310,
        elevationDeg: 22,
        isIdentified: false,
        position: { x: -320, y: 80, z: -400 },
        velocity: { x: 0.35, y: 0.01, z: 0.1 },
        behavior: 'orbit',
        visualSignature: 'Pusher-prop delta-wing silhouette, dual vertical stabilizers, EO/IR belly pod',
        acousticSignature: 'Steady single-piston hum (2.1 kHz)',
        radarCrossSection: '0.15 m² (Mini-UAS)'
      },
      {
        id: 'TGT-101-C',
        droneType: 'friendly_logistics',
        displayName: 'Target Charlie (Friendly Cargo Hexacopter)',
        threatLevel: 'friendly',
        distanceMeters: 310,
        altitudeMeters: 60,
        speedKnots: 18,
        azimuthDeg: 180,
        elevationDeg: 12,
        isIdentified: false,
        position: { x: 50, y: 25, z: 180 },
        velocity: { x: -0.1, y: 0, z: -0.15 },
        behavior: 'inbound',
        visualSignature: 'Hexacopter with bright IFF strobe, underslung olive-green medical/battery container',
        acousticSignature: 'Broadband multi-rotor thrum, synchronized frequencies',
        radarCrossSection: '0.35 m² (Heavy Lift UAS)'
      },
      {
        id: 'TGT-101-D',
        droneType: 'rotary_recon',
        displayName: 'Target Delta (Military Micro-Recon)',
        threatLevel: 'high',
        distanceMeters: 490,
        altitudeMeters: 110,
        speedKnots: 28,
        azimuthDeg: 65,
        elevationDeg: 18,
        isIdentified: false,
        position: { x: 280, y: 48, z: -190 },
        velocity: { x: -0.2, y: -0.01, z: 0.12 },
        behavior: 'inbound',
        visualSignature: 'Matte dark finish, shrouded stealth propellers, high-gain directional antenna mast',
        acousticSignature: 'Low-noise acoustic damping blades',
        radarCrossSection: '0.03 m² (Military Micro)'
      }
    ]
  },
  {
    id: 'SCN-102',
    code: 'BRAVO-04',
    title: 'Adverse Fog & Thermal Observation Drill',
    difficulty: 'Intermediate',
    description: 'Heavy fog condition at twilight. Visual optics degraded to 800m. Utilize FLIR thermal sensor (White-Hot / Black-Hot) to detect stealth loitering aerial contacts.',
    environment: {
      timeOfDay: 'dusk',
      weather: 'fog',
      visibilityMeters: 900,
      windKnots: 14
    },
    durationSec: 210,
    threatTypes: ['rotary_recon', 'fixed_wing_surveillance', 'commercial_micro_quad'],
    recommendedRoleLevel: 4,
    objectives: [
      { id: 'obj-4', description: 'Switch to FLIR White-Hot or Black-Hot thermal mode', requiredCount: 1, currentCount: 0, completed: false },
      { id: 'obj-5', description: 'Locate and classify 3 thermal heat signatures in fog', requiredCount: 3, currentCount: 0, completed: false },
      { id: 'obj-6', description: 'Identify loitering fixed-wing aerial target at >600m', requiredCount: 1, currentCount: 0, completed: false }
    ],
    targets: [
      {
        id: 'TGT-102-A',
        droneType: 'fixed_wing_surveillance',
        displayName: 'Thermal Contact 1 (Loitering Wing)',
        threatLevel: 'critical',
        distanceMeters: 670,
        altitudeMeters: 165,
        speedKnots: 48,
        azimuthDeg: 15,
        elevationDeg: 16,
        isIdentified: false,
        position: { x: 60, y: 70, z: -350 },
        velocity: { x: 0.3, y: 0.02, z: -0.1 },
        behavior: 'orbit',
        visualSignature: 'High thermal heat signature from electric motor cowl, low visual contrast in mist',
        acousticSignature: 'Attenuated propeller acoustic in high humidity',
        radarCrossSection: '0.12 m²'
      },
      {
        id: 'TGT-102-B',
        droneType: 'rotary_recon',
        displayName: 'Thermal Contact 2 (Hovering Quad)',
        threatLevel: 'high',
        distanceMeters: 380,
        altitudeMeters: 75,
        speedKnots: 15,
        azimuthDeg: 280,
        elevationDeg: 14,
        isIdentified: false,
        position: { x: -240, y: 35, z: -140 },
        velocity: { x: 0.08, y: -0.01, z: 0.05 },
        behavior: 'patrol',
        visualSignature: 'Heat blooming around ESC battery bays and 4 motor bearings',
        acousticSignature: 'Muffled intermittent motor pitch',
        radarCrossSection: '0.02 m²'
      },
      {
        id: 'TGT-102-C',
        droneType: 'commercial_micro_quad',
        displayName: 'Thermal Contact 3 (FPV Scout)',
        threatLevel: 'medium',
        distanceMeters: 290,
        altitudeMeters: 45,
        speedKnots: 34,
        azimuthDeg: 120,
        elevationDeg: 9,
        isIdentified: false,
        position: { x: 190, y: 22, z: -90 },
        velocity: { x: -0.22, y: 0.03, z: 0.15 },
        behavior: 'erratic',
        visualSignature: 'Hot battery pack center, small cross-section with high acceleration vectors',
        acousticSignature: 'Sharp erratic throttle transitions',
        radarCrossSection: '0.008 m²'
      }
    ]
  },
  {
    id: 'SCN-103',
    code: 'CHARLIE-09',
    title: 'Night Perimeter & Swarm Cluster Infiltration',
    difficulty: 'Tactical Swarm',
    description: 'Zero ambient light night operation. A coordinated mini-drone swarm cluster approaches the border defense installation. Rapid multi-target tracking required.',
    environment: {
      timeOfDay: 'night',
      weather: 'clear',
      visibilityMeters: 3000,
      windKnots: 6
    },
    durationSec: 240,
    threatTypes: ['swarm_cluster', 'rotary_recon', 'fixed_wing_surveillance'],
    recommendedRoleLevel: 6,
    objectives: [
      { id: 'obj-7', description: 'Enable Night Vision (NVG) or FLIR optics', requiredCount: 1, currentCount: 0, completed: false },
      { id: 'obj-8', description: 'Classify lead swarm node before perimeter boundary (<350m)', requiredCount: 1, currentCount: 0, completed: false },
      { id: 'obj-9', description: 'Catalog all 5 aerial threats in coordinated cluster', requiredCount: 5, currentCount: 0, completed: false }
    ],
    targets: [
      {
        id: 'TGT-103-A',
        droneType: 'swarm_cluster',
        displayName: 'Swarm Lead Node (Cluster Alpha-1)',
        threatLevel: 'critical',
        distanceMeters: 520,
        altitudeMeters: 90,
        speedKnots: 30,
        azimuthDeg: 350,
        elevationDeg: 11,
        isIdentified: false,
        position: { x: -40, y: 40, z: -290 },
        velocity: { x: 0.05, y: -0.01, z: 0.2 },
        behavior: 'inbound',
        visualSignature: 'Mesh radio RF beacon, compact co-axial dual rotors',
        acousticSignature: 'Multi-frequency swarm drone buzz (swarm harmonic resonance)',
        radarCrossSection: '0.04 m² (Combined Swarm Node)'
      },
      {
        id: 'TGT-103-B',
        droneType: 'swarm_cluster',
        displayName: 'Swarm Wing Node (Cluster Alpha-2)',
        threatLevel: 'critical',
        distanceMeters: 550,
        altitudeMeters: 95,
        speedKnots: 30,
        azimuthDeg: 355,
        elevationDeg: 12,
        isIdentified: false,
        position: { x: 10, y: 42, z: -310 },
        velocity: { x: 0.05, y: -0.01, z: 0.2 },
        behavior: 'inbound',
        visualSignature: 'Synchronized formation holding, spacing 15 meters from lead node',
        acousticSignature: 'Coordinated prop wash sound pattern',
        radarCrossSection: '0.04 m²'
      },
      {
        id: 'TGT-103-C',
        droneType: 'swarm_cluster',
        displayName: 'Swarm Flank Node (Cluster Alpha-3)',
        threatLevel: 'critical',
        distanceMeters: 580,
        altitudeMeters: 85,
        speedKnots: 30,
        azimuthDeg: 342,
        elevationDeg: 10,
        isIdentified: false,
        position: { x: -90, y: 38, z: -320 },
        velocity: { x: 0.05, y: -0.01, z: 0.2 },
        behavior: 'inbound',
        visualSignature: 'Autonomous flocking algorithm alignment, rapid response maneuvers',
        acousticSignature: 'Swarm harmonic frequency shift',
        radarCrossSection: '0.04 m²'
      },
      {
        id: 'TGT-103-D',
        droneType: 'fixed_wing_surveillance',
        displayName: 'Mothership Relayer (High Altitude EW Relay)',
        threatLevel: 'high',
        distanceMeters: 1100,
        altitudeMeters: 380,
        speedKnots: 62,
        azimuthDeg: 20,
        elevationDeg: 26,
        isIdentified: false,
        position: { x: 240, y: 150, z: -550 },
        velocity: { x: -0.15, y: 0.01, z: -0.1 },
        behavior: 'orbit',
        visualSignature: 'High aspect ratio glider wings, satellite link radome on spine',
        acousticSignature: 'Ultra-low acoustic footprint at standoff altitude',
        radarCrossSection: '0.22 m²'
      },
      {
        id: 'TGT-103-E',
        droneType: 'rotary_recon',
        displayName: 'Decoy Drone (Commercial Distraction)',
        threatLevel: 'medium',
        distanceMeters: 320,
        altitudeMeters: 50,
        speedKnots: 20,
        azimuthDeg: 240,
        elevationDeg: 8,
        isIdentified: false,
        position: { x: -210, y: 25, z: -100 },
        velocity: { x: 0.12, y: 0.01, z: -0.05 },
        behavior: 'patrol',
        visualSignature: 'Unshielded commercial lighting blinking red/green, obvious decoy pattern',
        acousticSignature: 'Loud uncalibrated plastic propellers',
        radarCrossSection: '0.02 m²'
      }
    ]
  }
];

export const INITIAL_TRAINING_HISTORY: TrainingSessionResult[] = [
  {
    id: 'SESS-2026-0921',
    scenarioId: 'SCN-101',
    scenarioTitle: 'Perimeter Recon & Basic Classification',
    traineeId: 'TRN-2026-084',
    traineeName: 'Havildar Rajesh Kumar',
    date: '2026-10-09 14:32',
    durationSec: 142,
    totalTargets: 4,
    identifiedTargets: 4,
    accuracyRate: 100,
    avgIdentificationTimeSec: 4.2,
    falseAlarmCount: 0,
    perimeterSafetyScore: 94,
    overallScore: 96,
    passed: true,
    observationLogs: [
      {
        targetId: 'TGT-101-A',
        actualType: 'commercial_micro_quad',
        actualThreat: 'medium',
        userType: 'commercial_micro_quad',
        userThreat: 'medium',
        isCorrectType: true,
        isCorrectThreat: true,
        timestampSec: 28,
        distanceMeters: 410
      },
      {
        targetId: 'TGT-101-B',
        actualType: 'fixed_wing_surveillance',
        actualThreat: 'high',
        userType: 'fixed_wing_surveillance',
        userThreat: 'high',
        isCorrectType: true,
        isCorrectThreat: true,
        timestampSec: 62,
        distanceMeters: 790
      },
      {
        targetId: 'TGT-101-C',
        actualType: 'friendly_logistics',
        actualThreat: 'friendly',
        userType: 'friendly_logistics',
        userThreat: 'friendly',
        isCorrectType: true,
        isCorrectThreat: true,
        timestampSec: 94,
        distanceMeters: 310
      },
      {
        targetId: 'TGT-101-D',
        actualType: 'rotary_recon',
        actualThreat: 'high',
        userType: 'rotary_recon',
        userThreat: 'high',
        isCorrectType: true,
        isCorrectThreat: true,
        timestampSec: 125,
        distanceMeters: 480
      }
    ],
    evaluatorNotes: [
      'Prompt acoustic correlation before visual lock.',
      'Correctly verified friendly IFF strobe without raising false perimeter alarm.',
      'Excellent azimuth tracking across high elevation angles.'
    ],
    recommendations: [
      'Advance to Adverse Fog scenario to practice FLIR thermal calibration.',
      'Practice quick-switching between 4x and 8x magnification on distant targets.'
    ]
  },
  {
    id: 'SESS-2026-0884',
    scenarioId: 'SCN-102',
    scenarioTitle: 'Adverse Fog & Thermal Observation Drill',
    traineeId: 'TRN-2026-084',
    traineeName: 'Havildar Rajesh Kumar',
    date: '2026-10-06 18:15',
    durationSec: 188,
    totalTargets: 3,
    identifiedTargets: 2,
    accuracyRate: 75,
    avgIdentificationTimeSec: 6.8,
    falseAlarmCount: 1,
    perimeterSafetyScore: 82,
    overallScore: 78,
    passed: true,
    observationLogs: [
      {
        targetId: 'TGT-102-A',
        actualType: 'fixed_wing_surveillance',
        actualThreat: 'critical',
        userType: 'fixed_wing_surveillance',
        userThreat: 'high',
        isCorrectType: true,
        isCorrectThreat: false,
        timestampSec: 54,
        distanceMeters: 620
      },
      {
        targetId: 'TGT-102-B',
        actualType: 'rotary_recon',
        actualThreat: 'high',
        userType: 'rotary_recon',
        userThreat: 'high',
        isCorrectType: true,
        isCorrectThreat: true,
        timestampSec: 110,
        distanceMeters: 370
      }
    ],
    evaluatorNotes: [
      'Thermal mode transition executed appropriately upon fog ingress.',
      'Underestimated threat priority on loitering fixed-wing aerial target (classified High instead of Critical).',
      'Delayed acquisition on low-signature FPV scout.'
    ],
    recommendations: [
      'Review distinction between stand-off ISR drones and loitering munitions in thermal view.',
      'Practice rapid sweep of lower azimuth sectors in degraded optical conditions.'
    ]
  }
];

export const INITIAL_ASSESSMENTS: TraineeAssessment[] = [
  {
    traineeId: 'TRN-2026-084',
    traineeName: 'Havildar Rajesh Kumar',
    rank: 'Havildar (AD)',
    unit: '14th Forward Air Defense Battery',
    completedSessions: 18,
    overallCompetency: 88,
    opticalIdScore: 92,
    thermalIdScore: 84,
    swarmTrackingScore: 79,
    threatAssessmentScore: 86,
    lastSessionDate: '2026-10-09',
    status: 'Ready for Field',
    instructorRemarks: 'Solid foundational discipline. Excels in optical range estimation. Requires 2 more swarm tracking iterations before frontline sector deployment.'
  },
  {
    traineeId: 'TRN-2026-091',
    traineeName: 'Naik S. Balakrishnan',
    rank: 'Naik',
    unit: '14th Forward Air Defense Battery',
    completedSessions: 14,
    overallCompetency: 81,
    opticalIdScore: 85,
    thermalIdScore: 72,
    swarmTrackingScore: 74,
    threatAssessmentScore: 79,
    lastSessionDate: '2026-10-08',
    status: 'Needs Night Training',
    instructorRemarks: 'Thermal signature differentiation shows latency under heavy fog conditions. Recommend focused FLIR simulation drill.'
  },
  {
    traineeId: 'TRN-2026-077',
    traineeName: 'Lance Naik Preeti Thapa',
    rank: 'Lance Naik',
    unit: '18th Independent AD Brigade',
    completedSessions: 22,
    overallCompetency: 96,
    opticalIdScore: 98,
    thermalIdScore: 95,
    swarmTrackingScore: 94,
    threatAssessmentScore: 97,
    lastSessionDate: '2026-10-10',
    status: 'Exceeds Standards',
    instructorRemarks: 'Top scorer in multi-drone swarm separation. Demonstrated zero false alarms across 5 high-speed drills.'
  },
  {
    traineeId: 'TRN-2026-105',
    traineeName: 'Sepoy Amit Deshmukh',
    rank: 'Sepoy',
    unit: '9th Mountain Surveillance Detachment',
    completedSessions: 9,
    overallCompetency: 74,
    opticalIdScore: 78,
    thermalIdScore: 68,
    swarmTrackingScore: 62,
    threatAssessmentScore: 72,
    lastSessionDate: '2026-10-05',
    status: 'Needs Night Training',
    instructorRemarks: 'Early training phase. High false alarm rate on commercial quadcopter vs bird clutter. Assigned to basic classification refresh.'
  }
];

export const INITIAL_UNIT_METRICS: UnitMetrics = {
  unitName: '14th Forward Air Defense Battery & Combined Detachments',
  totalPersonnel: 48,
  activeTrainees: 32,
  certifiedCount: 25,
  certificationRate: 78.1,
  aggregateAccuracy: 87.4,
  totalSimulationHours: 214.5,
  skillGaps: [
    {
      area: 'Multi-UAS Swarm Dispersal Tracking',
      currentProficiency: 76,
      benchmarkTarget: 90,
      priority: 'High',
      affectedTraineesCount: 14
    },
    {
      area: 'FLIR Thermal White-Hot / Black-Hot Calibration',
      currentProficiency: 81,
      benchmarkTarget: 90,
      priority: 'Medium',
      affectedTraineesCount: 9
    },
    {
      area: 'Commercial Micro-Drone vs Military Recon Discrimination',
      currentProficiency: 85,
      benchmarkTarget: 92,
      priority: 'Medium',
      affectedTraineesCount: 6
    },
    {
      area: 'Friendly IFF Transponder Verification Under Time Stress',
      currentProficiency: 93,
      benchmarkTarget: 95,
      priority: 'Low',
      affectedTraineesCount: 2
    }
  ]
};

// ==========================================
// API INTEGRATION LAYER INTERFACE
// ==========================================
// When connecting to an actual Node/Express/Cloud backend, implement this interface:
export interface ITrainingApiService {
  getCurrentRole(): UserRole;
  getUserProfile(role?: UserRole): Promise<UserProfile>;
  switchUserRole(role: UserRole): Promise<UserProfile>;
  getScenarios(): Promise<Scenario[]>;
  getScenario(id: string): Promise<Scenario | undefined>;
  createCustomScenario(scenario: Omit<Scenario, 'id'>): Promise<Scenario>;
  submitTrainingSession(result: Omit<TrainingSessionResult, 'id'>): Promise<TrainingSessionResult>;
  getTrainingHistory(traineeId?: string): Promise<TrainingSessionResult[]>;
  getAchievements(): Promise<Achievement[]>;
  getInstructorAssessments(): Promise<TraineeAssessment[]>;
  updateAssessment(assessment: TraineeAssessment): Promise<TraineeAssessment>;
  getUnitMetrics(): Promise<UnitMetrics>;
  getApiStatus(): ApiStatus;
  exportData(format: 'json' | 'csv'): Promise<string>;
}

class PrototypeTrainingService implements ITrainingApiService {
  private currentRole: UserRole = 'trainee';
  private scenarios: Scenario[] = [...INITIAL_SCENARIOS];
  private history: TrainingSessionResult[] = [...INITIAL_TRAINING_HISTORY];
  private assessments: TraineeAssessment[] = [...INITIAL_ASSESSMENTS];
  private achievements: Achievement[] = [...INITIAL_ACHIEVEMENTS];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const storedRole = localStorage.getItem('c_uas_current_role') as UserRole;
      if (storedRole && INITIAL_USERS[storedRole]) {
        this.currentRole = storedRole;
      }
      const storedHistory = localStorage.getItem('c_uas_training_history');
      if (storedHistory) {
        this.history = JSON.parse(storedHistory);
      }
      const storedScenarios = localStorage.getItem('c_uas_scenarios');
      if (storedScenarios) {
        this.scenarios = JSON.parse(storedScenarios);
      }
    } catch {
      // Fallback to initial constants if storage fails
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('c_uas_current_role', this.currentRole);
      localStorage.setItem('c_uas_training_history', JSON.stringify(this.history));
      localStorage.setItem('c_uas_scenarios', JSON.stringify(this.scenarios));
    } catch {
      // Storage save silent fallback
    }
  }

  getCurrentRole(): UserRole {
    return this.currentRole;
  }

  async getUserProfile(role?: UserRole): Promise<UserProfile> {
    const targetRole = role || this.currentRole;
    return { ...INITIAL_USERS[targetRole] };
  }

  async switchUserRole(role: UserRole): Promise<UserProfile> {
    this.currentRole = role;
    this.saveToStorage();
    return { ...INITIAL_USERS[role] };
  }

  async getScenarios(): Promise<Scenario[]> {
    return [...this.scenarios];
  }

  async getScenario(id: string): Promise<Scenario | undefined> {
    return this.scenarios.find(s => s.id === id);
  }

  async createCustomScenario(scenarioData: Omit<Scenario, 'id'>): Promise<Scenario> {
    const newScenario: Scenario = {
      ...scenarioData,
      id: `SCN-${Date.now().toString().slice(-4)}`
    };
    this.scenarios.unshift(newScenario);
    this.saveToStorage();
    return newScenario;
  }

  async submitTrainingSession(resultData: Omit<TrainingSessionResult, 'id'>): Promise<TrainingSessionResult> {
    const newSession: TrainingSessionResult = {
      ...resultData,
      id: `SESS-${Date.now().toString().slice(-6)}`
    };
    this.history.unshift(newSession);
    this.saveToStorage();
    return newSession;
  }

  async getTrainingHistory(traineeId?: string): Promise<TrainingSessionResult[]> {
    if (traineeId) {
      return this.history.filter(h => h.traineeId === traineeId);
    }
    return [...this.history];
  }

  async getAchievements(): Promise<Achievement[]> {
    return [...this.achievements];
  }

  async getInstructorAssessments(): Promise<TraineeAssessment[]> {
    return [...this.assessments];
  }

  async updateAssessment(assessment: TraineeAssessment): Promise<TraineeAssessment> {
    const idx = this.assessments.findIndex(a => a.traineeId === assessment.traineeId);
    if (idx !== -1) {
      this.assessments[idx] = { ...assessment };
    } else {
      this.assessments.push({ ...assessment });
    }
    return assessment;
  }

  async getUnitMetrics(): Promise<UnitMetrics> {
    return { ...INITIAL_UNIT_METRICS };
  }

  getApiStatus(): ApiStatus {
    return {
      isMockMode: true,
      backendUrl: null,
      databaseStatus: 'local_demo',
      aiModelStatus: 'client_rule_engine'
    };
  }

  async exportData(format: 'json' | 'csv'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(
        {
          exportTimestamp: new Date().toISOString(),
          version: '1.0-prototype-preview',
          metadata: {
            sihProblemStatement: '26247',
            title: 'AI-Enabled Drone & Counter-Drone Threat Simulation Trainer'
          },
          trainingHistory: this.history,
          assessments: this.assessments,
          unitMetrics: INITIAL_UNIT_METRICS
        },
        null,
        2
      );
    }

    // CSV format for tabular export
    const headers = [
      'Session_ID',
      'Scenario_Title',
      'Trainee_Name',
      'Date',
      'Duration_Sec',
      'Identified_Targets',
      'Total_Targets',
      'Accuracy_Percent',
      'Avg_Response_Sec',
      'Overall_Score',
      'Status'
    ];
    const rows = this.history.map(s => [
      s.id,
      `"${s.scenarioTitle}"`,
      `"${s.traineeName}"`,
      s.date,
      s.durationSec,
      s.identifiedTargets,
      s.totalTargets,
      s.accuracyRate,
      s.avgIdentificationTimeSec,
      s.overallScore,
      s.passed ? 'PASSED' : 'RETRY'
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

// Export singleton API service instance
export const apiService = new PrototypeTrainingService();
