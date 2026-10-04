import React, { type JSX } from "react";
import { toast } from "sonner";
import {
   type WishInput,
   useAddWish,
   useDeleteWish,
   useSetWishClaim,
   useTranslateWishes,
   useUpdateWish,
   useWishes,
} from "~/hooks/useSupabase";
import type { Wish } from "~/model/types";
import {
   formatPrice,
   isSpoilerFreeName,
   type Language,
   linkLabel,
   localizedWish,
   maxDescriptionLength,
   maxNameLength,
   maxTitleLength,
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
      href: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap",
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
      if (language == null) return;
      // Put the root layout's lang back when leaving, so other pages aren't
      // announced as German.
      const previous = document.documentElement.lang;
      document.documentElement.lang = language;
      return () => {
         document.documentElement.lang = previous;
      };
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
   const t = visitor ? strings[visitor.language] : null;

   return (
      <div className="wishlist-page min-h-screen bg-wl-page font-geist text-wl-fg antialiased">
         {visitor && t && (
            <>
               <header className="border-b border-wl-border bg-wl-card">
                  <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-4 px-4">
                     <div className="flex items-center gap-2.5">
                        <span className="flex size-8 items-center justify-center rounded-md bg-wl-primary text-wl-primary-fg">
                           <Icon name="gift" className="size-4" />
                        </span>
                        <div className="flex flex-col leading-tight">
                           <span className="text-sm font-semibold">{t.couple}</span>
                           <span className="text-xs text-wl-muted-fg">{t.date}</span>
                        </div>
                     </div>
                     <LanguageToggle
                        language={visitor.language}
                        onChange={setLanguage}
                        t={t}
                     />
                  </div>
               </header>
               {visitor.name == null ? (
                  <NameGate t={t} onSubmit={setName} />
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
   );
}

const buttonBase =
   "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-wl-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";
const primaryButton = `${buttonBase} h-10 px-4 bg-wl-primary text-wl-primary-fg shadow-xs hover:bg-wl-primary/90`;
const outlineButton = `${buttonBase} h-10 px-4 border border-wl-border bg-wl-card shadow-xs hover:bg-wl-muted`;
const ghostButton = `${buttonBase} h-9 px-3 text-wl-muted-fg hover:bg-wl-muted hover:text-wl-fg`;
const dangerButton = `${buttonBase} h-10 px-4 bg-wl-danger text-white shadow-xs hover:bg-wl-danger/90`;
const dangerGhostButton = `${buttonBase} h-10 px-3 text-wl-danger hover:bg-wl-danger/10`;
const inputClass =
   "w-full min-w-0 rounded-md border border-wl-input bg-wl-field px-3 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-wl-muted-fg focus-visible:border-wl-ring focus-visible:ring-[3px] focus-visible:ring-wl-ring/50 aria-invalid:border-wl-danger aria-invalid:ring-wl-danger/20 sm:text-sm";
const cardClass = "rounded-xl border border-wl-border bg-wl-card shadow-xs";

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
      <div
         role="group"
         aria-label={t.languageNav}
         className="inline-flex h-9 items-center rounded-lg bg-wl-muted p-[3px]"
      >
         {options.map((option) => (
            <button
               key={option}
               type="button"
               lang={option}
               aria-pressed={option === language}
               onClick={() => onChange(option)}
               className={`h-full rounded-md px-3 text-xs font-medium uppercase transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-wl-ring/50 ${
                  option === language
                     ? "bg-wl-card text-wl-fg shadow-xs"
                     : "text-wl-muted-fg hover:text-wl-fg"
               }`}
            >
               {option}
            </button>
         ))}
      </div>
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
      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
         <div className={`w-full max-w-sm ${cardClass}`}>
            <div className="flex flex-col gap-1.5 p-6 pb-0">
               <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
               <p className="text-sm text-wl-muted-fg">{t.gateIntro}</p>
            </div>
            <form
               className="flex flex-col gap-4 p-6"
               onSubmit={(e) => {
                  e.preventDefault();
                  if (name.trim() !== "") onSubmit(name.trim());
               }}
            >
               <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">{t.nameLabel}</span>
                  <input
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     required
                     maxLength={maxNameLength}
                     autoComplete="given-name"
                     autoFocus
                     className={`h-10 ${inputClass}`}
                  />
               </label>
               <button
                  type="submit"
                  disabled={name.trim() === ""}
                  className={`w-full ${primaryButton}`}
               >
                  {t.openList}
               </button>
            </form>
         </div>
      </main>
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
   useTranslatePending(wishes.data);

   const summary = wishes.data
      ? t.summary(
           wishes.data.length,
           spoilerFree ? null : wishes.data.filter((w) => w.claimed_by == null).length,
        )
      : null;

   return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:py-12">
         <div className="flex flex-col gap-1">
            <h1 className="mb-1 text-3xl font-semibold tracking-tight">{t.title}</h1>
            {summary != null && <p className="text-sm text-wl-muted-fg">{summary}</p>}
            <p className="text-sm text-wl-muted-fg">
               {t.signedAs} <span className="font-medium text-wl-fg">{name}</span> ·{" "}
               <button
                  type="button"
                  onClick={onSignOut}
                  className="rounded-sm font-medium text-wl-fg underline underline-offset-4 outline-none focus-visible:ring-[3px] focus-visible:ring-wl-ring/50"
               >
                  {t.notYou}
               </button>
            </p>
         </div>

         {spoilerFree && (
            <div
               role="note"
               className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded-lg border border-wl-border bg-wl-card px-4 py-3 text-sm"
            >
               <Icon name="eyeOff" className="row-span-2 mt-0.5 size-4" />
               <div className="font-medium">{t.spoilerFreeLabel}</div>
               <p className="text-wl-muted-fg">{t.spoilerFreeText(name)}</p>
            </div>
         )}

         {wishes.isPending ? (
            <div className="flex flex-col gap-3" aria-busy="true">
               {[0, 1, 2].map((i) => (
                  <div key={i} className="h-32 animate-pulse rounded-xl bg-wl-muted" />
               ))}
            </div>
         ) : wishes.isError ? (
            <p className="rounded-lg border border-wl-danger/40 bg-wl-danger/5 px-4 py-3 text-sm text-wl-danger">
               {t.loadError}
            </p>
         ) : wishes.data.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-wl-border px-6 py-12 text-center">
               <span className="flex size-10 items-center justify-center rounded-full bg-wl-muted">
                  <Icon name="gift" className="size-5 text-wl-muted-fg" />
               </span>
               <p className="text-sm text-wl-muted-fg">{t.empty}</p>
            </div>
         ) : (
            <ul className="flex flex-col gap-3">
               {wishes.data.map((wish) => (
                  <WishCard
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
      </main>
   );
}

/**
 * Asks the server to translate whatever is still untranslated: new wishes,
 * edited ones, and any a previous attempt missed. If a run fails or gets
 * nowhere, it waits until the set of pending wishes changes before trying
 * again, so a wish that can't be translated doesn't cause a request loop.
 */
function useTranslatePending(wishes: Array<Wish> | undefined): void {
   const { mutate, isPending } = useTranslateWishes();
   const pendingCount = wishes?.filter((w) => w.language == null).length ?? 0;
   const stalledAt = React.useRef<number | null>(null);

   React.useEffect(() => {
      if (pendingCount === 0 || isPending || stalledAt.current === pendingCount) return;
      mutate(undefined, {
         onSuccess: ({ translated }) => {
            stalledAt.current = translated === 0 ? pendingCount : null;
         },
         onError: () => {
            stalledAt.current = pendingCount;
         },
      });
   }, [pendingCount, isPending, mutate]);
}

function WishCard({
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
         <li className={`p-5 ${cardClass}`}>
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
   const shown = localizedWish(wish, language);
   const editButton = (
      <button
         type="button"
         onClick={() => setEditing(true)}
         aria-label={t.edit}
         className={ghostButton}
      >
         <Icon name="pencil" />
         <span aria-hidden="true" className="hidden sm:inline">
            {t.edit}
         </span>
      </button>
   );

   return (
      <li className={cardClass}>
         <div className="flex flex-col gap-1.5 p-5">
            <div className="flex items-start justify-between gap-4">
               <h2 className="text-base leading-snug font-semibold">{shown.title}</h2>
               {wish.price != null && (
                  <span className="shrink-0 text-base font-semibold tabular-nums">
                     {formatPrice(wish.price, language)}
                  </span>
               )}
            </div>
            {shown.description != null && (
               <p className="text-sm leading-relaxed whitespace-pre-line text-wl-muted-fg">
                  {shown.description}
               </p>
            )}
            {shown.translatedFrom != null && (
               <p className="flex items-center gap-1.5 text-xs text-wl-muted-fg">
                  <Icon name="languages" className="size-3.5" />
                  {t.translatedFrom(shown.translatedFrom)}
               </p>
            )}
            {(wish.link != null || spoilerFree) && (
               <div className="-mb-2 flex min-h-9 items-center justify-between gap-3">
                  {wish.link == null ? (
                     <span />
                  ) : (
                     <a
                        href={wish.link}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-wl-ring/50"
                     >
                        {linkLabel(wish.link)}
                        <Icon
                           name="externalLink"
                           className="size-3.5 text-wl-muted-fg"
                        />
                     </a>
                  )}
                  {/* The couple can't claim, so editing doesn't need a footer of its own. */}
                  {spoilerFree && <span className="-mr-3">{editButton}</span>}
               </div>
            )}
         </div>
         {!spoilerFree && (
            <div className="flex min-h-14 items-center justify-between gap-3 border-t border-wl-border px-5 py-2.5">
               <Claim wishId={wish.id} claimedBy={claimedBy} name={name} t={t} />
               {editButton}
            </div>
         )}
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
            className={primaryButton}
         >
            <Icon name="gift" />
            {t.claim}
         </button>
      );
   }

   if (!sameName(claimedBy, name)) {
      return (
         <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md bg-wl-muted px-2.5 py-1 text-sm font-medium text-wl-muted-fg">
            <Icon name="check" className="size-4 shrink-0" />
            <span className="truncate">{t.takenBy(claimedBy)}</span>
         </span>
      );
   }

   return (
      <div className="flex shrink-0 items-center gap-1">
         <span className="inline-flex items-center gap-1.5 rounded-md bg-wl-success/10 px-2.5 py-1 text-sm font-medium text-wl-success">
            <Icon name="check" className="size-4" />
            {t.yours}
         </span>
         <button
            type="button"
            disabled={setClaim.isPending}
            onClick={() => change(false)}
            className={ghostButton}
         >
            {t.takeBack}
         </button>
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
      let wish;
      try {
         wish = await addWish.mutateAsync(input);
      } catch {
         toast.error(t.somethingWentWrong);
         return;
      }
      // The wish exists from here on, so clear the form even if claiming
      // fails; otherwise a second click would add it twice.
      setFormKey((k) => k + 1);
      setClaimNow(false);
      if (!claimNow) return;
      try {
         const claimed = await setClaim.mutateAsync({ id: wish.id, name, claim: true });
         if (!claimed) toast.error(t.claimAfterAddFailed);
      } catch {
         toast.error(t.claimAfterAddFailed);
      }
   };

   return (
      <section className={`mt-4 ${cardClass}`}>
         <div className="flex flex-col gap-1.5 p-5 pb-0 sm:p-6 sm:pb-0">
            <h2 className="text-lg font-semibold tracking-tight">{t.addHeading}</h2>
            {!spoilerFree && <p className="text-sm text-wl-muted-fg">{t.addIntro}</p>}
         </div>
         <div className="p-5 sm:p-6">
            <WishForm
               key={formKey}
               t={t}
               submitLabel={t.add}
               submitIcon="plus"
               pending={addWish.isPending || setClaim.isPending}
               onSubmit={add}
            >
               {!spoilerFree && (
                  <label className="flex items-center gap-2.5 text-sm font-medium">
                     <input
                        type="checkbox"
                        checked={claimNow}
                        onChange={(e) => setClaimNow(e.target.checked)}
                        className="size-4 rounded-sm accent-wl-primary outline-none focus-visible:ring-[3px] focus-visible:ring-wl-ring/50"
                     />
                     {t.claimNow}
                  </label>
               )}
            </WishForm>
         </div>
      </section>
   );
}

function WishForm({
   t,
   initial,
   submitLabel,
   submitIcon,
   pending,
   onSubmit,
   onCancel,
   onDelete,
   children,
}: {
   t: WishlistStrings;
   initial?: Wish;
   submitLabel: string;
   submitIcon?: IconName;
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

   const submit = (e: React.SyntheticEvent): void => {
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
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
         <Field label={t.fieldTitle}>
            <input
               value={title}
               onChange={(e) => setTitle(e.target.value)}
               required
               maxLength={maxTitleLength}
               className={`h-10 ${inputClass}`}
            />
         </Field>
         <Field label={t.fieldDescription} optional={t.optional}>
            <textarea
               value={description}
               onChange={(e) => setDescription(e.target.value)}
               maxLength={maxDescriptionLength}
               rows={3}
               className={`min-h-20 resize-y py-2 ${inputClass}`}
            />
         </Field>
         <div className="grid gap-4 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
            <Field label={t.fieldPrice} optional={t.optional} error={errors.price}>
               <span className="relative">
                  <span
                     aria-hidden="true"
                     className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-wl-muted-fg"
                  >
                     £
                  </span>
                  <input
                     value={price}
                     onChange={(e) => setPrice(e.target.value)}
                     inputMode="decimal"
                     aria-invalid={errors.price != null}
                     className={`h-10 pl-7 tabular-nums ${inputClass}`}
                  />
               </span>
            </Field>
            <Field label={t.fieldLink} optional={t.optional} error={errors.link}>
               <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  inputMode="url"
                  autoCapitalize="off"
                  placeholder="https://"
                  aria-invalid={errors.link != null}
                  className={`h-10 ${inputClass}`}
               />
            </Field>
         </div>
         {children}
         <div className="flex flex-wrap items-center gap-2 pt-1">
            {onDelete && (
               <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                     confirmingDelete ? onDelete() : setConfirmingDelete(true)
                  }
                  onBlur={() => setConfirmingDelete(false)}
                  className={confirmingDelete ? dangerButton : dangerGhostButton}
               >
                  <Icon name="trash" />
                  {confirmingDelete ? t.confirmDelete : t.delete}
               </button>
            )}
            <div className="ml-auto flex items-center gap-2">
               {onCancel && (
                  <button type="button" onClick={onCancel} className={outlineButton}>
                     {t.cancel}
                  </button>
               )}
               <button
                  type="submit"
                  disabled={pending || title.trim() === ""}
                  className={primaryButton}
               >
                  {submitIcon && <Icon name={submitIcon} />}
                  {submitLabel}
               </button>
            </div>
         </div>
      </form>
   );
}

function Field({
   label,
   optional,
   error,
   children,
}: {
   label: string;
   optional?: string;
   error?: string;
   children: React.ReactNode;
}): JSX.Element {
   return (
      <label className="flex min-w-0 flex-col gap-2">
         <span className="text-sm font-medium">
            {label}
            {optional != null && (
               <span className="font-normal text-wl-muted-fg"> ({optional})</span>
            )}
         </span>
         {children}
         {error != null && <span className="text-sm text-wl-danger">{error}</span>}
      </label>
   );
}

// Lucide icon paths, inlined to avoid a dependency for eight icons.
const iconPaths = {
   gift: [
      "M3 9a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z",
      "M12 8v13",
      "M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7",
      "M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5",
   ],
   check: ["M20 6 9 17l-5-5"],
   languages: [
      "m5 8 6 6",
      "m4 14 6-6 2-3",
      "M2 5h12",
      "M7 2h1",
      "m22 22-5-10-5 10",
      "M14 18h6",
   ],
   pencil: [
      "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      "m15 5 4 4",
   ],
   plus: ["M5 12h14", "M12 5v14"],
   trash: [
      "M3 6h18",
      "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
      "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
   ],
   externalLink: [
      "M15 3h6v6",
      "M10 14 21 3",
      "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
   ],
   eyeOff: [
      "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",
      "M14.084 14.158a3 3 0 0 1-4.242-4.242",
      "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",
      "m2 2 20 20",
   ],
} satisfies Record<string, Array<string>>;

type IconName = keyof typeof iconPaths;

function Icon({ name, className }: { name: IconName; className?: string }): JSX.Element {
   return (
      <svg
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         strokeWidth={2}
         strokeLinecap="round"
         strokeLinejoin="round"
         aria-hidden="true"
         className={className}
      >
         {iconPaths[name].map((d) => (
            <path key={d} d={d} />
         ))}
      </svg>
   );
}
