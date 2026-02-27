import React, { useRef, useEffect, memo, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// --- Soft circular particle texture (created once) ---
function createParticleTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.7)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.2)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const particleTexture = createParticleTexture();

// Temp vectors to avoid per-frame allocations
const _ndc = new THREE.Vector3();
const _dir = new THREE.Vector3();

// --- Mouse tracker: projects pointer to world-space z=0 plane ---
const MouseTracker = ({ mouseRef, pressedRef }) => {
  const { gl } = useThree();

  useEffect(() => {
    const el = gl.domElement;
    const down = () => { pressedRef.current = true; };
    const up = () => { pressedRef.current = false; };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointerleave', up);
    };
  }, [gl, pressedRef]);

  useFrame((state) => {
    _ndc.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
    _dir.copy(_ndc).sub(state.camera.position).normalize();
    const d = -state.camera.position.z / _dir.z;
    mouseRef.current.copy(state.camera.position).addScaledVector(_dir, d);
  });

  return null;
};

// --- Photo point cloud ---
const AsyncPhotoPoints = ({ imageUrl, onLoaded, settings, analyzer, analyzerData, mouseRef, pressedRef }) => {
  const pointsRef = useRef();
  const [geometryData, setGeometryData] = React.useState(null);

  const originalsRef = useRef(null);
  const seedsRef = useRef(null);
  // Per-particle velocities for fluid mouse interaction
  const velocitiesRef = useRef(null);

  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.onload = () => {
      const maxDimension = 200;
      let w = img.width;
      let h = img.height;
      const aspect = w / h;
      if (w > h) { w = maxDimension; h = maxDimension / aspect; }
      else { h = maxDimension; w = maxDimension * aspect; }

      w = Math.floor(w);
      h = Math.floor(h);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      const imgData = ctx.getImageData(0, 0, w, h).data;
      const positions = [];
      const colors = [];
      const sizes = [];

      const halfW = w / 2;
      const halfH = h / 2;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const r = imgData[i] / 255;
          const g = imgData[i + 1] / 255;
          const b = imgData[i + 2] / 255;
          const a = imgData[i + 3] / 255;

          // Skip white/near-white background pixels
          if (r > 0.92 && g > 0.92 && b > 0.92) continue;

          if (a > 0.1) {
            const posX = (x - halfW) * 0.1;
            const posY = -(y - halfH) * 0.1;
            const luminance = r * 0.299 + g * 0.587 + b * 0.114;

            const posZ = luminance * 3.0 + (Math.random() - 0.5) * 0.8;

            // Elliptical distance from center (0 = center, 1 = edge of ellipse)
            const nx = (x - halfW) / halfW;
            const ny = (y - halfH) / halfH;
            const ellipseDist = Math.sqrt(nx * nx + ny * ny);

            // Oval vignette: bright center, fading edges
            const vignette = Math.max(0, 1.0 - ellipseDist * 0.7);
            const vignetteSmooth = vignette * vignette;

            // How close this pixel is to any rectangular edge (0 = center, 1 = at edge)
            const edgeX = Math.max(1 - x / (w * 0.2), 1 - (w - 1 - x) / (w * 0.2), 0);
            const edgeY = Math.max(1 - y / (h * 0.2), 1 - (h - 1 - y) / (h * 0.2), 0);
            const edgeProximity = Math.max(edgeX, edgeY);

            // All particles get a soft base scatter; edge particles scatter much more
            const baseScatter = 0.15;
            const edgeScatter = edgeProximity * 2.5;
            const scatter = baseScatter + edgeScatter;

            const finalX = posX + (Math.random() - 0.5) * scatter;
            const finalY = posY + (Math.random() - 0.5) * scatter;
            const finalZ = posZ + (Math.random() - 0.5) * scatter * 0.5;

            // Boost center colors, dim edges
            const colorBoost = 0.4 + vignetteSmooth * 0.8;
            const cr = Math.min(1, r * colorBoost);
            const cg = Math.min(1, g * colorBoost);
            const cb = Math.min(1, b * colorBoost);

            positions.push(finalX, finalY, finalZ);
            colors.push(cr, cg, cb);
            sizes.push(0.15 + vignetteSmooth * 0.2 + luminance * 0.15 + edgeProximity * 0.1);

            // Sprinkle extra scattered particles at edges for a misty halo
            if (edgeProximity > 0.3 && Math.random() < edgeProximity * 0.4) {
              const extraScatter = 1.5 + edgeProximity * 3.0;
              positions.push(
                posX + (Math.random() - 0.5) * extraScatter,
                posY + (Math.random() - 0.5) * extraScatter,
                posZ + (Math.random() - 0.5) * 1.5
              );
              colors.push(r * 0.3, g * 0.3, b * 0.3);
              sizes.push(0.1 + Math.random() * 0.1);
            }
          }
        }
      }

      const count = positions.length / 3;
      const originals = new Float32Array(positions);
      const seeds = new Float32Array(count * 4);
      const velocities = new Float32Array(count * 3); // vx, vy, vz per particle
      for (let i = 0; i < count; i++) {
        seeds[i * 4]     = Math.random() * Math.PI * 2;       // phase
        seeds[i * 4 + 1] = 0.3 + Math.random() * 0.7;        // speed
        seeds[i * 4 + 2] = 0.2 + Math.random() * 1.0;        // drift radius
        seeds[i * 4 + 3] = (Math.random() - 0.5) * 2;        // swirl direction
      }

      originalsRef.current = originals;
      seedsRef.current = seeds;
      velocitiesRef.current = velocities;

      setGeometryData({
        positions: new Float32Array(positions),
        colors: new Float32Array(colors),
        sizes: new Float32Array(sizes),
      });
      if (onLoaded) setTimeout(onLoaded, 500);
    };
    img.onerror = () => {
      console.error("Failed to load image for point cloud generation");
      if (onLoaded) onLoaded();
    };
    img.src = imageUrl;
  }, [imageUrl, onLoaded]);

  // Custom shader material for per-particle sizes + soft glow
  const shaderMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: particleTexture },
      uOpacity: { value: 0.85 },
    },
    vertexShader: `
      attribute float aSize;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D uTexture;
      uniform float uOpacity;
      varying vec3 vColor;
      void main() {
        vec4 texColor = texture2D(uTexture, gl_PointCoord);
        gl_FragColor = vec4(vColor, texColor.a * uOpacity);
      }
    `,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), []);

  useFrame((state) => {
    if (!pointsRef.current || !originalsRef.current || !seedsRef.current) return;

    const t = state.clock.elapsedTime;
    const positions = pointsRef.current.geometry.attributes.position.array;
    const orig = originalsRef.current;
    const seeds = seedsRef.current;
    const vel = velocitiesRef.current;
    const count = orig.length / 3;

    // Global breathing
    const breathe = 1.0 + Math.sin(t * 0.3) * 0.06;

    // Spiral burst — every ~12s, particles spiral out for ~3s
    const burstCycle = t % 12;
    const burstStrength = burstCycle < 3 ? Math.sin(burstCycle * Math.PI / 3) * 1.5 : 0;

    // Audio
    let bassPulse = 0;
    let midPulse = 0;
    if (analyzer?.current && analyzerData?.current && settings?.particleIntensity > 0) {
      analyzer.current.getByteFrequencyData(analyzerData.current);
      const len = analyzerData.current.length;
      let bassSum = 0, midSum = 0;
      const bassEnd = Math.floor(len / 4);
      const midEnd = Math.floor(len / 2);
      for (let i = 0; i < bassEnd; i++) bassSum += analyzerData.current[i];
      for (let i = bassEnd; i < midEnd; i++) midSum += analyzerData.current[i];
      bassPulse = (bassSum / bassEnd / 255) * settings.particleIntensity;
      midPulse = (midSum / (midEnd - bassEnd) / 255) * settings.particleIntensity;
    }

    // Mouse repulsion
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;
    const pressed = pressedRef.current;
    const repelRadius = pressed ? 4.0 : 2.5;
    const repelStrength = pressed ? 3.0 : 0.8;
    const repelRadiusSq = repelRadius * repelRadius;

    const damping = 0.92;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const ox = orig[i3];
      const oy = orig[i3 + 1];
      const oz = orig[i3 + 2];
      const phase = seeds[i * 4];
      const speed = seeds[i * 4 + 1];
      const radius = seeds[i * 4 + 2];
      const swirl = seeds[i * 4 + 3];

      const dist = Math.sqrt(ox * ox + oy * oy);
      const angle = Math.atan2(oy, ox);

      // Organic drift
      const driftX = Math.sin(t * speed * 0.35 + phase) * radius * 0.4
                   + Math.sin(t * 0.12 + dist * 0.2) * 0.5;
      const driftY = Math.cos(t * speed * 0.3 + phase * 1.3) * radius * 0.35
                   + Math.cos(t * 0.1 + dist * 0.18) * 0.4;
      const driftZ = Math.sin(t * speed * 0.2 + phase * 0.7) * radius * 0.5
                   + Math.sin(t * 0.3 + ox * 0.15 + oy * 0.15) * 0.5;

      // Swirl + spiral burst
      const swirlSpeed = 0.04 * swirl + burstStrength * 0.15 * swirl;
      const swirlAngle = angle + t * swirlSpeed + bassPulse * 0.2;
      const burstExpand = burstStrength * dist * 0.15;
      const swirlDist = dist * breathe + bassPulse * 1.2 + burstExpand;
      const swirlX = Math.cos(swirlAngle) * swirlDist - ox;
      const swirlY = Math.sin(swirlAngle) * swirlDist - oy;

      // Audio: bass pushes Z, mid flutters XY
      const audioZ = bassPulse * 1.5 + midPulse * Math.sin(phase + t * 2) * 0.5;

      // Compute target position
      let px = ox * breathe + driftX * 0.4 + swirlX * 0.3;
      let py = oy * breathe + driftY * 0.4 + swirlY * 0.3;
      let pz = oz + driftZ * 0.5 + audioZ;

      // Mouse repulsion — applied to the computed position
      const dmx = px - mx;
      const dmy = py - my;
      const mouseDSq = dmx * dmx + dmy * dmy;
      if (mouseDSq < repelRadiusSq && mouseDSq > 0.001) {
        const mouseDist = Math.sqrt(mouseDSq);
        const force = (1 - mouseDist / repelRadius) * repelStrength;
        vel[i3]     += (dmx / mouseDist) * force * 0.15;
        vel[i3 + 1] += (dmy / mouseDist) * force * 0.15;
        vel[i3 + 2] += (Math.random() - 0.5) * force * 0.1;
      }

      // Apply velocity with damping
      vel[i3]     *= damping;
      vel[i3 + 1] *= damping;
      vel[i3 + 2] *= damping;

      positions[i3]     = px + vel[i3];
      positions[i3 + 1] = py + vel[i3 + 1];
      positions[i3 + 2] = pz + vel[i3 + 2];
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    // Gentle overall rotation and float
    pointsRef.current.rotation.y = Math.sin(t * 0.07) * 0.2;
    pointsRef.current.rotation.x = Math.sin(t * 0.05) * 0.08;
    pointsRef.current.position.y = Math.sin(t * 0.13) * 0.3;
  });

  if (!geometryData) return null;

  return (
    <points ref={pointsRef} material={shaderMaterial}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={geometryData.positions.length / 3}
          array={geometryData.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={geometryData.colors.length / 3}
          array={geometryData.colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={geometryData.sizes.length}
          array={geometryData.sizes}
          itemSize={1}
        />
      </bufferGeometry>
    </points>
  );
};

// --- Ambient dust particles ---
const AMBIENT_COUNT = 3000;
const AMBIENT_POSITIONS = new Float32Array(AMBIENT_COUNT * 3);
const AMBIENT_ORIGINAL = new Float32Array(AMBIENT_COUNT * 3);
for (let i = 0; i < AMBIENT_COUNT; i++) {
  AMBIENT_POSITIONS[i*3] = (Math.random() - 0.5) * 40;
  AMBIENT_POSITIONS[i*3+1] = (Math.random() - 0.5) * 40;
  AMBIENT_POSITIONS[i*3+2] = (Math.random() - 0.5) * 40;
  AMBIENT_ORIGINAL[i*3] = AMBIENT_POSITIONS[i*3];
  AMBIENT_ORIGINAL[i*3+1] = AMBIENT_POSITIONS[i*3+1];
  AMBIENT_ORIGINAL[i*3+2] = AMBIENT_POSITIONS[i*3+2];
}

const AmbientParticles = ({ settings, analyzer, analyzerData }) => {
  const pointsRef = useRef();
  const originalPosRef = useRef(AMBIENT_ORIGINAL);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.x = state.clock.elapsedTime * 0.008;
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.015;

      if (analyzer?.current && analyzerData?.current && settings?.particleIntensity > 0) {
        analyzer.current.getByteFrequencyData(analyzerData.current);

        let avg = 0;
        for (let i = 0; i < analyzerData.current.length; i++) {
          avg += analyzerData.current[i];
        }
        avg = avg / analyzerData.current.length;
        const pulse = (avg / 255) * settings.particleIntensity * 5;

        const positions = pointsRef.current.geometry.attributes.position.array;
        const orig = originalPosRef.current;

        for (let i = 0; i < orig.length / 3; i++) {
          const i3 = i * 3;
          positions[i3]     = orig[i3]     + (orig[i3] > 0 ? pulse : -pulse);
          positions[i3 + 1] = orig[i3 + 1] + (orig[i3 + 1] > 0 ? pulse : -pulse);
          positions[i3 + 2] = orig[i3 + 2] + (orig[i3 + 2] > 0 ? pulse : -pulse);
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
      }
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={AMBIENT_POSITIONS.length / 3}
          array={AMBIENT_POSITIONS}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        map={particleTexture}
        color="#E8E2D9"
        transparent
        opacity={0.25}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation={true}
      />
    </points>
  );
};

// --- Water drop cursor SVG ---
const WATER_DROP_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='32' viewBox='0 0 24 32'%3E%3Cpath d='M12 0C12 0 0 14 0 21a12 12 0 0024 0C24 14 12 0 12 0z' fill='rgba(120,180,255,0.6)' stroke='rgba(180,220,255,0.8)' stroke-width='1'/%3E%3Cellipse cx='8' cy='18' rx='3' ry='4' fill='rgba(200,230,255,0.3)' transform='rotate(-20 8 18)'/%3E%3C/svg%3E") 12 16, auto`;

function Scene({ imageUrl, onLoaded, settings, analyzer, analyzerData }) {
  const mouseRef = useRef(new THREE.Vector3());
  const pressedRef = useRef(false);

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0,
      width: '100vw', height: '100vh', zIndex: 1,
      cursor: imageUrl ? WATER_DROP_CURSOR : 'default',
    }}>
      <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
        <fog attach="fog" args={['#050505', 25, 50]} />

        <ambientLight intensity={0.5} />

        <MouseTracker mouseRef={mouseRef} pressedRef={pressedRef} />

        <AmbientParticles settings={settings} analyzer={analyzer} analyzerData={analyzerData} />

        {imageUrl && (
          <AsyncPhotoPoints
            imageUrl={imageUrl}
            onLoaded={onLoaded}
            settings={settings}
            analyzer={analyzer}
            analyzerData={analyzerData}
            mouseRef={mouseRef}
            pressedRef={pressedRef}
          />
        )}
      </Canvas>
    </div>
  );
}

export default memo(Scene);
