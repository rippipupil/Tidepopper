// Comparar respuestas escritas sin que importen tildes, mayúsculas ni una errata.

/** Quita tildes, signos y espacios de más: para comparar respuestas escritas. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Distancia de edición (con transposiciones). */
export function levenshtein(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      // Dos letras cambiadas de sitio cuentan como una sola errata.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

/** 'exact' (igual sin contar tildes), 'close' (una errata por cada 6 letras) o 'wrong'. */
export function checkWritten(answer: string, expected: string): 'exact' | 'close' | 'wrong' {
  const a = normalize(answer);
  const e = normalize(expected);
  if (!a) return 'wrong';
  if (a === e) return 'exact';
  return levenshtein(a, e) <= Math.max(1, Math.floor(e.length / 6)) ? 'close' : 'wrong';
}
