import type { ReactNode } from "react";
import type { Route } from "./+types/home";
import { NamesRanking } from "~/NamesRanking";
import { type LoaderFunctionArgs, useLoaderData } from "react-router";
import { requireUser } from "~/server/guards.server";
import type { User } from "@supabase/supabase-js";

export function meta({}: Route.MetaArgs): ReturnType<Route.MetaFunction> {
   return [
      { title: "Names Names Names!" },
      { name: "description", content: "Names Names Names!" },
   ];
}

export const loader = async ({
   request,
}: LoaderFunctionArgs): Promise<{ user: User }> => {
   const { user } = await requireUser(request);
   return { user };
};

export default function Home(): ReactNode {
   const { user: _ } = useLoaderData<typeof loader>();
   return <NamesRanking />;
}
