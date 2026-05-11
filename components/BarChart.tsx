import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';

interface BarChartProps {
  data: { month: string; income: number; expense: number }[];
  height?: number;
}

const BarChart: React.FC<BarChartProps> = ({ data, height = 180 }) => {
  const chartHeight = height;
  const chartWidth = 300; // Fixed width for simplicity, adjust as needed
  const barWidth = 15;
  const groupSpacing = 30;
  const legendHeight = 40;
  const gridLineCount = 3;
  const backgroundColor = '#1A1A24';
  const cornerRadius = 12;
  const incomeColor = '#4ECDC4';
  const expenseColor = '#7C6FFF';
  const gridLineColor = '#2A2A3A';
  const textColor = '#FFFFFF';
  const labelColor = '#888899';

  const monthLabels: { [key: string]: string } = {
    'January': 'JAN',
    'February': 'FÉV',
    'March': 'MAR',
    'April': 'AVR',
    'May': 'MAI',
    'June': 'JUN',
    'July': 'JUL',
    'August': 'AOÛ',
    'September': 'SEP',
    'October': 'OCT',
    'November': 'NOV',
    'December': 'DÉC',
  };

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const months = data.map(d => monthLabels[d.month] || d.month.substring(0, 3).toUpperCase());
    const allValues = data.flatMap(d => [d.income, d.expense]);
    const maxValue = Math.max(...allValues, 1); // Ensure maxValue is at least 1 to avoid division by zero

    return data.map((item, index) => ({
      month: months[index],
      income: item.income,
      expense: item.expense,
      normalizedIncome: (item.income / maxValue) * (chartHeight - 50), // -50 for padding and labels
      normalizedExpense: (item.expense / maxValue) * (chartHeight - 50),
    }));
  }, [data, chartHeight]);

  const hasData = processedData.some(d => d.income > 0 || d.expense > 0);

  const gridLines = Array.from({ length: gridLineCount }).map((_, i) => {
    const y = (chartHeight - 50) * (1 - (i + 1) / (gridLineCount + 1));
    return (
      <Line
        key={`grid-${i}`}
        x1="0"
        y1={y.toString()}
        x2={chartWidth.toString()}
        y2={y.toString()}
        stroke={gridLineColor}
        strokeDasharray="4,4"
      />
    );
  });

  const bars = processedData.map((item, index) => {
    const x = index * groupSpacing + groupSpacing / 2;
    const barGroupHeight = chartHeight - 50;

    return (
      <React.Fragment key={index}>
        {/* Income Bar */}
        <Rect
          x={(x - barWidth / 2).toString()}
          y={(barGroupHeight - item.normalizedIncome).toString()}
          width={barWidth.toString()}
          height={item.normalizedIncome.toString()}
          fill={incomeColor}
          rx="4"
          ry="4"
        />
        {/* Expense Bar */}
        <Rect
          x={(x + barWidth / 2).toString()}
          y={(barGroupHeight - item.normalizedExpense).toString()}
          width={barWidth.toString()}
          height={item.normalizedExpense.toString()}
          fill={expenseColor}
          rx="4"
          ry="4"
        />
        {/* Month Label */}
        <SvgText
          x={x.toString()}
          y={(chartHeight - 15).toString()}
          fill={labelColor}
          fontSize="12"
          textAnchor="middle"
          fontWeight="bold"
        >
          {item.month}
        </SvgText>
      </React.Fragment>
    );
  });

  return (
    <View style={[styles.container, { height: chartHeight + legendHeight, backgroundColor }]}>
      <Svg height={chartHeight} width={chartWidth} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        {/* Background with rounded corners */}
        <Rect
          x="0"
          y="0"
          width={chartWidth.toString()}
          height={chartHeight.toString()}
          fill={backgroundColor}
          rx={cornerRadius.toString()}
          ry={cornerRadius.toString()}
        />

        {/* Grid Lines */}
        <g transform="translate(20, 20)"> {/* Padding for grid */}
          {gridLines}
          {bars}
        </g>

        {/* Y-axis labels (optional, for reference) */}
        <SvgText x="5" y="25" fill={labelColor} fontSize="10">MAX</SvgText>
        <SvgText x="5" y={(chartHeight - 35).toString()} fill={labelColor} fontSize="10">0</SvgText>
      </Svg>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: incomeColor }]} />
          <Text style={[styles.legendText, { color: textColor }]}>Revenus</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: expenseColor }]} />
          <Text style={[styles.legendText, { color: textColor }]}>Dépenses</Text>
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

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20, // Space for Y-axis labels
    paddingBottom: 20, // Space for X-axis labels
    paddingHorizontal: 20, // Horizontal padding for bars
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
  },
  noDataOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 36, 0.8)', // Slightly transparent background
    borderRadius: 12,
  },
  noDataText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BarChart;