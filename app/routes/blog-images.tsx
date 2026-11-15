import React, { type ReactNode } from "react";
import { redirect, useLoaderData } from "react-router";
import { toast } from "sonner";
import { Button } from "~/components/ui/Button";
import { cardClass, chipClass, focusRing, inputClass } from "~/components/ui/styles";
import { useEventListener } from "~/hooks/useEventListener";
import {
   getViewer,
   localStorageAvailable,
   missingB2Config,
} from "~/server/blog-images.server";
import {
   type BlogImage,
   buildSnippet,
   DEFAULT_DISPLAY_WIDTH,
   formatBytes,
} from "~/utils/blog-images";
import type { Route } from "./+types/blog-images";

// Drop a photo, get a responsive <picture> snippet to paste into a ninoan.com
// post. The browser encodes it (app/utils/blog-image-encoder.client.ts) and uploads
// the files straight to B2 with URLs the server signs. Nino only.

export function meta({}: Route.MetaArgs): ReturnType<Route.MetaFunction> {
   return [{ title: "Blog images" }];
}

export async function loader({ request }: Route.LoaderArgs): Promise<{
   allowed: boolean;
   missingB2: Array<string>;
   localAvailable: boolean;
}> {
   const viewer = await getViewer(request);
   if (viewer.kind === "signed-out") throw redirect("/login");
   const allowed = viewer.kind === "nino";
   return {
      allowed,
      missingB2: allowed ? missingB2Config() : [],
      localAvailable: localStorageAvailable,
   };
}

interface Settings {
   displayWidth: number;
   linkFull: boolean;
   lazy: boolean;
   keepLocal: boolean;
}

interface Item {
   id: number;
   fileName: string;
   previewUrl: string | undefined;
   status: string;
   fraction: number | undefined;
   error: string | undefined;
   image: BlogImage | undefined;
   alt: string;
}

const isImageFile = (file: File): boolean =>
   file.type.startsWith("image/") || /\.(heic|heif|avif)$/i.test(file.name);

/** Encodes one file in the browser and uploads the results. */
async function upload(
   file: File,
   storage: "b2" | "local",
   update: (patch: Partial<Item>) => void,
): Promise<void> {
   update({ status: "Starting…" });
   try {
      // Loaded on first use: it starts Web Workers and WebAssembly encoders.
      // The SSR check lets the server build leave it (and the codecs) out.
      const { encodeAndUpload } = import.meta.env.SSR
         ? await Promise.reject(new Error("Only runs in the browser"))
         : await import("~/utils/blog-image-encoder.client");
      const image = await encodeAndUpload(file, storage, ({ message, fraction }) =>
         update({ status: message, fraction }),
      );
      update({ image, status: "", fraction: undefined });
   } catch (error) {
      update({
         error: error instanceof Error ? error.message : String(error),
         fraction: undefined,
      });
   }
}

