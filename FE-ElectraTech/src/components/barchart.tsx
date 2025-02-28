import React, { useRef, useEffect, useState } from "react";
import { select, scaleBand, scaleLinear, axisBottom, axisLeft } from "d3";

interface BarChartProps {
  data: number[];
  width?: number;
  height?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  thresholdValue?: number;
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  width = 640,
  height = 400,
  marginTop = 20,
  marginRight = 20,
  marginBottom = 30,
  marginLeft = 40,
  thresholdValue,
}) => {
  const [chartSize, setChartSize] = useState({ width, height });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const gx = useRef<SVGGElement>(null);
  const gy = useRef<SVGGElement>(null);

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const x = scaleBand()
    .domain(daysOfWeek)
    .range([marginLeft, chartSize.width - marginRight])
    .padding(0.1);

  const y = scaleLinear()
    .domain([0, Math.max(...data, thresholdValue || 0)]) // Thêm thresholdValue vào domain
    .range([chartSize.height - marginBottom, marginTop]);

  useEffect(() => {
    if (gx.current) select(gx.current).call(axisBottom(x));
  }, [gx, x]);

  useEffect(() => {
    if (gy.current) select(gy.current).call(axisLeft(y));
  }, [gy, y]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      const containerWidth = chartContainerRef.current?.clientWidth || 0;
      const containerHeight = chartContainerRef.current?.clientHeight || 0;

      setChartSize({
        width: containerWidth,
        height: containerHeight,
      });
    });

    resizeObserver.observe(chartContainerRef.current as Element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={chartContainerRef} style={{ width: "90%", height: "80%" }}>
      <svg width={chartSize.width} height={chartSize.height}>
        <g
          transform={`translate(0,${chartSize.height - marginBottom})`}
          ref={gx}
        />
        <g fill="steelblue">
          {data.map((d, i) => (
            <g
              key={i}
              transform={`translate(${x(daysOfWeek[i])},0)`}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <rect
                y={y(d)}
                width={x.bandwidth()}
                height={chartSize.height - marginBottom - y(d)}
                fill={hoveredIndex === i ? "#2396EF" : "#E8F3FC"}
              />
              <text
                x={x.bandwidth() / 2}
                y={y(d) - 5}
                textAnchor="middle"
                fill={hoveredIndex === i ? "#2396EF" : "white"}
              >
                {d}
              </text>
            </g>
          ))}
          {thresholdValue && (
            <line
              x1={marginLeft}
              x2={chartSize.width - marginRight}
              y1={y(thresholdValue)}
              y2={y(thresholdValue)}
              stroke="red"
              strokeWidth={2}
            />
          )}
        </g>
      </svg>
    </div>
  );
};

export default BarChart;
