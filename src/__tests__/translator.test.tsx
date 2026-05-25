/**
 * Unit tests for `transX` from `../translator`.
 *
 * `transX` is `trans` pre-bound to the JSX converter. It bypasses whatever
 * converter is configured globally on `@mongez/localization` and always
 * produces React-compatible output. Useful when an app wires `plainConverter`
 * by default and wants JSX only in specific call sites.
 */
import { cleanup, render } from "@testing-library/react";
import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  extend,
  getTranslationsList,
  setCurrentLocaleCode,
  setFallbackLocaleCode,
  setTranslationsList,
  trans,
} from "@mongez/localization";
import { transX } from "../translator";

beforeEach(() => {
  // Reset translations and locale codes between tests. The localization
  // package keeps these in module scope, so without isolation the order
  // tests run in could affect outcomes.
  setTranslationsList({});
  setFallbackLocaleCode("en");
  setCurrentLocaleCode("en");
});

afterEach(() => {
  cleanup(); // unmount any trees rendered in the test
  setTranslationsList({});
  setFallbackLocaleCode("en");
  setCurrentLocaleCode("en");
});

describe("transX — string output without placeholders", () => {
  it("returns the translation as a plain string for the current locale", () => {
    extend("en", { hello: "Hello, World" });
    expect(transX("hello")).toBe("Hello, World");
  });

  it("falls back to the missing-key string when the key is not defined", () => {
    // No translation registered for `missing` in any locale. The core
    // `trans` contract returns the key itself — `transX` inherits that.
    expect(transX("missing")).toBe("missing");
  });

  it("respects the fallback locale when the current locale lacks the key", () => {
    extend("en", { contactUs: "Contact Us" });
    setCurrentLocaleCode("ar");
    setFallbackLocaleCode("en");
    expect(transX("contactUs")).toBe("Contact Us");
  });
});

describe("transX — JSX output with placeholders", () => {
  it("substitutes a JSX placeholder and renders into the DOM", () => {
    extend("en", {
      minOrder: "Minimum purchase amount is :amount USD",
    });

    const out = transX("minOrder", {
      amount: <strong data-testid="amt">12</strong>,
    });

    const { getByTestId, container } = render(<span>{out}</span>);
    expect(getByTestId("amt").tagName).toBe("STRONG");
    expect(container.textContent).toBe("Minimum purchase amount is 12 USD");
  });

  it("substitutes a string placeholder and renders the resulting text", () => {
    extend("en", {
      createItem: "Create new :item",
    });

    const out = transX("createItem", { item: "user" });
    const { container } = render(<span>{out}</span>);
    expect(container.querySelector("span")?.textContent).toBe(
      "Create new user",
    );
  });

  it("works regardless of which converter is configured globally", () => {
    // `trans` from @mongez/localization uses whatever converter is set on
    // the config. We don't touch the config here — the default is the
    // plain string converter. `transX` should STILL return JSX-compatible
    // output, ignoring the global setting. This is the entire reason the
    // function exists.
    extend("en", { line: "value: :v" });

    const plainOut = trans("line", { v: "x" });
    expect(plainOut).toBe("value: x"); // string from plainConverter

    const jsxOut = transX("line", { v: <em data-testid="em">x</em> });
    const { getByTestId } = render(<span>{jsxOut}</span>);
    // The element rendered, not the stringified [object Object].
    expect(getByTestId("em").tagName).toBe("EM");
  });
});

describe("transX — re-render after locale switch", () => {
  /**
   * Note: this package exposes NO hook that subscribes to locale changes.
   * `transX` is a plain function call. So we can't expect a component to
   * re-render automatically on `setCurrentLocaleCode(...)`. The realistic
   * pattern in apps is to lift the locale code into local state (or an
   * external store like `@mongez/atom`) and trigger a re-render that way.
   *
   * This test demonstrates that pattern AND pins the fact that, once a
   * component re-renders, `transX` returns the translated string for the
   * locale that's active at call time.
   */
  it("reflects the new locale when a component re-renders after the switch", () => {
    extend("en", { greeting: "Hello" });
    extend("ar", { greeting: "مرحبا" });

    function Greeting({ locale }: { locale: string }) {
      // The component receives the locale as a prop. When the prop
      // changes, the parent re-renders us and we call `transX` again.
      // (In a real app, a hook over `localizationEvents.onChange` would
      //  drive this — flagged in the README as a missing capability.)
      setCurrentLocaleCode(locale);
      return <span data-testid="g">{transX("greeting")}</span>;
    }

    const { getByTestId, rerender } = render(<Greeting locale="en" />);
    expect(getByTestId("g").textContent).toBe("Hello");

    rerender(<Greeting locale="ar" />);
    expect(getByTestId("g").textContent).toBe("مرحبا");
  });

  it("a component that already rendered does NOT auto-react to setCurrentLocaleCode", () => {
    // Pins the missing-reactivity behaviour. If a future PR adds a
    // `useLocale()` hook, this test should still pass — the bare `transX`
    // call has no subscription, so the DOM keeps the original locale's
    // text until React itself re-renders the component.
    extend("en", { greeting: "Hello" });
    extend("ar", { greeting: "مرحبا" });

    function Greeting() {
      return <span data-testid="g">{transX("greeting")}</span>;
    }

    setCurrentLocaleCode("en");
    const { getByTestId } = render(<Greeting />);
    expect(getByTestId("g").textContent).toBe("Hello");

    // Flip the global locale without re-rendering the component.
    act(() => {
      setCurrentLocaleCode("ar");
    });

    // The DOM still shows "Hello" because the component was never told
    // to re-render. This is the tearing-/staleness-shaped risk the README
    // calls out.
    expect(getByTestId("g").textContent).toBe("Hello");
  });
});

describe("transX — count-based pluralization (delegated to @mongez/localization)", () => {
  it("picks the `_one` / `_many` variant based on the placeholder count", () => {
    // The core package handles count routing; we only verify that
    // `transX` flows the placeholders bag through unchanged.
    //
    // Note: because `count` is in the placeholders bag, the core `trans`
    // always passes it through the converter — even for the `_one` branch
    // whose template has no `:count` placeholder. So the result is always
    // an array of React fragments, not a bare string. We render and
    // inspect textContent.
    extend("en", {
      products_one: "1 product",
      products_many: ":count products",
    });

    const oneOut = transX("products", { count: 1 });
    const { container: oneC } = render(<span>{oneOut}</span>);
    expect(oneC.querySelector("span")?.textContent).toBe("1 product");

    cleanup();

    const manyOut = transX("products", { count: 5 });
    const { container: manyC } = render(<span>{manyOut}</span>);
    expect(manyC.querySelector("span")?.textContent).toBe("5 products");
  });
});

describe("translations registry sanity", () => {
  // Sanity check: the `beforeEach` reset puts us in a known state. This
  // is meaningful because a stale registry was the most-common source of
  // flake in the legacy jest suite.
  it("starts each test with an empty translations list", () => {
    expect(getTranslationsList()).toEqual({});
  });
});
