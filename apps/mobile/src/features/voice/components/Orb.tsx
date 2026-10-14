import { Canvas, Fill, Shader, Skia, useClock } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import {
  type SharedValue,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/**
 * The voice entity: a glossy sphere of flowing MeLedger blues. Bands of light drift inside it
 * (domain-warped waves), a cyan backlight glows from below, a rim light and specular highlight
 * give it depth, and a soft halo fades out around it. `energy` speeds up and swells the flow;
 * `level` (0..1, the live voice volume) makes it pulse with speech.
 */
const ORB_SHADER = Skia.RuntimeEffect.Make(`
uniform float2 res;
uniform float time;
uniform float energy;
uniform float level;

const half3 DEEP = half3(0.035, 0.12, 0.42);
const half3 BLUE = half3(0.0, 0.404, 0.933);
const half3 BRIGHT = half3(0.149, 0.518, 0.988);
const half3 CYAN = half3(0.50, 0.92, 1.0);
const half3 WHITE = half3(1.0, 1.0, 1.0);

half4 main(float2 xy) {
  float size = min(res.x, res.y);
  // The sphere fills 70% of the canvas and swells a little with the voice.
  float radius = size * (0.35 + 0.025 * level);
  float2 uv = (xy - res * 0.5) / radius;
  float d = length(uv);

  // Halo outside the sphere.
  if (d > 1.0) {
    float glow = exp(-(d - 1.0) * (5.5 - 2.0 * level)) * (0.32 + 0.4 * level);
    // Fade to nothing before the canvas edge so the glow never shows a square border.
    float edge = size * 0.5 / radius;
    glow *= smoothstep(edge, edge * 0.8, d);
    return half4(BRIGHT * glow, glow);
  }

  float z = sqrt(1.0 - d * d);
  float3 n = float3(uv, z);
  float t = time * (0.18 + 0.55 * energy);

  // Domain-warped flow, wrapped onto the sphere so it bulges at the edges.
  float2 p = uv / (0.55 + 0.45 * z) * 1.35;
  float amp = 0.45 + 0.5 * energy + 0.6 * level;
  for (int i = 1; i < 5; i++) {
    float fi = float(i);
    p += amp / fi * sin(p.yx * (1.25 * fi) + float2(t * (0.8 + 0.25 * fi), -t * 0.6) + fi);
  }
  float band = 0.5 + 0.5 * sin(p.x * 1.6 + p.y * 1.1 + t);
  float streak = pow(0.5 + 0.5 * sin(p.y * 2.3 - p.x * 0.9 - t * 1.4), 7.0);

  half3 col = mix(DEEP, BLUE, smoothstep(0.1, 0.75, band));
  col = mix(col, BRIGHT, smoothstep(0.65, 1.0, band) * 0.8);
  col += CYAN * streak * (0.55 + 0.6 * level);

  // Cyan backlight from below-left, darker top-right: depth.
  float back = smoothstep(1.1, -0.3, distance(uv, float2(-0.45, 0.65)));
  col = mix(col, CYAN, back * 0.35);
  col *= 0.62 + 0.5 * z;

  // Rim light and a soft specular highlight.
  float fresnel = pow(1.0 - z, 2.6);
  col += mix(BRIGHT, CYAN, 0.5) * fresnel * 0.9;
  float3 light = normalize(float3(-0.45, -0.6, 0.75));
  float spec = pow(max(dot(n, light), 0.0), 42.0);
  col += WHITE * spec * 0.85;

  // Antialiased edge.
  float alpha = smoothstep(1.0, 1.0 - 3.0 / radius, d);
  return half4(col * alpha, alpha);
}
`);

export type OrbMode = 'idle' | 'listening' | 'thinking';

const ENERGY: Record<OrbMode, number> = { idle: 0.12, listening: 0.45, thinking: 0.9 };

interface OrbProps {
  size: number;
  mode?: OrbMode;
  /** Live voice volume, 0..1. Smoothed here, so raw event values are fine. */
  level?: SharedValue<number>;
}

export function Orb({ size, mode = 'idle', level }: OrbProps) {
  const clock = useClock();
  const energy = useSharedValue(ENERGY[mode]);
  useEffect(() => {
    energy.set(withTiming(ENERGY[mode], { duration: 600 }));
  }, [mode, energy]);

  // Volume events arrive about every 100ms; a soft spring turns them into smooth motion.
  const smoothLevel = useDerivedValue(() =>
    withSpring(level ? level.get() : 0, { damping: 14, stiffness: 90, mass: 0.6 }),
  );

  const uniforms = useDerivedValue(() => ({
    res: [size, size],
    time: clock.get() / 1000,
    energy: energy.get(),
    level: smoothLevel.get(),
  }));

  if (!ORB_SHADER) return null;
  return (
    <Canvas style={{ width: size, height: size }} accessible={false}>
      <Fill>
        <Shader source={ORB_SHADER} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}
