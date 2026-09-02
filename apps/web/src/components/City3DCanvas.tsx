import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  Activity, 
  Compass, 
  Minimize2, 
  Sparkles,
  Zap
} from 'lucide-react';

interface City3DCanvasProps {
  isOfficial?: boolean;
  isExploreMode?: boolean;
  onToggleExplore?: () => void;
}

interface HoveredBuildingInfo {
  name: string;
  category: string;
  status: string;
  metric: string;
  ward: string;
  screenX: number;
  screenY: number;
}

export const City3DCanvas: React.FC<City3DCanvasProps> = ({ 
  isOfficial = false,
  isExploreMode = false,
  onToggleExplore
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredBuilding, setHoveredBuilding] = useState<HoveredBuildingInfo | null>(null);

  // Keep references for event listeners and state synchronization
  const isOfficialRef = useRef(isOfficial);
  isOfficialRef.current = isOfficial;
  const isExploreModeRef = useRef(isExploreMode);
  isExploreModeRef.current = isExploreMode;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Scene, Camera, Fog ---
    const scene = new THREE.Scene();
    const fogColor = isOfficial ? 0x090503 : 0x020612;
    scene.fog = new THREE.FogExp2(fogColor, 0.009);

    const camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      1,
      1200
    );
    // Dynamic isometric perspective elevated over city
    camera.position.set(0, 52, 75);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = false; // keep 60fps silky smooth
    container.appendChild(renderer.domElement);

    // --- Theme Definitions ---
    const citizenTheme = {
      primary: 0x06b6d4,       // Electric Cyan
      secondary: 0x38bdf8,     // Sky Blue
      accent: 0x6366f1,        // Indigo
      windowLit: 0x7dd3fc,      // Crisp Cyan-White Window
      windowWarm: 0xfef08a,     // Warm Amber Window
      buildingBody: 0x050d1a,   // Deep Obsidian Blue
      buildingHighlight: 0x0ea5e9,
      roadLines: 0x0c213d,
      pulseTraffic: 0x38bdf8,
      taillightTraffic: 0xf43f5e,
      beacon: 0x22d3ee,
      laserBeam: 0x06b6d4,
      spireGlow: 0x38bdf8,
      gridColor: 0x082f49,
      ambient: 0x1e293b,
      lightColor: 0x38bdf8,
    };

    const officialTheme = {
      primary: 0xf59e0b,       // Solar Amber
      secondary: 0xfbbf24,     // Gold
      accent: 0xef4444,        // Crimson Alert
      windowLit: 0xfef08a,      // Radiant Gold Window
      windowWarm: 0xfca5a5,     // Alert Coral Window
      buildingBody: 0x170d05,   // Deep Obsidian Charcoal
      buildingHighlight: 0xf59e0b,
      roadLines: 0x3b1e08,
      pulseTraffic: 0xfbbf24,
      taillightTraffic: 0xef4444,
      beacon: 0xf59e0b,
      laserBeam: 0xfbbf24,
      spireGlow: 0xf59e0b,
      gridColor: 0x451a03,
      ambient: 0x2d1808,
      lightColor: 0xfbbf24,
    };

    const currentTheme = isOfficial ? officialTheme : citizenTheme;

    // --- High-Performance Procedural Window Canvas Texture ---
    const createWindowTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Base facade background
      ctx.fillStyle = isOfficial ? '#0e0804' : '#030914';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Window grid parameters
      const cols = 8;
      const rows = 24;
      const padX = 5;
      const padY = 4;
      const w = (canvas.width - padX * (cols + 1)) / cols;
      const h = (canvas.height - padY * (rows + 1)) / rows;

      const litColor = isOfficial ? '#fef08a' : '#bae6fd';
      const warmColor = isOfficial ? '#fbbf24' : '#38bdf8';
      const unlitColor = isOfficial ? '#1c1208' : '#081426';

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const rand = Math.random();
          const x = padX + c * (w + padX);
          const y = padY + r * (h + padY);

          if (rand > 0.42) {
            ctx.fillStyle = rand > 0.75 ? litColor : warmColor;
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = rand > 0.8 ? 5 : 2;
          } else {
            ctx.fillStyle = unlitColor;
            ctx.shadowBlur = 0;
          }
          ctx.fillRect(x, y, w, h);
        }
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1.5, 3);
      return texture;
    };

    const windowTexture = createWindowTexture();

    // --- Lighting Setup ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const mainDirLight = new THREE.DirectionalLight(currentTheme.lightColor, 2.8);
    mainDirLight.position.set(35, 75, 45);
    scene.add(mainDirLight);

    const rimLight = new THREE.DirectionalLight(currentTheme.accent, 1.8);
    rimLight.position.set(-40, 30, -30);
    scene.add(rimLight);

    const pointLight = new THREE.PointLight(currentTheme.primary, 4, 150);
    pointLight.position.set(0, 35, 0);
    scene.add(pointLight);

    // --- High-Tech Ground Grid & Transit Matrix ---
    const gridSize = 160;
    const gridDivisions = 40;
    const gridHelper = new THREE.GridHelper(
      gridSize,
      gridDivisions,
      currentTheme.primary,
      currentTheme.gridColor
    );
    gridHelper.position.y = -0.05;
    scene.add(gridHelper);

    // Concentric radial sonar rings on ground
    const radialGroup = new THREE.Group();
    for (let r = 15; r <= 80; r += 15) {
      const ringGeo = new THREE.RingGeometry(r - 0.2, r + 0.2, 64);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: currentTheme.primary,
        transparent: true,
        opacity: 0.12 + (80 - r) * 0.003,
        side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.02;
      radialGroup.add(ringMesh);
    }
    scene.add(radialGroup);

    // --- Interactive Building Mesh Collection ---
    const buildingGroup = new THREE.Group();
    const interactiveBuildings: THREE.Mesh[] = [];
    const buildingWireframes: THREE.LineSegments[] = [];
    const beacons: THREE.Mesh[] = [];

    // Building metadata generator for raycaster hover HUD
    const buildingNames = isOfficial ? [
      { name: 'Municipal Command Telemetry', category: 'High-Command Operations', ward: 'Central Ward 1', metric: '100% Core Uplink Active' },
      { name: 'GHMC Rapid Dispatch Center', category: 'Emergency Response', ward: 'Ward 4 - Secunderabad', metric: '18 Field Units On Route' },
      { name: 'HMWSSB Pressure Grid Node', category: 'Water & Utilities', ward: 'Ward 8 - North Feeder', metric: '6.2 Bar Nominal' },
      { name: 'TSSPDCL Smart Substation #4', category: 'Electrical Grid', ward: 'Ward 3 - East Subgrid', metric: '99.4% Grid Reliability' },
      { name: 'Integrated Traffic Command Hub', category: 'Smart Mobility', ward: 'Ward 7 - Arterial Loop', metric: 'Autonomous Signal Sync' },
      { name: 'Civix Environmental Sensor Bank', category: 'AQI & Clean Air', ward: 'Ward 5 - Metro Green', metric: 'AQI 58 • Good' },
      { name: 'Civic Grievance Resolution Desk', category: 'SLA Governance', ward: 'Ward 2 - West Corridor', metric: 'Avg Resolution 4.2h' },
      { name: 'Sanitation Logistics Terminal', category: 'Solid Waste Management', ward: 'Ward 6 - Logistics Hub', metric: '42 Vehicles Tracked' }
    ] : [
      { name: 'Ward 14 Civic Telemetry Hub', category: 'Community Operations', ward: 'Ward 14 - Secunderabad', metric: 'Live Resident Feed Connected' },
      { name: 'HMWSSB Water Monitoring Station', category: 'Clean Water Pipeline', ward: 'Main Lane Ward 14', metric: 'Water Pressure 100% Restored' },
      { name: 'Green Mobility Electric Corridor', category: 'Eco Infrastructure', ward: 'Outer Ring Corridor', metric: '24 EV Chargers Available' },
      { name: 'Neighborhood Action Center', category: 'Citizen Engagement', ward: 'Community Plaza 2', metric: '12 Active Local Petitions' },
      { name: 'Civix Autonomous AI Triage Tower', category: 'Real-time AI Assist', ward: 'Telemetry Node #9', metric: 'Sub-3s Issue Routing' },
      { name: 'Municipal Public Health Tower', category: 'Healthcare & Sanitization', ward: 'Central Zone', metric: 'All Ward Clinics Open' },
      { name: 'Smart Solar Rooftop Cluster', category: 'Clean Energy', ward: 'Rooftop Grid Tier-A', metric: '1.4 MW Generated Today' },
      { name: 'Community Emergency Beacon', category: 'SOS & Public Safety', ward: 'Secunderabad Junction', metric: 'Instant SOS Line Live' }
    ];

    // Shared Materials
    const sharedBuildingMat = new THREE.MeshPhongMaterial({
      color: currentTheme.buildingBody,
      map: windowTexture || undefined,
      shininess: 90,
      specular: currentTheme.primary,
      transparent: true,
      opacity: 0.95
    });

    const defaultEdgeMat = new THREE.LineBasicMaterial({
      color: currentTheme.secondary,
      transparent: true,
      opacity: 0.55,
      linewidth: 1
    });

    const cityRadius = 5;
    const blockSpacing = 8.5;
    let nameIdx = 0;

    for (let x = -cityRadius; x <= cityRadius; x++) {
      for (let z = -cityRadius; z <= cityRadius; z++) {
        // Leave open space around central Civix Command Tower
        if (Math.abs(x) <= 1 && Math.abs(z) <= 1) continue;
        // Natural organic urban clustering
        if (Math.random() > 0.72) continue;

        const posX = x * blockSpacing + (Math.random() - 0.5) * 2;
        const posZ = z * blockSpacing + (Math.random() - 0.5) * 2;
        const distFromCenter = Math.sqrt(x * x + z * z);

        // Skyscraper height grading (higher in center-mid, stepped outwards)
        const baseH = Math.max(6, 32 - distFromCenter * 3.4);
        const height = baseH + Math.random() * 8;
        const width = 3.6 + Math.random() * 2.2;
        const depth = 3.6 + Math.random() * 2.2;

        // Architectural Variety: Standard tower, stepped rooftop, or crown antenna
        const hasCrown = height > 16;
        const boxGeo = new THREE.BoxGeometry(width, height, depth);
        const buildingMesh = new THREE.Mesh(boxGeo, sharedBuildingMat.clone());
        buildingMesh.position.set(posX, height / 2, posZ);

        // Attach metadata for raycaster hover
        const meta = buildingNames[nameIdx % buildingNames.length];
        nameIdx++;
        buildingMesh.userData = {
          ...meta,
          defaultColor: currentTheme.buildingBody,
          highlightColor: currentTheme.buildingHighlight,
          height: height
        };

        buildingGroup.add(buildingMesh);
        interactiveBuildings.push(buildingMesh);

        // Glowing Wireframe Edges
        const wireGeo = new THREE.EdgesGeometry(boxGeo);
        const wireframe = new THREE.LineSegments(wireGeo, defaultEdgeMat.clone());
        wireframe.position.copy(buildingMesh.position);
        buildingGroup.add(wireframe);
        buildingWireframes.push(wireframe);
        buildingMesh.userData.wireframe = wireframe;

        // Illuminated Rooftop Helipads & Architectural Spire Antennas
        if (hasCrown) {
          // Rooftop illuminated crown ring
          const crownGeo = new THREE.RingGeometry(width * 0.28, width * 0.36, 16);
          crownGeo.rotateX(-Math.PI / 2);
          const crownMat = new THREE.MeshBasicMaterial({
            color: currentTheme.primary,
            side: THREE.DoubleSide
          });
          const crownMesh = new THREE.Mesh(crownGeo, crownMat);
          crownMesh.position.set(posX, height + 0.15, posZ);
          buildingGroup.add(crownMesh);

          // Slender Communication Spire
          const antennaHeight = 3.5 + Math.random() * 3;
          const antennaGeo = new THREE.CylinderGeometry(0.06, 0.08, antennaHeight, 6);
          const antennaMat = new THREE.MeshBasicMaterial({ color: currentTheme.secondary });
          const antennaMesh = new THREE.Mesh(antennaGeo, antennaMat);
          antennaMesh.position.set(posX, height + antennaHeight / 2, posZ);
          buildingGroup.add(antennaMesh);

          // Glowing Blinking Beacon Node
          const beaconGeo = new THREE.SphereGeometry(0.32, 8, 8);
          const beaconMat = new THREE.MeshBasicMaterial({ color: currentTheme.beacon });
          const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
          beaconMesh.position.set(posX, height + antennaHeight, posZ);
          buildingGroup.add(beaconMesh);
          beacons.push(beaconMesh);
        }
      }
    }

    // --- Central Civix Command Spire (The Crown Landmark) ---
    const hqHeight = 42;
    const hqWidth = 8.5;
    const hqGeo = new THREE.BoxGeometry(hqWidth, hqHeight, hqWidth);
    const hqMat = new THREE.MeshPhongMaterial({
      color: isOfficial ? 0x221307 : 0x071529,
      map: windowTexture || undefined,
      shininess: 120,
      specular: currentTheme.primary
    });
    const hqMesh = new THREE.Mesh(hqGeo, hqMat);
    hqMesh.position.set(0, hqHeight / 2, 0);
    hqMesh.userData = {
      name: isOfficial ? 'Civix Apex Command Monolith' : 'Civix Central Digital Twin Spire',
      category: 'Municipal Core HQ',
      ward: 'Ward Central - Apex Command',
      metric: 'Telemetry Synchronized • 100% Operational',
      defaultColor: isOfficial ? 0x221307 : 0x071529,
      highlightColor: currentTheme.primary,
      height: hqHeight
    };
    buildingGroup.add(hqMesh);
    interactiveBuildings.push(hqMesh);

    // HQ Laser-Etched Wireframe
    const hqWireGeo = new THREE.EdgesGeometry(hqGeo);
    const hqWire = new THREE.LineSegments(
      hqWireGeo,
      new THREE.LineBasicMaterial({
        color: currentTheme.primary,
        transparent: true,
        opacity: 0.95
      })
    );
    hqWire.position.copy(hqMesh.position);
    buildingGroup.add(hqWire);
    hqMesh.userData.wireframe = hqWire;

    // Ascending Vertical Laser Energy Beam from Spire Crown into the Sky
    const beamHeight = 90;
    const beamGeo = new THREE.CylinderGeometry(0.25, 0.45, beamHeight, 16);
    const beamMat = new THREE.MeshBasicMaterial({
      color: currentTheme.laserBeam,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const laserBeam = new THREE.Mesh(beamGeo, beamMat);
    laserBeam.position.set(0, hqHeight + beamHeight / 2, 0);
    scene.add(laserBeam);

    // Glowing Core Halo Sphere atop Spire
    const coreOrbGeo = new THREE.SphereGeometry(1.6, 24, 24);
    const coreOrbMat = new THREE.MeshBasicMaterial({
      color: currentTheme.spireGlow,
      transparent: true,
      opacity: 0.95
    });
    const coreOrb = new THREE.Mesh(coreOrbGeo, coreOrbMat);
    coreOrb.position.set(0, hqHeight + 0.5, 0);
    scene.add(coreOrb);

    // Rotating Holographic Gyro Rings atop Spire
    const gyroRingGeo = new THREE.RingGeometry(2.8, 3.2, 32);
    const gyroRingMat = new THREE.MeshBasicMaterial({
      color: currentTheme.primary,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const gyroRing1 = new THREE.Mesh(gyroRingGeo, gyroRingMat);
    gyroRing1.position.set(0, hqHeight + 0.5, 0);
    gyroRing1.rotation.x = Math.PI / 2;
    scene.add(gyroRing1);

    const gyroRing2 = new THREE.Mesh(gyroRingGeo, gyroRingMat.clone());
    gyroRing2.position.set(0, hqHeight + 0.5, 0);
    gyroRing2.rotation.y = Math.PI / 4;
    scene.add(gyroRing2);

    scene.add(buildingGroup);

    // --- Expanding Holographic Radar Sonar Waves ---
    const radarCount = 4;
    const radarRings: { mesh: THREE.Mesh; scale: number; speed: number }[] = [];
    const radarGeo = new THREE.RingGeometry(0.6, 1.8, 64);
    radarGeo.rotateX(-Math.PI / 2);

    for (let i = 0; i < radarCount; i++) {
      const radarMat = new THREE.MeshBasicMaterial({
        color: currentTheme.primary,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const radarMesh = new THREE.Mesh(radarGeo, radarMat);
      radarMesh.position.set(0, 0.25, 0);
      scene.add(radarMesh);
      radarRings.push({
        mesh: radarMesh,
        scale: 1 + i * 18,
        speed: 0.22 + i * 0.02
      });
    }

    // --- Multi-Lane Streaming High-Speed Traffic & Civic Telemetry Highways ---
    const trafficCount = 75;
    const trafficPackets: {
      mesh: THREE.Mesh;
      dir: 'x' | 'z';
      speed: number;
      min: number;
      max: number;
      fixedCoord: number;
      isEmergency: boolean;
    }[] = [];

    const packetGeo = new THREE.SphereGeometry(0.42, 8, 8);
    const headlightMat = new THREE.MeshBasicMaterial({ color: currentTheme.pulseTraffic });
    const taillightMat = new THREE.MeshBasicMaterial({ color: currentTheme.taillightTraffic });

    for (let i = 0; i < trafficCount; i++) {
      const isHeadlight = Math.random() > 0.35;
      const p = new THREE.Mesh(packetGeo, isHeadlight ? headlightMat : taillightMat);
      const isAxisX = Math.random() > 0.5;
      const channelIndex = Math.floor(Math.random() * 10) - 5;
      const streetChannel = channelIndex * blockSpacing + (isHeadlight ? 1.2 : -1.2);

      p.position.set(
        isAxisX ? (Math.random() - 0.5) * 120 : streetChannel,
        0.35,
        isAxisX ? streetChannel : (Math.random() - 0.5) * 120
      );
      scene.add(p);
      trafficPackets.push({
        mesh: p,
        dir: isAxisX ? 'x' : 'z',
        speed: (Math.random() * 0.45 + 0.22) * (isHeadlight ? 1 : -1),
        min: -68,
        max: 68,
        fixedCoord: streetChannel,
        isEmergency: !isHeadlight && Math.random() > 0.8
      });
    }

    // --- Atmospheric Luminous Embers / Telemetry Packets ---
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particleCoords = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particleCoords[i] = (Math.random() - 0.5) * 120;
      particleCoords[i + 1] = Math.random() * 60;
      particleCoords[i + 2] = (Math.random() - 0.5) * 120;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particleCoords, 3));

    const particleMat = new THREE.PointsMaterial({
      color: currentTheme.primary,
      size: 0.8,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    const floatingEmbers = new THREE.Points(particleGeo, particleMat);
    scene.add(floatingEmbers);

    // --- Interactive Mouse Raycasting & Hover Telemetry ---
    const raycaster = new THREE.Raycaster();
    const mouseNorm = new THREE.Vector2(0, 0);
    let currentlyHoveredMesh: THREE.Mesh | null = null;

    let mouseClientX = window.innerWidth / 2;
    let mouseClientY = window.innerHeight / 2;
    let targetCamX = 0;
    let targetCamY = 52;
    let targetCamZ = 75;

    const onPointerMove = (e: MouseEvent) => {
      mouseClientX = e.clientX;
      mouseClientY = e.clientY;
      mouseNorm.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseNorm.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', onPointerMove);

    // --- Window Resize Handler ---
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // --- Animation & Render Loop ---
    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Camera motion: Responsive parallax + Gentle Cinematic Drift in Explore Mode
      const isExploring = isExploreModeRef.current;
      const exploreOrbitSpeed = isExploring ? 0.08 : 0.03;
      const orbitRadius = isExploring ? 82 : 75;

      const angle = elapsed * exploreOrbitSpeed;
      const parallaxMultiplierX = isExploring ? 35 : 20;
      const parallaxMultiplierY = isExploring ? 24 : 14;

      targetCamX = Math.sin(angle) * (isExploring ? 12 : 6) + mouseNorm.x * parallaxMultiplierX;
      targetCamY = 48 + mouseNorm.y * parallaxMultiplierY;
      targetCamZ = orbitRadius + Math.cos(angle) * (isExploring ? 10 : 4);

      camera.position.x += (targetCamX - camera.position.x) * 0.045;
      camera.position.y += (targetCamY - camera.position.y) * 0.045;
      camera.position.z += (targetCamZ - camera.position.z) * 0.045;
      camera.lookAt(0, 12, 0);

      // Rotate Gyro Rings on Spire
      gyroRing1.rotation.z = elapsed * 0.6;
      gyroRing2.rotation.x = elapsed * 0.45;
      coreOrb.scale.setScalar(1 + Math.sin(elapsed * 4) * 0.12);

      // Beam Breathing Pulse
      laserBeam.scale.x = 1 + Math.sin(elapsed * 6) * 0.15;
      laserBeam.scale.z = laserBeam.scale.x;

      // Animate Rooftop Beacon Blink
      const beaconGlow = (Math.sin(elapsed * 5) + 1) * 0.5;
      beacons.forEach((b) => {
        (b.material as THREE.MeshBasicMaterial).color
          .setHex(currentTheme.beacon)
          .multiplyScalar(beaconGlow + 0.35);
      });

      // Animate Sonar Radar Wave Rings
      radarRings.forEach((r) => {
        r.scale += r.speed;
        if (r.scale > 80) r.scale = 1;
        r.mesh.scale.set(r.scale, r.scale, 1);
        const alpha = Math.max(0, 0.75 - r.scale / 80);
        (r.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
      });

      // Animate Traffic Streams
      trafficPackets.forEach((t) => {
        if (t.dir === 'x') {
          t.mesh.position.x += t.speed;
          if (t.mesh.position.x > t.max) t.mesh.position.x = t.min;
          if (t.mesh.position.x < t.min) t.mesh.position.x = t.max;
        } else {
          t.mesh.position.z += t.speed;
          if (t.mesh.position.z > t.max) t.mesh.position.z = t.min;
          if (t.mesh.position.z < t.min) t.mesh.position.z = t.max;
        }
      });

      // Drift Floating Embers Upward
      const positions = particleGeo.attributes.position.array as Float32Array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += 0.06;
        if (positions[i] > 60) positions[i] = 0;
      }
      particleGeo.attributes.position.needsUpdate = true;

      // Raycasting for Building Hover Highlighting
      raycaster.setFromCamera(mouseNorm, camera);
      const intersects = raycaster.intersectObjects(interactiveBuildings, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        if (hit !== currentlyHoveredMesh) {
          // Reset previous mesh
          if (currentlyHoveredMesh) {
            const wire = currentlyHoveredMesh.userData.wireframe as THREE.LineSegments;
            if (wire) {
              (wire.material as THREE.LineBasicMaterial).color.setHex(currentTheme.secondary);
              (wire.material as THREE.LineBasicMaterial).opacity = 0.55;
            }
          }

          // Highlight new mesh
          currentlyHoveredMesh = hit;
          const wire = hit.userData.wireframe as THREE.LineSegments;
          if (wire) {
            (wire.material as THREE.LineBasicMaterial).color.setHex(0xffffff);
            (wire.material as THREE.LineBasicMaterial).opacity = 1.0;
          }

          setHoveredBuilding({
            name: hit.userData.name,
            category: hit.userData.category,
            status: 'Telemetry Live • Monitored',
            metric: hit.userData.metric,
            ward: hit.userData.ward,
            screenX: mouseClientX,
            screenY: mouseClientY
          });
        }
      } else {
        if (currentlyHoveredMesh) {
          const wire = currentlyHoveredMesh.userData.wireframe as THREE.LineSegments;
          if (wire) {
            (wire.material as THREE.LineBasicMaterial).color.setHex(currentTheme.secondary);
            (wire.material as THREE.LineBasicMaterial).opacity = 0.55;
          }
          currentlyHoveredMesh = null;
          setHoveredBuilding(null);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // --- Cleanup Lifecycle ---
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('resize', onResize);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      renderer.dispose();
      gridHelper.geometry.dispose();
      sharedBuildingMat.dispose();
      defaultEdgeMat.dispose();
      beamGeo.dispose();
      beamMat.dispose();
      coreOrbGeo.dispose();
      coreOrbMat.dispose();
      gyroRingGeo.dispose();
      gyroRingMat.dispose();
      radarGeo.dispose();
      packetGeo.dispose();
      headlightMat.dispose();
      taillightMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      if (windowTexture) windowTexture.dispose();
    };
  }, [isOfficial]);

  return (
    <>
      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          pointerEvents: isExploreMode ? 'auto' : 'none',
          overflow: 'hidden',
        }}
      />

      {/* Top Left Live Digital Twin Indicator */}
      <div 
        className="scene-status-pill animate-fade-in"
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 20,
          background: isOfficial ? 'rgba(26, 15, 6, 0.85)' : 'rgba(7, 18, 36, 0.85)',
          border: isOfficial ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(6, 182, 212, 0.35)',
          boxShadow: isOfficial ? '0 4px 20px rgba(245, 158, 11, 0.25)' : '0 4px 20px rgba(6, 182, 212, 0.25)'
        }}
      >
        <span 
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isOfficial ? '#f59e0b' : '#06b6d4',
            boxShadow: isOfficial ? '0 0 10px #f59e0b' : '0 0 10px #06b6d4'
          }}
        />
        <span style={{ fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.4px', color: '#f8fafc' }}>
          {isOfficial ? 'MUNICIPAL APEX DIGITAL TWIN • 60 FPS' : 'CIVIX SMART CITY DIGITAL TWIN • 60 FPS'}
        </span>
      </div>

      {/* Explore 3D City Toggle Button */}
      {onToggleExplore && (
        <button
          type="button"
          onClick={onToggleExplore}
          className="city-explore-toggle-btn animate-fade-in"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 30,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '30px',
            background: isOfficial ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(239, 68, 68, 0.25))' : 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(59, 130, 246, 0.25))',
            border: isOfficial ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(6, 182, 212, 0.5)',
            backdropFilter: 'blur(16px)',
            color: '#ffffff',
            fontSize: '0.84rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: isOfficial ? '0 8px 30px rgba(245, 158, 11, 0.3)' : '0 8px 30px rgba(6, 182, 212, 0.3)',
            transition: 'all 0.3s cubic-bezier(0.2, 0, 0.2, 1)'
          }}
          title={isExploreMode ? 'Return to Login Form' : 'Explore 3D Smart City in Full Screen'}
        >
          {isExploreMode ? (
            <>
              <Minimize2 size={16} color={isOfficial ? '#fbbf24' : '#38bdf8'} />
              <span>Back to Sign In</span>
            </>
          ) : (
            <>
              <Compass size={16} color={isOfficial ? '#fbbf24' : '#38bdf8'} />
              <span>Explore 3D City Experience</span>
              <Sparkles size={14} color={isOfficial ? '#fbbf24' : '#38bdf8'} />
            </>
          )}
        </button>
      )}

      {/* Floating Holographic Hover HUD Popover on Building Raycast */}
      {hoveredBuilding && (
        <div
          className="city-hover-hud animate-fade-in"
          style={{
            position: 'fixed',
            left: `${Math.min(hoveredBuilding.screenX + 18, window.innerWidth - 270)}px`,
            top: `${Math.max(hoveredBuilding.screenY - 80, 20)}px`,
            zIndex: 40,
            pointerEvents: 'none',
            width: '250px',
            background: isOfficial ? 'rgba(24, 14, 6, 0.92)' : 'rgba(8, 18, 36, 0.92)',
            backdropFilter: 'blur(20px)',
            border: isOfficial ? '1px solid rgba(245, 158, 11, 0.45)' : '1px solid rgba(56, 189, 248, 0.45)',
            borderRadius: '14px',
            padding: '12px 14px',
            boxShadow: isOfficial 
              ? '0 12px 35px rgba(0, 0, 0, 0.8), 0 0 20px rgba(245, 158, 11, 0.25)' 
              : '0 12px 35px rgba(0, 0, 0, 0.8), 0 0 20px rgba(56, 189, 248, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span 
              style={{ 
                fontSize: '0.66rem', 
                fontWeight: 800, 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px',
                color: isOfficial ? '#fbbf24' : '#38bdf8' 
              }}
            >
              {hoveredBuilding.category}
            </span>
            <span style={{ fontSize: '0.66rem', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <Activity size={10} /> Live
            </span>
          </div>

          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 4px 0', lineHeight: 1.2 }}>
            {hoveredBuilding.name}
          </h4>

          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '6px' }}>
            📍 {hoveredBuilding.ward}
          </div>

          <div 
            style={{ 
              padding: '6px 8px', 
              background: 'rgba(255, 255, 255, 0.05)', 
              borderRadius: '8px',
              fontSize: '0.72rem',
              color: isOfficial ? '#fef08a' : '#bae6fd',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Zap size={12} color={isOfficial ? '#f59e0b' : '#38bdf8'} />
            <span>{hoveredBuilding.metric}</span>
          </div>
        </div>
      )}
    </>
  );
};
