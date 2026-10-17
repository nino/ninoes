import React from "react";
import * as d3 from "d3";
import type { BlogDailyViews } from "~/model/types";
import { useResizeObserver } from "~/hooks/useResizeObserver";
import { Skeleton } from "~/components/ui/Skeleton";
import { focusRing } from "~/components/ui/styles";
import { formatDay } from "~/utils/blog-stats";

const HEIGHT = 220;
const MARGIN = { top: 12, right: 8, bottom: 28, left: 40 };
/** Room for one date label ("17 Oct") with space either side. */
const LABEL_SPACING = 64;

function plural(count: number, word: string): string {
   return `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;
}

function describe(day: BlogDailyViews): string {
   return `${formatDay(day.day, { withYear: true })}: ${plural(day.views, "view")}, ${plural(day.visitors, "visitor")}`;
}

function Legend(): React.ReactNode {
   return (
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
   );
}

/** Holds the chart's exact space while its data loads. */
export function DailyViewsChartSkeleton(): React.ReactNode {
   return (
      <div className="space-y-2">
         <div style={{ height: HEIGHT }}>
            <Skeleton className="size-full" />
         </div>
         <Skeleton className="h-5 w-64" />
         <Legend />
      </div>
   );
}

/**
 * Views per day as bars, with distinct visitors per day as a line on the same
 * scale. Fills its container's width. Hovering, tapping, or focusing the chart
 * and using the arrow keys shows a day's numbers below it; a visually hidden
 * table gives screen readers all of them.
 */
export function DailyViewsChart({
   days,
}: {
   days: Array<BlogDailyViews>;
}): React.ReactNode {
   const [container, setContainer] = React.useState<HTMLDivElement | null>(null);
   const [width, setWidth] = React.useState(0);
   useResizeObserver(container, (entries) => setWidth(entries[0].contentRect.width));

   // An index into `days`. Switching ranges can leave it past the end, in which
   // case nothing is selected.
   const [active, setActive] = React.useState<number | null>(null);
   const activeDay = active == null ? undefined : days.at(active);

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

   // As many date labels as fit, however narrow the screen.
   const labelCount = Math.max(2, Math.floor(innerWidth / LABEL_SPACING));
   const labelEvery = Math.max(1, Math.ceil(days.length / labelCount));

   const first = days.at(0)?.day;
   const last = days.at(-1)?.day;
   const label =
      first && last
         ? `Views and visitors per day, ${formatDay(first, { withYear: true })} to ${formatDay(last, { withYear: true })}`
         : "Views and visitors per day";

   const onKeyDown = (event: React.KeyboardEvent): void => {
      const lastIndex = days.length - 1;
      const current = activeDay ? (active ?? lastIndex) : lastIndex;
      const next: Record<string, number> = {
         ArrowLeft: Math.max(0, current - 1),
         ArrowRight: Math.min(lastIndex, current + 1),
         Home: 0,
         End: lastIndex,
      };
      if (event.key in next) {
         event.preventDefault();
         setActive(next[event.key]);
      }
   };

   return (
      <div className="space-y-2">
         <div ref={setContainer} style={{ height: HEIGHT }}>
            {width > 0 && (
               <svg
                  width={width}
                  height={HEIGHT}
                  role="img"
                  aria-label={`${label}. Use the arrow keys to step through the days.`}
                  tabIndex={0}
                  className={`rounded-md ${focusRing}`}
                  onKeyDown={onKeyDown}
                  onFocus={() => setActive((current) => current ?? days.length - 1)}
                  onPointerLeave={(event) => {
                     // Touch fires pointerleave right after a tap; keep that selection.
                     if (event.pointerType === "mouse") {
                        setActive(null);
                     }
                  }}
               >
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
                           className={
                              d === activeDay ? "fill-primary" : "fill-primary/60"
                           }
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
                              data-date-label
                           >
                              {formatDay(d.day)}
                           </text>
                        ) : null,
                     )}
                     {/* Full-height targets, so days without views can be picked
                         too. */}
                     {days.map((d, i) => (
                        <rect
                           key={d.day}
                           x={(x(d.day) ?? 0) - (x.step() - x.bandwidth()) / 2}
                           width={x.step()}
                           height={innerHeight}
                           fill="transparent"
                           data-day-target
                           onPointerEnter={() => setActive(i)}
                           onClick={() => setActive(i)}
                        />
                     ))}
                  </g>
               </svg>
            )}
         </div>
         <p aria-live="polite" className="min-h-5 text-sm tabular-nums">
            {activeDay ? (
               describe(activeDay)
            ) : (
               <span className="text-muted-fg">
                  Hover over or tap a day to see its numbers.
               </span>
            )}
         </p>
         <Legend />
         <table className="sr-only">
            <caption>{label}</caption>
            <thead>
               <tr>
                  <th scope="col">Day</th>
                  <th scope="col">Views</th>
                  <th scope="col">Visitors</th>
               </tr>
            </thead>
            <tbody>
               {days.map((d) => (
                  <tr key={d.day}>
                     <th scope="row">{formatDay(d.day, { withYear: true })}</th>
                     <td>{d.views}</td>
                     <td>{d.visitors}</td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
}
