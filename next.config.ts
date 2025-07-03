// next-config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  webpack: (config, { isServer }) => { // FIX: Changed _isServer back to isServer
    // Add a rule to handle .glsl files
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/, // Regex to match .glsl and other shader file extensions
      exclude: /node_modules/, // Don't process glsl files in node_modules
      use: ['raw-loader'], // Use raw-loader to import content as a string
    });

    // To silence 'isServer' is defined but never used.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _isServer = isServer; // FIX: Explicitly 'use' isServer by assigning to an ignored variable

    // Important: return the modified config
    return config;
  },
};

export default nextConfig;