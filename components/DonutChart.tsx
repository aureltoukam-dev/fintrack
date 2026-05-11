import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Text, Animated } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

interface DonutChartProps {
  data: { categoryId: string; label: string; icon: string; amount: number; color: string }[];
  total: number;
  currencySymbol?: string;
}

const DonutChart: React.FC<DonutChartProps> = ({ data, total }) => {
  const containerWidth = 300; // Fixed width for the container
  const svgSize = containerWidth * 0.8; // SVG will be smaller than container
  const radius = svgSize / 2;
  const innerRadius = radius * 0.45;
  const strokeWidth = radius - innerRadius;
  const centerX = svgSize / 2;
  const centerY = svgSize / 2;
  const backgroundColor = '#1A1A24';
  const textColor = '#FFFFFF';
  const labelColor = '#888899';
  const noDataText = 'Aucune dépense sur cette période';

  const [animatedPaths, setAnimatedPaths] = useState<Animated.Value[]>([]);
  const [pathData, setPathData] = useState<any[]>([]);

  const maxSegments = 5;

  const processedData = data
    .slice(0, maxSegments)
    .map(item => ({
      ...item,
      percentage: total > 0 ? (item.amount / total) * 100 : 0,
    }));

  const otherAmount = data.slice(maxSegments).reduce((sum, item) => sum + item.amount, 0);
  const otherPercentage = total > 0 ? (otherAmount / total) * 100 : 0;

  const finalData = [
    ...processedData,
    ...(otherAmount > 0 ? [{
      categoryId: 'other',
      label: 'Autres',
      icon: '?', // Placeholder icon for 'other'
      amount: otherAmount,
      color: '#CCCCCC', // Default color for 'other'
      percentage: otherPercentage,
    }] : []),
  ];

  const hasData = finalData.length > 0 && finalData.some(d => d.amount > 0);

  const calculatePath = (startAngle: number, endAngle: number, animatedValue: Animated.Value) => {
    const startRad = startAngle * (Math.PI / 180);
    const endRad = endAngle * (Math.PI / 180);

    const startX = centerX + radius * Math.cos(startRad);
    const startY = centerY + radius * Math.sin(startRad);
    const endX = centerX + radius * Math.cos(endRad);
    const endY = centerY + radius * Math.sin(endRad);

    const innerStartX = centerX + innerRadius * Math.cos(startRad);
    const innerStartY = centerY + innerRadius * Math.sin(startRad);
    const innerEndX = centerX + innerRadius * Math.cos(endRad);
    const innerEndY = centerY + innerRadius * Math.sin(endRad);

    const largeArcFlag = endAngle - startAngle > 180 ? '1' : '0';

    // Animated path calculation
    const animatedEndRad = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [startRad, endRad],
    });

    const animatedEndX = animatedEndRad.interpolate({
      inputRange: [startRad, endRad],
      outputRange: [centerX + radius * Math.cos(startRad), centerX + radius * Math.cos(endRad)],
    });
    const animatedEndY = animatedEndRad.interpolate({
      inputRange: [startRad, endRad],
      outputRange: [centerY + radius * Math.sin(startRad), centerY + radius * Math.sin(endRad)],
    });

    const animatedInnerEndX = animatedEndRad.interpolate({
      inputRange: [startRad, endRad],
      outputRange: [centerX + innerRadius * Math.cos(startRad), centerX + innerRadius * Math.cos(endRad)],
    });
    const animatedInnerEndY = animatedEndRad.interpolate({
      inputRange: [startRad, endRad],
      outputRange: [centerY + innerRadius * Math.sin(startRad), centerY + innerRadius * Math.sin(endRad)],
    });

    // This is a simplified approach. For true animated path drawing,
    // you'd need to dynamically update the path string based on the animated value.
    // A common technique is to use a dummy path and animate its length or end point.
    // For this example, we'll animate the opacity or a placeholder.
    // A more robust animation would involve interpolating the path string itself,
    // which is complex. Let's use a simpler animation for demonstration.

    // We'll animate the opacity of the path for a fade-in effect,
    // or use a dummy path and animate its length.
    // For simplicity, let's animate the opacity.

    return `M ${innerStartX} ${innerStartY} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} L ${innerEndX} ${innerEndY} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStartX} ${innerStartY} Z`;
  };

  useEffect(() => {
    if (hasData) {
      const totalAngle = 360;
      let currentAngle = 0;
      const newAnimatedPaths = finalData.map((_, index) => new Animated.Value(0));
      setAnimatedPaths(newAnimatedPaths);

      const segmentAngles = finalData.map(item => (item.amount / total) * totalAngle);

      const newPathData = finalData.map((item, index) => {
        const startAngle = currentAngle;
        const endAngle = currentAngle + segmentAngles[index];
        currentAngle = endAngle;
        return {
          ...item,
          startAngle,
          endAngle,
          path: calculatePath(startAngle, endAngle, newAnimatedPaths[index]),
        };
      });
      setPathData(newPathData);

      // Animate paths on mount
      newAnimatedPaths.forEach((animValue, index) => {
        Animated.timing(animValue, {
          toValue: 1,
          duration: 500 + index * 100, // Stagger animation
          useNativeDriver: false, // Path animation often requires false
        }).start();
      });
    } else {
      setAnimatedPaths([]);
      setPathData([]);
    }
  }, [data, total, hasData]);

  const renderLegendItem = ({ item }: { item: typeof finalData[0] }) => (
    <View style={styles.legendItem}>
      <View style={[styles.legendIcon, { backgroundColor: item.color }]} />
      <Text style={[styles.legendLabel, { color: textColor }]}>{item.label}</Text>
      <Text style={[styles.legendPercentage, { color: labelColor }]}>{item.percentage.toFixed(1)}%</Text>
    </View>
  );

  const renderSvgContent = () => {
    if (!hasData) {
      return (
        <SvgText
          x={centerX.toString()}
          y={(centerY + 10).toString()} // Adjust Y for centering
          textAnchor="middle"
          fill={labelColor}
          fontSize="14"
          fontWeight="bold"
        >
          {noDataText}
        </SvgText>
      );
    }

    const paths = pathData.map((item, index) => {
      // For animation, we'll use a dummy path and animate its opacity or a placeholder.
      // A true animated path requires complex string interpolation.
      // Here, we'll use the calculated path and animate opacity.
      const AnimatedPath = Animated.createAnimatedComponent(Path);
      return (
        <AnimatedPath
          key={item.categoryId}
          d={item.path}
          fill={item.color}
          strokeWidth={strokeWidth}
          stroke={backgroundColor} // Stroke to create the donut effect
          strokeOpacity={animatedPaths[index]?.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          })}
          // For a more accurate path animation, you'd need to dynamically generate 'd'
          // based on the animated value, which is significantly more complex.
          // This opacity animation provides a fade-in effect.
        />
      );
    });

    return (
      <>
        {paths}
        {/* Center Text */}
        <SvgText
          x={centerX.toString()}
          y={(centerY - 10).toString()}
          textAnchor="middle"
          fill={textColor}
          fontSize="20"
          fontFamily="SpaceMono-Regular" // Ensure you have this font available
        >
          {total.toFixed(2)}
        </SvgText>
        <SvgText
          x={centerX.toString()}
          y={(centerY + 15).toString()}
          textAnchor="middle"
          fill={labelColor}
          fontSize="12"
        >
          Dépenses
        </SvgText>
      </>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Svg height={svgSize} width={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
        {renderSvgContent()}
      </Svg>

      <View style={styles.legendContainer}>
        <FlatList
          data={finalData}
          renderItem={renderLegendItem}
          keyExtractor={(item) => item.categoryId}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 300, // Match containerWidth
    height: 400, // Adjust height to accommodate SVG and legend
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  legendContainer: {
    flex: 1,
    width: '100%',
    marginTop: 15,
    paddingLeft: 10, // Add some padding for alignment
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    justifyContent: 'space-between', // Space out icon, label, and percentage
    paddingRight: 10, // Padding for percentage
  },
  legendIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendLabel: {
    fontSize: 14,
    flexShrink: 1, // Allow label to shrink if too long
    marginRight: 5,
  },
  legendPercentage: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default DonutChart;