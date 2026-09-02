import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface City3DCanvasProps {
  isOfficial?: boolean;
}

export const City3DCanvas: React.FC<City3DCanvasProps> = ({ isOfficial = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isOfficialRef = useRef(isOfficial);
  isOfficialRef.current = isOfficial;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Scene, Camera, Renderer ---
    const scene = new THREE.Scene();
    const fogColor = isOfficial ? 0x0a0604 : 0x030712;
    scene.fog = new THREE.FogExp2(fogColor, 0.012);

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    // Elevated isometric perspective
    camera.position.set(0, 55, 70);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // --- Dynamic Color Schemes ---
    const citizenTheme = {
      lineColor: 0x06b6d4, // Cyan
      buildingEdge: 0x38bdf8, // Sky
      buildingBody: 0x081329,
      groundGrid: 0x1e293b,
      pulseColor: 0x22d3ee,
      radarColor: 0x0ea5e9,
      beaconColor: 0x38bdf8,
      lightPrimary: 0x38bdf8,
      lightSecondary: 0x6366f1,
      fog: 0x030712,
    };

    const officialTheme = {
      lineColor: 0xf59e0b, // Amber Gold
      buildingEdge: 0xfbbf24,
      buildingBody: 0x1c1208,
      groundGrid: 0x332014,
      pulseColor: 0xfde047,
      radarColor: 0xf59e0b,
      beaconColor: 0xef4444, // Red alert beacon
      lightPrimary: 0xf59e0b,
      lightSecondary: 0xef4444,
      fog: 0x080402,
    };

    const currentTheme = isOfficial ? officialTheme : citizenTheme;

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(currentTheme.lightPrimary, 2.5);
    dirLight.position.set(30, 60, 40);
    scene.add(dirLight);

    const accentLight = new THREE.PointLight(currentTheme.lightSecondary, 3, 120);
    accentLight.position.set(-20, 20, 10);
    scene.add(accentLight);

    // --- City Ground Grid Plane ---
    const gridSize = 140;
    const gridDivisions = 35;
    const gridHelper = new THREE.GridHelper(
      gridSize,
      gridDivisions,
      currentTheme.lineColor,
      currentTheme.groundGrid
    );
    gridHelper.position.y = -0.1;
    scene.add(gridHelper);

    // --- Procedural Buildings ---
    const buildingGroup = new THREE.Group();
    const cityRadius = 6;
    const blockSpacing = 7;
    const buildingEdges: THREE.LineSegments[] = [];
    const beacons: THREE.Mesh[] = [];

    // Shared Geometries & Materials
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: currentTheme.buildingEdge,
      transparent: true,
      opacity: 0.75,
      linewidth: 1,
    });

    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: currentTheme.buildingBody,
      transparent: true,
      opacity: 0.88,
      shininess: 90,
      specular: 0x334155,
    });

    const beaconGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: currentTheme.beaconColor,
    });

    for (let x = -cityRadius; x <= cityRadius; x++) {
      for (let z = -cityRadius; z <= cityRadius; z++) {
        // Skip central plaza and street channels
        if (Math.abs(x) <= 1 && Math.abs(z) <= 1) continue;
        if (Math.random() > 0.65) continue; // Sparse urban density for aesthetic breathing room

        const posX = x * blockSpacing + (Math.random() - 0.5) * 1.5;
        const posZ = z * blockSpacing + (Math.random() - 0.5) * 1.5;
        
        // Building dimensions
        const width = 3 + Math.random() * 2.5;
        const depth = 3 + Math.random() * 2.5;
        const distFromCenter = Math.sqrt(x * x + z * z);
        // Central skyscrapers, outer suburban facilities
        const baseHeight = Math.max(3, 26 - distFromCenter * 2.8);
        const height = baseHeight + Math.random() * 6;

        const boxGeo = new THREE.BoxGeometry(width, height, depth);
        const buildingMesh = new THREE.Mesh(boxGeo, bodyMaterial);
        buildingMesh.position.set(posX, height / 2, posZ);
        buildingGroup.add(buildingMesh);

        // Crisp neon edge wireframes
        const wireGeo = new THREE.EdgesGeometry(boxGeo);
        const wireframe = new THREE.LineSegments(wireGeo, edgeMaterial);
        wireframe.position.copy(buildingMesh.position);
        buildingGroup.add(wireframe);
        buildingEdges.push(wireframe);

        // Add communication towers/beacons on tall buildings
        if (height > 16) {
          const antennaHeight = 3 + Math.random() * 2.5;
          const antennaGeo = new THREE.CylinderGeometry(0.08, 0.08, antennaHeight);
          const antenna = new THREE.Mesh(
            antennaGeo,
            new THREE.MeshBasicMaterial({ color: currentTheme.buildingEdge })
          );
          antenna.position.set(posX, height + antennaHeight / 2, posZ);
          buildingGroup.add(antenna);

          const beacon = new THREE.Mesh(beaconGeo, beaconMat);
          beacon.position.set(posX, height + antennaHeight, posZ);
          buildingGroup.add(beacon);
          beacons.push(beacon);
        }
      }
    }
    scene.add(buildingGroup);

    // --- Municipal Command Center (Central Monolith Landmark) ---
    const hqHeight = 32;
    const hqGeo = new THREE.BoxGeometry(7, hqHeight, 7);
    const hqMesh = new THREE.Mesh(hqGeo, bodyMaterial);
    hqMesh.position.set(0, hqHeight / 2, 0);
    scene.add(hqMesh);

    const hqWireGeo = new THREE.EdgesGeometry(hqGeo);
    const hqWire = new THREE.LineSegments(
      hqWireGeo,
      new THREE.LineBasicMaterial({
        color: currentTheme.lineColor,
        transparent: true,
        opacity: 0.95,
      })
    );
    hqWire.position.copy(hqMesh.position);
    scene.add(hqWire);

    // Top Helipad Ring / Beacon on HQ
    const helipadRingGeo = new THREE.RingGeometry(2.2, 2.7, 32);
    helipadRingGeo.rotateX(-Math.PI / 2);
    const helipadRingMat = new THREE.MeshBasicMaterial({
      color: currentTheme.lineColor,
      side: THREE.DoubleSide,
    });
    const helipadRing = new THREE.Mesh(helipadRingGeo, helipadRingMat);
    helipadRing.position.set(0, hqHeight + 0.1, 0);
    scene.add(helipadRing);

    // --- Animated Radar Waves Sweeping from HQ ---
    const radarCount = 3;
    const radarRings: { mesh: THREE.Mesh; scale: number; speed: number }[] = [];
    const radarGeo = new THREE.RingGeometry(0.5, 1.2, 48);
    radarGeo.rotateX(-Math.PI / 2);

    for (let i = 0; i < radarCount; i++) {
      const radarMat = new THREE.MeshBasicMaterial({
        color: currentTheme.radarColor,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      });
      const radarMesh = new THREE.Mesh(radarGeo, radarMat);
      radarMesh.position.set(0, 0.2, 0);
      scene.add(radarMesh);
      radarRings.push({
        mesh: radarMesh,
        scale: 1 + i * 20,
        speed: 0.18 + i * 0.02,
      });
    }

    // --- Animated Civic Data Packets (Vehicles / Telemetry Signals) ---
    const pulseCount = 36;
    const pulses: {
      mesh: THREE.Mesh;
      dir: 'x' | 'z';
      speed: number;
      min: number;
      max: number;
      fixedCoord: number;
    }[] = [];
    const pulseGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: currentTheme.pulseColor,
    });

    for (let i = 0; i < pulseCount; i++) {
      const p = new THREE.Mesh(pulseGeo, pulseMat);
      const isAxisX = Math.random() > 0.5;
      const streetChannel = (Math.floor(Math.random() * 12) - 6) * blockSpacing;

      p.position.set(
        isAxisX ? (Math.random() - 0.5) * 100 : streetChannel,
        0.3,
        isAxisX ? streetChannel : (Math.random() - 0.5) * 100
      );
      scene.add(p);
      pulses.push({
        mesh: p,
        dir: isAxisX ? 'x' : 'z',
        speed: (Math.random() * 0.25 + 0.15) * (Math.random() > 0.5 ? 1 : -1),
        min: -55,
        max: 55,
        fixedCoord: streetChannel,
      });
    }

    // --- Atmospheric Floating Embers / Civic Nodes ---
    const particlesCount = 140;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 100;
      particlePositions[i + 1] = Math.random() * 45;
      particlePositions[i + 2] = (Math.random() - 0.5) * 100;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: currentTheme.pulseColor,
      size: 0.65,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // --- Interactive Mouse Parallax Tracking ---
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseX = nx;
      mouseY = ny;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // --- Resize Handler ---
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // --- Render Loop ---
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Camera parallax interpolation
      targetX = mouseX * 18;
      targetY = 50 + mouseY * 12;

      camera.position.x += (targetX - camera.position.x) * 0.04;
      camera.position.y += (targetY - camera.position.y) * 0.04;
      // Slight gentle orbital drift
      const driftAngle = elapsedTime * 0.03;
      camera.position.z = 70 + Math.sin(driftAngle) * 4;
      camera.lookAt(0, 8, 0);

      // Rotate helipad ring
      helipadRing.rotation.z = elapsedTime * 0.4;

      // Pulse beacon blinking
      const beaconIntensity = (Math.sin(elapsedTime * 4) + 1) * 0.5;
      beaconMat.color.setHex(currentTheme.beaconColor).multiplyScalar(beaconIntensity + 0.3);

      // Animate Radar Waves
      radarRings.forEach((r) => {
        r.scale += r.speed;
        if (r.scale > 65) {
          r.scale = 1;
        }
        r.mesh.scale.set(r.scale, r.scale, 1);
        const opacity = Math.max(0, 0.7 - r.scale / 65);
        (r.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
      });

      // Animate Civic Data Packets
      pulses.forEach((p) => {
        if (p.dir === 'x') {
          p.mesh.position.x += p.speed;
          if (p.mesh.position.x > p.max) p.mesh.position.x = p.min;
          if (p.mesh.position.x < p.min) p.mesh.position.x = p.max;
        } else {
          p.mesh.position.z += p.speed;
          if (p.mesh.position.z > p.max) p.mesh.position.z = p.min;
          if (p.mesh.position.z < p.min) p.mesh.position.z = p.max;
        }
      });

      // Atmospheric Particles Slow Upward Drift
      const positions = particleGeo.attributes.position.array as Float32Array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += 0.04;
        if (positions[i] > 48) {
          positions[i] = 0;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Dispose resources
      renderer.dispose();
      gridHelper.geometry.dispose();
      edgeMaterial.dispose();
      bodyMaterial.dispose();
      beaconGeo.dispose();
      beaconMat.dispose();
      hqGeo.dispose();
      hqWireGeo.dispose();
      radarGeo.dispose();
      pulseGeo.dispose();
      pulseMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, [isOfficial]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    />
  );
};
