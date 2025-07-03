// src/components/shaders/fragmentShader.glsl
uniform vec3 uColor;
uniform float uTime;
uniform float uDistortionStrength; // Not directly used for color, but can be for effects
uniform float uNoiseScale; // Can influence color variation
uniform float uBrightness;
uniform float uDarkness;
varying vec3 vNormal; // Interpolated normal from vertex shader
varying vec3 vPosition; // Interpolated position from fragment shader for effects

// Perlin noise for subtle color variation (corrected for vec3 swizzling)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

float cnoise(vec3 P) {
    vec3 Pi0 = floor(P); // Integer part for indexing
    vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
    Pi0 = mod289(Pi0);
    Pi1 = mod289(Pi1);
    vec3 Pf0 = fract(P); // Fractional part for interpolation
    vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixyz0 = permute(ixy + iz0);
    vec4 ixyz1 = permute(ixy + iz1);

    vec4 gx = fract(ixyz0 * (1.0 / 7.0)) * 2.0 - 1.0;
    vec4 gy = fract(floor(ixyz0 * (1.0 / 7.0)) / 7.0) * 2.0 - 1.0;
    vec4 gz = fract(floor(floor(ixyz0 * (1.0 / 7.0)) / 7.0) / 7.0) * 2.0 - 1.0;
    vec3 g0 = normalize(vec3(gx.x,gy.x,gz.x));
    vec3 g1 = normalize(vec3(gx.y,gy.y,gz.y));
    vec3 g2 = normalize(vec3(gx.z,gy.z,gz.z));
    vec3 g3 = normalize(vec3(gx.w,gy.w,gz.w));

    // --- FIX: Change Pf0.xyw to Pf0.xyz ---
    vec4 norm0 = taylorInvSqrt(vec4(dot(g0,Pf0.xyz), dot(g1,Pf1.xyz), dot(g2,Pf0.xyz), dot(g3,Pf1.xyz)));
    g0 *= norm0.x;
    g1 *= norm0.y;
    g2 *= norm0.z;
    g3 *= norm0.w;

    vec4 m = max(0.6 - vec4(dot(Pf0,Pf0), dot(Pf1,Pf1), dot(Pf0.xyz,Pf0.xyz), dot(Pf1.xyz,Pf1.xyz)), 0.0);
    m = m * m;
    m = m * m;
    // --- FIX: Change Pf0.xyw to Pf0.xyz here as well ---
    vec4 px = vec4(dot(Pf0, g0), dot(Pf1, g1), dot(Pf0.xyz, g2), dot(Pf1.xyz, g3));
    return 42.0 * dot(m, px);
}

void main() {
    // Basic lighting model (simplified phong-like)
    vec3 lightDirection = normalize(vec3(0.5, 0.5, 1.0));
    float diffuse = max(dot(vNormal, lightDirection), 0.0);
    vec3 finalColor = uColor * (diffuse + 0.3); // Add some ambient light

    // Add subtle color noise based on position and time
    float colorNoise = cnoise(vPosition * uNoiseScale * 0.5 + uTime * 0.2);
    finalColor += uColor * colorNoise * 0.1; // Subtle color variation

    // Apply brightness and darkness
    finalColor *= uBrightness;
    finalColor -= uDarkness;

    gl_FragColor = vec4(finalColor, 1.0);
}