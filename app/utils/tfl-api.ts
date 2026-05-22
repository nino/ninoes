import type { Enum } from "~/model/types";
import { fetchJson } from "./fetch";

const tflApiBaseUrl = "https://api.tfl.gov.uk";

export const busStops = {
   hammersmith: "490007705C",
   ashchurchTerrace: "490003424S",
   shepherdsBush: "490000203C",
   askewRoadToShepherdsBush: "490015455E",
   askewRoadToActonGreen: "490015455W",
   woodLane: "490014874J",
} as const;

export type BusStop = Enum<typeof busStops>;

export const busStopNames: Record<BusStop, string> = {
   [busStops.hammersmith]: "Hammersmith Bus Station",
   [busStops.ashchurchTerrace]: "Ashchurch Terrace Bus Station",
   [busStops.shepherdsBush]: "Shepherds Bush Bus Station",
   [busStops.askewRoadToShepherdsBush]: "Askew Road to Shepherds Bush",
   [busStops.askewRoadToActonGreen]: "Askew Road to Acton Green",
   [busStops.woodLane]: "Wood Lane Bus Station",
};

const linesPerStop = {
   [busStops.hammersmith]: [218, 306],
   [busStops.ashchurchTerrace]: [218, 306],
   [busStops.shepherdsBush]: [237],
   [busStops.askewRoadToShepherdsBush]: [94, 237],
   [busStops.askewRoadToActonGreen]: [94, 237],
   [busStops.woodLane]: [237],
} as const;

export type BusArrival = {
   $type: string;
   id: string;
   operationType: number;
   vehicleId: string;
   naptanId: string;
   stationName: string;
   lineId: string;
   lineName: string;
   platformName: string;
   direction: string;
   bearing: string;
   tripId: string;
   baseVersion: string;
   destinationNaptanId: string;
   destinationName: string;
   timestamp: string;
   timeToStation: number;
   currentLocation: string;
   towards: string;
   expectedArrival: string;
   timeToLive: string;
   modeName: string;
   timing: {
      $type: string;
      countdownServerAdjustment: string;
      source: string;
      insert: string;
      read: string;
      sent: string;
      received: string;
   };
};

export async function getBusArrivals(stopId: BusStop): Promise<Array<BusArrival>> {
   const lines = linesPerStop[stopId];
   console.log(`Getting arrivals for stop ${stopId} and lines ${lines.join(",")}`);
   const arrivals = await fetchJson<Array<BusArrival>>(
      `${tflApiBaseUrl}/Line/${lines.join(",")}/Arrivals/${stopId}`,
   );
   return arrivals;
}
