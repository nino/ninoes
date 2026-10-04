export type Language = "en" | "de";

// The same limits are check constraints on public.wishes and
// public.wish_contributions.
export const maxTitleLength = 200;
export const maxDescriptionLength = 2000;
export const maxNameLength = 80;

const hostNames = new Set(["nino", "katherine"]);

/** The couple see the list without who has claimed what. */
export function isSpoilerFreeName(name: string): boolean {
   return hostNames.has(name.trim().toLowerCase());
}

export function sameName(a: string, b: string): boolean {
   return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Reads a price typed by hand: "240", "240,50", "£ 1.200", "1,200.00 GBP".
 * Returns null for an empty field and NaN for something that isn't a price.
 */
export function parsePrice(input: string): number | null {
   const cleaned = input.replaceAll(/£|gbp|\s/gi, "");
   if (cleaned === "") return null;
   if (!/^\d[\d.,]*$/.test(cleaned)) return Number.NaN;

   // The last separator followed by one or two digits is the decimal mark;
   // every other separator groups thousands.
   const decimal = /[.,](\d{1,2})$/.exec(cleaned);
   const whole = decimal ? cleaned.slice(0, decimal.index) : cleaned;
   const digits = whole.replaceAll(/[.,]/g, "");
   return Number(decimal ? `${digits}.${decimal[1]}` : digits);
}

export function formatPrice(price: number, language: Language): string {
   return new Intl.NumberFormat(language === "de" ? "de-DE" : "en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
   }).format(price);
}

/**
 * Turns "lecreuset.de/bräter" into a full https URL. Returns null for an empty
 * field and undefined for anything that isn't an http(s) address, since links
 * from anonymous visitors end up in an href.
 */
export function normalizeLink(input: string): string | null | undefined {
   const trimmed = input.trim();
   if (trimmed === "") return null;
   const withScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
   try {
      const url = new URL(withScheme);
      if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
      if (!url.hostname.includes(".")) return undefined;
      return url.toString();
   } catch {
      return undefined;
   }
}

/** "https://www.lecreuset.de/de_DE/..." → "lecreuset.de" */
export function linkLabel(link: string): string {
   try {
      return new URL(link).hostname.replace(/^www\./, "");
   } catch {
      return link;
   }
}

/**
 * The title and description to show a viewer: the original if it's already in
 * their language (or not translated yet), otherwise the translation.
 */
export function localizedWish(
   wish: {
      title: string;
      description: string | null;
      language: Language | null;
      translated_title: string | null;
      translated_description: string | null;
   },
   viewer: Language,
): { title: string; description: string | null; translatedFrom: Language | null } {
   if (
      wish.language == null ||
      wish.language === viewer ||
      wish.translated_title == null
   ) {
      return { title: wish.title, description: wish.description, translatedFrom: null };
   }
   return {
      title: wish.translated_title,
      description: wish.translated_description ?? wish.description,
      translatedFrom: wish.language,
   };
}

/** What a viewer sees and may do with a wish's contributions. */
export function contributionState<
   T extends { name: string; amount: number | null; complete: boolean },
>(
   contributions: Array<T>,
   viewer: string,
): {
   /** Someone's "I'll give this", if any. */
   whole: T | null;
   mine: T | null;
   /** Sum of the amounts people entered. */
   total: number;
   canGiveWhole: boolean;
   canChipIn: boolean;
} {
   const whole = contributions.find((c) => c.complete) ?? null;
   const mine = contributions.find((c) => sameName(c.name, viewer)) ?? null;
   const others = contributions.filter((c) => c !== mine);
   return {
      whole,
      mine,
      total: contributions.reduce((sum, c) => sum + (c.amount ?? 0), 0),
      canGiveWhole: others.length === 0 && mine?.complete !== true,
      canChipIn: mine == null && whole == null,
   };
}

export interface WishlistStrings {
   couple: string;
   date: string;
   title: string;
   gateIntro: string;
   giftNotice: string;
   nameLabel: string;
   openList: string;
   signedAs: string;
   notYou: string;
   languageNav: string;
   loadError: string;
   empty: string;
   summary: (total: number, open: number | null) => string;
   spoilerFreeLabel: string;
   spoilerFreeText: (name: string) => string;
   claim: string;
   yours: string;
   takenBy: (name: string) => string;
   takeBack: string;
   edit: string;
   addHeading: string;
   addIntro: string;
   claimNow: string;
   fieldTitle: string;
   fieldDescription: string;
   fieldPrice: string;
   fieldLink: string;
   optional: string;
   add: string;
   save: string;
   cancel: string;
   delete: string;
   confirmDelete: string;
   invalidPrice: string;
   invalidLink: string;
   alreadyClaimed: string;
   claimAfterAddFailed: string;
   chipIn: string;
   changeShare: string;
   fieldShare: string;
   covered: (total: string, price: string) => string;
   you: string;
   wholeGift: string;
   contributionsLabel: string;
   alreadyShared: string;
   wishGone: string;
   somethingWentWrong: string;
   translatedFrom: (language: Language) => string;
}

