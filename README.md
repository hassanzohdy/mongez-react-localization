# @mongez/react-localization

> React adapter for [`@mongez/localization`](https://github.com/hassanzohdy/mongez-localization). Adds a JSX-aware placeholder converter so `trans(...)` can interpolate React elements, plus `transX` — a JSX-bound translate function that works regardless of which converter is configured globally.

`@mongez/localization` is the framework-agnostic core: registries, locale switching, count rules, placeholders, events. This adapter is the React-side bridge — small on purpose. It does **one thing**: replace `:placeholder` (or `{{placeholder}}`) tokens in a translation with React children, so you can drop `<strong>`, `<a href>`, or any component straight into a translated sentence without losing reactivity or escaping its props.

## Install

```sh
yarn add @mongez/react-localization
# peer: @mongez/localization, react >= 18
```

## A 30-second tour

```tsx
import { extend, setLocalizationConfigurations, trans } from "@mongez/localization";
import { jsxConverter, transX } from "@mongez/react-localization";

// 1. Wire the JSX converter globally — now every `trans(...)` understands JSX.
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

// 2. Don't want to flip the global converter? Use `transX` per call.
//    It always uses the JSX converter, regardless of what's configured.
export function AlsoPriceNotice() {
  return (
    <p>
      {transX("minimumOrderPurchase", {
        amount: <strong style={{ color: "red" }}>12</strong>,
      })}
    </p>
  );
}
```

## What's in the box

| Export | Purpose |
|---|---|
| `jsxConverter(translation, placeholders, pattern)` | The JSX-aware converter. Plug into `setLocalizationConfigurations({ converter: jsxConverter })` once, and every `trans(...)` call gains JSX placeholder support. |
| `transX(keyword, placeholders?)` | A `trans` variant pre-bound to `jsxConverter`. Use when the global converter is left as `plainConverter` and you want JSX only at specific call sites. |

That's the entire public API surface. Everything else — `extend`, `trans`, `transFrom`, `setCurrentLocaleCode`, `groupedTranslations`, `transObject`, `localizationEvents`, count rules, range rules — lives in `@mongez/localization` and works unchanged here.

## `jsxConverter`

```ts
function jsxConverter(
  translation: string,
  placeholders: any,
  placeholderPattern: RegExp,
): string | React.ReactNode[];
```

Splits the translation on the placeholder pattern (e.g. `/:(\w+)/g`), looks each captured token up in `placeholders`, and reassembles the parts as an array of `React.Fragment` children. The result is React-renderable directly.

Behaviour rules:

1. **No-op for non-object placeholders.** If `placeholders` is a primitive (e.g. `10`) or `{}`, the translation is returned as a plain string. This matches the legacy `trans` shape and avoids breaking code that mistakenly passes the wrong type.
2. **Missing-key fallback.** If a token appears in the template but is absent from `placeholders` (or its value is `null` / `undefined`), the token name is rendered as bare text — i.e. `Create new :item` with `placeholders = { wrong: "x" }` renders as `Create new item`. The leading `:` is stripped because the splitter captures only the name.
3. **JSX-or-anything values.** A placeholder value can be a string, number, React element, array of nodes, or `null`. React renders it however React would render that prop.
4. **Pattern is supplied by the caller.** The pattern comes from `@mongez/localization`'s `placeholderPattern` config — either the default `:colon` form, `{{doubleCurly}}`, or a custom RegExp.
5. **Returns an array.** When at least one placeholder is found, the return value is `Array<React.ReactNode>`, NOT a string — `trans` consumers must handle both shapes (string vs array), or always wrap the call in `<>...</>`.

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

Use when:

- You configured `plainConverter` (the default) globally because most of your translations don't need JSX, AND
- A few specific call sites DO need JSX placeholders, AND
- You don't want to flip the global converter (which would change every `trans` return type from `string` to `string | ReactNode[]`).

If your app uses `jsxConverter` globally, `trans` and `transX` are interchangeable.

## Limitations & gotchas

### No locale-change subscription

This package does NOT expose a `useLocale()` hook or any context provider. `transX(...)` is a plain function call — it reads the current locale code at call time and returns. A component that already rendered will keep showing the old translation if you call `setCurrentLocaleCode("ar")` from outside React.

Real apps that need locale-driven re-renders typically:

- Drive a re-render via a parent component that holds the locale in `useState` and calls `setCurrentLocaleCode` in an effect.
- Or store the locale in `@mongez/atom` and subscribe via the atom's `useValue()` hook.
- Or subscribe to `localizationEvents.onChange("localeCode", ...)` from a custom hook and force-update via `useReducer(x => x + 1, 0)`.

A small `useLocale()` / `useTranslate()` API surface is a natural next step for this package, but it doesn't exist today. If you build that on top, mind the **tearing risk** described next.

### Tearing risk under React 18 concurrent rendering

If you do build a `useLocale()` / `useTranslate()` hook on top of this package, prefer `useSyncExternalStore` (subscribed to `localizationEvents`) over the `useState + useEffect(localizationEvents.onChange(...))` pattern. The latter is the well-known stale-read trap:

1. First render snapshots `getCurrentLocaleCode()` synchronously.
2. The locale changes between render commit and effect-mount.
3. Subscribers added in the effect miss that intermediate change.
4. Concurrent reads in sibling components can disagree on the locale.

`useSyncExternalStore` collapses the snapshot + subscribe pair into a single tear-free operation. The `@mongez/react-atom` package does the same migration in its 6.x line — same playbook applies here when those hooks land.

### No `<Translate>` component

Some i18n libraries expose `<Translate keyword="x" />` to colocate the translation with the JSX. This package doesn't — `trans()` and `transX()` are functions, called inline. Adding a component is a one-liner if you need it:

```tsx
function Translate({ k, placeholders }: { k: string; placeholders?: any }) {
  return <>{transX(k, placeholders)}</>;
}
```

But the function-call style composes more cleanly with `transObject`, `groupedTranslations`, and conditional logic, so it's the recommended path.

### `null` / `undefined` placeholders crash `jsxConverter`

Calling `jsxConverter("Hello", null, /.../)` throws `Cannot convert undefined or null to object`. The guard at `src/converters.tsx:18` checks `typeof placeholders !== "object"`, which is `false` for `null` (since `typeof null === "object"`), so the function falls through to `Object.keys(null)` and explodes.

This is a known bug — there is a skipped regression test in `src/__tests__/converters.test.tsx` pinning it. In practice it doesn't bite because `trans` only calls the converter when `placeholders` is truthy. But if you call `jsxConverter` directly, **never** pass `null`.

## Patterns

### Locale switch driven by an atom

```tsx
import { atom } from "@mongez/react-atom";
import {
  setCurrentLocaleCode,
  localizationEvents,
} from "@mongez/localization";
import { transX } from "@mongez/react-localization";

const localeAtom = atom({ key: "ui.locale", default: "en" });

// Mirror the atom into the localization core whenever it changes.
localeAtom.onChange((next) => setCurrentLocaleCode(next));

function LocaleSwitch() {
  const [locale, setLocale] = localeAtom.useState();
  return (
    <button onClick={() => setLocale(locale === "en" ? "ar" : "en")}>
      {transX("toggle")}
    </button>
  );
}

function Greeting() {
  // The atom's useValue() drives the re-render; transX reads the now-current locale.
  localeAtom.useValue();
  return <h1>{transX("greeting")}</h1>;
}
```

### Drop-in JSX inside a sentence

```tsx
extend("en", {
  agreeToTerms:
    "By clicking Continue, you agree to our :tos and :privacy.",
});

function ToS() {
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

### Pluralization (delegated to `@mongez/localization`)

```ts
import { extend } from "@mongez/localization";
import { transX } from "@mongez/react-localization";

extend("en", {
  products_zero: "No products",
  products_one: "1 product",
  products_many: ":count products",
});

transX("products", { count: 0 });   // → "No products" (as a fragment array)
transX("products", { count: 1 });   // → "1 product"
transX("products", { count: 42 });  // → "42 products"
```

Count rules are configurable per-locale on the core package — see [`@mongez/localization`'s README](https://github.com/hassanzohdy/mongez-localization).

## Related packages

| Package | Purpose |
|---|---|
| [`@mongez/localization`](https://github.com/hassanzohdy/mongez-localization) | The framework-agnostic core. Registries, locales, count rules, events. |
| [`@mongez/react-atom`](https://github.com/hassanzohdy/mongez-react-atom) | State primitive with React hooks — useful for driving locale changes from a component. |
| [`@mongez/events`](https://github.com/hassanzohdy/events) | Event bus. Used internally by the core to broadcast `localizationEvents`. |

## React version

React **18 or newer**. The package itself has no React-specific runtime requirements — `React.Fragment` is the only API consumed — but the rest of the `@mongez/*` family standardized on 18+ for tear-free state, so this peer dep tracks that floor.

## License

MIT
