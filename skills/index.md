---
description: "React layer for @mongez/localization that lets translations contain JSX and components. Exports `transX` and `jsxConverter`; the core translation functions (`trans`, `setTranslationsList`, `setCurrentLocaleCode`) come from @mongez/localization. Use for: \"translate text with a link or bold tag inside\", \"embed a React component in a translation\", \"placeholder that is JSX\", \"transX in components\", \"use JSX converter\". Not this package: loading translations, switching locale, plain string `trans`, plurals and locale events → @mongez/localization."
---
# @mongez/react-localization

A small add-on. It provides a converter that turns placeholders into React nodes, and `transX` returns translated JSX. Translation data, locale switching and events all still live in @mongez/localization.

## The 80% path
1. Orient with `overview.md`.
2. Use `transX(key, placeholders)` where placeholders may be elements (`trans-x.md`); it applies `jsxConverter` itself.
3. Optionally register `jsxConverter` globally so `trans` understands JSX too (`jsx-converter.md`).
4. Worked examples: `recipes.md`.

## Conventions and pitfalls
- Install both packages. This one does not re-export the core translation functions.
- Registering `jsxConverter` globally (`setLocalizationConfigurations({ converter })` or `setConverter`) changes what `trans` returns app-wide, so plain-string consumers (titles, attributes) should use `plainTrans`.
- Set locale and translations through @mongez/localization before rendering.
- Give repeated JSX placeholders stable keys if you render them in a list.
