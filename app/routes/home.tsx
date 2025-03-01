import type { Route } from "./+types/home";
import { NamesRanking } from "~/NamesRanking";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Names Names Names!" },
    { name: "description", content: "Names Names Names!" },
  ];
}

export default function Home() {
  return <NamesRanking />;
}
