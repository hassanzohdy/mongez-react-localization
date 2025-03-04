import { getTranslationLocaleCode, transFrom } from "@mongez/localization";
import { jsxConverter } from "./converters";

/**
 * Translate for jsx
 */
export function transX(keyword: string, placeholders?: any) {
  return transFrom(
    getTranslationLocaleCode(),
    keyword,
    placeholders,
    jsxConverter,
  );
}
