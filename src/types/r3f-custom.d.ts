// src/types/r3f-custom.d.ts
import type { ShaderMaterial} from 'three'; // Use type import for Material and ShaderMaterial
import type { Ref } from 'react'; // Import Ref from React

// Define the shape of your custom material's specific uniforms/props
export type CustomShaderMaterialSpecificProps = {
  uTime?: number;
  uColor?: import('three').Color;
  uDistortionStrength?: number;
  uNoiseScale?: number;
  uBrightness?: number;
  uDarkness?: number;
};

// Declare the module extension for @react-three/fiber's JSX IntrinsicElements
declare module '@react-three/fiber' {
  interface ThreeElements {
    customShaderMaterial: CustomShaderMaterialSpecificProps &
      // Merge with the base Material properties and React's Ref type
      // This is the most reliable way to make TypeScript recognize 'ref'
      // Use "Omit" to correctly add the ref prop from React's perspective
      Omit<JSX.IntrinsicElements['meshStandardMaterial'], 'ref' | 'args' | 'attach'> & { // Inherit standard props, but omit its ref, args, attach as we'll add our own.
        ref?: Ref<ShaderMaterial & CustomShaderMaterialSpecificProps>; // Explicitly define ref for your custom material
        attach?: string; // Add back attach if it's used on the JSX tag
        args?: unknown[]; // Change from any[] to unknown[] for better type safety
      };
  }
}