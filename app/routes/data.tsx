import { Typography } from "antd";
import { useEffect } from "react";
import * as d3 from "d3";
import { useQuery } from "@tanstack/react-query";

type Troop = {
  LATP: number;
  LONP: number;
  SURV: number;
  DIR: "A" | "R";
  DIV: number;
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

export default function Data() {
  const troopsQuery = useQuery({
    queryKey: ["troops"],
    queryFn: fetchTroops,
  });

  const troops = troopsQuery.data ?? [];

  useEffect(() => {
    // Clear any existing SVG
    d3.select("#d3-container").selectAll("*").remove();

    // Set up dimensions
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create SVG container
    const svg = d3
      .select("#d3-container")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(troops, (d) => d.LONP) as [number, number])
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain(d3.extent(troops, (d) => d.LATP) as [number, number])
      .range([height, 0]);

    const strokeScale = d3
      .scaleLinear()
      .domain([0, d3.max(troops, (d) => d.SURV) || 340000])
      .range([0, 50]); // min and max stroke width in pixels

    // Create line generator for the specific data shape
    const lineGenerator = d3
      .line<Troop>()
      .x((d) => xScale(d.LONP))
      .y((d) => yScale(d.LATP));

    // Remove previous line segments if they exist
    svg.selectAll(".data-line-segment").remove();

    // Group troops by division
    const divisionGroups = d3.group(troops, (d) => d.DIV);

    // Create line segments with varying stroke widths, grouped by division
    for (const [divisionNumber, divisionTroops] of divisionGroups) {
      for (let i = 0; i < divisionTroops.length - 1; i++) {
        const d = divisionTroops[i];
        const currentWidth = strokeScale(d.SURV);
        const prevWidth = strokeScale(divisionTroops[i + 1].SURV);

        svg
          .append("path")
          .attr("class", `data-line-segment div-${divisionNumber}`)
          .attr("fill", "none")
          .attr("stroke-linecap", "round")
          .attr("stroke", d.DIR === "A" ? "#D4B996" : "#000000")
          .attr("stroke-width", (currentWidth + prevWidth) / 2)
          .attr("d", lineGenerator([divisionTroops[i + 1], d]));
      }

      // Add data points for this division
      svg
        .selectAll(`circle.div-${divisionNumber}`)
        .data(divisionTroops)
        .join("circle")
        .attr("class", `div-${divisionNumber}`)
        .attr("cx", (d) => xScale(d.LATP))
        .attr("cy", (d) => yScale(d.LONP))
        .attr("R", 5)
        .attr("fill", (d) => (d.DIR === "A" ? "#D4B996" : "#000000"));
    }
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.append("g").attr("transform", `translate(0,${height})`).call(xAxis);
    svg.append("g").call(yAxis);
  });

  return (
    <main>
      <Typography.Title level={1}>Data</Typography.Title>
      <div id="d3-container" />
    </main>
  );
}
