"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Slow-drifting field of soft teal bands, evoking a signal/scan pattern.
// Kept subtle and dark so it reads as texture, not decoration.
const FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uResolution;

  vec3 accent = vec3(0.051, 0.584, 0.533); // #0d9488
  vec3 ink = vec3(0.059, 0.110, 0.141); // #0f1c24

  float wave(vec2 uv, float t) {
    float a = sin(uv.x * 3.0 + t * 0.12) * 0.5 + 0.5;
    float b = sin(uv.y * 4.0 - t * 0.08 + a * 2.0) * 0.5 + 0.5;
    return a * b;
  }

  void main() {
    vec2 uv = vUv;
    uv.x *= uResolution.x / uResolution.y;

    float t = uTime;
    float n = wave(uv * 1.4, t);
    n += wave(uv * 2.6 + 10.0, t * 1.3) * 0.5;
    n = n / 1.5;

    float glow = smoothstep(0.35, 0.95, n) * 0.22;
    vec3 color = mix(ink, accent, glow);

    gl_FragColor = vec4(color, glow * 0.9);
  }
`;

function DriftField() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThreeSize();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
    }),
    [size.width, size.height],
  );

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
    }
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  );
}

function useThreeSize() {
  const [size, setSize] = useState({ width: 1, height: 1 });
  useEffect(() => {
    const update = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return { size };
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

export function HeroCanvas() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!reducedMotion && supportsWebGL()) {
      setEnabled(true);
    }
  }, []);

  if (!enabled) return null;

  return (
    <Canvas
      className="!absolute !inset-0"
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: false }}
      aria-hidden
    >
      <DriftField />
    </Canvas>
  );
}
