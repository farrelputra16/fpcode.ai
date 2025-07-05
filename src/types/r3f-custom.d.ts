// src/types/r3f-custom.d.ts
import type { ShaderMaterial} from 'three';
import type { Ref } from 'react';

export type CustomShaderMaterialSpecificProps = {
  uTime?: number;
  uColor?: import('three').Color;
  uDistortionStrength?: number;
  uNoiseScale?: number;
  uBrightness?: number;
  uDarkness?: number;
  uAudioLevel?: number; // Added uAudioLevel
};

declare module '@react-three/fiber' {
  interface ThreeElements {
    customShaderMaterial: CustomShaderMaterialSpecificProps &
      // Merge with the base Material properties and React's Ref type
      Omit<JSX.IntrinsicElements['meshStandardMaterial'], 'ref' | 'args' | 'attach'> & {
        ref?: Ref<ShaderMaterial & CustomShaderMaterialSpecificProps>;
        attach?: string;
        args?: unknown[]; // Changed from any[] to unknown[] for better type safety
      };
  }
}