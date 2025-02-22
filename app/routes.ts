import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/wtf", "routes/wtf.tsx"),
  route("/vote", "routes/vote.tsx"),
  route("/leaderboard", "routes/leaderboard.tsx"),
  route("/teams", "routes/teams.tsx"),
  route("/data", "routes/data.tsx"),
] satisfies RouteConfig;
