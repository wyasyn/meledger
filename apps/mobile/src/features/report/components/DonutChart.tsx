import { formatAmount, formatMoney } from '@meledger/shared';
import { Circle, Canvas, Group, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { type GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  type SharedValue,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import { lightColors, paletteColor, radius, spacing } from '@/theme/tokens';

import type { DonutSegment } from '../logic';

interface DonutChartProps {
  segments: DonutSegment[];
  total: number;
  /** "Total Expenses" or "Total Income". */
  label: string;
  size: number;
}

/** Ring thickness as a share of the chart's diameter. */
const THICKNESS = 0.19;
/** Space between segments along the middle of the ring, in dp. */
const GAP = 7;
/** How far the selected segment grows outwards. */
const POP = 7;
/** Rounded segment corners. */
const CORNER = 9;
const HATCH_BASE = '#EEEEF1';
const HATCH_STRIPE = '#DCDCE1';
const TRACK = lightColors.surface;
const START = -90;

/** Annular sector from `startDeg` sweeping clockwise. Runs on the UI thread. */
function sector(c: number, outer: number, inner: number, startDeg: number, sweepDeg: number) {
  'worklet';
  const builder = Skia.PathBuilder.Make();
  if (sweepDeg > 0.05) {
    builder
      .arcToOval(
        Skia.XYWHRect(c - outer, c - outer, outer * 2, outer * 2),
        startDeg,
        sweepDeg,
        true,
      )
      .arcToOval(
        Skia.XYWHRect(c - inner, c - inner, inner * 2, inner * 2),
        startDeg + sweepDeg,
        -sweepDeg,
        false,
      )
      .close();
  }
  return builder.detach();
}

interface Arc {
  segment: DonutSegment;
  /** Degrees from the top, before the gap is taken off. */
  from: number;
  to: number;
}

/**
 * Expenses or income by category as a thick ring of rounded segments with small gaps
 * (build prompt section 5.4). The biggest categories get their colour; the grouped rest is
 * hatched grey. Tapping a segment lifts it, shows its share in a black pill and its amount in
 * the middle; tapping elsewhere clears it. Segments sweep in when the data changes.
 */
export function DonutChart({ segments, total, label, size }: DonutChartProps) {
  // A selection belongs to the figures it was made on; new figures start unselected.
  const [pick, setPick] = useState<{ signature: string; id: string | null }>({
    signature: '',
    id: null,
  });
  const progress = useSharedValue(0);
  const c = size / 2;
  const outer = c - POP - 2;
  const inner = outer - size * THICKNESS;
  const gapDeg = segments.length > 1 ? ((GAP / ((outer + inner) / 2)) * 180) / Math.PI : 0;

  // Re-run the sweep whenever the figures change.
  const signature = segments.map((s) => `${s.id}:${s.value}`).join('|');
  const selected = pick.signature === signature ? pick.id : null;
  const setSelected = (update: (current: string | null) => string | null) =>
    setPick({ signature, id: update(selected) });
  useEffect(() => {
    progress.set(0);
    progress.set(withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) }));
  }, [signature, progress]);

  const arcs = segments.reduce<Arc[]>((list, segment) => {
    const from = list.at(-1)?.to ?? 0;
    return [...list, { segment, from, to: from + segment.share * 360 }];
  }, []);

  const onPress = (e: GestureResponderEvent) => {
    const dx = e.nativeEvent.locationX - c;
    const dy = e.nativeEvent.locationY - c;
    const distance = Math.hypot(dx, dy);
    if (distance < inner - 8 || distance > outer + POP + 8) {
      setSelected(() => null);
      return;
    }
    const angle = ((Math.atan2(dy, dx) * 180) / Math.PI - START + 360) % 360;
    const hit = arcs.find((a) => angle >= a.from && angle < a.to)?.segment.id ?? null;
    Haptics.selectionAsync();
    setSelected((current) => (hit === current ? null : hit));
  };

  const active = arcs.find((a) => a.segment.id === selected);
  const mid = active ? ((START + (active.from + active.to) / 2) * Math.PI) / 180 : 0;
  const pillAt = active
    ? { x: c + Math.cos(mid) * (outer + POP - 4), y: c + Math.sin(mid) * (outer + POP - 4) }
    : null;

  const centerLabel = active ? active.segment.label : label;
  const centerAmount = active ? active.segment.value : total;
  const description = segments.map((s) => `${s.label} ${Math.round(s.share * 100)}%`).join(', ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="image"
      accessibilityLabel={`${label} ${formatMoney(total)}. ${description}`}
      style={{ width: size, height: size }}
    >
      <Canvas style={{ width: size, height: size }}>
        {/* Static base ring in the card colour: Skia only paints a canvas that has a static layer. */}
        <Circle
          cx={c}
          cy={c}
          r={(outer + inner) / 2}
          style="stroke"
          strokeWidth={outer - inner}
          color={TRACK}
        />
        {segments.length === 1 ? (
          <Ring c={c} outer={outer} inner={inner} segment={segments[0]!} progress={progress} />
        ) : (
          arcs.map((arc) => (
            <Segment
              key={arc.segment.id}
              arc={arc}
              c={c}
              outer={outer}
              inner={inner}
              gapDeg={gapDeg}
              selected={arc.segment.id === selected}
              progress={progress}
            />
          ))
        )}
      </Canvas>

      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
        <Animated.View key={centerLabel} entering={FadeIn.duration(180)} style={styles.centerText}>
          <Text variant="caption" tone="muted" numberOfLines={1} align="center">
            {centerLabel}
          </Text>
          <View style={styles.amountRow}>
            <Text variant="label" tone="muted">
              UGX
            </Text>
            <Text variant="amount" numberOfLines={1} adjustsFontSizeToFit style={styles.amount}>
              {formatAmount(centerAmount, 'UGX')}
            </Text>
          </View>
        </Animated.View>
      </View>

      {active && pillAt ? (
        <Animated.View
          key={active.segment.id}
          pointerEvents="none"
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(120)}
          style={[styles.pill, { left: pillAt.x - PILL_W / 2, top: pillAt.y - PILL_H / 2 }]}
        >
          <Text variant="micro" tone="inverse">
            {Math.round(active.segment.share * 100)}%
          </Text>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

interface SegmentProps {
  arc: Arc;
  c: number;
  outer: number;
  inner: number;
  gapDeg: number;
  selected: boolean;
  progress: SharedValue<number>;
}

function Segment({ arc, c, outer, inner, gapDeg, selected, progress }: SegmentProps) {
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.set(withTiming(selected ? POP : 0, { duration: 220, easing: Easing.out(Easing.cubic) }));
  }, [selected, lift]);

  const { from, to } = arc;
  // Rounded corners: the sector is drawn CORNER smaller on every side, then stroked with round
  // joins at twice that width, which grows it back to full size with rounded corners.
  const path = useDerivedValue(() => {
    const p = progress.get();
    const o = outer + lift.get() - CORNER;
    const i = inner + CORNER;
    const inset = ((CORNER / ((o + i) / 2)) * 180) / Math.PI;
    const sweep = Math.max(0, (to - from) * p - gapDeg - inset * 2);
    return sector(c, o, i, START + from * p + gapDeg / 2 + inset, sweep);
  });

  if (arc.segment.other) {
    const hatch = (
      <LinearGradient
        start={vec(0, 0)}
        end={vec(5, 5)}
        mode="repeat"
        colors={[HATCH_BASE, HATCH_BASE, HATCH_STRIPE, HATCH_STRIPE]}
        positions={[0, 0.5, 0.5, 1]}
      />
    );
    return (
      <Group>
        <Path path={path}>{hatch}</Path>
        <Path path={path} style="stroke" strokeWidth={CORNER * 2} strokeJoin="round">
          {hatch}
        </Path>
      </Group>
    );
  }
  const color = paletteColor(arc.segment.color);
  return (
    <Group>
      <Path path={path} color={color} />
      <Path path={path} color={color} style="stroke" strokeWidth={CORNER * 2} strokeJoin="round" />
    </Group>
  );
}

