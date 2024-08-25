import React from "react";

/**
 * JSX converter
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
    typeof placeholders !== "object" ||
    Object.keys(placeholders).length === 0
  ) {
    return translation;
  }

  // Split the translation string based on the placeholder pattern
  const parts = translation.split(placeholderPattern);

  // Map over the parts to replace placeholders with React.Fragment
  return parts.map((part, index) => {
    // Check if this part is a placeholder or text
    if (index % 2 === 1) {
      // This is a placeholder (odd index) based on splitting pattern
      const placeholderKey = part; // Get the placeholder key
      const value = placeholders[placeholderKey];
      part = value === undefined || value === null ? placeholderKey : value;
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}
