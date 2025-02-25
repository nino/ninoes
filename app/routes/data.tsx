import { Typography } from "antd";
import { useMemo } from "react";
import * as d3 from "d3";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import type { GeoSphere, GeoPermissibleObjects } from "d3-geo";

type Troop = {
  LATP: number;
  LONP: number;
  SURV: number;
  DIR: "A" | "R";
  DIV: number;
};

type Temperature = {
  LONT: number;
  TEMP: number;
  DAYS: number;
  MON: string;
  DAY: number;
};

type LineSegment = {
  points: [Troop, Troop];
  strokeWidth: number;
  color: string;
  division: number;
};

type Dimensions = {
  margin: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  tempHeight: number;
  tempMargin: { top: number; bottom: number };
};

async function fetchTroops(): Promise<Array<Troop>> {
  const troops = await fetch("/troops.csv").then((res) => res.text());
  return parseCsv(troops, {
    LATP: "number",
    LONP: "number",
    SURV: "number",
    DIR: "string",
    DIV: "number",
  }) as unknown as Array<Troop>;
}

async function fetchTemperatures(): Promise<Array<Temperature>> {
  const temperatures = await fetch("/temperatures.csv").then((res) =>
    res.text()
  );
  return parseCsv(temperatures, {
    LONT: "number",
    TEMP: "number",
    DAYS: "number",
    MON: "string",
    DAY: "number",
  }) as unknown as Array<Temperature>;
}

function parseValue(value: string, type: string) {
  if (type === "number") {
    return Number(value);
  }
  return value;
}

function parseCsv(csv: string, schema: Record<string, string>) {
  const lines = csv.split(/[\r\n]+/);
  const headers = lines[0].split(",");

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row: Record<string, unknown> = {};

    headers.forEach((header, index) => {
      row[header] = parseValue(values[index], schema[header]);
    });

    return row;
  });
}

const dimensions: Dimensions = {
  margin: { top: 20, right: 20, bottom: 100, left: 60 },
  width: 800 - 80,
  height: 400 - 120,
  tempHeight: 100,
  tempMargin: { top: 40, bottom: 20 },
};

// Configure projection for the specific region we're interested in
const projection = d3
  .geoOrthographic()
  .scale(4500)
  .rotate([-31, -55.5, 0])
  .translate([dimensions.width / 2, dimensions.height / 2])
  .clipAngle(90);

// Create graticules with specific lines for our region of interest
const graticule = d3
  .geoGraticule()
  .stepMinor([0.5, 0.5])
  .stepMajor([1, 1])
  .extentMajor([
    [24, 54],
    [38, 56],
  ]);

const pathGenerator = d3.geoPath(projection);

const strokeScale = d3.scaleLinear().range([0, 40]);

const tempXScale = d3
  .scaleLinear()
  .domain([24, 37.6])
  .range([0, dimensions.width]);

const tempYScale = d3
  .scaleLinear()
  .domain([-30, 0])
  .range([dimensions.tempHeight, 0])
  .nice();

function TroopPath({
  points,
  strokeWidth,
  color,
}: Omit<LineSegment, "division">) {
  const lineGenerator = d3
    .line<Troop>()
    .x((d) => {
      const p = projection([d.LONP, d.LATP]);
      return p ? p[0] : 0;
    })
    .y((d) => {
      const p = projection([d.LONP, d.LATP]);
      return p ? p[1] : 0;
    });
  const d = lineGenerator(points) || "";

  return (
    <path
      d={d}
      fill="none"
      strokeLinecap="round"
      stroke={color}
      strokeWidth={strokeWidth}
    />
  );
}

function TroopPoint({ troop }: { troop: Troop }) {
  const [x, y] = projection([troop.LONP, troop.LATP]) || [0, 0];
  return (
    <circle
      cx={x}
      cy={y}
      r={1}
      fill={troop.DIR === "A" ? "#D4B996" : "#000000"}
    />
  );
}

function TemperatureLine({
  temperatures,
}: {
  temperatures: Array<Temperature>;
}) {
  const d = useMemo(() => {
    const tempLine = d3
      .line<Temperature>()
      .x((d) => tempXScale(d.LONT))
      .y((d) => tempYScale(d.TEMP));
    return tempLine(temperatures) || "";
  }, [temperatures]);

  return <path d={d} fill="none" stroke="black" strokeWidth={1.5} />;
}

function TemperaturePoint({ temperature }: { temperature: Temperature }) {
  return (
    <circle
      cx={tempXScale(temperature.LONT)}
      cy={tempYScale(temperature.TEMP)}
      r={3}
      fill="black"
    />
  );
}

function XAxis({
  scale,
  transform,
}: {
  scale: d3.ScaleLinear<number, number>;
  transform?: string;
}) {
  const ref = React.useRef<SVGGElement>(null);

  React.useEffect(() => {
    if (ref.current) {
      // Create geographic ticks
      const ticks = d3.range(24, 38, 2);
      const axis = d3
        .axisBottom(scale)
        .tickValues(ticks)
        .tickFormat((d) => `${d}°E`);
      d3.select(ref.current).call(axis);
    }
  }, [scale]);

  return <g ref={ref} transform={transform} />;
}

