import { FontSystem } from "cassidy-styler";

/**
 *
 * @param {string} text
 * @param  {...(Parameters<typeof FontSystem.applyFonts>[1])} targetFonts
 * @returns {string}
 */
export function reverseFonts(text, ...targetFonts) {
  if (!text || typeof text !== "string") return text;
  const fontsToProcess = targetFonts.length
    ? targetFonts.filter((font) => font in FontSystem.fontMap)
    : Object.keys(FontSystem.fontMap);
  if (!fontsToProcess.length) return text;
  let result = text;
  fontsToProcess.forEach((font) => {
    const fontMap = FontSystem.fontMap[font];
    const mappedChars = Object.values(fontMap)
      .filter((v) => v !== "" && v !== undefined)
      .map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    if (!mappedChars) return;
    const regex = new RegExp(mappedChars, "g");
    if (regex.test(result)) {
      result = result.replace(regex, (match) => {
        return (
          Object.keys(fontMap).find((key) => fontMap[key] === match) || match
        );
      });
    }
  });
  return result;
}

export default FontSystem;
