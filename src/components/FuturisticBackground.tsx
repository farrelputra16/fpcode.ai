// src/components/FuturisticBackground.tsx
'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, extend, useThree } from '@react-three/fiber';
import { Torus, shaderMaterial as dreiShaderMaterial } from '@react-three/drei';
import { Color, Mesh, ShaderMaterial } from 'three';

// Import our GLSL shaders
import vertexShader from '../components/shaders/vertexShader.glsl';
import fragmentShader from '../components/shaders/fragmentShader.glsl';

type CustomShaderMaterialProps = {
  uTime: number;
  uColor: Color;
  uDistortionStrength: number;
  uNoiseScale: number;
  uBrightness: number;
  uDarkness: number;
  attach?: string;
  args?: unknown[]; // Changed from any[] to unknown[]
};

const CustomShaderMaterial = dreiShaderMaterial(
  {
    uTime: 0,
    uColor: new Color(0x3D5AFE),
    uDistortionStrength: 0.1,
    uNoiseScale: 1.0,
    uBrightness: 1.0,
    uDarkness: 0.0,
  },
  vertexShader,
  fragmentShader
);

extend({ CustomShaderMaterial });

// (declare global block in r3f-custom.d.ts remains the same)

interface AnimatedTorusProps {
  theme: 'light' | 'dark';
  position: [number, number, number];
  rotationSpeed?: [number, number, number];
  distortionMultiplier?: number;
  sizeMultiplier?: number; // New prop for varying size
}

function AnimatedTorus({ theme, position, rotationSpeed = [0.002, 0.003, 0], distortionMultiplier = 1, sizeMultiplier = 1 }: AnimatedTorusProps) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial & CustomShaderMaterialProps>(null);

  const uniforms = useMemo(() => {
    return {
      uColor: theme === 'dark' ? new Color('#3D5AFE') : new Color('#42A5F5'),
      uDistortionStrength: (theme === 'dark' ? 0.15 : 0.08) * distortionMultiplier,
      uNoiseScale: theme === 'dark' ? 1.5 : 0.8,
      uBrightness: theme === 'dark' ? 1.5 : 1.2,
      uDarkness: theme === 'dark' ? 0.0 : 0.05,
    };
  }, [theme, distortionMultiplier]);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uTime = clock.getElapsedTime();
    }
    if (meshRef.current) {
      meshRef.current.rotation.x += rotationSpeed[0];
      meshRef.current.rotation.y += rotationSpeed[1];
      meshRef.current.rotation.z += rotationSpeed[2];
    }
  });

  return (
    // Adjust torus args based on sizeMultiplier
    <Torus ref={meshRef} args={[1 * sizeMultiplier, 0.3 * sizeMultiplier, 16, 100]} position={position}>
      <customShaderMaterial ref={materialRef} {...uniforms} />
    </Torus>
  );
}

// CameraParallaxController remains the same
interface CameraParallaxControllerProps {
  mousePosition: { x: number; y: number };
}

function CameraParallaxController({ mousePosition }: CameraParallaxControllerProps) {
  const { camera } = useThree();

  useFrame(() => {
    camera.position.x += (mousePosition.x * 0.5 - camera.position.x) * 0.05;
    camera.position.y += (-mousePosition.y * 0.5 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);
  });

  return null;
}


interface FuturisticBackgroundProps {
  theme: 'light' | 'dark';
  mousePosition: { x: number; y: number };
}

export default function FuturisticBackground({ theme, mousePosition }: FuturisticBackgroundProps) {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-transparent opacity-30">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 75 }}
        gl={{ antialias: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={theme === 'dark' ? 1.0 : 1.0} />
        <pointLight position={[10, 10, 10]} intensity={theme === 'dark' ? 1.5 : 2.0} />
        <pointLight position={[-10, -10, -10]} intensity={theme === 'dark' ? 1.0 : 1.5} />

        <CameraParallaxController mousePosition={mousePosition} />

        {/* --- OBJECT PLACEMENT FOR SIDE AREAS --- */}
        {/* Larger X values push objects further to the sides */}
        {/* Varying Z values for depth */}
        {/* Left Side Orbs */}
        <AnimatedTorus theme={theme} position={[-8, 4, -2]} rotationSpeed={[0.003, 0.004, 0.001]} distortionMultiplier={1.0} sizeMultiplier={1.2} />
        <AnimatedTorus theme={theme} position={[-6, -2, 1]} rotationSpeed={[0.004, 0.003, 0.002]} distortionMultiplier={0.8} sizeMultiplier={0.9} />
        <AnimatedTorus theme={theme} position={[-7, 0, -4]} rotationSpeed={[0.002, 0.005, 0.001]} distortionMultiplier={1.5} sizeMultiplier={1.5} />
        <AnimatedTorus theme={theme} position={[-9, -5, 0]} rotationSpeed={[0.007, 0.004, 0.003]} distortionMultiplier={1.2} sizeMultiplier={1.0} />

        {/* Right Side Orbs */}
        <AnimatedTorus theme={theme} position={[8, 4, 0]} rotationSpeed={[0.003, 0.004, 0.001]} distortionMultiplier={1.0} sizeMultiplier={1.1} />
        <AnimatedTorus theme={theme} position={[6, -2, -1]} rotationSpeed={[0.004, 0.003, 0.002]} distortionMultiplier={0.9} sizeMultiplier={1.3} />
        <AnimatedTorus theme={theme} position={[7, 0, 2]} rotationSpeed={[0.002, 0.005, 0.001]} distortionMultiplier={1.3} sizeMultiplier={1.4} />
        <AnimatedTorus theme={theme} position={[9, -5, -3]} rotationSpeed={[0.007, 0.004, 0.003]} distortionMultiplier={1.1} sizeMultiplier={0.8} />

        {/* Some orbs slightly behind the chat panel, but still visible if transparent enough */}
        <AnimatedTorus theme={theme} position={[-1.5, 3, -5]} rotationSpeed={[0.005, 0.002, 0.004]} distortionMultiplier={0.7} sizeMultiplier={0.7} />
        <AnimatedTorus theme={theme} position={[1.5, -3, -6]} rotationSpeed={[0.006, 0.003, 0.005]} distortionMultiplier={0.6} sizeMultiplier={0.6} />
      </Canvas>
    </div>
  );
}