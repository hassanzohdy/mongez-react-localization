<div align="center">

# @mongez/react-localization

**The React adapter for [`@mongez/localization`](https://github.com/hassanzohdy/mongez-localization) — drop React elements straight into translated sentences without losing structure, reactivity, or RTL ordering.**

[![npm](https://img.shields.io/npm/v/@mongez/react-localization.svg)](https://www.npmjs.com/package/@mongez/react-localization)
[![license](https://img.shields.io/npm/l/@mongez/react-localization.svg)](LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@mongez/react-localization.svg)](https://bundlephobia.com/package/@mongez/react-localization)
[![downloads](https://img.shields.io/npm/dw/@mongez/react-localization.svg)](https://www.npmjs.com/package/@mongez/react-localization)

</div>

---

## Why @mongez/react-localization?

`react-i18next` ships a full provider, hooks, suspense pipeline, and its own message format — about 14 KB minzipped of machinery you opt into wholesale. `react-intl` (FormatJS) leans on ICU MessageFormat and a `<FormattedMessage>` component pattern, dragging in a parser plus locale data per language. `react-intl-universal` is lighter but still owns the registry, locale switching, and message format.

`@mongez/react-localization` is the **React-only sliver** on top of [`@mongez/localization`](https://github.com/hassanzohdy/mongez-localization) — the framework-agnostic core that already owns registries, locale switching, count rules, placeholders, and events. The adapter exports exactly two things: a JSX-aware placeholder converter so `trans(:tos)` can interpolate `<a>Terms</a>`, and `transX` — a `trans` variant pre-bound to that converter for per-call JSX without flipping the global setting. One source file, no provider, no context, no hooks of its own.

```tsx
import { extend, setLocalizationConfigurations, trans } from "@mongez/localization";
import { jsxConverter } from "@mongez/react-localization";

setLocalizationConfigurations({ converter: jsxConverter });
extend("en", { agreeToTerms: "You agree to our :tos." });

<p>{trans("agreeToTerms", { tos: <a href="/terms">Terms</a> })}</p>
// → <p>You agree to our <a href="/terms">Terms</a>.</p>
```

---

## Features

| Feature | Description |
|---|---|
| **`jsxConverter`** | A placeholder-to-React converter. Wire once via `setLocalizationConfigurations({ converter: jsxConverter })` and every `trans(...)` accepts React elements as placeholder values. |
| **`transX`** | A `trans` variant hard-bound to `jsxConverter`. Use per call when the global converter is left as `plainConverter` and only specific call sites need JSX. |
| **Pattern-agnostic** | Honors whatever placeholder pattern the core uses — `:colon`, `{{doubleCurly}}`, or a custom RegExp. The pattern is passed in by the caller. |
| **Missing-key fallback** | If a `:token` is in the template but not in the placeholders bag, the bare key renders as text. No crash, no `[object Object]`. |
| **Deterministic React keys** | Each fragment gets a numeric `key` derived from the split index — no "each child should have a unique key" warnings. |
| **Tiny surface** | Two exports, one source file. No provider, no context, no hooks. Pairs with whatever state library you already use. |
| **TypeScript-first** | Signatures returned by `jsxConverter` and `transX` are `string | React.ReactNode[]` — the array branch fires when at least one placeholder resolves. |
| **Pluralization-ready** | Count routing lives in `@mongez/localization`. `transX` flows the `count` placeholder through unchanged. |

---

## Installation

```sh
npm install @mongez/react-localization @mongez/localization
```

```sh
yarn add @mongez/react-localization @mongez/localization
```

```sh
pnpm add @mongez/react-localization @mongez/localization
```

Peer dependencies: `@mongez/localization >= 3.0.0` and `react >= 18`.

---

## Quick start

Pick one of the two paths below and stick to it for the project.

### Path A — wire `jsxConverter` globally

Best when most of your translations interpolate React elements (links, icons, formatted spans). Every `trans(...)` call understands JSX from that point on.

```tsx
import {
  extend,
  setLocalizationConfigurations,
  trans,
} from "@mongez/localization";
import { jsxConverter } from "@mongez/react-localization";

setLocalizationConfigurations({
  defaultLocaleCode: "en",
  fallback: "en",
  converter: jsxConverter,
});

extend("en", {
  minimumOrderPurchase:
    "Minimum purchase amount for this order is :amount USD",
});

export function PriceNotice() {
  return (
    <p>
      {trans("minimumOrderPurchase", {
        amount: <strong style={{ color: "red" }}>12</strong>,
      })}
    </p>
  );
}
```

The return type of `trans(...)` widens from `string` to `string | React.ReactNode[]` — keep that in mind for call sites that pass the result to string-typed APIs like `document.title`.

### Path B — keep `plainConverter`, use `transX` per call

Best when most translations are plain strings and only a handful of call sites need JSX. `trans(...)` stays typed as `string` everywhere; `transX(...)` widens only where you actually need React elements.

```tsx
import { extend, trans } from "@mongez/localization";
import { transX } from "@mongez/react-localization";

extend("en", {
  greeting: "Hello :name",
  agreeToTerms: "You agree to our :tos.",
});

trans("greeting", { name: "Alice" });
// → "Hello Alice" (string)

transX("agreeToTerms", { tos: <a href="/terms">Terms</a> });
// → React fragment array, rendered as a real <a> in the DOM.
```

> The two paths are mutually exclusive — pick one. Mixing `jsxConverter` globally **and** `transX` at call sites produces identical output, but the extra import is noise.

---

## `jsxConverter`

```ts
function jsxConverter(
  translation: string,
  placeholders: any,
  placeholderPattern: RegExp,
): string | React.ReactNode[];
```

Splits `translation` on `placeholderPattern`, substitutes each captured token from `placeholders`, and reassembles the parts as an array of `React.Fragment` children.

| Behaviour | Result |
|---|---|
| `placeholders` is `null`, `undefined`, a primitive, or `{}` | Returns `translation` unchanged as a `string`. No split, no array. |
| `placeholders` has at least one entry | Returns `Array<React.ReactNode>` of fragments. Render via `{out}` inside any JSX expression slot. |
| Token in template, missing in placeholders bag | Falls back to the bare key (e.g. `Create new :item` → `"Create new item"`). The leading `:` is gone because the splitter captured only the name. |
| Placeholder value is a React element | Renders as the element — the surrounding text stays as plain string. |
| Placeholder value is `null` / `undefined` | Same as missing — bare key renders. |
| Pattern is `:colon` / `{{doubleCurly}}` / custom | Honored as supplied — the pattern is sourced from `@mongez/localization`'s `placeholderPattern` config. |

The function is pure — same inputs, same output. No React hooks, no subscriptions, no side effects.

---

## `transX`

```ts
function transX(keyword: string, placeholders?: any): string | React.ReactNode[];
```

Equivalent to:

```ts
import { getTranslationLocaleCode, transFrom } from "@mongez/localization";
import { jsxConverter } from "@mongez/react-localization";

transFrom(getTranslationLocaleCode(), keyword, placeholders, jsxConverter);
```

`transX` hard-codes `jsxConverter` as the converter argument, ignoring whatever is set via `setLocalizationConfigurations({ converter })`. That's the entire point of the function.

Because it delegates to `transFrom`, it inherits every feature of the core package:

- Locale resolution via `getTranslationLocaleCode()` (translation locale, falling back to current locale).
- Fallback locale via `setFallbackLocaleCode()`.
- Missing-keyword fallback (returns the keyword itself if nothing resolves).
- Count-based pluralization when `placeholders.count` is set.
- Object-shaped keyword support (`transX({ en: "Hello", ar: "مرحبا" })`).

> **No locale-change subscription.** `transX` is a plain function call that reads `getTranslationLocaleCode()` once and returns. Components that already rendered will keep their old translation when `setCurrentLocaleCode("ar")` fires — drive the re-render through state, an atom, or a `useSyncExternalStore` over `localizationEvents`. See [Recipes](#recipes).

---

## Hooks and components — what's NOT in the box

This package intentionally ships **no** `useLocale()` hook, `useTranslate()` hook, `<Translate>` component, or context provider. All three are recipes built on top of what's exported — one-liners that compose with whatever state library you already use.

| Concern | Lives where |
|---|---|
| Translation registry, locale switching, count rules, events | [`@mongez/localization`](https://github.com/hassanzohdy/mongez-localization) |
| JSX placeholder support | `@mongez/react-localization` (this package) |
| Locale-driven re-renders | Your state library — `@mongez/react-atom`, Zustand, Redux, or a custom hook over `localizationEvents` |

If you build a `useLocale()` on top, prefer `useSyncExternalStore` over the older `useState + useEffect(localizationEvents.onChange(...))` pattern — see [Recipes](#recipes). The latter has a known stale-read window under React 18 concurrent rendering.

---

## Recipes

### Render a translation with embedded React component

Reach for this when a localized sentence needs a link, icon, or styled span inline — typical for terms-of-service notices, prompts with branded names, or any UI where the translator owns the surrounding wording.

```tsx
import { extend } from "@mongez/localization";
import { transX } from "@mongez/react-localization";

extend("en", {
  agreeToTerms:
    "By clicking Continue, you agree to our :tos and :privacy.",
});

extend("ar", {
  agreeToTerms:
    "بالنقر على متابعة، فإنك توافق على :tos و :privacy.",
});

function CheckoutFooter() {
  return (
    <p>
      {transX("agreeToTerms", {
        tos: <a href="/terms">Terms of Service</a>,
        privacy: <a href="/privacy">Privacy Policy</a>,
      })}
    </p>
  );
}
```

The result is a fragment array; React renders each fragment in document order, preserving the original sentence structure of the translation — including in RTL locales where the visual order differs from the source order.

### Switch locale on user action

Lift the locale into local state and mirror it into the core in an effect. This is the simplest re-render path — no extra dependency, every consumer re-mounts on switch.

```tsx
import { useEffect, useState } from "react";
import { setCurrentLocaleCode } from "@mongez/localization";
import { transX } from "@mongez/react-localization";

function App() {
  const [locale, setLocale] = useState<"en" | "ar">("en");

  useEffect(() => {
    setCurrentLocaleCode(locale);
  }, [locale]);

  return (
    <>
      <button onClick={() => setLocale(l => (l === "en" ? "ar" : "en"))}>
        {transX("toggleLocale")}
      </button>
      {/* `key={locale}` forces children to remount on switch */}
      <Page key={locale} />
    </>
  );
}
```

The `key={locale}` trick is the cheapest way to re-render every consumer when the locale flips, at the cost of unmounting the subtree. For surgical re-renders without the remount, see the next recipe.

### Build a `useLocale()` hook over the event bus

Reach for this when you want components to subscribe to locale changes individually — no parent state, no remount, no extra dependency. Use `useSyncExternalStore` to stay tear-free under React 18 concurrent rendering.

```ts
import { useSyncExternalStore } from "react";
import {
  getCurrentLocaleCode,
  localizationEvents,
} from "@mongez/localization";

export function useLocale(): string {
  return useSyncExternalStore(
    (notify) => {
      const sub = localizationEvents.onChange("localeCode", notify);
      return () => sub.unsubscribe();
    },
    () => getCurrentLocaleCode(),
    () => getCurrentLocaleCode(),
  );
}
```

```tsx
import { transX } from "@mongez/react-localization";

function Title() {
  useLocale(); // subscribes; re-renders on flip
  return <h1>{transX("title")}</h1>;
}
```

> **Don't reach for `useState + useEffect(localizationEvents.onChange(...))`.** It looks equivalent but introduces a stale-read window between the synchronous render snapshot and the effect-time subscription — siblings can disagree on the locale under concurrent rendering. `useSyncExternalStore` collapses the snapshot and subscribe into one tear-free operation.

### Render plural forms with count

Pluralization lives in `@mongez/localization`'s count rules. `transX` flows the `count` placeholder through, picks the right `_zero` / `_one` / `_two` / `_few` / `_many` variant per locale, and runs the result through `jsxConverter`.

```tsx
import { extend } from "@mongez/localization";
import { transX } from "@mongez/react-localization";

extend("en", {
  products_zero: "No products",
  products_one: "1 product",
  products_many: ":count products",
});

extend("ar", {
  products_zero: "لا توجد منتجات",
  products_one: "منتج واحد",
  products_two: "منتجان",
  products_few: ":count منتجات",
  products_many: ":count منتجاً",
});

function ProductsBadge({ count }: { count: number }) {
  return <span>{transX("products", { count })}</span>;
}

// <ProductsBadge count={0} />  → "No products"
// <ProductsBadge count={1} />  → "1 product"
// <ProductsBadge count={42} /> → "42 products"
```

> When `count` is present in the placeholders bag, the converter runs even for templates with no `:count` token (like `_one` → `"1 product"`), so the return is always a fragment array. Render into an element or wrap in `<>{...}</>` — don't pass it to a `string`-typed API.

### Write a tiny `<Translate>` component

Some teams prefer a JSX-in / JSX-out shape over `{transX(...)}` calls. Trivial to write on top of the two exports.

```tsx
import { transX } from "@mongez/react-localization";

type TranslateProps = {
  k: string;
  placeholders?: any;
};

export function Translate({ k, placeholders }: TranslateProps) {
  return <>{transX(k, placeholders)}</>;
}

// Usage:
<Translate k="welcome" placeholders={{ name: <strong>Ada</strong> }} />
```

The function-call shape composes more cleanly with `transObject`, `groupedTranslations`, and conditionals — that's why the package doesn't ship the component itself — but the wrapper is a one-liner if your codebase prefers it.

---

## Related packages

| Package | Use when you need |
|---|---|
| [`@mongez/localization`](https://github.com/hassanzohdy/mongez-localization) | The framework-agnostic core. Registry, locale switching, count rules, fallback, events — `extend`, `trans`, `transFrom`, `setCurrentLocaleCode`, `localizationEvents`, `groupedTranslations`, `transObject` all live here. |
| [`@mongez/react-atom`](https://github.com/hassanzohdy/mongez-react-atom) | Reactive state primitive with React hooks. Drop the locale into an atom and `useValue()` subscribes a component to changes — cleaner than the `key=` remount trick. |
| [`@mongez/events`](https://github.com/hassanzohdy/events) | Event bus. Used internally by `@mongez/localization` to broadcast `localizationEvents` — pairs well with a `useSyncExternalStore`-based `useLocale()` hook. |

---

## Further reading

- [`llms.txt`](./llms.txt) and [`llms-full.txt`](./llms-full.txt) — single-file API surface for tool-assisted development.
- [`skills/`](./skills) — per-topic deep-dives (overview, `jsxConverter`, `transX`, recipes).
- [`CHANGELOG.md`](./CHANGELOG.md) — release notes.

---

## License

MIT — see [LICENSE](./LICENSE).
