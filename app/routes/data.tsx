import { Typography } from "antd";
import { useMemo } from "react";
import * as d3 from "d3";
import { useQuery } from "@tanstack/react-query";

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

function TroopPath({
  points,
  strokeWidth,
  color,
}: Omit<LineSegment, "division">) {
  const lineGenerator = d3
    .line<Troop>()
    .x((d) => xScale(d.LONP))
    .y((d) => yScale(d.LATP));
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
  return (
    <circle
      cx={xScale(troop.LATP)}
      cy={yScale(troop.LONP)}
      r={5}
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
  const ticks = scale.ticks();
  return (
    <g transform={transform}>
      <line x1={0} x2={dimensions.width} y1={0} y2={0} stroke="black" />
      {ticks.map((tick) => (
        <g key={tick} transform={`translate(${scale(tick)},0)`}>
          <line y2={6} stroke="black" />
          <text
            style={{
              fontSize: "10px",
              textAnchor: "middle",
              transform: "translateY(20px)",
            }}
          >
            {tick}
          </text>
        </g>
      ))}
    </g>
  );
}

function YAxis({
  scale,
  transform,
  tickFormat,
  height,
  tickValues,
}: {
  scale: d3.ScaleLinear<number, number>;
  transform?: string;
  tickFormat?: (d: number) => string;
  height: number;
  tickValues?: Array<number>;
}) {
  const ticks = tickValues ?? scale.ticks(5);
  return (
    <g transform={transform}>
      <line y1={0} y2={height} x1={0} x2={0} stroke="black" />
      {ticks.map((tick) => (
        <g key={tick} transform={`translate(0,${scale(tick)})`}>
          <line x2={-6} stroke="black" />
          <text
            style={{
              fontSize: "10px",
              textAnchor: "end",
              transform: "translateX(-10px)",
              alignmentBaseline: "middle",
            }}
          >
            {tickFormat ? tickFormat(tick) : tick}
          </text>
        </g>
      ))}
    </g>
  );
}

const dimensions: Dimensions = {
  margin: { top: 20, right: 20, bottom: 100, left: 60 },
  width: 800 - 80,
  height: 400 - 120,
  tempHeight: 100,
  tempMargin: { top: 40, bottom: 20 },
};

const xScale = d3.scaleLinear().range([0, dimensions.width]);
const yScale = d3.scaleLinear().range([dimensions.height, 0]).nice();
const strokeScale = d3.scaleLinear().range([0, 50]);
const tempXScale = d3
  .scaleLinear()
  .domain([24, 37.6])
  .range([0, dimensions.width]);
const tempYScale = d3
  .scaleLinear()
  .domain([-30, 0])
  .range([dimensions.tempHeight, 0])
  .nice();

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
    // Update scales based on data
    xScale.domain(d3.extent(troops, (d) => d.LONP) as [number, number]);
    yScale.domain(d3.extent(troops, (d) => d.LATP) as [number, number]);
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
          {lineSegments.map((segment, i) => (
            <TroopPath key={i} {...segment} />
          ))}
          {points.map((point, i) => (
            <TroopPoint key={i} troop={point} />
          ))}
          <XAxis
            scale={xScale}
            transform={`translate(0,${dimensions.height})`}
          />
          <YAxis
            scale={yScale.nice()}
            height={dimensions.height}
            tickValues={yScale.nice().ticks(10)}
          />

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
              height={dimensions.tempHeight}
              tickFormat={(d) => `${d}°C`}
              tickValues={tempYScale.ticks(5)}
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
