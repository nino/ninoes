import React, { type JSX } from "react";
import { toast } from "sonner";
import {
   type WishInput,
   useAddWish,
   useDeleteWish,
   useSetWishClaim,
   useUpdateWish,
   useWishes,
} from "~/hooks/useSupabase";
import type { Wish } from "~/model/types";
import {
   formatPrice,
   isSpoilerFreeName,
   type Language,
   linkLabel,
   normalizeLink,
   parsePrice,
   sameName,
   strings,
   type WishlistStrings,
} from "~/utils/wishlist";
import type { Route } from "./+types/wishlist";

export function meta({}: Route.MetaArgs): ReturnType<Route.MetaFunction> {
   return [
      { title: "Wishlist · Katherine & Nino" },
      { name: "robots", content: "noindex" },
   ];
}

export const links: Route.LinksFunction = () => [
   { rel: "preconnect", href: "https://fonts.googleapis.com" },
   { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
   {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&display=swap",
   },
];

const nameKey = "wishlist:name";
const languageKey = "wishlist:language";

// Writes land here too, so the page still works when localStorage is blocked.
const memoryStorage = new Map<string, string | null>();
const storageListeners = new Set<() => void>();

function readStorage(key: string): string | null {
   if (memoryStorage.has(key)) return memoryStorage.get(key) ?? null;
   try {
      return window.localStorage.getItem(key);
   } catch {
      return null;
   }
}

function writeStorage(key: string, value: string | null): void {
   memoryStorage.set(key, value);
   try {
      if (value == null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
   } catch {
      // Private mode or blocked storage: the value just won't survive a reload.
   }
   for (const listener of storageListeners) listener();
}

function subscribeToStorage(listener: () => void): () => void {
   storageListeners.add(listener);
   return () => storageListeners.delete(listener);
}

/** undefined while rendering on the server, before localStorage can be read. */
function useStoredValue(key: string): string | null | undefined {
   return React.useSyncExternalStore(
      subscribeToStorage,
      () => readStorage(key),
      () => undefined,
   );
}

interface Visitor {
   name: string | null;
   language: Language;
}

function useVisitor(): {
   visitor: Visitor | null;
   setName: (name: string | null) => void;
   setLanguage: (language: Language) => void;
} {
   const name = useStoredValue(nameKey);
   const storedLanguage = useStoredValue(languageKey);

   let visitor: Visitor | null = null;
   if (name !== undefined) {
      const language: Language =
         storedLanguage === "de" || storedLanguage === "en"
            ? storedLanguage
            : navigator.language.toLowerCase().startsWith("de")
              ? "de"
              : "en";
      visitor = { name, language };
   }

   const language = visitor?.language;
   React.useEffect(() => {
      if (language != null) document.documentElement.lang = language;
   }, [language]);

   const setName = React.useCallback((value: string | null) => {
      writeStorage(nameKey, value);
   }, []);

   const setLanguage = React.useCallback((value: Language) => {
      writeStorage(languageKey, value);
   }, []);

   return { visitor, setName, setLanguage };
}

export default function WishlistPage(): JSX.Element {
   const { visitor, setName, setLanguage } = useVisitor();

   return (
      <div className="wishlist-page min-h-screen bg-wl-paper font-caslon text-wl-ink">
         <div className="mx-auto flex min-h-screen max-w-xl flex-col px-6 pt-2 pb-12">
            {visitor && (
               <>
                  <LanguageToggle
                     language={visitor.language}
                     onChange={setLanguage}
                     t={strings[visitor.language]}
                  />
                  {visitor.name == null ? (
                     <NameGate t={strings[visitor.language]} onSubmit={setName} />
                  ) : (
                     <WishList
                        name={visitor.name}
                        language={visitor.language}
                        onSignOut={() => setName(null)}
                     />
                  )}
               </>
            )}
         </div>
      </div>
   );
}

const focusRing =
   "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wl-accent";
const smallCaps = "text-xs tracking-[0.16em] uppercase text-wl-muted";
const primaryButton = `rounded-xs bg-wl-ink px-5 py-3.5 text-[15px] text-wl-paper disabled:opacity-60 ${focusRing}`;
const outlineButton = `rounded-xs border border-wl-ink px-4 py-2.5 text-sm text-wl-ink disabled:opacity-60 ${focusRing}`;
const textButton = `py-3 text-sm text-wl-muted underline underline-offset-3 hover:text-wl-ink disabled:opacity-60 ${focusRing}`;

function LanguageToggle({
   language,
   onChange,
   t,
}: {
   language: Language;
   onChange: (language: Language) => void;
   t: WishlistStrings;
}): JSX.Element {
   const options: Array<Language> = ["en", "de"];
   return (
      <nav
         aria-label={t.languageNav}
         className="flex items-center justify-end text-[13px]"
      >
         {options.map((option, i) => (
            <React.Fragment key={option}>
               {i > 0 && (
                  <span aria-hidden="true" className="text-wl-leader">
                     /
                  </span>
               )}
               <button
                  type="button"
                  lang={option}
                  aria-pressed={option === language}
                  onClick={() => onChange(option)}
                  className={`px-1.5 py-3 uppercase ${focusRing} ${
                     option === language
                        ? "text-wl-ink underline underline-offset-4"
                        : "text-wl-muted hover:text-wl-ink"
                  }`}
               >
                  {option}
               </button>
            </React.Fragment>
         ))}
      </nav>
   );
}

function NameGate({
   t,
   onSubmit,
}: {
   t: WishlistStrings;
   onSubmit: (name: string) => void;
}): JSX.Element {
   const [name, setName] = React.useState("");

   return (
      <div className="flex flex-1 flex-col pt-4">
         <div className="flex flex-1 flex-col justify-center gap-10">
            <div className="flex flex-col gap-3">
               <div className={smallCaps}>{t.couple}</div>
               <h1 className="text-[52px] leading-none italic">{t.title}</h1>
               <p className="max-w-xs leading-relaxed text-wl-soft">{t.gateIntro}</p>
            </div>
            <form
               className="flex flex-col gap-7"
               onSubmit={(e) => {
                  e.preventDefault();
                  if (name.trim() !== "") onSubmit(name.trim());
               }}
            >
               <label className="flex flex-col gap-1.5">
                  <span className={smallCaps}>{t.nameLabel}</span>
                  <input
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     required
                     autoComplete="given-name"
                     autoFocus
                     className="border-b border-wl-ink bg-transparent py-2 text-[26px] italic outline-none focus:border-wl-accent focus:shadow-[0_1px_0_0_var(--color-wl-accent)]"
                  />
               </label>
               <button type="submit" className={`self-start ${primaryButton}`}>
                  {t.openList}
               </button>
            </form>
         </div>
      </div>
   );
}

function WishList({
   name,
   language,
   onSignOut,
}: {
   name: string;
   language: Language;
   onSignOut: () => void;
}): JSX.Element {
   const t = strings[language];
   const spoilerFree = isSpoilerFreeName(name);
   const wishes = useWishes({ spoilerFree });

   return (
      <>
         <header className="flex flex-col gap-2 border-b border-wl-ink pb-4">
            <div className={smallCaps}>{t.couple}</div>
            <h1 className="text-[40px] leading-none italic">{t.title}</h1>
            <div className="text-sm text-wl-muted">
               {t.signedAs} <span className="text-wl-ink">{name}</span> ·{" "}
               <button
                  type="button"
                  onClick={onSignOut}
                  className={`text-wl-accent underline underline-offset-2 ${focusRing}`}
               >
                  {t.notYou}
               </button>
            </div>
         </header>

         {spoilerFree && (
            <aside className="mt-4 flex flex-col gap-1 rounded-xs border border-wl-rule px-4 py-3.5">
               <div className="text-[11px] tracking-[0.16em] text-wl-accent uppercase">
                  {t.spoilerFreeLabel}
               </div>
               <p className="text-sm leading-normal text-wl-soft">
                  {t.spoilerFreeText(name)}
               </p>
            </aside>
         )}

         {wishes.isPending ? (
            <p className="py-8 text-wl-muted italic">{t.loading}</p>
         ) : wishes.isError ? (
            <p className="py-8 text-wl-muted italic">{t.loadError}</p>
         ) : wishes.data.length === 0 ? (
            <p className="py-8 text-wl-muted italic">{t.empty}</p>
         ) : (
            <ul>
               {wishes.data.map((wish) => (
                  <WishRow
                     key={wish.id}
                     wish={wish}
                     name={name}
                     spoilerFree={spoilerFree}
                     language={language}
                  />
               ))}
            </ul>
         )}

         <AddWish name={name} spoilerFree={spoilerFree} t={t} />
      </>
   );
}

function WishRow({
   wish,
   name,
   spoilerFree,
   language,
}: {
   wish: Wish;
   name: string;
   spoilerFree: boolean;
   language: Language;
}): JSX.Element {
   const t = strings[language];
   const [editing, setEditing] = React.useState(false);
   const updateWish = useUpdateWish();
   const deleteWish = useDeleteWish();

   if (editing) {
      return (
         <li className="border-b border-wl-rule py-5">
            <WishForm
               t={t}
               initial={wish}
               submitLabel={t.save}
               pending={updateWish.isPending || deleteWish.isPending}
               onCancel={() => setEditing(false)}
               onDelete={() =>
                  deleteWish.mutate(wish.id, {
                     onError: () => toast.error(t.somethingWentWrong),
                  })
               }
               onSubmit={(input) =>
                  updateWish.mutateAsync({ id: wish.id, wish: input }).then(
                     () => setEditing(false),
                     () => {
                        toast.error(t.somethingWentWrong);
                     },
                  )
               }
            />
         </li>
      );
   }

   const claimedBy = wish.claimed_by ?? null;
   const dimmed = !spoilerFree && claimedBy != null;

   return (
      <li className="flex flex-col gap-1.5 border-b border-wl-rule pt-4 pb-3">
         <div className="flex items-baseline gap-2">
            <h2 className={`text-[19px] ${dimmed ? "text-wl-muted" : ""}`}>
               {wish.title}
            </h2>
            {wish.price != null && (
               <>
                  <span
                     aria-hidden="true"
                     className="min-w-4 flex-1 border-b border-dotted border-wl-leader"
                  />
                  <span
                     className={`shrink-0 [font-variant-numeric:oldstyle-nums] ${dimmed ? "text-wl-muted" : ""}`}
                  >
                     {formatPrice(wish.price, language)}
                  </span>
               </>
            )}
         </div>
         {wish.description != null && (
            <p className="text-sm leading-normal whitespace-pre-line text-wl-muted">
               {wish.description}
            </p>
         )}
         {wish.link != null && (
            <a
               href={wish.link}
               target="_blank"
               rel="noopener noreferrer nofollow"
               className={`self-start text-[13px] text-wl-accent italic underline-offset-2 hover:underline ${focusRing}`}
            >
               {linkLabel(wish.link)}
            </a>
         )}
         <div className="flex min-h-12 items-center justify-between gap-4">
            {spoilerFree ? (
               <span />
            ) : (
               <Claim wishId={wish.id} claimedBy={claimedBy} name={name} t={t} />
            )}
            <button
               type="button"
               onClick={() => setEditing(true)}
               className={textButton}
            >
               {t.edit}
            </button>
         </div>
      </li>
   );
}

function Claim({
   wishId,
   claimedBy,
   name,
   t,
}: {
   wishId: string;
   claimedBy: string | null;
   name: string;
   t: WishlistStrings;
}): JSX.Element {
   const setClaim = useSetWishClaim();

   const change = (claim: boolean): void => {
      setClaim.mutate(
         { id: wishId, name, claim },
         {
            onSuccess: (ok) => {
               if (!ok) toast.error(claim ? t.alreadyClaimed : t.somethingWentWrong);
            },
            onError: () => toast.error(t.somethingWentWrong),
         },
      );
   };

   if (claimedBy == null) {
      return (
         <button
            type="button"
            disabled={setClaim.isPending}
            onClick={() => change(true)}
            className={outlineButton}
         >
            {t.claim}
         </button>
      );
   }

   const mine = sameName(claimedBy, name);
   return (
      <div className="flex items-center gap-4">
         <div className="flex items-center gap-3">
            <span className="text-[11px] tracking-[0.16em] text-wl-muted uppercase">
               {t.from}
            </span>
            <span
               className={`inline-block -rotate-3 font-signature text-3xl leading-none ${
                  mine ? "text-wl-accent" : "text-wl-muted"
               }`}
            >
               {claimedBy}
            </span>
         </div>
         {mine && (
            <button
               type="button"
               disabled={setClaim.isPending}
               onClick={() => change(false)}
               className={textButton}
            >
               {t.takeBack}
            </button>
         )}
      </div>
   );
}

function AddWish({
   name,
   spoilerFree,
   t,
}: {
   name: string;
   spoilerFree: boolean;
   t: WishlistStrings;
}): JSX.Element {
   const addWish = useAddWish();
   const setClaim = useSetWishClaim();
   const [claimNow, setClaimNow] = React.useState(false);
   // Remounting the form clears it after a successful add.
   const [formKey, setFormKey] = React.useState(0);

   const add = async (input: WishInput): Promise<void> => {
      try {
         const wish = await addWish.mutateAsync(input);
         if (claimNow) await setClaim.mutateAsync({ id: wish.id, name, claim: true });
         setFormKey((k) => k + 1);
         setClaimNow(false);
      } catch {
         toast.error(t.somethingWentWrong);
      }
   };

   return (
      <section className="mt-10 flex flex-col gap-3">
         <h2 className="text-2xl italic">{t.addHeading}</h2>
         {!spoilerFree && (
            <p className="text-sm leading-normal text-wl-muted">{t.addIntro}</p>
         )}
         <WishForm
            key={formKey}
            t={t}
            submitLabel={t.add}
            pending={addWish.isPending || setClaim.isPending}
            onSubmit={add}
         >
            {!spoilerFree && (
               <label className="flex items-center gap-3 py-1 text-[15px]">
                  <input
                     type="checkbox"
                     checked={claimNow}
                     onChange={(e) => setClaimNow(e.target.checked)}
                     className={`size-4 accent-wl-ink ${focusRing}`}
                  />
                  {t.claimNow}
               </label>
            )}
         </WishForm>
      </section>
   );
}

function WishForm({
   t,
   initial,
   submitLabel,
   pending,
   onSubmit,
   onCancel,
   onDelete,
   children,
}: {
   t: WishlistStrings;
   initial?: Wish;
   submitLabel: string;
   pending: boolean;
   onSubmit: (input: WishInput) => Promise<void>;
   onCancel?: () => void;
   onDelete?: () => void;
   children?: React.ReactNode;
}): JSX.Element {
   const [title, setTitle] = React.useState(initial?.title ?? "");
   const [description, setDescription] = React.useState(initial?.description ?? "");
   const [price, setPrice] = React.useState(
      initial?.price == null ? "" : String(initial.price),
   );
   const [link, setLink] = React.useState(initial?.link ?? "");
   const [errors, setErrors] = React.useState<{ price?: string; link?: string }>({});
   const [confirmingDelete, setConfirmingDelete] = React.useState(false);

   const submit = (e: React.FormEvent): void => {
      e.preventDefault();
      const parsedPrice = parsePrice(price);
      const parsedLink = normalizeLink(link);
      const nextErrors = {
         price: Number.isNaN(parsedPrice) ? t.invalidPrice : undefined,
         link: parsedLink === undefined ? t.invalidLink : undefined,
      };
      setErrors(nextErrors);
      if (nextErrors.price != null || nextErrors.link != null || title.trim() === "") {
         return;
      }
      void onSubmit({
         title: title.trim(),
         description: description.trim() === "" ? null : description.trim(),
         price: parsedPrice,
         link: parsedLink ?? null,
      });
   };

   return (
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
         <Field label={t.fieldTitle}>
            <input
               value={title}
               onChange={(e) => setTitle(e.target.value)}
               required
               className={`text-lg ${fieldInput}`}
            />
         </Field>
         <Field label={`${t.fieldDescription} · ${t.optional}`}>
            <textarea
               value={description}
               onChange={(e) => setDescription(e.target.value)}
               rows={2}
               className={`resize-y ${fieldInput}`}
            />
         </Field>
         <div className="grid grid-cols-2 gap-5">
            <Field label={`${t.fieldPrice} · ${t.optional}`} error={errors.price}>
               <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  inputMode="decimal"
                  placeholder="£"
                  aria-invalid={errors.price != null}
                  className={fieldInput}
               />
            </Field>
            <Field label={`${t.fieldLink} · ${t.optional}`} error={errors.link}>
               <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  inputMode="url"
                  autoCapitalize="off"
                  placeholder="https://"
                  aria-invalid={errors.link != null}
                  className={fieldInput}
               />
            </Field>
         </div>
         {children}
         <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <button
               type="submit"
               disabled={pending || title.trim() === ""}
               className={primaryButton}
            >
               {submitLabel}
            </button>
            {onCancel && (
               <button type="button" onClick={onCancel} className={textButton}>
                  {t.cancel}
               </button>
            )}
            {onDelete && (
               <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                     confirmingDelete ? onDelete() : setConfirmingDelete(true)
                  }
                  onBlur={() => setConfirmingDelete(false)}
                  className={`ml-auto ${textButton} ${confirmingDelete ? "text-wl-danger" : ""}`}
               >
                  {confirmingDelete ? `${t.confirmDelete}?` : t.delete}
               </button>
            )}
         </div>
      </form>
   );
}

const fieldInput =
   "min-w-0 border-b border-wl-leader bg-transparent py-2 text-wl-ink outline-none placeholder:text-wl-leader focus:border-wl-accent focus:shadow-[0_1px_0_0_var(--color-wl-accent)] aria-invalid:border-wl-danger";

function Field({
   label,
   error,
   children,
}: {
   label: string;
   error?: string;
   children: React.ReactNode;
}): JSX.Element {
   return (
      <label className="flex min-w-0 flex-col gap-1">
         <span className="text-[11px] tracking-[0.16em] text-wl-muted uppercase">
            {label}
         </span>
         {children}
         {error != null && (
            <span className="text-[13px] text-wl-danger italic">{error}</span>
         )}
      </label>
   );
}
