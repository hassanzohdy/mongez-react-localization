/**
 * Unit tests for `jsxConverter` from `../converters`.
 *
 * `jsxConverter` is the placeholder-substitution function this package
 * exists to provide. When wired up via `setLocalizationConfigurations({
 * converter: jsxConverter })`, `trans(...)` from `@mongez/localization`
 * starts returning React fragments instead of strings — letting consumers
 * pass JSX (e.g. `<strong>12</strong>`) as a placeholder value.
 *
 * The converter has no React reactivity of its own; it's a pure function
 * over a translation string + placeholders bag + RegExp pattern. These
 * tests pin the rendering contract so we don't accidentally regress it
 * when touching the splitter logic.
 */
import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { jsxConverter } from "../converters";

const COLON_PATTERN = /:([a-zA-Z0-9_-]+)/g;
const DOUBLE_CURLY_PATTERN = /{{([a-zA-Z0-9_-]+)}}/g;

describe("jsxConverter — non-object placeholder paths", () => {
  it("returns the translation untouched when placeholders is a primitive (number / string)", () => {
    // The signature accepts `any` for placeholders; passing a number is a
    // common misuse pattern (e.g. forgetting to pass a count under an
    // object key). We must NOT crash, we must NOT mutate.
    expect(jsxConverter("Hello", 10 as any, COLON_PATTERN)).toBe("Hello");
    expect(jsxConverter("Hello", "str" as any, COLON_PATTERN)).toBe("Hello");
  });

  it("returns the translation untouched when placeholders is an empty object", () => {
    expect(jsxConverter("Create new :item", {}, COLON_PATTERN)).toBe(
      "Create new :item",
    );
  });

  it("returns the translation untouched when placeholders is null / undefined", () => {
    expect(jsxConverter("Hello", null as any, COLON_PATTERN)).toBe("Hello");
    expect(jsxConverter("Hello", undefined as any, COLON_PATTERN)).toBe(
      "Hello",
    );
  });
});

describe("jsxConverter — substitution", () => {
  it("substitutes a string placeholder and renders as text in the DOM", () => {
    const out = jsxConverter(
      "Create new :item",
      { item: "user" },
      COLON_PATTERN,
    );
    // The output should be an array of React.Fragment children.
    expect(Array.isArray(out)).toBe(true);

    const { container } = render(<span>{out}</span>);
    expect(container.querySelector("span")?.textContent).toBe(
      "Create new user",
    );
  });

  it("substitutes a JSX placeholder and renders the element in the DOM", () => {
    const out = jsxConverter(
      "Minimum purchase amount is :amount USD",
      { amount: <strong data-testid="amt">12</strong> },
      COLON_PATTERN,
    );

    const { getByTestId, container } = render(<span>{out}</span>);
    // The strong element appears in the rendered tree.
    expect(getByTestId("amt").tagName).toBe("STRONG");
    expect(getByTestId("amt").textContent).toBe("12");
    // The surrounding text is preserved verbatim.
    expect(container.textContent).toBe("Minimum purchase amount is 12 USD");
  });

  it("substitutes multiple placeholders in document order", () => {
    const out = jsxConverter(
      ":greeting :name, your order :id is ready",
      { greeting: "Hello", name: "Alice", id: 42 },
      COLON_PATTERN,
    );
    const { container } = render(<p>{out}</p>);
    expect(container.querySelector("p")?.textContent).toBe(
      "Hello Alice, your order 42 is ready",
    );
  });

  it("leaves a placeholder as the bare key when the corresponding value is missing", () => {
    // Real-world misuse: caller passes a different key by mistake.
    // The split puts the placeholder key in the odd slot, and since
    // `placeholders[key]` is undefined the converter falls back to the
    // bare key (without the leading colon). This matches the legacy
    // jest suite at tests/jsxConverter.test.tsx and is a part of the
    // package's public behaviour — pinning it here.
    const out = jsxConverter(
      "Create new :item",
      { wrongKey: "user" },
      COLON_PATTERN,
    );
    const { container } = render(<span>{out}</span>);
    expect(container.querySelector("span")?.textContent).toBe("Create new item");
  });

  it("treats an explicit `null` placeholder value the same as missing", () => {
    const out = jsxConverter(
      "Create new :item",
      { item: null },
      COLON_PATTERN,
    );
    const { container } = render(<span>{out}</span>);
    expect(container.querySelector("span")?.textContent).toBe("Create new item");
  });

  it("renders the double-curly pattern when wired with `{{name}}` regex", () => {
    const out = jsxConverter(
      "Hello {{name}}, you have {{count}} messages",
      { name: <em data-testid="n">Alice</em>, count: 3 },
      DOUBLE_CURLY_PATTERN,
    );
    const { getByTestId, container } = render(<p>{out}</p>);
    expect(getByTestId("n").textContent).toBe("Alice");
    expect(container.querySelector("p")?.textContent).toBe(
      "Hello Alice, you have 3 messages",
    );
  });
});

