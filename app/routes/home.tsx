import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Names Names Names!" },
    { name: "description", content: "Names Names Names!" },
  ];
}

export default function Home() {
  return <Welcome />;
}
