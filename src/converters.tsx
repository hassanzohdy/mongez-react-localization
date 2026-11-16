import React from "react";

/**
 * Hyphen-separated segments directly after a placeholder name, e.g. `-min` or `-min-x`
 */
const hyphenTailPattern = /^(?:-[a-zA-Z0-9_]+)+/;

/**
 * JSX converter
 *
 * A placeholder followed by hyphen segments uses the longest hyphenated key present
 * in the placeholders object (`:minutes-min` with `{ "minutes-min": 5 }` gives `5`).
 * Otherwise the name is used on its own and the segments stay as text, the same rule
 * as `plainConverter` in `@mongez/localization` 3.5.2, whose default colon pattern
 * stops at a hyphen.
 *
 * @param translation The translation string containing placeholders.
 * @param placeholders An object mapping placeholder names to their values.
 * @param placeholderPattern A RegExp pattern for matching placeholders in the translation string.
 * @returns An array of React elements where placeholders are replaced with their corresponding values.
 */
export function jsxConverter(
  translation: string,
  placeholders: any,
  placeholderPattern: RegExp,
) {
  if (
    placeholders == null ||
    typeof placeholders !== "object" ||
    Object.keys(placeholders).length === 0
  ) {
    return translation;
  }

  // Every occurrence is replaced, whatever the pattern's flags (as `split` did):
  // force `g` and drop `y`, which would stop at the first gap between matches.
  const pattern = new RegExp(
    placeholderPattern.source,
    `${placeholderPattern.flags.replace(/[gy]/g, "")}g`,
  );

  // Text and placeholders alternate: text at even indexes, placeholders at odd ones.
  const parts: any[] = [];
  let cursor = 0;

  for (const match of translation.matchAll(pattern)) {
    const start = match.index!;

    if (start < cursor) continue;

    const [text, key] = match;
    const matchEnd = start + text.length;

    // hyphen segments only extend a name that ends the match (`:name-x`, not `{{name}}-x`)
    const segments =
      key !== undefined && text.endsWith(key)
        ? translation
            .slice(matchEnd)
            .match(hyphenTailPattern)?.[0]
            .match(/-[a-zA-Z0-9_]+/g)
        : undefined;

    let placeholderKey = key;
    let consumed = 0;

    if (segments) {
      // longest hyphenated key first
      for (let count = segments.length; count > 0; count--) {
        const suffix = segments.slice(0, count).join("");
        if (placeholders[key + suffix] != null) {
          placeholderKey = key + suffix;
          consumed = suffix.length;
          break;
        }
      }
    }

    const value = placeholders[placeholderKey];

    parts.push(translation.slice(cursor, start));
    // A missing value renders the bare key (without the leading colon).
    parts.push(value === undefined || value === null ? placeholderKey : value);
    cursor = matchEnd + consumed;
  }

  parts.push(translation.slice(cursor));

  return parts.map((part, index) => (
    <React.Fragment key={index}>{part}</React.Fragment>
  ));
}
