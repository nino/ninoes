// Builds the Stargate half of /startrek. Episode lists and air dates come from
// the TVmaze API, and the episode summaries come from Sonnet 5.5 working from
// memory alone, with no tools and no web access. That is on purpose: the
// summaries should read like a streaming service's confidently wrong blurbs.
//
// Run `bun run stargate` after `ant auth login`, then commit
// app/utils/stargate-data.ts and app/utils/stargate-summaries.ts. Cloud
// sessions can reach neither TVmaze nor the Claude API, so this runs locally.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { z } from "zod";
import type { EpisodeRecord, SeriesData } from "../app/utils/startrek-data";

interface Show {
   id: string;
   shortName: string;
   name: string;
   fullName: string;
   /** What to search TVmaze for. */
   query: string;
}

const shows: Array<Show> = [
   {
      id: "sg1",
      shortName: "SG-1",
      name: "Stargate: SG-1",
      fullName: "Stargate SG-1",
      query: "Stargate SG-1",
   },
   {
      id: "sga",
      shortName: "SGA",
      name: "Stargate: Atlantis",
      fullName: "Stargate Atlantis",
      query: "Stargate Atlantis",
   },
   {
      id: "sgu",
      shortName: "SGU",
      name: "Stargate: Universe",
      fullName: "Stargate Universe",
      query: "Stargate Universe",
   },
];

const delayYears = 45;

const TvmazeShow = z.object({
   id: z.number(),
   name: z.string(),
   premiered: z.string().nullable(),
});
const TvmazeEpisode = z.object({
   season: z.number(),
   number: z.number().nullable(),
   name: z.string(),
   airdate: z.string(),
   type: z.string(),
});

async function getJson(url: string): Promise<unknown> {
   const response = await fetch(url);
   if (!response.ok) throw new Error(`${url}: ${response.status}`);
   return response.json();
}

async function fetchSeasons(show: Show): Promise<Array<Array<EpisodeRecord>>> {
   const found = TvmazeShow.parse(
      await getJson(
         `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(show.query)}`,
      ),
   );
   console.log(
      `${show.fullName}: TVmaze show ${found.id} "${found.name}" (${found.premiered})`,
   );
   const episodes = z
      .array(TvmazeEpisode)
      .parse(await getJson(`https://api.tvmaze.com/shows/${found.id}/episodes`))
      .filter((episode) => episode.type === "regular" && episode.airdate !== "");

   const seasons = new Map<number, Array<EpisodeRecord>>();
   for (const episode of episodes) {
      const season = seasons.get(episode.season) ?? [];
      season.push([episode.airdate, episode.name]);
      seasons.set(episode.season, season);
   }
   const ordered = [...seasons.entries()]
      .toSorted(([a], [b]) => a - b)
      .map(([, season]) => season);

   const titles = ordered.flat().map(([, title]) => title);
   const repeated = titles.filter((title, index) => titles.indexOf(title) !== index);
   if (repeated.length > 0) {
      // Summaries are keyed by title, so repeats would share one.
      console.warn(`  Repeated titles in ${show.fullName}: ${repeated.join(", ")}`);
   }
   console.log(`  ${ordered.length} seasons, ${titles.length} episodes`);
   return ordered;
}

const system = `You write episode descriptions for a TV listings page, entirely from memory. You have no internet access and nothing to look anything up with.

For each episode you are given, write a plot summary of one to three sentences in plain, simple English, like the blurb a streaming service shows under an episode.

- Be specific: name the characters, planets, aliens and ships, and say what actually happens.
- If you don't remember an episode well, write your best recollection of it anyway, stated plainly. Don't hedge ("I believe", "possibly", "likely"), don't say you are unsure, and don't fall back on vague filler.
- Write one summary for every episode, in the order given.`;

const SeasonSummaries = z.object({
   summaries: z
      .array(
         z.object({
            title: z.string().describe("The episode title, exactly as given."),
            summary: z.string().describe("One to three sentences on what happens."),
         }),
      )
      .describe("One entry per episode, in the order given."),
});

const client = new Anthropic();

async function summariseSeason(
   show: Show,
   seasonNumber: number,
   season: Array<EpisodeRecord>,
): Promise<Record<string, string>> {
   const list = season
      .map(
         ([airDate, title], index) =>
            `${index + 1}. "${title}" (first aired ${airDate})`,
      )
      .join("\n");
   const response = await client.beta.messages.parse({
      model: "claude-sonnet-5-5",
      max_tokens: 16000,
      output_config: { effort: "low", format: betaZodOutputFormat(SeasonSummaries) },
      system,
      messages: [
         {
            role: "user",
            content: `${show.fullName}, season ${seasonNumber}:\n\n${list}`,
         },
      ],
   });
   const summaries = response.parsed_output?.summaries;
   if (summaries?.length !== season.length) {
      throw new Error(
         `${show.fullName} season ${seasonNumber}: expected ${season.length} summaries, got ${summaries?.length ?? response.stop_reason}`,
      );
   }
   // Match by position: the model may tidy a title's punctuation.
   return Object.fromEntries(
      season.map(([, title], index) => [title, summaries[index].summary]),
   );
}

const data: Array<SeriesData> = [];
const summaries: Record<string, Record<string, string>> = {};

for (const show of shows) {
   const seasons = await fetchSeasons(show);
   data.push({
      id: show.id,
      shortName: show.shortName,
      name: show.name,
      fullName: show.fullName,
      delayYears,
      seasons,
   });
   const perSeason = await Promise.all(
      seasons.map((season, index) => summariseSeason(show, index + 1, season)),
   );
   summaries[show.id] = Object.assign({}, ...perSeason);
   console.log(`  Summarised ${Object.keys(summaries[show.id]).length} episodes`);
}

const dataFile = "app/utils/stargate-data.ts";
const summariesFile = "app/utils/stargate-summaries.ts";

await writeFile(
   dataFile,
   `/**
 * Original broadcast dates for the Stargate series on /startrek, grouped by
 * season. Generated by \`bun run stargate\` (scripts/stargate.ts) from the TVmaze
 * API; edit the script rather than this file.
 */
import type { SeriesData } from "./startrek-data";

export const stargateSeries: Array<SeriesData> = ${JSON.stringify(data, null, 3)};
`,
);

await writeFile(
   summariesFile,
   `/**
 * Episode summaries for the Stargate series on /startrek, keyed by series id
 * and then by episode title. Generated by \`bun run stargate\`
 * (scripts/stargate.ts): Sonnet 5.5 wrote them from memory with no way to look
 * anything up, so many details are wrong. That is the point.
 */
export const stargateSummaries: Record<string, Record<string, string>> = ${JSON.stringify(summaries, null, 3)};
`,
);

spawnSync("bunx", ["prettier", "--write", dataFile, summariesFile], {
   stdio: "inherit",
});
console.log(`Wrote ${dataFile} and ${summariesFile}`);
