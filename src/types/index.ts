export type UserRole = 'trainee' | 'instructor' | 'commander';

export interface UserProfile {
  id: string;
  name: string;
  callsign: string;
  role: UserRole;
  rank: string;
  unit: string;
  serviceId: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  totalMissions: number;
  accuracyRate: number;
  avgResponseTimeSec: number;
  qualificationStatus: 'Qualified' | 'In Training' | 'Requires Recertification';
  avatarInitials: string;
}

export type DroneType = 
  | 'rotary_recon'
  | 'fixed_wing_surveillance'
  | 'commercial_micro_quad'
  | 'swarm_cluster'
  | 'friendly_logistics';

export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical' | 'friendly';

export type TimeOfDay = 'day' | 'dusk' | 'night';
export type WeatherCondition = 'clear' | 'fog' | 'overcast';
export type ThermalMode = 'rgb' | 'flir_white_hot' | 'flir_black_hot' | 'night_vision';

export interface AerialTarget {
  id: string;
  droneType: DroneType;
  displayName: string;
  threatLevel: ThreatLevel;
  distanceMeters: number;
  altitudeMeters: number;
  speedKnots: number;
  azimuthDeg: number;
  elevationDeg: number;
  isIdentified: boolean;
  detectedAtSec?: number;
  classifiedAs?: DroneType;
  classifiedThreat?: ThreatLevel;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  behavior: 'patrol' | 'inbound' | 'orbit' | 'erratic';
  visualSignature: string;
  acousticSignature: string;
  radarCrossSection: string;
}

export interface ScenarioObjective {
  id: string;
  description: string;
  requiredCount: number;
  currentCount: number;
  completed: boolean;
}

export interface Scenario {
  id: string;
  title: string;
  code: string;
  difficulty: 'Basic' | 'Intermediate' | 'Advanced' | 'Tactical Swarm';
  description: string;
  environment: {
    timeOfDay: TimeOfDay;
    weather: WeatherCondition;
    visibilityMeters: number;
    windKnots: number;
  };
  durationSec: number;
  targets: AerialTarget[];
  objectives: ScenarioObjective[];
  threatTypes: DroneType[];
  recommendedRoleLevel: number;
}

export interface TargetObservationLog {
  targetId: string;
  actualType: DroneType;
  actualThreat: ThreatLevel;
  userType?: DroneType;
  userThreat?: ThreatLevel;
  isCorrectType: boolean;
  isCorrectThreat: boolean;
  timestampSec: number;
  distanceMeters: number;
}

export type ObservationReportStatus = 'VERIFIED' | 'PENDING_REVIEW' | 'FLAGGED' | 'RESOLVED';

export interface ObservationReport {
  id: string;
  sessionId: string;
  traineeId: string;
  traineeName?: string;
  droneClassification: DroneType;
  threatRating: ThreatLevel;
  observationNotes: string;
  createdAt: string;
  status: ObservationReportStatus;
  targetId?: string;
  targetDisplayName?: string;
  distanceMeters?: number;
  azimuthDeg?: number;
  elevationDeg?: number;
}

export interface TrainingSessionResult {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  traineeId: string;
  traineeName: string;
  date: string;
  durationSec: number;
  totalTargets: number;
  identifiedTargets: number;
  accuracyRate: number;
  avgIdentificationTimeSec: number;
  falseAlarmCount: number;
  perimeterSafetyScore: number;
  overallScore: number;
  passed: boolean;
  observationLogs: TargetObservationLog[];
  evaluatorNotes: string[];
  recommendations: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  unlocked: boolean;
  unlockedDate?: string;
  category: 'Classification' | 'Perimeter Defense' | 'Adverse Weather' | 'Tactical Mastery';
}

export interface TraineeAssessment {
  traineeId: string;
  traineeName: string;
  rank: string;
  unit: string;
  completedSessions: number;
  overallCompetency: number;
  opticalIdScore: number;
  thermalIdScore: number;
  swarmTrackingScore: number;
  threatAssessmentScore: number;
  lastSessionDate: string;
  status: 'Ready for Field' | 'Needs Night Training' | 'Exceeds Standards';
  instructorRemarks: string;
}

export interface UnitMetrics {
  unitName: string;
  totalPersonnel: number;
  activeTrainees: number;
  certifiedCount: number;
  certificationRate: number;
  aggregateAccuracy: number;
  totalSimulationHours: number;
  skillGaps: Array<{
    area: string;
    currentProficiency: number;
    benchmarkTarget: number;
    priority: 'High' | 'Medium' | 'Low';
    affectedTraineesCount: number;
  }>;
}

export interface ApiStatus {
  isMockMode: boolean;
  backendUrl: string | null;
  databaseStatus: 'unconnected' | 'connected' | 'local_demo';
  aiModelStatus: 'client_rule_engine' | 'connected_gemini' | 'standby';
  storageEngine?: 'postgresql' | 'filesystem_json';
  postgresConfigured?: boolean;
  postgresConnected?: boolean;
  totalPersistedReports?: number;
  postgresDetails?: {
    databaseName?: string;
    serverVersion?: string;
    error?: string;
    connectionInstructions?: string;
  };
}
