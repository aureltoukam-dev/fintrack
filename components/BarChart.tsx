import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { G, Rect, Text as SvgText, Line } from 'react-native-svg';
import { useTheme } from '../constants/theme';

interface BarChartProps {
  data: { label: string; income: number; expense: number }[];
  height?: number;
}

const BarChart: React.FC<BarChartProps> = ({ data, height = 180 }) => {
  const C = useTheme();
  const chartHeight = height;
  const screenWidth = Dimensions.get('window').width;
  const horizontalPadding = 48;
  const chartWidth = screenWidth - 64;
  const svgWidth = chartWidth;
  const drawWidth = svgWidth - horizontalPadding;
  const barGroupWidth = data.length > 0 ? drawWidth / data.length : 40;
  const barWidth = Math.min(Math.max(barGroupWidth * 0.3, 6), 20);
  const gridLineCount = 4;
  const drawHeight = chartHeight - 40;

  const maxValue = useMemo(() => {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.flatMap(d => [d.income, d.expense]), 1);
  }, [data]);

  const hasData = data.some(d => d.income > 0 || d.expense > 0);

  const gridLines = Array.from({ length: gridLineCount }, (_, i) => {
    const y = drawHeight * (1 - (i + 1) / (gridLineCount + 1));
    const value = Math.round(maxValue * (i + 1) / (gridLineCount + 1));
    const label = value >= 1000 ? `${Math.round(value / 1000)}k` : String(value);
    return (
      <G key={`grid-${i}`}>
        <Line
          x1={horizontalPadding.toString()}
          y1={y.toString()}
          x2={svgWidth.toString()}
          y2={y.toString()}
          stroke={C.surface3}
          strokeDasharray="4,4"
          strokeWidth="1"
        />
        <SvgText
          x={(horizontalPadding - 4).toString()}
          y={(y + 4).toString()}
          fill={C.text2}
          fontSize="9"
          textAnchor="end"
        >
          {label}
        </SvgText>
      </G>
    );
  });

  const bars = data.map((item, index) => {
    const groupCenterX = horizontalPadding + barGroupWidth * index + barGroupWidth / 2;
    const incomH = (item.income / maxValue) * drawHeight;
    const expensH = (item.expense / maxValue) * drawHeight;
    const gap = barWidth * 0.3;

    return (
      <G key={index}>
        <Rect
          x={(groupCenterX - gap / 2 - barWidth).toString()}
          y={(drawHeight - incomH).toString()}
          width={barWidth.toString()}
          height={Math.max(incomH, 0).toString()}
          fill={C.accent2}
          rx="3"
          ry="3"
        />
        <Rect
          x={(groupCenterX + gap / 2).toString()}
          y={(drawHeight - expensH).toString()}
          width={barWidth.toString()}
          height={Math.max(expensH, 0).toString()}
          fill={C.accent}
          rx="3"
          ry="3"
        />
        <SvgText
          x={groupCenterX.toString()}
          y={(drawHeight + 16).toString()}
          fill={C.text2}
          fontSize="9"
          textAnchor="middle"
          fontWeight="bold"
        >
          {item.label}
        </SvgText>
      </G>
    );
  });

  const styles = useMemo(() => StyleSheet.create({
    container: { backgroundColor: C.surface, borderRadius: 12, overflow: 'hidden', position: 'relative', paddingBottom: 8 },
    legendContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 8, gap: 16 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 12, fontFamily: 'Sora-Regular', color: C.text },
    noDataOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: C.overlay, borderRadius: 12 },
    noDataText: { color: C.text, fontSize: 14, fontWeight: '600' },
  }), [C]);

  return (
    <View style={styles.container}>
      <Svg height={chartHeight} width={svgWidth} viewBox={`0 0 ${svgWidth} ${chartHeight}`}>
        <G transform="translate(0, 10)">
          {gridLines}
          {bars}
        </G>
      </Svg>
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: C.accent2 }]} />
          <Text style={styles.legendText}>Revenus</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: C.accent }]} />
          <Text style={styles.legendText}>Dépenses</Text>
        </View>
      </View>
      {!hasData && (
        <View style={styles.noDataOverlay}>
          <Text style={styles.noDataText}>Aucune donnée</Text>
        </View>
      )}
    </View>
  );
};

export default BarChart;
