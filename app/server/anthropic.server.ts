import Anthropic from "@anthropic-ai/sdk";
import { oidcFederationProvider } from "@anthropic-ai/sdk/lib/credentials/oidc-federation";
import http from "node:http";

// Workload identity federation: on Fly, the machine's own OIDC token is
// exchanged for a short-lived Anthropic token, so the app holds no API key.
// None of these IDs are secrets. The rule only accepts tokens for
// `ninoan:ninoes:*` with this audience, and only grants workspace:inference.
const federation = {
   audience: "anthropic-ninoes",
   federationRuleId: "fdrl_01PKuXyeQUprxjVCHFz1iauS",
   organizationId: "0b45bcd6-9ad0-4f74-ab31-e2763db58d42",
   serviceAccountId: "svac_01TuGC5eoGG3prq8ymTuoQ2m",
};

/**
 * Asks the Fly machine API for a fresh OIDC token. Fly tokens carry a `jti`,
 * which Anthropic accepts only once, so every exchange needs a new one.
 */
function mintFlyIdentityToken(): Promise<string> {
   return new Promise((resolve, reject) => {
      const request = http.request(
         {
            socketPath: "/.fly/api",
            path: "/v1/tokens/oidc",
            method: "POST",
            headers: { "content-type": "application/json" },
         },
         (response) => {
            let body = "";
            response.setEncoding("utf8");
            response.on("data", (chunk: string) => (body += chunk));
            response.on("end", () => {
               if (response.statusCode === 200) resolve(body.trim());
               else
                  reject(
                     new Error(`Fly OIDC token request failed: ${response.statusCode}`),
                  );
            });
         },
      );
      // The machine API is local and answers in milliseconds; don't let a
      // stuck socket hold up every translate request behind it.
      request.setTimeout(10_000, () => {
         request.destroy(new Error("Fly OIDC token request timed out"));
      });
      request.on("error", reject);
      request.end(JSON.stringify({ aud: federation.audience }));
   });
}

let client: Anthropic | undefined;

/** On Fly: federated credentials. Locally: whatever `ant auth login` set up. */
export function getAnthropic(): Anthropic {
   client ??=
      process.env.FLY_APP_NAME == null
         ? new Anthropic()
         : new Anthropic({
              credentials: oidcFederationProvider({
                 identityTokenProvider: mintFlyIdentityToken,
                 federationRuleId: federation.federationRuleId,
                 organizationId: federation.organizationId,
                 serviceAccountId: federation.serviceAccountId,
                 baseURL: "https://api.anthropic.com",
                 fetch: globalThis.fetch,
              }),
           });
   return client;
}
