/**
 * The live CPGRAMS grievance-description field states:
 *   "Alphabet A-Z, a-z, number 0-9 and special characters , . - _ ( ) / : & @ # $ % & * ? + = ! ' "
 *    only are allowed in grievance description."
 * This reproduces that rule exactly so we can show a citizen what the real
 * portal would silently delete from their words.
 */
const ALLOWED = new Set(
  [
    ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    ..."abcdefghijklmnopqrstuvwxyz",
    ..."0123456789",
    ...",.-_()/:&@#$%&*?+=!'\"",
    " ",
    "\n",
    "\r",
    "\t",
  ].flat(),
);

export function isAllowedChar(ch: string): boolean {
  return ALLOWED.has(ch);
}

export type SanitizeResult = {
  ascii: string;
  dropped: number;
  total: number;
  droppedPct: number;
  /** True when the text is meaningfully non-Latin, i.e. an Indian script. */
  wouldBeDestroyed: boolean;
};

export function cpgramsSanitize(text: string): SanitizeResult {
  let ascii = "";
  let dropped = 0;
  for (const ch of text) {
    if (ALLOWED.has(ch)) ascii += ch;
    else dropped++;
  }
  const meaningful = [...text].filter((c) => !/\s/.test(c)).length || 1;
  const droppedPct = Math.round((dropped / meaningful) * 100);
  return {
    ascii,
    dropped,
    total: [...text].length,
    droppedPct,
    wouldBeDestroyed: droppedPct >= 25,
  };
}

/** Detect whether a string carries any Indic script characters. */
export function hasIndicScript(text: string): boolean {
  return /[\u0900-\u0DFF]/.test(text);
}