function YAxis({
  scale,
  transform,
  tickFormat,
  tickValues,
}: {
  scale: d3.ScaleLinear<number, number>;
  transform?: string;
  tickFormat?: (domainValue: d3.NumberValue, index: number) => string;
  tickValues?: Array<number>;
}) {
  const ref = React.useRef<SVGGElement>(null);

  React.useEffect(() => {
    if (ref.current) {
      // Create geographic ticks
      const ticks = d3.range(50, 60, 2);
      const axis = d3
        .axisLeft(scale)
        .tickValues(tickValues || ticks)
        .tickFormat(tickFormat || ((d) => `${d}°N`));
      d3.select(ref.current).call(axis);
    }
  }, [scale, tickFormat, tickValues]);

  return <g ref={ref} transform={transform} />;
}

function GeoBackground() {
  const sphere: GeoSphere = { type: "Sphere" };
  const graticulePath = graticule() as GeoPermissibleObjects;
  const graticuleMajor = graticule.lines() as Array<GeoPermissibleObjects>;
  const graticuleOutline = graticule.outline() as GeoPermissibleObjects;

  return (
    <>
      <path
        d={pathGenerator(sphere) || ""}
        fill="#f0f0f0"
        stroke="#000"
        strokeWidth={0.5}
      />
      <path
        d={pathGenerator(graticulePath) || ""}
        fill="none"
        stroke="#ddd"
        strokeWidth={0.2}
      />
      {graticuleMajor.map((line, i) => (
        <path
          key={i}
          d={pathGenerator(line) || ""}
          fill="none"
          stroke="#999"
          strokeWidth={0.5}
        />
      ))}
      <path
        d={pathGenerator(graticuleOutline) || ""}
        fill="none"
        stroke="#ddd"
        strokeWidth={1}
      />
      {/* Add latitude labels */}
      {[50, 52, 54, 56, 58, 60].map((lat) => {
        const [x, y] = projection([24, lat]) || [0, 0];
        return (
          <text
            key={lat}
            x={x - 5}
            y={y}
            style={{ fontSize: "10px", textAnchor: "end" }}
          >
            {lat}°N
          </text>
        );
      })}
      {/* Add longitude labels */}
      {[24, 26, 28, 30, 32, 34, 36, 38].map((lon) => {
        const [x, y] = projection([lon, 50]) || [0, 0];
        return (
          <text
            key={lon}
            x={x}
            y={y + 15}
            style={{ fontSize: "10px", textAnchor: "middle" }}
          >
            {lon}°E
          </text>
        );
      })}
    </>
  );
}

export default function Data() {
  const troopsQuery = useQuery({
    queryKey: ["troops"],
    queryFn: fetchTroops,
  });

  const temperaturesQuery = useQuery({
    queryKey: ["temperatures"],
    queryFn: fetchTemperatures,
  });

  const temperatures = temperaturesQuery.data ?? [];

  const { lineSegments, points } = useMemo(() => {
    const troops = troopsQuery.data ?? [];
    // Update stroke scale based on data
    strokeScale.domain([0, d3.max(troops, (d) => d.SURV) || 340000]);

    const divisionGroups = d3.group(troops, (d) => d.DIV);
    const segments: Array<LineSegment> = [];
    const pts: Array<Troop> = [];

    for (const [divisionNumber, divisionTroops] of divisionGroups) {
      pts.push(...divisionTroops);

      for (let i = 0; i < divisionTroops.length - 1; i++) {
        const d = divisionTroops[i];
        const currentWidth = strokeScale(d.SURV);
        const prevWidth = strokeScale(divisionTroops[i + 1].SURV);

        segments.push({
          points: [divisionTroops[i + 1], d],
          strokeWidth: (currentWidth + prevWidth) / 2,
          color: d.DIR === "A" ? "#D4B996" : "#000000",
          division: divisionNumber,
        });
      }
    }

    return { lineSegments: segments, points: pts };
  }, [troopsQuery.data]);

  const totalHeight =
    dimensions.height +
    dimensions.margin.top +
    dimensions.margin.bottom +
    dimensions.tempHeight +
    dimensions.tempMargin.top +
    dimensions.tempMargin.bottom;

  return (
    <main>
      <Typography.Title level={1}>Data</Typography.Title>
      <svg
        width={
          dimensions.width + dimensions.margin.left + dimensions.margin.right
        }
        height={totalHeight}
      >
        <g
          transform={`translate(${dimensions.margin.left},${dimensions.margin.top})`}
        >
          {/* Main plot */}
          <GeoBackground />
          {lineSegments.map((segment, i) => (
            <TroopPath key={i} {...segment} />
          ))}
          {points.map((point, i) => (
            <TroopPoint key={i} troop={point} />
          ))}

          {/* Temperature subplot */}
          <g
            transform={`translate(0,${
              dimensions.height + dimensions.tempMargin.top
            })`}
          >
            <TemperatureLine temperatures={temperatures} />
            {temperatures.map((temp, i) => (
              <TemperaturePoint key={i} temperature={temp} />
            ))}
            <XAxis
              scale={tempXScale}
              transform={`translate(0,${dimensions.tempHeight})`}
            />
            <YAxis
              scale={tempYScale}
              tickFormat={(d) => `${Number(d)}°C`}
              tickValues={[-30, -25, -20, -15, -10, -5, 0]}
            />
            <text
              transform="rotate(-90)"
              y={-45}
              x={-dimensions.tempHeight / 2}
              style={{
                fontSize: "12px",
                textAnchor: "middle",
              }}
            >
              Temperature (°C)
            </text>
            <text
              x={dimensions.width / 2}
              y={dimensions.tempHeight + 35}
              style={{
                fontSize: "12px",
                textAnchor: "middle",
              }}
            >
              Longitude
            </text>
          </g>
        </g>
      </svg>
    </main>
  );
}
