import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
   index("routes/home.tsx"),
   route("/wtf", "routes/wtf.tsx"),
   route("/vote", "routes/vote.tsx"),
   route("/votes", "routes/votes.tsx"),
   route("/leaderboard", "routes/leaderboard.tsx"),
   route("/elo", "routes/elo.tsx"),
   route("/teams", "routes/teams.tsx"),
   route("/data", "routes/data.tsx"),
   route("/login", "routes/login.tsx"),
   route("/logout", "routes/logout.tsx"),
   route("/control", "routes/control.tsx"),
] satisfies RouteConfig;
