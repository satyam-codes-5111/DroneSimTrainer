import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { 
  Scenario, 
  AerialTarget, 
  DroneType, 
  ThreatLevel, 
  ThermalMode, 
  TimeOfDay, 
  WeatherCondition,
  TrainingSessionResult,
  TargetObservationLog
} from '../../types';
import { 
  Play, 
  Pause, 
  Square, 
  Crosshair, 
  Eye, 
  Maximize2, 
  Sun, 
  Moon, 
  CloudFog, 
  ShieldAlert, 
  CheckCircle2, 
  Radio, 
  Camera, 
  ChevronRight,
  Info
} from 'lucide-react';

interface VirtualTrainingSceneProps {
  scenario: Scenario;
  onFinishSimulation: (result: TrainingSessionResult) => void;
  onExitWithoutSaving: () => void;
  traineeId: string;
  traineeName: string;
}

export const VirtualTrainingScene: React.FC<VirtualTrainingSceneProps> = ({
  scenario,
  onFinishSimulation,
  onExitWithoutSaving,
  traineeId,
  traineeName
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Simulation controls state
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemainingSec, setTimeRemainingSec] = useState(scenario.durationSec);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Environment & Sensor controls
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(scenario.environment.timeOfDay);
  const [weather, setWeather] = useState<WeatherCondition>(scenario.environment.weather);
  const [thermalMode, setThermalMode] = useState<ThermalMode>('rgb');
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 4 | 8>(1);

  // Targets & Observation state
  const [targets, setTargets] = useState<AerialTarget[]>(
    scenario.targets.map(t => ({ ...t, isIdentified: false }))
  );
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(scenario.targets[0]?.id || null);
  const [observationLogs, setObservationLogs] = useState<TargetObservationLog[]>([]);

  // Classification form inputs for selected target
  const [inputClass, setInputClass] = useState<DroneType>('commercial_micro_quad');
  const [inputThreat, setInputThreat] = useState<ThreatLevel>('medium');
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Camera orientation & Look angle
  const [cameraAzimuth, setCameraAzimuth] = useState(0); // 0 to 360 deg
  const [cameraElevation, setCameraElevation] = useState(15); // -10 to +70 deg

  // References for Three.js
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const droneMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const lightsRef = useRef<{
    ambient?: THREE.AmbientLight;
    directional?: THREE.DirectionalLight;
    fog?: THREE.FogExp2;
  }>({});
  const animationFrameId = useRef<number | null>(null);

  const selectedTarget = targets.find(t => t.id === selectedTargetId) || targets[0];

  // Helper to build 3D drone mesh with rotating propellers
  const createDroneMesh = (target: AerialTarget): THREE.Group => {
    const group = new THREE.Group();

    if (target.droneType === 'commercial_micro_quad' || target.droneType === 'rotary_recon') {
      // Quadcopter body
      const bodyGeo = new THREE.BoxGeometry(3, 0.8, 3);
      const bodyMat = new THREE.MeshStandardMaterial({ 
        color: target.droneType === 'rotary_recon' ? 0x1f2937 : 0xe2e8f0,
        roughness: 0.4,
        metalness: 0.6
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      group.add(body);

      // Camera gimbal pod
      const podGeo = new THREE.SphereGeometry(0.7, 16, 16);
      const podMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.2 });
      const pod = new THREE.Mesh(podGeo, podMat);
      pod.position.set(0, -0.6, 1);
      group.add(pod);

      // 4 arms & rotors
      const armOffsets = [
        { x: 3, z: 3 },
        { x: -3, z: 3 },
        { x: 3, z: -3 },
        { x: -3, z: -3 }
      ];

      armOffsets.forEach(pos => {
        // Arm strut
        const armGeo = new THREE.CylinderGeometry(0.2, 0.2, 4);
        const armMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
        const arm = new THREE.Mesh(armGeo, armMat);
        arm.rotation.z = Math.PI / 2;
        arm.position.set(pos.x / 2, 0, pos.z / 2);
        group.add(arm);

        // Motor housing
        const motorGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.6);
        const motorMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
        const motor = new THREE.Mesh(motorGeo, motorMat);
        motor.position.set(pos.x, 0.4, pos.z);
        group.add(motor);

        // Rotor blades
        const rotorGeo = new THREE.BoxGeometry(3.5, 0.05, 0.4);
        const rotorMat = new THREE.MeshStandardMaterial({ 
          color: 0x94a3b8,
          transparent: true,
          opacity: 0.8
        });
        const rotor = new THREE.Mesh(rotorGeo, rotorMat);
        rotor.position.set(pos.x, 0.8, pos.z);
        rotor.name = 'propeller';
        group.add(rotor);
      });
    } else if (target.droneType === 'fixed_wing_surveillance') {
      // Fuselage
      const fuseGeo = new THREE.CylinderGeometry(0.8, 0.6, 7, 16);
      const fuseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
      const fuse = new THREE.Mesh(fuseGeo, fuseMat);
      fuse.rotation.x = Math.PI / 2;
      group.add(fuse);

      // Delta wings
      const wingGeo = new THREE.BoxGeometry(16, 0.2, 3);
      const wingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.set(0, 0, -0.5);
      group.add(wing);

      // Twin tail fins
      const tailGeo = new THREE.BoxGeometry(0.2, 2, 1.5);
      const tailMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
      const tail1 = new THREE.Mesh(tailGeo, tailMat);
      tail1.position.set(-2, 1, -3);
      const tail2 = new THREE.Mesh(tailGeo, tailMat);
      tail2.position.set(2, 1, -3);
      group.add(tail1);
      group.add(tail2);

      // Pusher propeller
      const propGeo = new THREE.BoxGeometry(2.5, 0.1, 0.3);
      const propMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0 });
      const prop = new THREE.Mesh(propGeo, propMat);
      prop.position.set(0, 0, -3.6);
      prop.name = 'propeller';
      group.add(prop);
    } else if (target.droneType === 'friendly_logistics') {
      // Friendly Heavy Hexacopter
      const mainGeo = new THREE.CylinderGeometry(2, 2, 1.2, 6);
      const mainMat = new THREE.MeshStandardMaterial({ color: 0x166534 }); // Olive friendly
      const main = new THREE.Mesh(mainGeo, mainMat);
      group.add(main);

      // Underslung logistics cargo crate
      const cargoGeo = new THREE.BoxGeometry(2.5, 2, 2.5);
      const cargoMat = new THREE.MeshStandardMaterial({ color: 0x15803d });
      const cargo = new THREE.Mesh(cargoGeo, cargoMat);
      cargo.position.set(0, -1.6, 0);
      group.add(cargo);

      // Friendly flashing beacon light
      const beaconGeo = new THREE.SphereGeometry(0.4, 8, 8);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(0, 1, 0);
      group.add(beacon);
    } else {
      // Swarm mini-node
      const coreGeo = new THREE.OctahedronGeometry(1.5);
      const coreMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.3 });
      const core = new THREE.Mesh(coreGeo, coreMat);
      group.add(core);

      const ringGeo = new THREE.TorusGeometry(2, 0.15, 8, 24);
      const ringMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.name = 'propeller';
      group.add(ring);
    }

    // Set initial position
    group.position.set(target.position.x, target.position.y, target.position.z);
    return group;
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera (65 deg FOV default at observer tower origin)
    const camera = new THREE.PerspectiveCamera(65, width / height, 1, 4000);
    camera.position.set(0, 10, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // Ground Terrain / Observation Outpost
    const terrainGeo = new THREE.PlaneGeometry(3000, 3000, 64, 64);
    const terrainMat = new THREE.MeshStandardMaterial({ 
      color: 0x0f172a, 
      roughness: 0.9, 
      metalness: 0.1,
      wireframe: false
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = 0;
    scene.add(terrain);

    // Tactical Coordinate Ground Grid
    const gridHelper = new THREE.GridHelper(2400, 48, 0x10b981, 0x1e293b);
    gridHelper.position.y = 0.5;
    scene.add(gridHelper);

    // Observation Outpost Tower
    const towerGeo = new THREE.CylinderGeometry(8, 12, 10, 8);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(0, 5, 0);
    scene.add(tower);

    // Radar dish on outpost
    const dishGeo = new THREE.SphereGeometry(3, 16, 16, 0, Math.PI);
    const dishMat = new THREE.MeshStandardMaterial({ color: 0x334155, side: THREE.DoubleSide });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.set(0, 13, 0);
    dish.rotation.x = -Math.PI / 4;
    scene.add(dish);

    // Perimeter boundary rings (Safe Perimeter at 300m and Warning Perimeter at 600m)
    const ring300Geo = new THREE.RingGeometry(298, 302, 64);
    const ring300Mat = new THREE.MeshBasicMaterial({ 
      color: 0xef4444, 
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4
    });
    const ring300 = new THREE.Mesh(ring300Geo, ring300Mat);
    ring300.rotation.x = -Math.PI / 2;
    ring300.position.y = 1;
    scene.add(ring300);

    const ring600Geo = new THREE.RingGeometry(598, 602, 64);
    const ring600Mat = new THREE.MeshBasicMaterial({ 
      color: 0x10b981, 
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25
    });
    const ring600 = new THREE.Mesh(ring600Geo, ring600Mat);
    ring600.rotation.x = -Math.PI / 2;
    ring600.position.y = 1;
    scene.add(ring600);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(300, 500, 200);
    scene.add(dirLight);

    lightsRef.current = {
      ambient: ambientLight,
      directional: dirLight
    };

    // Instantiate 3D drone models
    droneMeshesRef.current.clear();
    targets.forEach(tgt => {
      const mesh = createDroneMesh(tgt);
      scene.add(mesh);
      droneMeshesRef.current.set(tgt.id, mesh);
    });

    // Resize handler
    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let lastTime = performance.now();
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);

      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      // Spin propellers and move drone meshes along path
      droneMeshesRef.current.forEach((mesh, id) => {
        // Spin rotor children
        mesh.traverse(child => {
          if (child.name === 'propeller') {
            child.rotation.y += 0.4;
          }
        });

        // Dynamic motion based on target properties
        const tgt = targets.find(t => t.id === id);
        if (tgt && !isPaused) {
          if (tgt.behavior === 'orbit') {
            const angle = now * 0.0004 + (id.charCodeAt(0) % 10);
            const radius = tgt.distanceMeters * 0.6;
            mesh.position.x = Math.sin(angle) * radius;
            mesh.position.z = Math.cos(angle) * radius;
            mesh.rotation.y = angle + Math.PI / 2;
          } else if (tgt.behavior === 'patrol') {
            mesh.position.x += Math.sin(now * 0.001) * 0.4;
            mesh.position.y += Math.sin(now * 0.002) * 0.1;
          } else if (tgt.behavior === 'inbound') {
            // Gradual vector toward perimeter
            mesh.position.z += 0.2;
            if (mesh.position.z > 200) mesh.position.z = -400;
          }
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Environment Lighting & Fog
  useEffect(() => {
    if (!sceneRef.current || !lightsRef.current) return;
    const { ambient, directional } = lightsRef.current;
    const scene = sceneRef.current;

    if (timeOfDay === 'day') {
      scene.background = new THREE.Color(0x38bdf8);
      if (ambient) ambient.intensity = 0.6;
      if (directional) {
        directional.intensity = 1.3;
        directional.color.setHex(0xffffff);
      }
    } else if (timeOfDay === 'dusk') {
      scene.background = new THREE.Color(0x9a3412); // Dusk amber orange
      if (ambient) ambient.intensity = 0.35;
      if (directional) {
        directional.intensity = 0.8;
        directional.color.setHex(0xf97316);
      }
    } else {
      // Night
      scene.background = new THREE.Color(0x020617); // Obsidian night
      if (ambient) ambient.intensity = 0.15;
      if (directional) {
        directional.intensity = 0.3;
        directional.color.setHex(0x38bdf8);
      }
    }

    // Weather Fog
    if (weather === 'fog') {
      const fogColor = timeOfDay === 'night' ? 0x090d16 : 0x64748b;
      scene.fog = new THREE.FogExp2(fogColor, 0.0035);
    } else {
      scene.fog = null;
    }
  }, [timeOfDay, weather]);

  // Update Camera Orientation and Zoom FOV
  useEffect(() => {
    if (!cameraRef.current) return;
    const camera = cameraRef.current;

    // FOV mapping for optical zoom (65 deg down to 12 deg)
    const fovMap = { 1: 65, 2: 38, 4: 20, 8: 12 };
    camera.fov = fovMap[zoomLevel];
    camera.updateProjectionMatrix();

    // Calculate look-at vector from azimuth & elevation angles
    const azRad = (cameraAzimuth * Math.PI) / 180;
    const elRad = (cameraElevation * Math.PI) / 180;

    const targetX = Math.sin(azRad) * Math.cos(elRad) * 1000;
    const targetY = 10 + Math.sin(elRad) * 1000;
    const targetZ = -Math.cos(azRad) * Math.cos(elRad) * 1000;

    camera.lookAt(targetX, targetY, targetZ);
  }, [cameraAzimuth, cameraElevation, zoomLevel]);

  // Center camera on target when selected
  const focusOnTarget = (target: AerialTarget) => {
    setSelectedTargetId(target.id);
    // Approximate azimuth from outpost (origin [0, 10, 0])
    const azDeg = Math.round(target.azimuthDeg);
    const elDeg = Math.round(target.elevationDeg);
    setCameraAzimuth(azDeg);
    setCameraElevation(elDeg);
  };

  // Timer Tick
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setTimeRemainingSec(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinishSimulation();
          return 0;
        }
        return prev - 1;
      });
      setElapsedSec(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused]);

  // Handle Trainee Classification Submission
  const handleSubmitClassification = () => {
    if (!selectedTarget) return;

    const isCorrectType = inputClass === selectedTarget.droneType;
    const isCorrectThreat = inputThreat === selectedTarget.threatLevel;

    const newLog: TargetObservationLog = {
      targetId: selectedTarget.id,
      actualType: selectedTarget.droneType,
      actualThreat: selectedTarget.threatLevel,
      userType: inputClass,
      userThreat: inputThreat,
      isCorrectType,
      isCorrectThreat,
      timestampSec: elapsedSec,
      distanceMeters: selectedTarget.distanceMeters
    };

    setObservationLogs(prev => {
      const filtered = prev.filter(l => l.targetId !== selectedTarget.id);
      return [...filtered, newLog];
    });

    setTargets(prev =>
      prev.map(t =>
        t.id === selectedTarget.id
          ? {
              ...t,
              isIdentified: true,
              classifiedAs: inputClass,
              classifiedThreat: inputThreat,
              detectedAtSec: elapsedSec
            }
          : t
      )
    );

    setFeedbackNotice(
      `Observation Report Logged for ${selectedTarget.displayName} · Classified: ${inputClass.replace(/_/g, ' ')} [Threat: ${inputThreat.toUpperCase()}]`
    );
    setTimeout(() => setFeedbackNotice(null), 4000);

    // Auto advance to next unclassified target
    const nextUnidentified = targets.find(t => t.id !== selectedTarget.id && !t.isIdentified);
    if (nextUnidentified) {
      focusOnTarget(nextUnidentified);
    }
  };

  // Complete Simulation & Build AAR
  const handleFinishSimulation = () => {
    const total = targets.length;
    const identified = observationLogs.filter(l => l.isCorrectType && l.isCorrectThreat).length;
    const accuracyRate = total > 0 ? Math.round((identified / total) * 100) : 0;
    
    // Check false alarm: misclassifying friendly logistics as hostile
    const falseAlarms = observationLogs.filter(
      l => l.actualThreat === 'friendly' && l.userThreat && l.userThreat !== 'friendly'
    ).length;

    // Check perimeter safety: penalize if contacts breach < 300m without detection
    const perimeterBreaches = targets.filter(t => t.distanceMeters < 300 && !t.isIdentified).length;
    const perimeterSafetyScore = Math.max(0, 100 - perimeterBreaches * 25);

    const avgTime = observationLogs.length > 0 
      ? Number((observationLogs.reduce((acc, l) => acc + l.timestampSec, 0) / observationLogs.length).toFixed(1))
      : 0;

    const overallScore = Math.round(
      accuracyRate * 0.5 + perimeterSafetyScore * 0.3 + (100 - falseAlarms * 30) * 0.2
    );

    const passed = overallScore >= 70;

    const result: TrainingSessionResult = {
      id: `SESS-${Date.now().toString().slice(-6)}`,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      traineeId,
      traineeName,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      durationSec: elapsedSec,
      totalTargets: total,
      identifiedTargets: identified,
      accuracyRate,
      avgIdentificationTimeSec: avgTime,
      falseAlarmCount: falseAlarms,
      perimeterSafetyScore,
      overallScore: Math.min(100, Math.max(0, overallScore)),
      passed,
      observationLogs,
      evaluatorNotes: [
        `Executed scenario in ${timeOfDay} mode with ${weather} weather conditions.`,
        `Observed ${observationLogs.length} of ${total} aerial contacts with ${accuracyRate}% match rate.`,
        falseAlarms === 0 ? 'Exemplary friendly asset discrimination (Zero false alarms).' : `Logged ${falseAlarms} false alarm misidentifications.`
      ],
      recommendations: [
        accuracyRate < 80 
          ? 'Focus on distinguishing pusher-prop fixed-wing silhouettes vs multi-rotor profiles at stand-off ranges (>500m).' 
          : 'Proficiency confirmed for basic visual identification.',
        'Ensure continuous 360-degree azimuth sweep while monitoring high elevation sectors.'
      ]
    };

    onFinishSimulation(result);
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Thermal vision CSS filter classes
  const getThermalFilterClass = () => {
    switch (thermalMode) {
      case 'flir_white_hot':
        return 'contrast-150 brightness-90 grayscale invert';
      case 'flir_black_hot':
        return 'contrast-150 brightness-95 grayscale';
      case 'night_vision':
        return 'hue-rotate-90 saturate-200 contrast-125 brightness-110 sepia';
      default:
        return '';
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-slate-950 overflow-hidden select-none flex flex-col">
      {/* 3D Three.js Canvas Container */}
      <div 
        ref={mountRef} 
        className={`absolute inset-0 w-full h-full cursor-crosshair transition-all duration-300 ${getThermalFilterClass()}`}
        onMouseDown={(e) => {
          // Allow mouse drag camera rotation
          const startX = e.clientX;
          const startY = e.clientY;
          const startAz = cameraAzimuth;
          const startEl = cameraElevation;

          const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;
            setCameraAzimuth((startAz + deltaX * 0.15 + 360) % 360);
            setCameraElevation(Math.max(-10, Math.min(75, startEl - deltaY * 0.15)));
          };

          const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
          };

          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
        }}
      />

      {/* Night Vision Scanlines Overlay */}
      {thermalMode === 'night_vision' && (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_30%,rgba(6,78,59,0.4)_100%)] opacity-80" />
      )}

      {/* Reticle Overlay */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="relative w-64 h-64 border border-emerald-500/20 rounded-full flex items-center justify-center">
          {/* Crosshairs */}
          <div className="absolute w-full h-px bg-emerald-500/30" />
          <div className="absolute h-full w-px bg-emerald-500/30" />
          <div className="w-16 h-16 border border-emerald-500/50 rounded flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          </div>
          {/* Compass heading marks */}
          <div className="absolute -top-6 text-[10px] font-mono text-emerald-400">
            AZ: {cameraAzimuth.toFixed(0)}°
          </div>
          <div className="absolute -bottom-6 text-[10px] font-mono text-emerald-400">
            EL: {cameraElevation.toFixed(0)}°
          </div>
        </div>
      </div>

      {/* TOP HUD BAR */}
      <div className="relative z-20 flex items-center justify-between gap-4 p-3 bg-slate-950/85 backdrop-blur border-b border-slate-800 text-xs">
        {/* Scenario Code & Name */}
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-emerald-400 text-sm">
            {scenario.code}
          </span>
          <span className="text-slate-600">·</span>
          <span className="font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
            {scenario.title}
          </span>
          <span className="text-slate-600 hidden md:inline">·</span>
          <span className="text-slate-400 hidden md:inline">
            Observer: {traineeName}
          </span>
        </div>

        {/* Center: Mission Timer & Pause */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 px-3 py-1.5 rounded">
            <span className="text-slate-400 text-[10px]">REMAINING</span>
            <span className={`font-mono font-bold text-sm tabular-nums ${
              timeRemainingSec < 30 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
            }`}>
              {formatTime(timeRemainingSec)}
            </span>
          </div>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
            title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={handleFinishSimulation}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded flex items-center gap-1.5 transition-colors"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Finish & Review</span>
          </button>
        </div>

        {/* Right: Quick Controls & Abort */}
        <div className="flex items-center gap-2">
          <button
            onClick={onExitWithoutSaving}
            className="text-slate-400 hover:text-rose-400 transition-colors p-1"
            title="Abort drill without saving"
          >
            Abort
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackNotice && (
        <div className="relative z-30 bg-emerald-950/90 border-b border-emerald-500/50 text-emerald-300 text-xs px-4 py-2 text-center animate-in fade-in duration-200">
          {feedbackNotice}
        </div>
      )}

      {/* MAIN VIEWPORT: SIDEBARS & PANELS */}
      <div className="relative z-10 flex-1 flex justify-between p-3 pointer-events-none">
        {/* LEFT PANEL: Sensor Controls & Optics */}
        <div className="w-64 max-w-[280px] flex flex-col gap-3 pointer-events-auto">
          {/* Optics Zoom Selector */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 backdrop-blur shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                Optical Magnification
              </span>
              <span className="font-mono text-xs text-emerald-400 font-bold">
                {zoomLevel}x
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {([1, 2, 4, 8] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setZoomLevel(level)}
                  className={`py-1 text-xs font-mono font-bold rounded transition-colors ${
                    zoomLevel === level
                      ? 'bg-emerald-400 text-slate-950 shadow'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {level}x
                </button>
              ))}
            </div>
          </div>

          {/* Thermal Sensor Colormap Switcher */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 backdrop-blur shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                EO / IR Sensor Mode
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setThermalMode('rgb')}
                className={`py-1.5 px-2 text-[11px] font-medium rounded text-left transition-colors ${
                  thermalMode === 'rgb'
                    ? 'bg-emerald-400 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                Visible RGB
              </button>
              <button
                onClick={() => setThermalMode('flir_white_hot')}
                className={`py-1.5 px-2 text-[11px] font-medium rounded text-left transition-colors ${
                  thermalMode === 'flir_white_hot'
                    ? 'bg-emerald-400 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                FLIR White-Hot
              </button>
              <button
                onClick={() => setThermalMode('flir_black_hot')}
                className={`py-1.5 px-2 text-[11px] font-medium rounded text-left transition-colors ${
                  thermalMode === 'flir_black_hot'
                    ? 'bg-emerald-400 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                FLIR Black-Hot
              </button>
              <button
                onClick={() => setThermalMode('night_vision')}
                className={`py-1.5 px-2 text-[11px] font-medium rounded text-left transition-colors ${
                  thermalMode === 'night_vision'
                    ? 'bg-emerald-400 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                Night Vision (NVG)
              </button>
            </div>
          </div>

          {/* Environmental Conditions Toggle */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 backdrop-blur shadow-lg">
            <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-2">
              Atmospheric Simulator
            </span>
            <div className="flex gap-1 mb-2">
              {(['day', 'dusk', 'night'] as const).map(tod => (
                <button
                  key={tod}
                  onClick={() => setTimeOfDay(tod)}
                  className={`flex-1 py-1 text-[11px] capitalize rounded transition-colors ${
                    timeOfDay === tod
                      ? 'bg-slate-800 text-emerald-400 font-semibold border border-emerald-500/40'
                      : 'bg-slate-900/60 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  {tod}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {(['clear', 'fog'] as const).map(w => (
                <button
                  key={w}
                  onClick={() => setWeather(w)}
                  className={`flex-1 py-1 text-[11px] capitalize rounded transition-colors ${
                    weather === w
                      ? 'bg-slate-800 text-emerald-400 font-semibold border border-emerald-500/40'
                      : 'bg-slate-900/60 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  {w} Weather
                </button>
              ))}
            </div>
          </div>

          {/* Airspace Targets Quick Selector */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 backdrop-blur shadow-lg overflow-y-auto max-h-48">
            <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-2">
              Detected Contacts ({targets.filter(t => t.isIdentified).length}/{targets.length})
            </span>
            <div className="space-y-1.5">
              {targets.map(tgt => {
                const isSelected = tgt.id === selectedTargetId;
                return (
                  <button
                    key={tgt.id}
                    onClick={() => focusOnTarget(tgt)}
                    className={`w-full text-left p-2 rounded text-xs transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-950/60 border border-emerald-500/50 text-white'
                        : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 border border-transparent'
                    }`}
                  >
                    <div>
                      <p className="font-mono font-semibold text-white">
                        {tgt.displayName}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Rng: {tgt.distanceMeters}m · Az: {tgt.azimuthDeg}°
                      </p>
                    </div>
                    {tgt.isIdentified ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Crosshair className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Target Inspection & Classification Console */}
        <div className="w-80 max-w-[320px] pointer-events-auto">
          {selectedTarget && (
            <div className="bg-slate-950/95 border border-slate-800 rounded-lg p-4 backdrop-blur shadow-2xl space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-2">
                <div>
                  <span className="text-[10px] font-mono text-emerald-400">
                    OPTICAL TARGET LOCK
                  </span>
                  <h3 className="font-bold text-white text-sm">
                    {selectedTarget.displayName}
                  </h3>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="text-slate-400 text-[10px]">STAND-OFF</span>
                  <p className={`font-bold tabular-nums ${
                    selectedTarget.distanceMeters < 300 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {selectedTarget.distanceMeters}m
                  </p>
                </div>
              </div>

              {/* Safety Perimeter Warning */}
              {selectedTarget.distanceMeters < 300 && (
                <div className="p-2 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>PERIMETER BREACH: Standoff distance &lt; 300m</span>
                </div>
              )}

              {/* Detected Technical Signatures */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                    Visual Optical Features
                  </span>
                  <p className="text-slate-300 text-[11px] mt-0.5 bg-slate-900/60 p-2 rounded border border-slate-800/80">
                    {selectedTarget.visualSignature}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                    <span className="text-[9px] text-slate-500 uppercase block">RCS Signature</span>
                    <span className="font-mono text-emerald-400 font-medium">
                      {selectedTarget.radarCrossSection}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                    <span className="text-[9px] text-slate-500 uppercase block">Acoustic Peak</span>
                    <span className="font-mono text-slate-300">
                      {selectedTarget.acousticSignature.split(',')[0]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Classification Input Form */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Select Drone Classification
                  </label>
                  <select
                    value={inputClass}
                    onChange={e => setInputClass(e.target.value as DroneType)}
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded p-2 focus:ring-1 focus:ring-emerald-400 outline-none"
                  >
                    <option value="commercial_micro_quad">Commercial Micro-Quad (DJI-Class)</option>
                    <option value="rotary_recon">Military Rotary-Recon UAS</option>
                    <option value="fixed_wing_surveillance">Tactical Fixed-Wing Surveillance</option>
                    <option value="swarm_cluster">Autonomous Swarm Cluster Node</option>
                    <option value="friendly_logistics">Friendly Logistics / Medical Hexacopter</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Threat Assessment Rating
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {(['low', 'medium', 'high', 'critical'] as const).map(lvl => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setInputThreat(lvl)}
                        className={`py-1 text-[10px] uppercase font-bold rounded transition-colors ${
                          inputThreat === lvl
                            ? 'bg-emerald-400 text-slate-950 shadow'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setInputThreat('friendly')}
                    className={`w-full mt-1.5 py-1 text-[10px] uppercase font-bold rounded transition-colors ${
                      inputThreat === 'friendly'
                        ? 'bg-blue-500 text-white shadow'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Friendly / Authorized Transponder
                  </button>
                </div>

                <button
                  onClick={handleSubmitClassification}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-500/10"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Log Observation Report</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM HUD COMPASS TAPE */}
      <div className="relative z-20 bg-slate-950/90 border-t border-slate-800 p-2 text-xs flex items-center justify-between text-slate-400">
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <span>GIMBAL: [AZ {cameraAzimuth.toFixed(0)}° / EL {cameraElevation.toFixed(0)}°]</span>
          <span className="text-slate-700">|</span>
          <span>SENSOR: {thermalMode.toUpperCase()}</span>
          <span className="text-slate-700">|</span>
          <span>ZOOM: {zoomLevel}X</span>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-emerald-400" />
          <span>Click and drag view to rotate optical orientation</span>
        </div>
      </div>
    </div>
  );
};