export const strings: Record<Language, WishlistStrings> = {
   en: {
      couple: "Katherine & Nino",
      date: "7 November 2026",
      title: "Wishlist",
      gateIntro: "Enter your name so everyone knows who is bringing what.",
      giftNotice:
         "We don’t expect any gifts, but if you wish to give us something, you can use this page to organise and get inspired.",
      nameLabel: "Your name",
      openList: "Continue",
      signedAs: "Signed in as",
      notYou: "Not you?",
      languageNav: "Language",
      loadError: "The list didn’t load. Try reloading the page.",
      empty: "No wishes yet.",
      summary: (total, open) =>
         `${total} ${total === 1 ? "wish" : "wishes"}` +
         (open == null ? "" : ` · ${open} still available`),
      spoilerFreeLabel: "No-spoilers mode",
      spoilerFreeText: (name) =>
         `Hi ${name}. You won’t see who is giving what until the wedding on 7 November.`,
      claim: "I’ll give this",
      yours: "You’re giving this",
      takenBy: (name) => `${name} is giving this`,
      takeBack: "Take back",
      edit: "Edit",
      addHeading: "Add a wish",
      addIntro:
         "Planning something that isn’t on the list? Add it and claim it, so nobody doubles up.",
      claimNow: "I’m giving this myself",
      fieldTitle: "Title",
      fieldDescription: "Description",
      fieldPrice: "Price",
      fieldLink: "Link",
      optional: "optional",
      add: "Add wish",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      confirmDelete: "Really delete?",
      invalidPrice: "That doesn’t look like a price.",
      invalidLink: "That doesn’t look like a web address.",
      alreadyClaimed: "Someone else just claimed this one.",
      claimAfterAddFailed:
         "Your wish was added, but claiming it didn’t work. Use “I’ll give this” on it instead.",
      chipIn: "Chip in",
      changeShare: "Change",
      fieldShare: "Your share",
      covered: (total, price) => `${total} of ${price}`,
      you: "You",
      wholeGift: "Whole gift",
      contributionsLabel: "Contributions",
      alreadyShared:
         "Others are already chipping in, so this one can only be shared now.",
      wishGone: "This wish has just been deleted.",
      somethingWentWrong: "Something went wrong. Please try again.",
      translatedFrom: (language) =>
         `Machine-translated from ${language === "de" ? "German" : "English"}`,
   },
   de: {
      couple: "Katherine & Nino",
      date: "7. November 2026",
      title: "Wunschliste",
      gateIntro: "Gib deinen Namen ein, damit alle wissen, wer was mitbringt.",
      giftNotice:
         "Wir erwarten keine Geschenke. Wenn ihr uns aber etwas schenken möchtet, könnt ihr diese Seite nutzen, um euch zu organisieren und euch inspirieren zu lassen.",
      nameLabel: "Dein Name",
      openList: "Weiter",
      signedAs: "Angemeldet als",
      notYou: "Nicht du?",
      languageNav: "Sprache",
      loadError: "Die Liste konnte nicht geladen werden. Lade die Seite bitte neu.",
      empty: "Noch keine Wünsche.",
      summary: (total, open) =>
         `${total} ${total === 1 ? "Wunsch" : "Wünsche"}` +
         (open == null ? "" : ` · ${open} noch frei`),
      spoilerFreeLabel: "Spoilerfrei",
      spoilerFreeText: (name) =>
         `Hallo ${name}. Wer was schenkt, erfährst du erst bei der Hochzeit am 7. November.`,
      claim: "Das schenke ich",
      yours: "Das schenkst du",
      takenBy: (name) => `${name} schenkt das`,
      takeBack: "Zurücknehmen",
      edit: "Bearbeiten",
      addHeading: "Neuer Wunsch",
      addIntro:
         "Du planst etwas, das nicht auf der Liste steht? Trag es ein und reserviere es, damit nichts doppelt kommt.",
      claimNow: "Das schenke ich selbst",
      fieldTitle: "Titel",
      fieldDescription: "Beschreibung",
      fieldPrice: "Preis",
      fieldLink: "Link",
      optional: "optional",
      add: "Wunsch eintragen",
      save: "Speichern",
      cancel: "Abbrechen",
      delete: "Löschen",
      confirmDelete: "Wirklich löschen?",
      invalidPrice: "Das sieht nicht nach einem Preis aus.",
      invalidLink: "Das sieht nicht nach einer Webadresse aus.",
      alreadyClaimed: "Das hat gerade jemand anderes reserviert.",
      claimAfterAddFailed:
         "Dein Wunsch ist eingetragen, aber das Reservieren hat nicht geklappt. Nutze dort „Das schenke ich“.",
      chipIn: "Mitschenken",
      changeShare: "Ändern",
      fieldShare: "Dein Anteil",
      covered: (total, price) => `${total} von ${price}`,
      you: "Du",
      wholeGift: "Ganzes Geschenk",
      contributionsLabel: "Beiträge",
      alreadyShared: "Andere schenken schon mit, deshalb geht das nur noch gemeinsam.",
      wishGone: "Dieser Wunsch wurde gerade gelöscht.",
      somethingWentWrong: "Etwas ist schiefgelaufen. Bitte versuch es noch einmal.",
      translatedFrom: (language) =>
         `Maschinell übersetzt aus dem ${language === "de" ? "Deutschen" : "Englischen"}`,
   },
};
