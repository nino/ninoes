import React from "react";
import { DailyViewsChart } from "~/components/DailyViewsChart";
import { Skeleton } from "~/components/ui/Skeleton";
import { focusRing } from "~/components/ui/styles";
import { Table, type TableColumnDef } from "~/components/ui/Table";
import {
   useBlogDailyViews,
   useBlogTopPages,
   useBlogTopReferrers,
} from "~/hooks/useSupabase";
import type { BlogTopPage, BlogTopReferrer } from "~/model/types";
import { requireUser } from "~/server/guards.server";
import {
   RANGE_OPTIONS,
   type RangeDays,
   rangeEndingToday,
   summarise,
} from "~/utils/blog-stats";
import type { Route } from "./+types/blog-stats";

// Page views for ninoan.com, recorded by the blog's log shipper into
// analytics.page_views. The report functions only return data to Nino's account,
// so anyone else who signs in sees an empty page.

export function meta({}: Route.MetaArgs): ReturnType<Route.MetaFunction> {
   return [{ title: "ninoan.com stats" }];
}

export const loader = async ({ request }: Route.LoaderArgs): Promise<null> => {
   await requireUser(request);
   return null;
};

const linkStyles = `underline decoration-border underline-offset-2 hover:decoration-fg ${focusRing}`;

const pageColumns: Array<TableColumnDef<BlogTopPage>> = [
   {
      accessorKey: "path",
      header: "Page",
      cell: ({ row }) => (
         <a
            href={`https://ninoan.com${row.original.path}`}
            target="_blank"
            rel="noopener noreferrer"
            className={linkStyles}
         >
            {row.original.path}
         </a>
      ),
   },
   {
      accessorKey: "views",
      header: "Views",
      cell: ({ row }) => row.original.views.toLocaleString(),
   },
   {
      accessorKey: "visitor_days",
      header: "Visitors",
      cell: ({ row }) => row.original.visitor_days.toLocaleString(),
   },
];

const referrerColumns: Array<TableColumnDef<BlogTopReferrer>> = [
   {
      accessorKey: "referrer_host",
      header: "Site",
      cell: ({ row }) => (
         <a
            href={`https://${row.original.referrer_host}`}
            target="_blank"
            rel="noopener noreferrer"
            className={linkStyles}
         >
            {row.original.referrer_host}
         </a>
      ),
   },
   {
      accessorKey: "views",
      header: "Views",
      cell: ({ row }) => row.original.views.toLocaleString(),
   },
   {
      accessorKey: "visitor_days",
      header: "Visitors",
      cell: ({ row }) => row.original.visitor_days.toLocaleString(),
   },
];

function RangePicker({
   value,
   onChange,
}: {
   value: RangeDays;
   onChange: (days: RangeDays) => void;
}): React.ReactNode {
   const chipStyles = (selected: boolean): string =>
      `h-8 rounded-full border px-3 text-sm font-medium transition-colors ${focusRing} ${
         selected
            ? "border-primary bg-primary text-primary-fg"
            : "border-border bg-card text-muted-fg shadow-xs hover:bg-muted hover:text-fg"
      }`;

   return (
      <div role="group" aria-label="Date range" className="flex flex-wrap gap-2">
         {RANGE_OPTIONS.map((days) => (
            <button
               key={days}
               type="button"
               className={chipStyles(days === value)}
               aria-pressed={days === value}
               onClick={() => onChange(days)}
            >
               {days} days
            </button>
         ))}
      </div>
   );
}

function Stat({ label, value }: { label: string; value: string }): React.ReactNode {
   return (
      <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-xs">
         <div className="text-sm text-muted-fg">{label}</div>
         <div className="font-title text-3xl tabular-nums">{value}</div>
      </div>
   );
}

export default function BlogStats(): React.ReactNode {
   const [days, setDays] = React.useState<RangeDays>(30);
   const range = React.useMemo(() => rangeEndingToday(days), [days]);

   const daily = useBlogDailyViews(range);
   const pages = useBlogTopPages(range);
   const referrers = useBlogTopReferrers(range);

   const [pageSorting, setPageSorting] = React.useState([{ id: "views", desc: true }]);
   const [referrerSorting, setReferrerSorting] = React.useState([
      { id: "views", desc: true },
   ]);

   const summary = React.useMemo(() => summarise(daily.data ?? []), [daily.data]);

   return (
      <div className="space-y-8">
         <div className="space-y-2">
            <h1 className="font-title text-3xl">ninoan.com stats</h1>
            <p className="text-muted-fg">
               Page views from browsers, recorded since 17 October 2026. Days are in UTC.
            </p>
         </div>

         <RangePicker value={days} onChange={setDays} />

         {daily.isError || pages.isError || referrers.isError ? (
            <p className="text-muted-fg">Couldn&rsquo;t load the stats.</p>
         ) : (
            <>
               {daily.isPending ? (
                  <div role="status" className="space-y-4">
                     <span className="sr-only">Loading</span>
                     <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-20" />
                        <Skeleton className="h-20" />
                     </div>
                     <Skeleton className="h-[220px]" />
                  </div>
               ) : (
                  <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <Stat
                           label="Page views"
                           value={summary.views.toLocaleString()}
                        />
                        <Stat
                           label="Visitors per day"
                           value={summary.averageDailyVisitors.toLocaleString(
                              undefined,
                              { maximumFractionDigits: 1 },
                           )}
                        />
                     </div>
                     {summary.views === 0 ? (
                        <p className="text-muted-fg">No page views in this range yet.</p>
                     ) : (
                        <DailyViewsChart days={daily.data} />
                     )}
                  </div>
               )}

               <div className="grid gap-8 lg:grid-cols-2">
                  <section className="space-y-3">
                     <h2 className="font-title text-xl">Pages</h2>
                     {!pages.isPending && pages.data.length === 0 ? (
                        <p className="text-muted-fg">No pages viewed in this range.</p>
                     ) : (
                        <Table
                           data={pages.data ?? []}
                           columns={pageColumns}
                           sorting={pageSorting}
                           setSorting={setPageSorting}
                           isLoading={pages.isPending}
                        />
                     )}
                  </section>
                  <section className="space-y-3">
                     <h2 className="font-title text-xl">Referring sites</h2>
                     {!referrers.isPending && referrers.data.length === 0 ? (
                        <p className="text-muted-fg">
                           No visits from other sites in this range.
                        </p>
                     ) : (
                        <Table
                           data={referrers.data ?? []}
                           columns={referrerColumns}
                           sorting={referrerSorting}
                           setSorting={setReferrerSorting}
                           isLoading={referrers.isPending}
                        />
                     )}
                  </section>
               </div>

               <p className="text-sm text-faint-fg">
                  In the tables, visitors are counted once per day: someone who comes
                  back on three days counts three times. Most sites only send their
                  domain, so referrers are sites rather than individual links.
               </p>
            </>
         )}
      </div>
   );
}