export default function BlogImages(): ReactNode {
   const { allowed, missingB2, localAvailable } = useLoaderData<typeof loader>();
   const canUpload = missingB2.length === 0;
   const canStore = canUpload || localAvailable;
   const canDrop = allowed && canStore;
   const [settings, setSettings] = React.useState<Settings>({
      displayWidth: DEFAULT_DISPLAY_WIDTH,
      linkFull: true,
      lazy: true,
      keepLocal: !canUpload,
   });
   const [items, setItems] = React.useState<Array<Item>>([]);
   const [dragging, setDragging] = React.useState(false);
   const dragDepth = React.useRef(0);
   const nextId = React.useRef(0);
   // One at a time, so encodes don't fight over the CPU.
   const queue = React.useRef<Promise<void>>(Promise.resolve());

   const updateItem = (id: number, patch: Partial<Item>): void =>
      setItems((current) =>
         current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );

   const addFiles = (files: Iterable<File>): void => {
      if (!canDrop) return;
      const storage = settings.keepLocal || !canUpload ? "local" : "b2";
      const added: Array<Item> = [];
      for (const file of files) {
         if (!isImageFile(file)) continue;
         const item: Item = {
            id: nextId.current++,
            fileName: file.name,
            previewUrl: URL.createObjectURL(file),
            status: "Waiting…",
            fraction: undefined,
            error: undefined,
            image: undefined,
            alt: "",
         };
         added.push(item);
         queue.current = queue.current.then(() =>
            upload(file, storage, (patch) => updateItem(item.id, patch)),
         );
      }
      setItems((current) => [...added.toReversed(), ...current]);
   };

   useEventListener("dragenter", (event) => {
      event.preventDefault();
      dragDepth.current++;
      setDragging(true);
   });
   useEventListener("dragleave", () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
   });
   useEventListener("dragover", (event) => event.preventDefault());
   useEventListener("drop", (event) => {
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      addFiles(event.dataTransfer?.files ?? []);
   });
   useEventListener("paste", (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
         return;
      }
      const files = [...(event.clipboardData?.files ?? [])];
      if (files.length > 0) {
         event.preventDefault();
         addFiles(files);
      }
   });

   const toggle = (key: "linkFull" | "lazy" | "keepLocal", label: string): ReactNode => (
      <button
         type="button"
         className={chipClass(settings[key])}
         aria-pressed={settings[key]}
         disabled={key === "keepLocal" && (!canUpload || !localAvailable)}
         onClick={() => setSettings((s) => ({ ...s, [key]: !s[key] }))}
      >
         {label}
      </button>
   );

   return (
      <div className="space-y-8">
         <div className="space-y-2">
            <h1 className="font-title text-3xl">Blog images</h1>
            <p className="text-muted-fg">
               Drop a photo to get AVIF, WebP and JPEG at several widths, plus an HDR
               AVIF for HDR photos, and a snippet to paste into a post. Encoding
               happens in this browser; the files go straight to B2.
            </p>
         </div>

         {!allowed && (
            <p className={`${cardClass} p-5`} role="alert">
               Only Nino can upload images here.
            </p>
         )}

         {allowed && !canUpload && (
            <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-fg">
               B2 isn&rsquo;t set up ({missingB2.join(", ")} missing)
               {localAvailable
                  ? ", so files are kept on this machine. Set them in .env and restart the dev server."
                  : ". Set them as Fly secrets."}
            </p>
         )}

         <label
            htmlFor="blog-image-picker"
            aria-disabled={!canDrop}
            className={`flex min-h-44 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${focusRing} ${
               canDrop ? "cursor-pointer" : "pointer-events-none opacity-50"
            } ${dragging && canDrop ? "border-primary bg-primary/10" : "border-border bg-card"}`}
         >
            <span className="text-lg font-semibold">Drop photos here</span>
            <span className="text-sm text-muted-fg">
               or click to choose, or paste with &#8984;V
            </span>
         </label>
         <input
            id="blog-image-picker"
            type="file"
            disabled={!canDrop}
            accept="image/*,.heic,.heif"
            multiple
            hidden
            onChange={(event) => {
               addFiles(event.currentTarget.files ?? []);
               event.currentTarget.value = "";
            }}
         />

         <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <label
               className="flex items-center gap-2 whitespace-nowrap"
               title="The widest the post ever shows the image, in CSS pixels"
            >
               Shown at most
               <input
                  type="number"
                  min={100}
                  step={10}
                  value={Number.isFinite(settings.displayWidth) ? settings.displayWidth : ""}
                  onChange={(event) =>
                     setSettings((s) => ({
                        ...s,
                        displayWidth: event.currentTarget.valueAsNumber,
                     }))
                  }
                  className={`h-8 w-24 ${inputClass}`}
               />
               px wide
            </label>
            <div className="flex flex-wrap gap-2">
               {toggle("linkFull", "Link to full size")}
               {toggle("lazy", "Lazy load")}
               {localAvailable && toggle("keepLocal", "Keep files locally")}
            </div>
         </div>

         <div className="space-y-4">
            {items.map((item) => (
               <ImageCard
                  key={item.id}
                  item={item}
                  settings={settings}
                  onAltChange={(alt) => updateItem(item.id, { alt })}
               />
            ))}
         </div>
      </div>
   );
}

