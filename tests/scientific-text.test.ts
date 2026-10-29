import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ScientificText from "@/components/ScientificText";
describe("Scientific reading notation", () => {
  it("preserves question marks, charges, arrows, subscripts and decimal quantities", () => {
    const text = "Why ?? H₂ + O₂ → H₂O; Na⁺, 20°C, 0.001 m";
    const html = renderToStaticMarkup(createElement(ScientificText, { text }));
    expect(html).toBe(text);
  });
  it("escapes document HTML rather than treating source text as executable markup", () => {
    const html = renderToStaticMarkup(
      createElement(ScientificText, { text: "<img src=x onerror=alert(1)>" }),
    );
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
  it("renders explicit equations and keeps unsupported notation visible", () => {
    expect(
      renderToStaticMarkup(createElement(ScientificText, { text: "$F=ma$" })),
    ).toContain("katex");
    expect(
      renderToStaticMarkup(
        createElement(ScientificText, { text: "$\\unknownchem{Na}$" }),
      ),
    ).toContain("unknownchem");
  });
});
