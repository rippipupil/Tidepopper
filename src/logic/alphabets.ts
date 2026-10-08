export interface Glyph {
  char: string;
  sound: string; // cómo se lee
}

export interface Alphabet {
  id: string;
  name: string;
  language: string;
  keywords: string[]; // para reconocerlo en el tema de un curso
  glyphs: Glyph[];
}

const g = (pairs: string): Glyph[] =>
  pairs
    .trim()
    .split(/\s+/)
    .map((p) => {
      const [char, sound] = p.split(':');
      return { char, sound };
    });

export const ALPHABETS: Alphabet[] = [
  {
    id: 'hiragana',
    name: 'Hiragana',
    language: 'Japonés',
    keywords: ['japon', 'hiragana', 'nihongo'],
    glyphs: g(`あ:a い:i う:u え:e お:o か:ka き:ki く:ku け:ke こ:ko さ:sa し:shi す:su せ:se そ:so た:ta ち:chi つ:tsu て:te と:to
      な:na に:ni ぬ:nu ね:ne の:no は:ha ひ:hi ふ:fu へ:he ほ:ho ま:ma み:mi む:mu め:me も:mo や:ya ゆ:yu よ:yo
      ら:ra り:ri る:ru れ:re ろ:ro わ:wa を:wo ん:n`),
  },
  {
    id: 'katakana',
    name: 'Katakana',
    language: 'Japonés',
    keywords: ['katakana'],
    glyphs: g(`ア:a イ:i ウ:u エ:e オ:o カ:ka キ:ki ク:ku ケ:ke コ:ko サ:sa シ:shi ス:su セ:se ソ:so タ:ta チ:chi ツ:tsu テ:te ト:to
      ナ:na ニ:ni ヌ:nu ネ:ne ノ:no ハ:ha ヒ:hi フ:fu ヘ:he ホ:ho マ:ma ミ:mi ム:mu メ:me モ:mo ヤ:ya ユ:yu ヨ:yo
      ラ:ra リ:ri ル:ru レ:re ロ:ro ワ:wa ヲ:wo ン:n`),
  },
  {
    id: 'cirilico',
    name: 'Cirílico',
    language: 'Ruso',
    keywords: ['ruso', 'cirilico', 'cirílico', 'ucraniano', 'bulgaro', 'búlgaro'],
    glyphs: g(`А:a Б:b В:v Г:g Д:d Е:ye Ё:yo Ж:zh З:z И:i Й:y К:k Л:l М:m Н:n О:o П:p Р:r С:s Т:t У:u Ф:f Х:kh Ц:ts Ч:ch Ш:sh Щ:shch Ъ:(signo-duro) Ы:y Ь:(signo-suave) Э:e Ю:yu Я:ya`),
  },
  {
    id: 'griego',
    name: 'Griego',
    language: 'Griego',
    keywords: ['griego', 'grecia'],
    glyphs: g(`Α:alfa Β:beta Γ:gamma Δ:delta Ε:épsilon Ζ:zeta Η:eta Θ:theta Ι:iota Κ:kappa Λ:lambda Μ:mi Ν:ni Ξ:xi Ο:ómicron Π:pi Ρ:rho Σ:sigma Τ:tau Υ:ípsilon Φ:fi Χ:ji Ψ:psi Ω:omega`),
  },
  {
    id: 'hangul',
    name: 'Hangul',
    language: 'Coreano',
    keywords: ['corean', 'hangul'],
    glyphs: g(`ㄱ:g ㄴ:n ㄷ:d ㄹ:r ㅁ:m ㅂ:b ㅅ:s ㅇ:ng ㅈ:j ㅊ:ch ㅋ:k ㅌ:t ㅍ:p ㅎ:h ㅏ:a ㅑ:ya ㅓ:eo ㅕ:yeo ㅗ:o ㅛ:yo ㅜ:u ㅠ:yu ㅡ:eu ㅣ:i`),
  },
];

export function alphabetById(id: string | undefined): Alphabet | undefined {
  return ALPHABETS.find((a) => a.id === id);
}

/** Adivina el alfabeto por el nombre o el tema del estudio (p. ej. «Japonés básico» → hiragana). */
export function guessAlphabet(text: string): Alphabet | undefined {
  const t = text.toLowerCase();
  return ALPHABETS.find((a) => a.keywords.some((k) => t.includes(k)));
}
