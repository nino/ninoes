// Random names for the /new-name page: half of them real names, half invented by
// stringing syllables together for a sci-fi or fantasy sound. Real names come from
// one of several languages, so some have accents or are written in Chinese,
// Japanese or Korean.

/** Returns a number in [0, 1), like `Math.random`. */
export type Random = () => number;

/** Share of names built from the real-name lists rather than invented. */
export const realNameChance = 0.5;
export const middleNameChance = 0.15;
/** Share of invented words that get one accented vowel. */
export const inventedAccentChance = 0.15;

/**
 * How a name's parts go together. `given-first` is "Anna Maria Novak",
 * `family-first` is "Nguyễn Văn An", and `cjk` is family name then given name
 * with no space and no middle name, as in "王浩然".
 */
export type NameStyle = "given-first" | "family-first" | "cjk";

export interface NameCulture {
   language: string;
   /**
    * Language tag for the page's `lang` attribute, so screen readers pronounce
    * the name and Chinese and Japanese get their own glyph shapes. Left out for
    * the mixed Nordic list.
    */
   lang?: string;
   style: NameStyle;
   /** How often this culture comes up, relative to the others. */
   weight: number;
   given: ReadonlyArray<string>;
   family: ReadonlyArray<string>;
}

export const cultures: ReadonlyArray<NameCulture> = [
   {
      language: "English",
      lang: "en",
      style: "given-first",
      weight: 4,
      given: [
         "Ada",
         "Alice",
         "Arthur",
         "Beatrice",
         "Ben",
         "Caleb",
         "Charlotte",
         "Clara",
         "Daniel",
         "Eliza",
         "Emma",
         "Ezra",
         "George",
         "Grace",
         "Hannah",
         "Harriet",
         "Henry",
         "Isaac",
         "Ivy",
         "James",
         "Josephine",
         "Lucy",
         "Mabel",
         "Maya",
         "Noah",
         "Nora",
         "Oliver",
         "Oscar",
         "Peter",
         "Ruth",
         "Samuel",
         "Stella",
         "Theo",
         "Thomas",
         "Walter",
         "Zoe",
      ],
      family: [
         "Abbott",
         "Bell",
         "Brooks",
         "Carter",
         "Clarke",
         "Ellis",
         "Fleming",
         "Hall",
         "Hughes",
         "Murphy",
         "Quinn",
         "Sullivan",
         "Walsh",
         "Wright",
         "Young",
      ],
   },
   {
      language: "German",
      lang: "de",
      style: "given-first",
      weight: 1,
      given: [
         "Jürgen",
         "Jörg",
         "Anneliese",
         "Günther",
         "Käthe",
         "Lotte",
         "Matthias",
         "Sören",
         "Ulrike",
         "Bärbel",
         "Frieda",
         "Konrad",
      ],
      family: [
         "Müller",
         "Schäfer",
         "Köhler",
         "Größer",
         "Hoffmann",
         "Krüger",
         "Weiß",
         "Böhm",
         "Fuchs",
         "Schröder",
         "Vogel",
         "Zimmermann",
      ],
   },
   {
      language: "French",
      lang: "fr",
      style: "given-first",
      weight: 1,
      given: [
         "Hélène",
         "Amélie",
         "Élodie",
         "Gaël",
         "Noémie",
         "Jérôme",
         "Léa",
         "Clément",
         "Anaïs",
         "François",
         "Thérèse",
         "Benoît",
      ],
      family: [
         "Lefèvre",
         "Dubois",
         "Moreau",
         "Girard",
         "Rousseau",
         "Bérard",
         "Chevalier",
         "Mercier",
         "Lemaître",
         "Faure",
         "Gauthier",
         "Ménard",
      ],
   },
   {
      language: "Spanish",
      lang: "es",
      style: "given-first",
      weight: 1,
      given: [
         "José",
         "María",
         "Inés",
         "Iñigo",
         "Lucía",
         "Andrés",
         "Sofía",
         "Raúl",
         "Ramón",
         "Begoña",
         "Óscar",
         "Martín",
      ],
      family: [
         "Núñez",
         "Martínez",
         "Gómez",
         "Ibáñez",
         "Peña",
         "Muñoz",
         "Sánchez",
         "Fernández",
         "Jiménez",
         "Castillo",
         "Ortega",
         "Rodríguez",
      ],
   },
   {
      language: "Portuguese",
      lang: "pt",
      style: "given-first",
      weight: 1,
      given: [
         "João",
         "Conceição",
         "Gonçalo",
         "Inês",
         "Tomás",
         "Leonor",
         "Sebastião",
         "Luís",
         "Mariana",
         "Simão",
      ],
      family: [
         "Gonçalves",
         "Magalhães",
         "Simões",
         "Guimarães",
         "Araújo",
         "Lopes",
         "Brandão",
         "Nogueira",
         "Silva",
         "Pereira",
      ],
   },
   {
      language: "Nordic",
      style: "given-first",
      weight: 1,
      given: [
         "Søren",
         "Åsa",
         "Bjørn",
         "Sigrún",
         "Märta",
         "Þórunn",
         "Ástrid",
         "Ørjan",
         "Linnéa",
         "Håkon",
         "Freyja",
         "Oddný",
      ],
      family: [
         "Ødegård",
         "Åberg",
         "Sjöberg",
         "Bjørnstad",
         "Þórsdóttir",
         "Lindqvist",
         "Hjálmarsson",
         "Strøm",
         "Engström",
         "Nyström",
      ],
   },
   {
      language: "Polish",
      lang: "pl",
      style: "given-first",
      weight: 1,
      given: [
         "Łukasz",
         "Małgorzata",
         "Wojciech",
         "Zofia",
         "Agnieszka",
         "Michał",
         "Radosław",
         "Jadwiga",
      ],
      family: [
         "Wójcik",
         "Kowalczyk",
         "Wiśniewski",
         "Lewandowska",
         "Zieliński",
         "Dąbrowski",
         "Jabłońska",
         "Woźniak",
      ],
   },
   {
      language: "Czech",
      lang: "cs",
      style: "given-first",
      weight: 1,
      given: [
         "Jiří",
         "Kateřina",
         "Bořek",
         "Žofie",
         "Šárka",
         "Radek",
         "Tereza",
         "Ondřej",
      ],
      family: [
         "Dvořák",
         "Nováková",
         "Černý",
         "Procházka",
         "Svobodová",
         "Kříž",
         "Růžička",
         "Horáková",
      ],
   },
   {
      language: "Turkish",
      lang: "tr",
      style: "given-first",
      weight: 1,
      given: [
         "Çağla",
         "Gökhan",
         "Şule",
         "Ömer",
         "Ayşe",
         "Barış",
         "Gülşen",
         "İlker",
         "Özge",
         "Emre",
      ],
      family: [
         "Öztürk",
         "Yıldız",
         "Çelik",
         "Şahin",
         "Doğan",
         "Aydın",
         "Güneş",
         "Kılıç",
         "Erdoğan",
         "Özdemir",
      ],
   },
   {
      language: "Vietnamese",
      lang: "vi",
      style: "family-first",
      weight: 1,
      given: [
         "An",
         "Bảo",
         "Châu",
         "Dũng",
         "Hà",
         "Hương",
         "Khánh",
         "Linh",
         "Ngọc",
         "Phương",
         "Quang",
         "Thảo",
         "Tuấn",
         "Vy",
      ],
      family: [
         "Nguyễn",
         "Trần",
         "Lê",
         "Phạm",
         "Hoàng",
         "Huỳnh",
         "Phan",
         "Vũ",
         "Võ",
         "Đặng",
         "Bùi",
         "Đỗ",
      ],
   },
   {
      language: "Chinese",
      lang: "zh-Hans",
      style: "cjk",
      weight: 1,
      given: [
         "伟",
         "芳",
         "秀英",
         "敏",
         "静",
         "磊",
         "婷",
         "子涵",
         "浩然",
         "欣怡",
         "宇轩",
         "雨桐",
      ],
      family: ["王", "李", "张", "刘", "陈", "杨", "黄", "赵", "周", "吴", "林", "郭"],
   },
   {
      language: "Japanese",
      lang: "ja",
      style: "cjk",
      weight: 1,
      given: [
         "陽翔",
         "蓮",
         "結衣",
         "葵",
         "美咲",
         "大輝",
         "さくら",
         "健太",
         "花子",
         "翔太",
         "ひなた",
         "悠真",
      ],
      family: [
         "佐藤",
         "鈴木",
         "高橋",
         "田中",
         "伊藤",
         "渡辺",
         "山本",
         "中村",
         "小林",
         "加藤",
         "吉田",
         "山田",
      ],
   },
   {
      language: "Korean",
      lang: "ko",
      style: "cjk",
      weight: 1,
      given: [
         "민준",
         "서연",
         "지우",
         "하준",
         "서윤",
         "도윤",
         "지민",
         "예은",
         "현우",
         "수아",
         "시우",
         "하은",
      ],
      family: ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오"],
   },
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

// Accented forms for invented words, e.g. "Vaëlin" or "Thóren".
const accented: Record<string, ReadonlyArray<string>> = {
   a: ["á", "ä", "â"],
   e: ["é", "ë", "ê"],
   i: ["í", "ï"],
   o: ["ó", "ö", "ô"],
   u: ["ú", "ü"],
};

export interface GeneratedName {
   given: string;
   middle: string | null;
   family: string;
   style: NameStyle;
   /** Language tag, for real names from a single language. */
   lang: string | null;
   /** True when the parts come from the real-name lists. */
   real: boolean;
}

export function formatName(name: GeneratedName): string {
   switch (name.style) {
      case "given-first":
         return join(name.given, name.middle, name.family);
      case "family-first":
         return join(name.family, name.middle, name.given);
      case "cjk":
         return name.family + name.given;
   }
}

function join(...parts: Array<string | null>): string {
   return parts.filter((part) => part != null).join(" ");
}

export function generateName(random: Random = Math.random): GeneratedName {
   const real = random() < realNameChance;
   const hasMiddle = random() < middleNameChance;
   if (real) {
      const culture = pickCulture(random);
      const given = pick(culture.given, random);
      return {
         given,
         middle:
            hasMiddle && culture.style !== "cjk"
               ? pickOther(culture.given, given, random)
               : null,
         family: pick(culture.family, random),
         style: culture.style,
         lang: culture.lang ?? null,
         real,
      };
   }
   return {
      given: inventWord(2, 3, random),
      middle: hasMiddle ? inventWord(1, 2, random) : null,
      family: inventWord(2, 3, random),
      style: "given-first",
      lang: null,
      real,
   };
}

function pickCulture(random: Random): NameCulture {
   const total = cultures.reduce((sum, culture) => sum + culture.weight, 0);
   let roll = random() * total;
   for (const culture of cultures) {
      roll -= culture.weight;
      if (roll < 0) return culture;
   }
   return cultures[cultures.length - 1];
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
   if (random() < inventedAccentChance) word = accentOneVowel(word, random);
   return word.charAt(0).toUpperCase() + word.slice(1);
}

/** Swaps one plain vowel in the word for an accented one. */
function accentOneVowel(word: string, random: Random): string {
   // Invented words are plain ASCII, so string indices are characters.
   const positions: Array<number> = [];
   for (let i = 0; i < word.length; i++) {
      if (word[i] in accented) positions.push(i);
   }
   if (positions.length === 0) return word;
   const at = pick(positions, random);
   return word.slice(0, at) + pick(accented[word[at]], random) + word.slice(at + 1);
}

/** Picks an item other than `not`. */
function pickOther(items: ReadonlyArray<string>, not: string, random: Random): string {
   const others = items.filter((item) => item !== not);
   return pick(others, random);
}

function pick<T>(items: ReadonlyArray<T>, random: Random): T {
   return items[Math.floor(random() * items.length)];
}
