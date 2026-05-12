import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface DonutChartProps {
  data: { categoryId: string; label: string; icon: string; amount: number; color: string }[];
  total: number;
  currencySymbol?: string;
}

const DonutChart: React.FC<DonutChartProps> = ({ data, total, currencySymbol = '' }) => {
  const size = 220;
  const radius = size / 2;
  const innerRadius = radius * 0.55;
  const strokeWidth = radius - innerRadius;
  const cx = size / 2;
  const cy = size / 2;
  const backgroundColor = '#1A1A24';
  const textColor = '#FFFFFF';
  const labelColor = '#888899';

  const [animValues] = useState<Animated.Value[]>([]);
  const [pathData, setPathData] = useState<{ path: string; color: string; categoryId: string; label: string; icon: string; percentage: number; animVal: Animated.Value }[]>([]);

  const maxSegments = 5;
  const processedData = data.slice(0, maxSegments);
  const otherAmount = data.slice(maxSegments).reduce((s, i) => s + i.amount, 0);
  const finalData = [
    ...processedData,
    ...(otherAmount > 0 ? [{ categoryId: 'other', label: 'Autres', icon: '…', amount: otherAmount, color: '#9896B0' }] : []),
  ].filter(d => d.amount > 0);

  const hasData = finalData.length > 0 && total > 0;

  const arcPath = (startAngle: number, endAngle: number): string => {
    const toRad = (a: number) => (a - 90) * (Math.PI / 180);
    const sR = toRad(startAngle);
    const eR = toRad(endAngle);
    const sx = cx + radius * Math.cos(sR);
    const sy = cy + radius * Math.sin(sR);
    const ex = cx + radius * Math.cos(eR);
    const ey = cy + radius * Math.sin(eR);
    const isx = cx + innerRadius * Math.cos(sR);
    const isy = cy + innerRadius * Math.sin(sR);
    const iex = cx + innerRadius * Math.cos(eR);
    const iey = cy + innerRadius * Math.sin(eR);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${isx} ${isy} L ${sx} ${sy} A ${radius} ${radius} 0 ${large} 1 ${ex} ${ey} L ${iex} ${iey} A ${innerRadius} ${innerRadius} 0 ${large} 0 ${isx} ${isy} Z`;
  };

  useEffect(() => {
    if (!hasData) { setPathData([]); return; }

    let angle = 0;
    const newPaths = finalData.map((item, index) => {
      const pct = (item.amount / total) * 100;
      const sweep = (item.amount / total) * 360;
      const gap = finalData.length > 1 ? 1 : 0;
      const startAngle = angle + gap / 2;
      const endAngle = angle + sweep - gap / 2;
      angle += sweep;
      const anim = animValues[index] ?? new Animated.Value(0);
      if (!animValues[index]) animValues[index] = anim;
      return { path: arcPath(startAngle, endAngle), color: item.color, categoryId: item.categoryId, label: item.label, icon: item.icon, percentage: pct, animVal: anim };
    });
    setPathData(newPaths);

    newPaths.forEach((p, i) => {
      p.animVal.setValue(0);
      Animated.timing(p.animVal, { toValue: 1, duration: 400 + i * 80, useNativeDriver: false }).start();
    });
  }, [data, total, hasData]);

  const formatAmount = (n: number) => n.toLocaleString('fr-FR');

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
        {!hasData ? (
          <SvgText x={(cx).toString()} y={(cy + 5).toString()} textAnchor="middle" fill={labelColor} fontSize="13">
            Aucune dépense
          </SvgText>
        ) : (
          <>
            {pathData.map(p => (
              <AnimatedPath
                key={p.categoryId}
                d={p.path}
                fill={p.color}
                opacity={p.animVal}
                stroke={backgroundColor}
                strokeWidth="2"
              />
            ))}
            <SvgText x={cx.toString()} y={(cy - 8).toString()} textAnchor="middle" fill={textColor} fontSize="15" fontFamily="SpaceMono-Regular">
              {formatAmount(total)}
            </SvgText>
            <SvgText x={cx.toString()} y={(cy + 10).toString()} textAnchor="middle" fill={textColor} fontSize="11" fontFamily="SpaceMono-Regular">
              {currencySymbol}
            </SvgText>
            <SvgText x={cx.toString()} y={(cy + 26).toString()} textAnchor="middle" fill={labelColor} fontSize="10">
              Dépenses
            </SvgText>
          </>
        )}
      </Svg>
      <View style={styles.legend}>
        {pathData.map(p => (
          <View key={p.categoryId} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: p.color }]} />
            <Text style={styles.legendIcon}>{p.icon}</Text>
            <Text style={styles.legendLabel} numberOfLines={1}>{p.label}</Text>
            <Text style={styles.legendPct}>{p.percentage.toFixed(1)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { borderRadius: 12, alignItems: 'center', padding: 16 },
  legend: { width: '100%', marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 6, flexShrink: 0 },
  legendIcon: { fontSize: 14, marginRight: 4, flexShrink: 0 },
  legendLabel: { flex: 1, fontSize: 13, color: '#F0EFF8', fontFamily: 'Sora-Regular' },
  legendPct: { fontSize: 12, color: '#888899', fontFamily: 'SpaceMono-Regular', marginLeft: 4 },
});

export default DonutChart;
