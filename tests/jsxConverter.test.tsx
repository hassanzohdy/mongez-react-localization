import {
  extend,
  setLocalizationConfigurations,
  trans,
} from "@mongez/localization";
import { act } from "react-dom/test-utils";
import { jsxConverter } from "../src/converters";
import { container, render } from "./boot";

describe("@mongez/react-localization/jsxConverter", () => {
  setLocalizationConfigurations({
    converter: jsxConverter,
  });

  extend("en", {
    hello: "Hello, World",
    createNewItem: "Create new :item",
  });

  it("should translate plain text", () => {
    expect(trans("hello")).toBe("Hello, World");
  });

  it("should translate with placeholder", () => {
    act(() => {
      render(
        <span id="content">{trans("createNewItem", { item: "user" })}</span>,
      );
    });

    expect(container().querySelector("#content")?.textContent).toBe(
      "Create new user",
    );
  });

  it("should translate with passing invalid placeholder", () => {
    act(() => {
      render(<span id="content">{trans("hello", 10)}</span>);
    });

    expect(container().querySelector("#content")?.textContent).toBe(
      "Hello, World",
    );
  });
  it("should translate with passing empty placeholder", () => {
    act(() => {
      render(<span id="content">{trans("createNewItem", {})}</span>);
    });

    expect(container().querySelector("#content")?.textContent).toBe(
      "Create new :item",
    );
  });
  it("should translate with passing missing placeholder keys", () => {
    act(() => {
      render(
        <span id="content">
          {trans("createNewItem", { anotherKey: "welcome" })}
        </span>,
      );
    });

    expect(container().querySelector("#content")?.textContent).toBe(
      "Create new :item",
    );
  });
});
