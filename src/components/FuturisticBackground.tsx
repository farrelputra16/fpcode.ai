// src/components/FuturisticBackground.tsx
'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Torus } from '@react-three/drei';
import { Color, Mesh } from 'three'; // <-- PERUBAHAN DI SINI: Import Mesh langsung dari 'three'

interface SphereProps {
  theme: 'light' | 'dark';
}

// Simple Sphere component that will animate
function AnimatedTorus({ theme }: SphereProps) {
  // Properly type useRef with Mesh from 'three'
  const meshRef = useRef<Mesh>(null); // <-- PERUBAHAN DI SINI: Gunakan 'Mesh' yang diimpor

  // Rotate the torus on each frame
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.002;
      meshRef.current.rotation.y += 0.003;
    }
  });

  const materialColor = theme === 'dark' ? new Color('#3D5AFE') : new Color('#42A5F5');

  return (
    <Torus ref={meshRef} args={[1, 0.3, 16, 100]} position={[0, 0, 0]}>
      <meshStandardMaterial
        color={materialColor}
        emissive={theme === 'dark' ? new Color('#3D5AFE') : new Color('#1976D2')}
        emissiveIntensity={theme === 'dark' ? 0.7 : 0.1}
        metalness={0.7}
        roughness={0.3}
      />
    </Torus>
  );
}

interface FuturisticBackgroundProps {
  theme: 'light' | 'dark';
}

export default function FuturisticBackground({ theme }: FuturisticBackgroundProps) {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        gl={{ antialias: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={theme === 'dark' ? 0.3 : 0.8} />
        <pointLight position={[10, 10, 10]} intensity={theme === 'dark' ? 0.5 : 1} />
        <pointLight position={[-10, -10, -10]} intensity={theme === 'dark' ? 0.3 : 0.6} />
        <AnimatedTorus theme={theme} />
      </Canvas>
    </div>
  );
}