import {
   BlogImageError,
   requireNino,
   signUploads,
} from "~/server/blog-images.server";
import { SignRequestSchema } from "~/utils/blog-images";
import type { Route } from "./+types/blog-images-sign";

/**
 * Takes `{ storage, keys }` as JSON and returns a signed PUT URL per key, so
 * the browser can upload the files it encoded straight to B2. Nino only.
 */
export async function action({ request }: Route.ActionArgs): Promise<Response> {
   await requireNino(request);
   const parsed = SignRequestSchema.safeParse(await request.json().catch(() => null));
   if (!parsed.success) {
      return Response.json({ error: "Bad request" }, { status: 400 });
   }
   try {
      const { origin } = new URL(request.url);
      return Response.json(await signUploads(parsed.data, origin), {
         headers: { "Cache-Control": "no-store" },
      });
   } catch (error) {
      if (!(error instanceof BlogImageError)) throw error;
      return Response.json({ error: error.message }, { status: 400 });
   }
}
