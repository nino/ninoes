import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/wtf", "routes/wtf.tsx"),
  route("/vote", "routes/vote.tsx"),
] satisfies RouteConfig;
