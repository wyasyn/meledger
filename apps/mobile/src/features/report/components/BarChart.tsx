import { formatCompact } from '@meledger/shared';
import {
  DashPathEffect,
  LinearGradient,
  RoundedRect,
  useFont,
  vec,
} from '@shopify/react-native-skia';
import { useState } from 'react';
import { View } from 'react-native';
import { type SharedValue, useAnimatedReaction, useDerivedValue } from 'react-native-reanimated';
import { Bar, CartesianChart, useChartPressState } from 'victory-native';
import { scheduleOnRN } from 'react-native-worklets';

import { lightColors, tint } from '@/theme/tokens';

import type { Bucket } from '../logic';

// Skia draws the axis labels itself, so it loads the font file directly.
const AXIS_FONT = require('@expo-google-fonts/plus-jakarta-sans/500Medium/PlusJakartaSans_500Medium.ttf');

interface BarChartProps {
  data: Bucket[];
  height?: number;
  /** Bar colour (the gradient runs from a lighter tint to it). */
  color?: string;
  /** Called with the bar under the finger while pressing, and null on release. */
  onInspect: (bucket: Bucket | null) => void;
}

/** About this many labels fit under the bars. */
const MAX_LABELS = 7;

/**
 * Daily or weekly totals as rounded bars with a soft vertical gradient, a light dashed grid and
 * compact amounts on the right ("120k"), like the Budget Buddy weekly chart. Press and slide
 * across the bars to read each one; the selected bar darkens.
 */
export function BarChart({
  data,
  height = 200,
  color = lightColors.primary,
  onInspect,
}: BarChartProps) {
  const font = useFont(AXIS_FONT, 11);
  const { state, isActive } = useChartPressState({ x: 0, y: { value: 0 } });
  const [active, setActive] = useState<number | null>(null);

  const setIndex = (index: number) => {
    const next = index >= 0 ? index : null;
    setActive(next);
    onInspect(next !== null ? (data[next] ?? null) : null);
  };

  // Mirror the pressed bar to React for the header readout.
  useAnimatedReaction(
    () => (state.isActive.get() ? state.matchedIndex.get() : -1),
    (index, previous) => {
      if (index === previous) return;
      scheduleOnRN(setIndex, index);
    },
  );

  const step = Math.max(1, Math.ceil(data.length / MAX_LABELS));
  // Plotted by position (0, 1, 2...) so bars and labels are evenly spaced.
  const points = data.map((b, i) => ({ i, value: b.value }));
  const tickValues = points.filter((p) => p.i % step === 0).map((p) => p.i);
  const max = data.reduce((m, b) => Math.max(m, b.value), 0);
  // Narrow bars for a month of days, wider ones for a handful of weeks.
  const barRatio = data.length > 14 ? 0.62 : 0.5;
  /** Wide enough to read, never a slab (a handful of weeks). */
  const MAX_BAR = 34;

  return (
    <View style={{ height }}>
      <CartesianChart
        data={points}
        xKey="i"
        yKeys={['value']}
        domain={{ y: [0, max > 0 ? max : 1] }}
        domainPadding={{ left: 14, right: 14, top: 18 }}
        chartPressState={state}
        chartPressConfig={{ pan: { activateAfterLongPress: 120 } }}
        xAxis={{
          font,
          tickValues,
          formatXLabel: (i) => data[i]?.label ?? '',
          labelColor: lightColors.onSurfaceVariant,
          lineWidth: 0,
          labelOffset: 6,
        }}
        yAxis={[
          {
            font,
            tickCount: 4,
            axisSide: 'right',
            formatYLabel: (y) => formatCompact(Math.round(y)),
            labelColor: lightColors.onSurfaceVariant,
            lineColor: lightColors.outline,
            lineWidth: 1,
            labelOffset: 8,
            linePathEffect: <DashPathEffect intervals={[4, 4]} />,
          },
        ]}
        frame={{ lineWidth: 0 }}
      >
        {({ points, chartBounds }) => (
          <>
            <Bar
              points={points.value}
              chartBounds={chartBounds}
              barWidth={Math.min(
                MAX_BAR,
                ((chartBounds.right - chartBounds.left) / Math.max(1, data.length)) * barRatio,
              )}
              roundedCorners={{ topLeft: 5, topRight: 5, bottomLeft: 2, bottomRight: 2 }}
              animate={{ type: 'timing', duration: 450 }}
              opacity={isActive ? 0.45 : 1}
            >
              <LinearGradient
                start={vec(0, chartBounds.top)}
                end={vec(0, chartBounds.bottom)}
                colors={[color, tint(color, 0.55)]}
              />
            </Bar>
            {isActive && active !== null ? (
              <ActiveBar
                x={state.x.position}
                y={state.y.value.position}
                bottom={chartBounds.bottom}
                width={Math.min(
                  MAX_BAR,
                  ((chartBounds.right - chartBounds.left) / Math.max(1, data.length)) * barRatio,
                )}
                color={color}
              />
            ) : null}
          </>
        )}
      </CartesianChart>
    </View>
  );
}

function ActiveBar({
  x,
  y,
  bottom,
  width,
  color,
}: {
  x: SharedValue<number>;
  y: SharedValue<number>;
  bottom: number;
  width: number;
  color: string;
}) {
  const left = useDerivedValue(() => x.get() - width / 2);
  const top = useDerivedValue(() => Math.min(y.get(), bottom - 2));
  const h = useDerivedValue(() => Math.max(2, bottom - top.get()));
  return <RoundedRect x={left} y={top} width={width} height={h} r={5} color={color} />;
}
