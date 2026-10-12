import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCw, Shield, Sparkles, User, AlertCircle } from 'lucide-react';

interface TraineeAvatarSceneProps {
  camoStyle?: 'desert' | 'charcoal' | 'woodland';
  onRotatePrompt?: boolean;
}

export const TraineeAvatarScene: React.FC<TraineeAvatarSceneProps> = ({
  camoStyle = 'charcoal',
  onRotatePrompt = true
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const [webGlFailed, setWebGlFailed] = useState(false);

  const characterGroupRef = useRef<THREE.Group | null>(null);
  const pedestalGroupRef = useRef<THREE.Group | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameId = useRef<number | null>(null);

  // Colors based on camo style
  const getCamoColors = (style: string) => {
    switch (style) {
      case 'desert':
        return {
          suit: 0xd4a373,
          vest: 0x8b5a2b,
          helmet: 0xb5835a,
          boots: 0x583101,
          accent: 0xe9d8a6
        };
      case 'woodland':
        return {
          suit: 0x2d4a22,
          vest: 0x1e3f20,
          helmet: 0x386641,
          boots: 0x132a13,
          accent: 0xa7c957
        };
      default: // charcoal / tactical night
        return {
          suit: 0x1e293b,
          vest: 0x0f172a,
          helmet: 0x334155,
          boots: 0x020617,
          accent: 0x10b981 // emerald green accents
        };
    }
  };

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    // Safe dimension resolution to avoid NaN aspect ratio or zero-size framebuffers
    const width = Math.max(container.clientWidth || window.innerWidth || 800, 320);
    const height = Math.max(container.clientHeight || (window.innerHeight - 150) || 600, 400);

    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;

    try {
      // 1. Scene
      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x050814, 0.04);

      // 2. Camera
      camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
      camera.position.set(0, 1.3, 4.2);
      camera.lookAt(0, 1.1, 0);

      // 3. Renderer with error guard
      renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;

      container.appendChild(renderer.domElement);

      // 4. Lighting (Dramatic cinematic gaming lobby rim & studio key lights)
      const ambientLight = new THREE.AmbientLight(0x0f172a, 1.8);
      scene.add(ambientLight);

      // Key Light
      const keyLight = new THREE.DirectionalLight(0xe2e8f0, 2.2);
      keyLight.position.set(3, 4, 3);
      keyLight.castShadow = true;
      scene.add(keyLight);

      // Emerald Rim Light
      const rimLightEmerald = new THREE.DirectionalLight(0x10b981, 3.5);
      rimLightEmerald.position.set(-3, 3, -2);
      scene.add(rimLightEmerald);

      // Cyan Fill Light
      const rimLightCyan = new THREE.DirectionalLight(0x06b6d4, 2.0);
      rimLightCyan.position.set(3, 2, -2.5);
      scene.add(rimLightCyan);

      // Ground Uplight
      const underLight = new THREE.PointLight(0x10b981, 2.5, 6);
      underLight.position.set(0, 0.2, 0);
      scene.add(underLight);

      // 5. Holographic Pedestal / Staging Platform
      const pedestalGroup = new THREE.Group();
      pedestalGroupRef.current = pedestalGroup;

      const baseGeo = new THREE.CylinderGeometry(1.4, 1.6, 0.15, 32);
      const baseMat = new THREE.MeshStandardMaterial({ 
        color: 0x090d16, 
        metalness: 0.8, 
        roughness: 0.3 
      });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = -0.075;
      baseMesh.receiveShadow = true;
      pedestalGroup.add(baseMesh);

      const topInsetGeo = new THREE.CylinderGeometry(1.25, 1.25, 0.02, 32);
      const topInsetMat = new THREE.MeshStandardMaterial({ 
        color: 0x0f172a, 
        metalness: 0.9, 
        roughness: 0.2 
      });
      const topInset = new THREE.Mesh(topInsetGeo, topInsetMat);
      topInset.position.y = 0.01;
      pedestalGroup.add(topInset);

      // Glowing Hologram Rings
      const ringGeo = new THREE.RingGeometry(1.15, 1.22, 64);
      const ringMat = new THREE.MeshBasicMaterial({ 
        color: 0x10b981, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 0.02;
      pedestalGroup.add(ringMesh);

      const radarLinesGeo = new THREE.RingGeometry(0.8, 0.83, 32);
      const radarLinesMat = new THREE.MeshBasicMaterial({ 
        color: 0x06b6d4, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
      });
      const radarRing = new THREE.Mesh(radarLinesGeo, radarLinesMat);
      radarRing.rotation.x = -Math.PI / 2;
      radarRing.position.y = 0.025;
      pedestalGroup.add(radarRing);

      scene.add(pedestalGroup);

      // 6. Tactical Soldier 3D Avatar Group
      const charColors = getCamoColors(camoStyle);
      const charGroup = new THREE.Group();
      characterGroupRef.current = charGroup;

      const suitMat = new THREE.MeshStandardMaterial({ color: charColors.suit, roughness: 0.6, metalness: 0.2 });
      const vestMat = new THREE.MeshStandardMaterial({ color: charColors.vest, roughness: 0.5, metalness: 0.3 });
      const helmetMat = new THREE.MeshStandardMaterial({ color: charColors.helmet, roughness: 0.4, metalness: 0.4 });
      const bootMat = new THREE.MeshStandardMaterial({ color: charColors.boots, roughness: 0.8, metalness: 0.1 });
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xbb8a6b, roughness: 0.7, metalness: 0.0 });
      const visorMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.1, metalness: 0.9 });
      const neonAccentMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });

      // Torso
      const torsoGeo = new THREE.BoxGeometry(0.5, 0.65, 0.28);
      const torso = new THREE.Mesh(torsoGeo, suitMat);
      torso.position.y = 1.15;
      torso.castShadow = true;
      charGroup.add(torso);

      // Plate Carrier Vest
      const vestGeo = new THREE.BoxGeometry(0.54, 0.52, 0.34);
      const vest = new THREE.Mesh(vestGeo, vestMat);
      vest.position.y = 1.18;
      vest.castShadow = true;
      charGroup.add(vest);

      // Pouches & Radio
      const pouchGeo = new THREE.BoxGeometry(0.38, 0.15, 0.08);
      const pouch = new THREE.Mesh(pouchGeo, vestMat);
      pouch.position.set(0, 1.05, 0.19);
      charGroup.add(pouch);

      const radioGeo = new THREE.BoxGeometry(0.08, 0.14, 0.08);
      const radio = new THREE.Mesh(radioGeo, vestMat);
      radio.position.set(-0.2, 1.42, 0.1);
      charGroup.add(radio);

      const antennaGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.28);
      const antenna = new THREE.Mesh(antennaGeo, bootMat);
      antenna.position.set(-0.2, 1.6, 0.1);
      charGroup.add(antenna);

      // Rank patch
      const patchGeo = new THREE.PlaneGeometry(0.12, 0.07);
      const patch = new THREE.Mesh(patchGeo, neonAccentMat);
      patch.position.set(0.12, 1.28, 0.175);
      charGroup.add(patch);

      // Neck & Head
      const neckGeo = new THREE.CylinderGeometry(0.1, 0.11, 0.12);
      const neck = new THREE.Mesh(neckGeo, skinMat);
      neck.position.y = 1.52;
      charGroup.add(neck);

      const headGeo = new THREE.BoxGeometry(0.24, 0.26, 0.24);
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 1.68;
      head.castShadow = true;
      charGroup.add(head);

      // Helmet & Visor
      const helmetGeo = new THREE.SphereGeometry(0.21, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.65);
      const helmet = new THREE.Mesh(helmetGeo, helmetMat);
      helmet.position.set(0, 1.76, 0.01);
      helmet.castShadow = true;
      charGroup.add(helmet);

      const nvgMountGeo = new THREE.BoxGeometry(0.08, 0.08, 0.05);
      const nvgMount = new THREE.Mesh(nvgMountGeo, bootMat);
      nvgMount.position.set(0, 1.78, 0.19);
      charGroup.add(nvgMount);

      const visorGeo = new THREE.BoxGeometry(0.24, 0.08, 0.06);
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 1.7, 0.13);
      charGroup.add(visor);

      // Comms Headset
      const earcupLeftGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04);
      const earcupLeft = new THREE.Mesh(earcupLeftGeo, bootMat);
      earcupLeft.rotation.z = Math.PI / 2;
      earcupLeft.position.set(-0.14, 1.7, 0);
      charGroup.add(earcupLeft);

      const earcupRight = earcupLeft.clone();
      earcupRight.position.set(0.14, 1.7, 0);
      charGroup.add(earcupRight);

      // Legs & Boots
      const legGeo = new THREE.CylinderGeometry(0.11, 0.09, 0.65);
      const leftLeg = new THREE.Mesh(legGeo, suitMat);
      leftLeg.position.set(-0.18, 0.52, 0);
      leftLeg.rotation.z = -0.06;
      leftLeg.castShadow = true;
      charGroup.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeo, suitMat);
      rightLeg.position.set(0.18, 0.52, 0);
      rightLeg.rotation.z = 0.06;
      rightLeg.castShadow = true;
      charGroup.add(rightLeg);

      const bootGeo = new THREE.BoxGeometry(0.14, 0.18, 0.28);
      const leftBoot = new THREE.Mesh(bootGeo, bootMat);
      leftBoot.position.set(-0.2, 0.1, 0.04);
      leftBoot.castShadow = true;
      charGroup.add(leftBoot);

      const rightBoot = new THREE.Mesh(bootGeo, bootMat);
      rightBoot.position.set(0.2, 0.1, 0.04);
      rightBoot.castShadow = true;
      charGroup.add(rightBoot);

      // Arms
      const armGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.55);
      const leftArm = new THREE.Mesh(armGeo, suitMat);
      leftArm.position.set(-0.35, 1.15, 0);
      leftArm.rotation.z = 0.12;
      leftArm.castShadow = true;
      charGroup.add(leftArm);

      const gloveGeo = new THREE.SphereGeometry(0.07, 8, 8);
      const leftGlove = new THREE.Mesh(gloveGeo, bootMat);
      leftGlove.position.set(-0.38, 0.85, 0);
      charGroup.add(leftGlove);

      const rightArm = new THREE.Mesh(armGeo, suitMat);
      rightArm.position.set(0.35, 1.15, 0);
      rightArm.rotation.z = -0.12;
      rightArm.castShadow = true;
      charGroup.add(rightArm);

      const rightGlove = new THREE.Mesh(gloveGeo, bootMat);
      rightGlove.position.set(0.38, 0.85, 0);
      charGroup.add(rightGlove);

      scene.add(charGroup);

      // 7. Ambient Atmospheric Motes
      const particleCount = 80;
      const particleGeo = new THREE.BufferGeometry();
      const particlePositions = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount * 3; i += 3) {
        particlePositions[i] = (Math.random() - 0.5) * 6;
        particlePositions[i + 1] = Math.random() * 3;
        particlePositions[i + 2] = (Math.random() - 0.5) * 6;
      }

      particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
      const particleMat = new THREE.PointsMaterial({
        color: 0x10b981,
        size: 0.03,
        transparent: true,
        opacity: 0.6
      });

      const particles = new THREE.Points(particleGeo, particleMat);
      particlesRef.current = particles;
      scene.add(particles);

      // 8. Resize Handler
      const handleResize = () => {
        if (!container || !renderer || !camera) return;
        const w = Math.max(container.clientWidth || window.innerWidth || 800, 320);
        const h = Math.max(container.clientHeight || (window.innerHeight - 150) || 600, 400);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      window.addEventListener('resize', handleResize);

      // 9. Animation Loop
      let clock = new THREE.Clock();
      const animate = () => {
        animFrameId.current = requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        if (charGroup) {
          charGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.015;
        }

        if (ringMesh && radarRing) {
          ringMesh.rotation.z += 0.003;
          radarRing.rotation.z -= 0.005;
        }

        if (particles) {
          const pos = particles.geometry.attributes.position.array as Float32Array;
          for (let i = 1; i < pos.length; i += 3) {
            pos[i] += 0.002;
            if (pos[i] > 3) pos[i] = 0;
          }
          particles.geometry.attributes.position.needsUpdate = true;
        }

        renderer.render(scene, camera);
      };

      animate();

      return () => {
        window.removeEventListener('resize', handleResize);
        if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
        if (container && renderer && renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        renderer?.dispose();
      };
    } catch (err) {
      console.warn('WebGL Initialization Fallback:', err);
      setWebGlFailed(true);
    }
  }, [camoStyle]);

  // Handle character rotation when user drags
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsInteracting(true);
    const startX = e.clientX;
    const startAngle = rotationAngle;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newAngle = startAngle + deltaX * 0.01;
      setRotationAngle(newAngle);
      if (characterGroupRef.current) {
        characterGroupRef.current.rotation.y = newAngle;
      }
    };

    const handlePointerUp = () => {
      setIsInteracting(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div className="relative w-full h-full min-h-[460px] select-none overflow-hidden bg-slate-950/60">
      {/* Fallback Static Tactical Base View if WebGL is unavailable */}
      {webGlFailed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
          {/* Staging Pedestal Graphic */}
          <div className="relative w-72 h-72 rounded-full border border-emerald-500/30 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15)_0%,transparent_70%)] animate-pulse">
            <div className="w-56 h-56 rounded-full border border-emerald-500/20 flex items-center justify-center">
              <div className="w-40 h-40 rounded-full border border-teal-500/30 flex items-center justify-center">
                {/* Tactical Operator Vector Silhouette */}
                <div className="w-24 h-32 rounded-xl bg-slate-800/90 border border-emerald-500/50 flex flex-col items-center justify-center text-emerald-400 shadow-2xl">
                  <User className="w-14 h-14" />
                  <span className="text-[10px] font-mono font-bold mt-1 text-emerald-300">OPERATOR-04</span>
                </div>
              </div>
            </div>
            {/* Holographic crosshair marks */}
            <div className="absolute inset-x-0 h-px bg-emerald-500/30" />
            <div className="absolute inset-y-0 w-px bg-emerald-500/30" />
          </div>

          <div className="mt-4 max-w-sm">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-300 mb-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Forward Observation Staging Bay Active</span>
            </div>
            <p className="text-xs text-slate-400">
              Virtual tactical operator ready for counter-UAS mission drill.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 3D Canvas Container */}
          <div
            ref={mountRef}
            onPointerDown={handlePointerDown}
            className="w-full h-full cursor-grab active:cursor-grabbing"
          />

          {/* Rotation Hint Indicator */}
          {onRotatePrompt && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3.5 py-1 rounded-full text-[11px] text-slate-400 backdrop-blur-md shadow-lg">
              <RotateCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '8s' }} />
              <span>Drag to inspect 3D operator loadout</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