describe("jsxConverter — key stability", () => {
  it("assigns deterministic numeric keys to each fragment so React doesn't warn", () => {
    // We capture warnings from React via the testing library; if the
    // converter forgot to set `key` on the fragments, React would emit
    // a "each child in a list should have a unique key" warning.
    const errors: string[] = [];
    const origError = console.error;
    console.error = (...args: any[]) => {
      errors.push(args.map(String).join(" "));
    };
    try {
      render(
        <span>
          {jsxConverter(
            ":a :b :c",
            { a: "1", b: "2", c: "3" },
            COLON_PATTERN,
          )}
        </span>,
      );
    } finally {
      console.error = origError;
    }
    const hasKeyWarning = errors.some(line =>
      /unique "key" prop/i.test(line),
    );
    expect(hasKeyWarning).toBe(false);
  });
});

describe("jsxConverter — hyphens after a placeholder (localization 3.5.2 colon pattern)", () => {
  // The default colon pattern from @mongez/localization 3.5.2 stops at a hyphen.
  const PATTERN = /:([a-zA-Z0-9_]+)/g;
  const text = (out: any) => render(<span>{out}</span>).container.textContent;

  it("substitutes the name and keeps the hyphen segment as text", () => {
    expect(text(jsxConverter("past the :minutes-min mark", { minutes: 5 }, PATTERN))).toBe(
      "past the 5-min mark",
    );
  });

  it("uses an exact hyphenated key when the placeholders object has it", () => {
    expect(text(jsxConverter(":minutes-min left", { "minutes-min": 5 }, PATTERN))).toBe("5 left");
    expect(
      text(jsxConverter(":minutes-min left", { minutes: 1, "minutes-min": 5 }, PATTERN)),
    ).toBe("5 left");
  });

  it("uses the longest hyphenated key that exists", () => {
    expect(text(jsxConverter(":a-b-c", { a: 1, "a-b": 2 }, PATTERN))).toBe("2-c");
    expect(text(jsxConverter(":a-b-c", { a: 1 }, PATTERN))).toBe("1-b-c");
  });

  it("keeps a JSX value as an element", () => {
    const { getByTestId, container } = render(
      <span>{jsxConverter(":count-day streak", { count: <b data-testid="c">7</b> }, PATTERN)}</span>,
    );
    expect(getByTestId("c").tagName).toBe("B");
    expect(container.textContent).toBe("7-day streak");
  });

  it("still renders the bare key when no value exists", () => {
    expect(text(jsxConverter(":minutes-min", { other: 1 }, PATTERN))).toBe("minutes-min");
  });

  it("does not join hyphen text after a closing delimiter into the key", () => {
    expect(text(jsxConverter("{{a}}-b", { a: 1, "a-b": 2 }, /{{([a-zA-Z0-9_-]+)}}/g))).toBe(
      "1-b",
    );
  });

  it("replaces every occurrence with a sticky pattern", () => {
    expect(text(jsxConverter("x :a :a", { a: 1 }, /:([a-z]+)/y))).toBe("x 1 1");
  });
});
