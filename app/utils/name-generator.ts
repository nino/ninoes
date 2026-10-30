// Random names for the /new-name page: half of them real names, half invented by
// stringing syllables together for a sci-fi or fantasy sound.

/** Returns a number in [0, 1), like `Math.random`. */
export type Random = () => number;

/** Share of names built from the real-name lists rather than invented. */
export const realNameChance = 0.5;
export const middleNameChance = 0.15;

export const realFirstNames: ReadonlyArray<string> = [
   "Ada",
   "Alice",
   "Amara",
   "Anna",
   "Arthur",
   "Beatrice",
   "Ben",
   "Caleb",
   "Camille",
   "Carlos",
   "Charlotte",
   "Clara",
   "Daniel",
   "David",
   "Elena",
   "Eliza",
   "Emil",
   "Emma",
   "Ezra",
   "Felix",
   "Frida",
   "George",
   "Grace",
   "Hannah",
   "Harriet",
   "Henry",
   "Hugo",
   "Ingrid",
   "Iris",
   "Isaac",
   "Ivy",
   "James",
   "Jonas",
   "Josephine",
   "Julia",
   "Kai",
   "Laura",
   "Leo",
   "Lena",
   "Lucas",
   "Lucy",
   "Luis",
   "Mabel",
   "Maya",
   "Margot",
   "Marta",
   "Matteo",
   "Max",
   "Mila",
   "Miriam",
   "Nadia",
   "Nina",
   "Noah",
   "Nora",
   "Oliver",
   "Olga",
   "Oscar",
   "Paula",
   "Peter",
   "Priya",
   "Rosa",
   "Ruth",
   "Samuel",
   "Sara",
   "Simon",
   "Sofia",
   "Stella",
   "Theo",
   "Thomas",
   "Tobias",
   "Vera",
   "Viktor",
   "Walter",
   "Yara",
   "Zoe",
];

export const realLastNames: ReadonlyArray<string> = [
   "Abbott",
   "Alvarez",
   "Bauer",
   "Becker",
   "Bell",
   "Bianchi",
   "Brooks",
   "Carter",
   "Castillo",
   "Chen",
   "Clarke",
   "Costa",
   "Dubois",
   "Ellis",
   "Fischer",
   "Fleming",
   "Garcia",
   "Hall",
   "Hartmann",
   "Hughes",
   "Ivanova",
   "Jensen",
   "Kaur",
   "Keller",
   "Kowalski",
   "Larsen",
   "Lindqvist",
   "Lopez",
   "Martin",
   "Meyer",
   "Moreau",
   "Murphy",
   "Nakamura",
   "Novak",
   "Okafor",
   "Olsen",
   "Park",
   "Patel",
   "Quinn",
   "Reyes",
   "Romano",
   "Rossi",
   "Sato",
   "Schmidt",
   "Silva",
   "Sullivan",
   "Tanaka",
   "Torres",
   "Vogel",
   "Wagner",
   "Walsh",
   "Weber",
   "Wright",
   "Young",
   "Zimmermann",
];

// Syllables are an optional onset, a vowel sound and an optional coda.
const onsets = [
   "b",
   "d",
   "f",
   "g",
   "h",
   "j",
   "k",
   "kh",
   "l",
   "m",
   "n",
   "p",
   "r",
   "s",
   "sh",
   "t",
   "th",
   "v",
   "y",
   "z",
   "zh",
];
const clusterOnsets = ["br", "dr", "gr", "kr", "sk", "tr", "vr"];
const vowels = ["a", "a", "e", "e", "i", "o", "o", "u", "ae", "ai", "ei", "ia"];
// A word that starts on a vowel starts on a plain one.
const plainVowels = ["a", "e", "i", "o", "u"];
const codas = ["l", "n", "r", "s", "th", "x", "k", "m", "nd", "rn", "sh", "z"];
// Inside a word only soft codas, so they don't jam into the next onset.
const innerCodas = ["l", "n", "r"];

export interface GeneratedName {
   first: string;
   middle: string | null;
   last: string;
   /** True when the parts come from the real-name lists. */
   real: boolean;
}

export function formatName(name: GeneratedName): string {
   return [name.first, name.middle, name.last].filter((part) => part != null).join(" ");
}

export function generateName(random: Random = Math.random): GeneratedName {
   const real = random() < realNameChance;
   const hasMiddle = random() < middleNameChance;
   if (real) {
      const first = pick(realFirstNames, random);
      return {
         first,
         middle: hasMiddle ? pickOther(realFirstNames, first, random) : null,
         last: pick(realLastNames, random),
         real,
      };
   }
   return {
      first: inventWord(2, 3, random),
      middle: hasMiddle ? inventWord(1, 2, random) : null,
      last: inventWord(2, 3, random),
      real,
   };
}

/** A capitalised word of `min` to `max` syllables. */
export function inventWord(
   min: number,
   max: number,
   random: Random = Math.random,
): string {
   const count = min + Math.floor(random() * (max - min + 1));
   let word = "";
   let afterConsonant = false;
   for (let i = 0; i < count; i++) {
      const last = i === count - 1;
      // Words may start on a vowel, but later syllables need an onset so vowels
      // don't pile up.
      const bare = i === 0 && random() < 0.2;
      // Clusters only now and then, and never straight after a consonant.
      const cluster = !bare && !afterConsonant && random() < 0.2;
      const onset = bare ? "" : pick(cluster ? clusterOnsets : onsets, random);
      const vowel = pick(bare ? plainVowels : vowels, random);
      const coda =
         random() < (last ? 0.6 : 0.2) ? pick(last ? codas : innerCodas, random) : "";
      word += onset + vowel + coda;
      afterConsonant = coda !== "";
   }
   return word.charAt(0).toUpperCase() + word.slice(1);
}

/** Picks an item other than `not`. */
function pickOther(items: ReadonlyArray<string>, not: string, random: Random): string {
   const others = items.filter((item) => item !== not);
   return pick(others, random);
}

function pick<T>(items: ReadonlyArray<T>, random: Random): T {
   return items[Math.floor(random() * items.length)];
}
