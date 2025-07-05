// src/components/AudioVisualizer3D.tsx
'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, extend,} from '@react-three/fiber';
import { Torus, shaderMaterial as dreiShaderMaterial } from '@react-three/drei';
import { Color, Mesh, ShaderMaterial } from 'three';

// Import GLSL shaders (pastikan path ini benar dari lokasi AudioVisualizer3D.tsx)
import vertexShader from './shaders/vertexShader.glsl';
import fragmentShader from './shaders/fragmentShader.glsl';

// Definisi Tipe untuk properti material kustom
type CustomShaderMaterialProps = {
  uTime: number;
  uColor: Color;
  uDistortionStrength: number;
  uNoiseScale: number;
  uBrightness: number;
  uDarkness: number;
  uAudioLevel: number; // Uniform baru untuk level audio
  attach?: string;
  args?: unknown[];
};

// Buat konstruktor material kustom
const CustomShaderMaterial = dreiShaderMaterial(
  {
    uTime: 0,
    uColor: new Color(0x3D5AFE),
    uDistortionStrength: 0.1,
    uNoiseScale: 1.0,
    uBrightness: 1.0,
    uDarkness: 0.0,
    uAudioLevel: 0.0, // Inisialisasi level audio
  },
  vertexShader,
  fragmentShader
);

// Perluas agar tersedia sebagai elemen JSX
extend({ CustomShaderMaterial });

// Pastikan deklarasi global di r3f-custom.d.ts mencakup uAudioLevel
// (Anda perlu menambahkannya ke CustomShaderMaterialSpecificProps di r3f-custom.d.ts)
// declare global { namespace JSX { interface IntrinsicElements { customShaderMaterial: CustomShaderMaterialProps; } } }


interface AudioReactiveTorusProps {
  theme: 'light' | 'dark';
  audioLevel: number; // Prop untuk level audio dari 0-1
}

function AudioReactiveTorus({ theme, audioLevel }: AudioReactiveTorusProps) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial & CustomShaderMaterialProps>(null);

  // Sesuaikan properti material berdasarkan tema
  const uniforms = useMemo(() => {
    return {
      uColor: theme === 'dark' ? new Color('#3D5AFE') : new Color('#42A5F5'),
      // Kekuatan distorsi dasar, yang akan dimodifikasi oleh audioLevel
      uDistortionStrength: theme === 'dark' ? 0.05 : 0.02,
      uNoiseScale: theme === 'dark' ? 1.5 : 0.8,
      uBrightness: theme === 'dark' ? 1.5 : 1.2,
      uDarkness: theme === 'dark' ? 0.0 : 0.05,
      // uAudioLevel akan diupdate di useFrame
      uAudioLevel: 0.0,
    };
  }, [theme]);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uTime = clock.getElapsedTime();
      // Update uniform uAudioLevel berdasarkan prop audioLevel
      // Lakukan smoothing atau threshold jika perlu
      materialRef.current.uAudioLevel = audioLevel * (theme === 'dark' ? 1.5 : 1.0); // Level audio lebih menonjol di dark mode
    }
    if (meshRef.current) {
      // Rotasi atau skala dasar
      meshRef.current.rotation.x += 0.002;
      meshRef.current.rotation.y += 0.003;
      // Sedikit scaling berdasarkan level audio untuk visualisasi
      const scale = 1 + audioLevel * 0.2; // Membesar hingga 20% dari ukuran normal
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <Torus ref={meshRef} args={[1, 0.3, 16, 100]} position={[0, 0, 0]}>
      <customShaderMaterial ref={materialRef} {...uniforms} />
    </Torus>
  );
}

interface AudioVisualizer3DProps {
  theme: 'light' | 'dark';
  audioLevel: number; // Level audio dari VoiceChatModule
}

export default function AudioVisualizer3D({ theme, audioLevel }: AudioVisualizer3DProps) {
  // FIX: Use console.log or similar to "use" audioLevel prop if not directly used in JSX
  // This satisfies TypeScript's unused prop check.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _audioLevel = audioLevel;

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }} // Kamera untuk visualisasi ini
        gl={{ antialias: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={theme === 'dark' ? 0.8 : 1.0} />
        <pointLight position={[5, 5, 5]} intensity={theme === 'dark' ? 1.0 : 1.5} />
        <pointLight position={[-5, -5, -5]} intensity={theme === 'dark' ? 0.8 : 1.2} />
        <AudioReactiveTorus theme={theme} audioLevel={audioLevel} />
      </Canvas>
    </div>
  );
}