/** A single category fills the whole ring: no gaps or corners. */
function Ring({
  c,
  outer,
  inner,
  segment,
  progress,
}: {
  c: number;
  outer: number;
  inner: number;
  segment: DonutSegment;
  progress: SharedValue<number>;
}) {
  const mid = (outer + inner) / 2;
  const width = outer - inner;
  const ring = useDerivedValue(() => {
    const builder = Skia.PathBuilder.Make();
    const sweep = 359.99 * progress.get();
    if (sweep > 0.05) {
      builder.addArc(Skia.XYWHRect(c - mid, c - mid, mid * 2, mid * 2), START, sweep);
    }
    return builder.detach();
  });
  return (
    <Path
      path={ring}
      style="stroke"
      strokeWidth={width}
      strokeCap="butt"
      color={segment.other ? HATCH_STRIPE : paletteColor(segment.color)}
    />
  );
}

const PILL_W = 46;
const PILL_H = 26;

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  centerText: { maxWidth: '52%', alignItems: 'center', gap: 2 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs + 2 },
  amount: { fontSize: 24, lineHeight: 30, flexShrink: 1 },
  pill: {
    position: 'absolute',
    width: PILL_W,
    height: PILL_H,
    borderRadius: radius.pill,
    backgroundColor: lightColors.insightBar,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(17,17,17,0.24)',
  },
});
