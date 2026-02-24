import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// Points component that takes an image Data URL and turns it into particles
const PhotoPoints = ({ imageUrl }) => {
  const pointsRef = useRef();
  
  // Create particle data from the image
  const [positions, colors] = useMemo(() => {
    if (!imageUrl) return [new Float32Array(), new Float32Array()];
    
    // Create an offscreen canvas to read pixel data
    const img = new Image();
    img.src = imageUrl;
    
    // To avoid too many particles, we scale down to Max 200x200
    const maxDimension = 150; 
    let width = img.width;
    let height = img.height;
    
    const aspect = width / height;
    if (width > height) {
      width = maxDimension;
      height = maxDimension / aspect;
    } else {
      height = maxDimension;
      width = maxDimension * aspect;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // We need to wait for image to load to do this properly
    // This useMemo is synchronous, so we're faking it for the initial render
    // A real implementation would use a TextureLoader, but for raw pixel reading:
    return [new Float32Array(), new Float32Array()];
  }, [imageUrl]);

  return null; // Will replace with proper async loading
}

const AsyncPhotoPoints = ({ imageUrl, onLoaded, settings, analyzer, analyzerData }) => {
  const pointsRef = useRef();
  const [geometryData, setGeometryData] = React.useState(null);
  
  // Store the original Z positions so we can animate relative to them
  const originalZRef = useRef(new Float32Array());

  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.onload = () => {
      // Increase max dimension slightly for better resolution
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
      
      // We push the points into a 3D space
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const r = imgData[i] / 255;
          const g = imgData[i + 1] / 255;
          const b = imgData[i + 2] / 255;
          const a = imgData[i + 3] / 255;
          
          if (a > 0.1) { // Skip transparent
             // Center it and add depth z-noise based on brightness
             const posX = (x - w/2) * 0.1;
             const posY = -(y - h/2) * 0.1; // invert Y
             
             // Calculate luminance to determine depth (brighter pixels come forward)
             const luminance = r * 0.299 + g * 0.587 + b * 0.114;
             // Push the points out based on luminance, with a tiny bit of random noise for dust effect
             const posZ = luminance * 2.5 + (Math.random() - 0.5) * 0.1;
             
             // Multiply colors slightly to blend with the dark environment
             colors.push(r, g, b);
             positions.push(posX, posY, posZ);
          }
        }
      }
      // Keep a copy of original Z positions for animation reference
      const originalZ = new Float32Array(positions.length / 3);
      for(let i=0; i<positions.length; i+=3) {
        originalZ[i/3] = positions[i+2];
      }
      originalZRef.current = originalZ;

      setGeometryData({
        positions: new Float32Array(positions),
        colors: new Float32Array(colors)
      });
      if (onLoaded) {
          // Delay removing the loading screen to allow Three to actually render
          setTimeout(onLoaded, 500); 
      }
    };
    img.onerror = () => {
      console.error("Failed to load image for point cloud generation");
      if (onLoaded) onLoaded();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useFrame((state) => {
    if (pointsRef.current) {
      // Gentle dreamy sway instead of full spin so the image remains visible
      pointsRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.3;
      pointsRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.05) * 0.1;
      
      // Floating motion
      pointsRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.5;

      // Audio Reactivity
      if (analyzer?.current && analyzerData?.current && geometryData && settings?.particleIntensity > 0) {
        analyzer.current.getByteFrequencyData(analyzerData.current);
        
        // Calculate average bass frequency (lower index) for a general pulse
        let lowerThirdAvg = 0;
        const lowerThirdLength = Math.floor(analyzerData.current.length / 3);
        for(let i = 0; i < lowerThirdLength; i++) {
          lowerThirdAvg += analyzerData.current[i];
        }
        lowerThirdAvg = lowerThirdAvg / lowerThirdLength;
        const bassPulse = (lowerThirdAvg / 255) * settings.particleIntensity;

        const positions = pointsRef.current.geometry.attributes.position.array;
        
        // Update particles based on both their original Z and the music
        for (let i = 0; i < originalZRef.current.length; i++) {
            // Pick a specific frequency band for this particle to react to
            // Using modulo to distribute the frequency bands across the particles
            const freqIndex = i % analyzerData.current.length;
            const freqValue = analyzerData.current[freqIndex] / 255;
            
            // Combine overall bass pulse with individual frequency flutter
            const dynamicOffset = (bassPulse * 0.5) + (freqValue * settings.particleIntensity * 0.5);
            
            // Apply offset to Z
            positions[i * 3 + 2] = originalZRef.current[i] + dynamicOffset;
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
      }
    }
  });

  if (!geometryData) return null;

  return (
    <points ref={pointsRef}>
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
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation={true}
      />
    </points>
  );
};

// Generic ambient particles for when no photo is loaded or combined
const AmbientParticles = ({ settings, analyzer, analyzerData }) => {
  const pointsRef = useRef();
  const originalPosRef = useRef(new Float32Array());
  
  const [positions] = useMemo(() => {
    const count = 3000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i*3] = (Math.random() - 0.5) * 40;
      positions[i*3+1] = (Math.random() - 0.5) * 40;
      positions[i*3+2] = (Math.random() - 0.5) * 40;
    }
    const originalPos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        originalPos[i*3] = positions[i*3];
        originalPos[i*3+1] = positions[i*3+1];
        originalPos[i*3+2] = positions[i*3+2];
    }
    originalPosRef.current = originalPos;

    return [positions];
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.x = state.clock.elapsedTime * 0.01;
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;

      // Ambient Audio Reactivity
      if (analyzer?.current && analyzerData?.current && settings?.particleIntensity > 0) {
        analyzer.current.getByteFrequencyData(analyzerData.current);
        
        let avg = 0;
        for(let i = 0; i < analyzerData.current.length; i++) {
          avg += analyzerData.current[i];
        }
        avg = avg / analyzerData.current.length;
        const pulse = (avg / 255) * settings.particleIntensity * 5; // Ambient particles spread more

        const positions = pointsRef.current.geometry.attributes.position.array;
        
        for (let i = 0; i < originalPosRef.current.length / 3; i++) {
            // Expand outward from center based on pulse
            positions[i * 3]     = originalPosRef.current[i * 3]     + (originalPosRef.current[i * 3] > 0 ? pulse : -pulse);
            positions[i * 3 + 1] = originalPosRef.current[i * 3 + 1] + (originalPosRef.current[i * 3 + 1] > 0 ? pulse : -pulse);
            positions[i * 3 + 2] = originalPosRef.current[i * 3 + 2] + (originalPosRef.current[i * 3 + 2] > 0 ? pulse : -pulse);
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
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#E8E2D9"
        transparent
        opacity={0.3}
        sizeAttenuation={true}
      />
    </points>
  );
};

export default function Scene({ imageUrl, onLoaded, settings, analyzer, analyzerData }) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1 }}>
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={45} />
        
        {/* Soft fog matching the background */}
        <fog attach="fog" args={['#050505', 10, 40]} />
        
        <ambientLight intensity={0.5} />
        
        <AmbientParticles settings={settings} analyzer={analyzer} analyzerData={analyzerData} />
        
        {imageUrl && <AsyncPhotoPoints imageUrl={imageUrl} onLoaded={onLoaded} settings={settings} analyzer={analyzer} analyzerData={analyzerData} />}
        
        {/* Panning/Zooming matching Penderecki's Garden */}
        <OrbitControls 
          enablePan={false} 
          enableZoom={true} 
          maxDistance={30}
          minDistance={5}
          autoRotate={false} 
          autoRotateSpeed={0.5} 
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
}