function ImageCard({
   item,
   settings,
   onAltChange,
}: {
   item: Item;
   settings: Settings;
   onAltChange: (alt: string) => void;
}): ReactNode {
   const { image } = item;
   const displayWidth = Number.isFinite(settings.displayWidth)
      ? settings.displayWidth
      : DEFAULT_DISPLAY_WIDTH;
   const snippet =
      image &&
      buildSnippet(image, {
         alt: item.alt.trim(),
         displayWidth,
         linkFull: settings.linkFull,
         lazy: settings.lazy,
      });

   const copy = async (): Promise<void> => {
      if (snippet == null) return;
      try {
         await navigator.clipboard.writeText(snippet);
         toast.success(item.alt.trim() === "" ? "Copied, without alt text" : "Copied");
      } catch {
         toast.error("Couldn’t copy. Select the snippet and press ⌘C.");
      }
   };

   return (
      <article className={`${cardClass} grid gap-5 p-5 sm:grid-cols-[14rem_1fr]`}>
         <div className="self-start overflow-hidden rounded-lg bg-muted">
            {snippet == null ? (
               item.previewUrl != null && (
                  <img
                     src={item.previewUrl}
                     alt=""
                     className="aspect-4/3 w-full object-cover"
                  />
               )
            ) : (
               // The snippet itself, so the preview proves the URLs and markup work
               // (and shows the HDR version on an HDR screen).
               <div
                  className="[&_img]:block"
                  // oxlint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: snippet }}
               />
            )}
         </div>

         <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
               <h2 className="font-semibold break-all">{item.fileName}</h2>
               {image && (
                  <span className="text-sm text-muted-fg">
                     {image.width} &times; {image.height}
                     {image.hdr && " · HDR"} · original{" "}
                     {formatBytes(image.originalBytes)}
                  </span>
               )}
            </div>

            {item.error != null ? (
               <p className="text-sm whitespace-pre-wrap text-danger">{item.error}</p>
            ) : (
               image == null && (
                  <div className="space-y-2" role="status">
                     <p className="text-sm text-muted-fg">{item.status}</p>
                     <div className="h-1 overflow-hidden rounded-full bg-muted">
                        <div
                           className="h-full bg-primary transition-[width]"
                           style={{ width: `${(item.fraction ?? 0) * 100}%` }}
                        />
                     </div>
                  </div>
               )
            )}

            <input
               type="text"
               value={item.alt}
               onChange={(event) => onAltChange(event.currentTarget.value)}
               placeholder="Alt text: describe the image"
               aria-label={`Alt text for ${item.fileName}`}
               className={`h-10 ${inputClass}`}
            />

            {image && snippet != null && (
               <>
                  <textarea
                     readOnly
                     spellCheck={false}
                     value={snippet}
                     rows={Math.min(14, snippet.split("\n").length)}
                     aria-label="Snippet"
                     onFocus={(event) => event.currentTarget.select()}
                     className={`${inputClass} py-2 font-mono text-xs whitespace-pre`}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                     <Button type="button" onClick={() => void copy()}>
                        Copy snippet
                     </Button>
                  </div>
                  <SizeTable image={image} />
               </>
            )}
         </div>
      </article>
   );
}

function SizeTable({ image }: { image: BlogImage }): ReactNode {
   const columns = [
      ...(image.hdr ? [{ label: "HDR AVIF", variants: image.sources.hdrAvif }] : []),
      { label: "AVIF", variants: image.sources.avif },
      { label: "WebP", variants: image.sources.webp },
      { label: image.fallback.toUpperCase(), variants: image.sources.fallback },
   ];
   const link = `underline decoration-border underline-offset-2 hover:decoration-fg ${focusRing}`;
   return (
      <details className="text-sm text-muted-fg">
         <summary className="cursor-pointer">File sizes</summary>
         <table className="mt-2 tabular-nums">
            <thead>
               <tr>
                  <th className="pr-4 text-left font-medium">Width</th>
                  {columns.map((c) => (
                     <th key={c.label} className="pr-4 text-right font-medium">
                        {c.label}
                     </th>
                  ))}
               </tr>
            </thead>
            <tbody>
               {image.sources.avif.map((row, i) => (
                  <tr key={row.width}>
                     <td className="pr-4">{row.width} px</td>
                     {columns.map((c) => {
                        const v = c.variants.at(i);
                        return (
                           <td key={c.label} className="pr-4 text-right">
                              {v && (
                                 <a
                                    href={v.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={link}
                                 >
                                    {formatBytes(v.bytes)}
                                 </a>
                              )}
                           </td>
                        );
                     })}
                  </tr>
               ))}
               <tr>
                  <td className="pr-4">Full</td>
                  <td colSpan={columns.length} className="pr-4 text-right">
                     <a
                        href={image.full.url}
                        target="_blank"
                        rel="noreferrer"
                        className={link}
                     >
                        {image.fallback.toUpperCase()} {formatBytes(image.full.bytes)}
                     </a>
                  </td>
               </tr>
            </tbody>
         </table>
      </details>
   );
}
