import React from "react";
import { useLoaderData } from "react-router";
import { DailyViewsChart, DailyViewsChartSkeleton } from "~/components/DailyViewsChart";
import { Skeleton } from "~/components/ui/Skeleton";
import { cardClass, chipClass, focusRing } from "~/components/ui/styles";
import { Table, type TableColumnDef } from "~/components/ui/Table";
import {
   useBlogDailyViews,
   useBlogTopPages,
   useBlogTopReferrers,
} from "~/hooks/useSupabase";
import { useUtcToday } from "~/hooks/useUtcToday";
import type { BlogTopPage, BlogTopReferrer } from "~/model/types";
import { requireUser } from "~/server/guards.server";
import {
   BLOG_TOP_ROWS,
   formatDay,
   RANGE_OPTIONS,
   type RangeDays,
   rangeEndingOn,
   RECORDING_STARTED,
   summarise,
} from "~/utils/blog-stats";
import type { Route } from "./+types/blog-stats";

// Page views for ninoan.com, recorded by the blog's log shipper into
// analytics.page_views. The report functions only return data to Nino's account,
// so anyone else who signs in sees an empty page.

export function meta({}: Route.MetaArgs): ReturnType<Route.MetaFunction> {
   return [{ title: "ninoan.com stats" }];
}

export const loader = async ({
   request,
}: Route.LoaderArgs): Promise<{ userId: string }> => {
   const { user } = await requireUser(request);
   return { userId: user.id };
};

/** The Views and Visitors columns both tables share. */
function countColumns<T extends { views: number; visitor_days: number }>(): Array<
   TableColumnDef<T>
> {
   return [
      {
         id: "views",
         header: "Views",
         enableSorting: false,
         accessorFn: (row) => row.views,
         cell: ({ row }) => row.original.views.toLocaleString(),
      },
      {
         id: "visitors",
         header: "Visitors",
         enableSorting: false,
         accessorFn: (row) => row.visitor_days,
         cell: ({ row }) => row.original.visitor_days.toLocaleString(),
      },
   ];
}

// Not sortable: the database returns the top rows by views, so sorting by
// anything else would only reorder those.
const pageColumns: Array<TableColumnDef<BlogTopPage>> = [
   {
      accessorKey: "path",
      header: "Page",
      enableSorting: false,
      cell: ({ row }) => (
         <a
            href={`https://ninoan.com${row.original.path}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline decoration-border underline-offset-2 hover:decoration-fg ${focusRing}`}
         >
            {row.original.path}
         </a>
      ),
   },
   ...countColumns<BlogTopPage>(),
];

// Plain text rather than links: anyone can send a Referer header, and spammers
// do, hoping for a link back.
const referrerColumns: Array<TableColumnDef<BlogTopReferrer>> = [
   { accessorKey: "referrer_host", header: "Site", enableSorting: false },
   ...countColumns<BlogTopReferrer>(),
];

function RangePicker({
   value,
   onChange,
}: {
   value: RangeDays;
   onChange: (days: RangeDays) => void;
}): React.ReactNode {
   return (
      <div role="group" aria-label="Date range" className="flex flex-wrap gap-2">
         {RANGE_OPTIONS.map((days) => (
            <button
               key={days}
               type="button"
               className={chipClass(days === value)}
               aria-pressed={days === value}
               onClick={() => onChange(days)}
            >
               {days} days
            </button>
         ))}
      </div>
   );
}

function Stat({
   label,
   value,
   note,
}: {
   label: string;
   value: string;
   note?: string;
}): React.ReactNode {
   return (
      <div className={`${cardClass} px-4 py-3`}>
         <div className="text-sm text-muted-fg">{label}</div>
         <div className="font-title text-3xl tabular-nums">{value}</div>
         {note && <div className="text-xs text-faint-fg">{note}</div>}
      </div>
   );
}

export default function BlogStats(): React.ReactNode {
   const { userId } = useLoaderData<typeof loader>();
   const today = useUtcToday();
   const [days, setDays] = React.useState<RangeDays>(30);
   const range = React.useMemo(() => rangeEndingOn(today, days), [today, days]);

   const daily = useBlogDailyViews(userId, range);
   const pages = useBlogTopPages(userId, range);
   const referrers = useBlogTopReferrers(userId, range);

   const summary = React.useMemo(
      () => summarise(daily.data ?? [], today),
      [daily.data, today],
   );
   // While a new range loads, the previous one stays on screen, dimmed.
   const updating =
      daily.isPlaceholderData || pages.isPlaceholderData || referrers.isPlaceholderData;

   return (
      <div className="space-y-8">
         <div className="space-y-2">
            <h1 className="font-title text-3xl">ninoan.com stats</h1>
            <p className="text-muted-fg">
               Page views from browsers, recorded since{" "}
               {formatDay(RECORDING_STARTED, { withYear: true })}. Days are in UTC.
            </p>
         </div>

         <RangePicker value={days} onChange={setDays} />

         {daily.isError || pages.isError || referrers.isError ? (
            <p className="text-muted-fg">Couldn&rsquo;t load the stats.</p>
         ) : (
            <div
               aria-busy={updating}
               className={`space-y-8 transition-opacity ${updating ? "opacity-60" : ""}`}
            >
               {daily.isPending ? (
                  <div role="status" className="space-y-4">
                     <span className="sr-only">Loading</span>
                     <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-24" />
                        <Skeleton className="h-24" />
                     </div>
                     <DailyViewsChartSkeleton />
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
                           note="Average over complete days"
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
                     <div>
                        <h2 className="font-title text-xl">Top pages</h2>
                        <p className="text-sm text-muted-fg">
                           The {BLOG_TOP_ROWS} with the most views.
                        </p>
                     </div>
                     {!pages.isPending && pages.data.length === 0 ? (
                        <p className="text-muted-fg">No pages viewed in this range.</p>
                     ) : (
                        <Table
                           data={pages.data ?? []}
                           columns={pageColumns}
                           isLoading={pages.isPending}
                        />
                     )}
                  </section>
                  <section className="space-y-3">
                     <div>
                        <h2 className="font-title text-xl">Top referring sites</h2>
                        <p className="text-sm text-muted-fg">
                           The {BLOG_TOP_ROWS} with the most views.
                        </p>
                     </div>
                     {!referrers.isPending && referrers.data.length === 0 ? (
                        <p className="text-muted-fg">
                           No visits from other sites in this range.
                        </p>
                     ) : (
                        <Table
                           data={referrers.data ?? []}
                           columns={referrerColumns}
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
            </div>
         )}
      </div>
   );
}
