import React from "react";
import * as d3 from "d3";
import type { BlogDailyViews } from "~/model/types";
import { useResizeObserver } from "~/hooks/useResizeObserver";
import { formatDay } from "~/utils/blog-stats";

const HEIGHT = 220;
const MARGIN = { top: 12, right: 8, bottom: 28, left: 40 };

function plural(count: number, word: string): string {
   return `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * Views per day as bars, with distinct visitors per day as a line on the same
 * scale. Fills its container's width.
 */
export function DailyViewsChart({
   days,
}: {
   days: Array<BlogDailyViews>;
}): React.ReactNode {
   const [container, setContainer] = React.useState<HTMLDivElement | null>(null);
   const [width, setWidth] = React.useState(0);
   useResizeObserver(container, (entries) => setWidth(entries[0].contentRect.width));

   const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
   const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

   const x = d3
      .scaleBand<string>()
      .domain(days.map((d) => d.day))
      .range([0, innerWidth])
      .padding(days.length > 60 ? 0.1 : 0.25);
   const centre = (day: string): number => (x(day) ?? 0) + x.bandwidth() / 2;

   // A floor of 4 keeps a quiet week from drawing one view as a full-height bar.
   const maxViews = d3.max(days, (d) => d.views) ?? 0;
   const y = d3
      .scaleLinear()
      .domain([0, Math.max(maxViews, 4)])
      .range([innerHeight, 0])
      .nice();
   const yTicks = y.ticks(4).filter(Number.isInteger);

   const visitorsPath =
      d3
         .line<BlogDailyViews>()
         .x((d) => centre(d.day))
         .y((d) => y(d.visitors))(days) ?? "";

   // About six date labels, whatever the range.
   const labelEvery = Math.max(1, Math.ceil(days.length / 6));

   const first = days.at(0)?.day;
   const last = days.at(-1)?.day;
   const label =
      first && last
         ? `Views and visitors per day, ${formatDay(first, { withYear: true })} to ${formatDay(last, { withYear: true })}`
         : "Views and visitors per day";

   return (
      <div className="space-y-2">
         <div ref={setContainer} style={{ height: HEIGHT }}>
            {width > 0 && (
               <svg width={width} height={HEIGHT} role="img" aria-label={label}>
                  <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
                     {yTicks.map((tick) => (
                        <g key={tick} transform={`translate(0,${y(tick)})`}>
                           <line x2={innerWidth} className="stroke-border" />
                           <text
                              x={-8}
                              dy="0.32em"
                              textAnchor="end"
                              className="fill-muted-fg text-xs"
                           >
                              {tick.toLocaleString()}
                           </text>
                        </g>
                     ))}
                     {days.map((d) => (
                        <rect
                           key={d.day}
                           x={x(d.day)}
                           y={y(d.views)}
                           width={x.bandwidth()}
                           height={innerHeight - y(d.views)}
                           className="fill-primary/60"
                        />
                     ))}
                     <path
                        d={visitorsPath}
                        fill="none"
                        className="stroke-ring"
                        strokeWidth={2}
                        strokeLinejoin="round"
                     />
                     {days.map((d, i) =>
                        i % labelEvery === 0 ? (
                           <text
                              key={d.day}
                              x={centre(d.day)}
                              y={innerHeight + 18}
                              textAnchor="middle"
                              className="fill-muted-fg text-xs"
                           >
                              {formatDay(d.day)}
                           </text>
                        ) : null,
                     )}
                     {/* Full-height hover targets, so days without views get a
                         tooltip too. */}
                     {days.map((d) => (
                        <rect
                           key={d.day}
                           x={(x(d.day) ?? 0) - (x.step() - x.bandwidth()) / 2}
                           width={x.step()}
                           height={innerHeight}
                           fill="transparent"
                        >
                           <title>
                              {`${formatDay(d.day, { withYear: true })}: ${plural(d.views, "view")}, ${plural(d.visitors, "visitor")}`}
                           </title>
                        </rect>
                     ))}
                  </g>
               </svg>
            )}
         </div>
         <div className="flex gap-4 text-sm text-muted-fg">
            <span className="flex items-center gap-1.5">
               <span aria-hidden className="size-3 rounded-sm bg-primary/60" />
               Views
            </span>
            <span className="flex items-center gap-1.5">
               <span aria-hidden className="h-0.5 w-4 rounded-full bg-ring" />
               Visitors
            </span>
         </div>
      </div>
   );
}
