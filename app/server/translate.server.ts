import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { getAnthropic } from "./anthropic.server";

const TranslationSchema = z.object({
   language: z
      .enum(["en", "de"])
      .describe("The language the wish was written in. Pick the closer one if unsure."),
   title: z.string().describe("The title in the other language."),
   description: z
      .string()
      .nullable()
      .describe("The description in the other language, or null if there was none."),
});
export type Translation = z.infer<typeof TranslationSchema>;

const system = `You translate entries on a wedding gift wishlist between English and German.

You get one entry as JSON with a title and an optional description. Work out whether it is written in English or German, then translate it into the other language.

- Keep brand names, product names, model numbers, sizes and prices as they are.
- Write English with British spelling and vocabulary.
- Match the register of the original: short and plain, the way a guest or the couple would write it.
- If something has no sensible translation (a proper name, for example), keep it unchanged.
- Translate only. Don't add, explain or leave out anything.`;

export async function translateWish(wish: {
   title: string;
   description: string | null;
}): Promise<Translation> {
   const response = await getAnthropic().beta.messages.parse({
      model: "claude-sonnet-5-5",
      max_tokens: 16000,
      // If the model declines, the API retries on a fallback model in the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(TranslationSchema) },
      system,
      messages: [
         {
            role: "user",
            content: JSON.stringify({
               title: wish.title,
               description: wish.description,
            }),
         },
      ],
   });

   if (response.stop_reason === "refusal") {
      throw new Error(
         `Translation refused (${response.stop_details?.category ?? "unknown"})`,
      );
   }
   if (response.parsed_output == null) {
      throw new Error(`Translation returned no usable output (${response.stop_reason})`);
   }
   return response.parsed_output;
}
