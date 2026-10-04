export type Language = "en" | "de";

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

export interface WishlistStrings {
   couple: string;
   date: string;
   title: string;
   gateIntro: string;
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
   somethingWentWrong: string;
}

export const strings: Record<Language, WishlistStrings> = {
   en: {
      couple: "Katherine & Nino",
      date: "7 November 2026",
      title: "Wishlist",
      gateIntro: "Enter your name so everyone knows who is bringing what.",
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
      somethingWentWrong: "Something went wrong. Please try again.",
   },
   de: {
      couple: "Katherine & Nino",
      date: "7. November 2026",
      title: "Wunschliste",
      gateIntro: "Gib deinen Namen ein, damit alle wissen, wer was mitbringt.",
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
      somethingWentWrong: "Etwas ist schiefgelaufen. Bitte versuch es noch einmal.",
   },
};
