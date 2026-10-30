import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
   layout("routes/app-layout.tsx", [
      index("routes/home.tsx"),
      route("/vote", "routes/vote.tsx"),
      route("/votes", "routes/votes.tsx"),
      route("/leaderboard", "routes/leaderboard.tsx"),
      route("/banned", "routes/banned.tsx"),
      route("/blog-stats", "routes/blog-stats.tsx"),
      route("/elo", "routes/elo.tsx"),
      route("/teams", "routes/teams.tsx"),
      route("/data", "routes/data.tsx"),
      route("/login", "routes/login.tsx"),
      route("/logout", "routes/logout.tsx"),
      route("/control", "routes/control.tsx"),
      route("/error-test", "routes/error-test.tsx"),
      route("/bus", "routes/bus.tsx"),
      route("/new-name", "routes/new-name.tsx"),
      route("/startrek", "routes/startrek.tsx"),
      route("/startrek.ics", "routes/startrek-ics.ts"),
      route("/calendar", "routes/calendar-ics.ts"),
      route("/last-year", "routes/last-year.ts"),
   ]),
   // Its own header and favicon, outside the app layout.
   route("/wishlist", "routes/wishlist.tsx"),
   route("/wishlist/translate", "routes/wishlist-translate.ts"),
   // PostHog's endpoints, for this site and Nino's other apps.
   route("/relay/*", "routes/relay.ts"),
] satisfies RouteConfig;
