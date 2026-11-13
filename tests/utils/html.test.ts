import { actHtmlToText, htmlToText } from "../../src/utils/html.js";

describe("htmlToText", () => {
  it("drops the head and markup and keeps block elements as line breaks", () => {
    const html = `<!DOCTYPE html><html><head><title>Ignored</title></head><body>
      <h1>Interpelacja nr 10</h1>
      <p class="int-recipient">do ministra
      zdrowia</p><p>Pani Minister!<br>Druga linia</p></body></html>`;

    expect(htmlToText(html)).toBe(
      "Interpelacja nr 10\n\ndo ministra zdrowia\n\nPani Minister!\nDruga linia"
    );
  });

  it("renders list items as bullets, also when their content is a block element", () => {
    const html = "<ol><li><div>Pierwszy punkt</div></li><li>Drugi <strong>punkt</strong></li></ol>";

    expect(htmlToText(html)).toBe("- Pierwszy punkt\n- Drugi punkt");
  });

  it("decodes named and numeric entities", () => {
    expect(htmlToText("<p>A&nbsp;&amp;&#160;B &lt;C&gt; &#x105;&#261; &oacute;</p>")).toBe(
      "A & B <C> ąą &oacute;"
    );
  });

  it("removes scripts, styles and comments", () => {
    expect(htmlToText("<style>p{}</style><script>x()</script><!-- note --><p>Tekst</p>")).toBe(
      "Tekst"
    );
  });

  it("marks superscripts with a caret and joins adjacent ones", () => {
    expect(htmlToText("<p>Art.&nbsp;18<SUP>3</SUP><SUP>a</SUP>. Powierzchnia 5 m<sup>2</sup></p>")).toBe(
      "Art. 18^3a. Powierzchnia 5 m^2"
    );
  });
});

describe("actHtmlToText", () => {
  it("starts the line of a unit's content with its labels, as acts are printed", () => {
    const html = `<h1><span class="head-type">Ustawa</span><span class="head-date">z dnia 1 lipca 2024 r.</span></h1>
      <button id="show-all-button">Pokaż całość</button>
      <div class="unit unit_arti"><h3><b>Art.&nbsp;18<SUP>3</SUP><SUP>a</SUP>.</b></h3><div class="unit-inner">
        <div class="unit unit_para"><h3>§&nbsp;1.</h3><div class="unit-inner"><div>Treść paragrafu:</div>
          <div class="unit unit_pint"><h3>1)</h3><div>punkt;</div></div>
        </div></div>
      </div></div>
      <div class="unit unit_arti"><h3>Art. 19.</h3><div>(uchylony)</div></div>`;

    expect(actHtmlToText(html)).toBe(
      "Ustawa\nz dnia 1 lipca 2024 r.\n\n" +
        "Art. 18^3a. § 1. Treść paragrafu:\n\n1) punkt;\n\nArt. 19. (uchylony)"
    );
  });

  it("does not take a one-word line ending a sentence for a label", () => {
    expect(actHtmlToText("<div>2)</div><div>wynagrodzenie.</div><div>Dalej.</div>")).toBe(
      "2) wynagrodzenie.\n\nDalej."
    );
  });

  it("keeps footnotes next to their marker", () => {
    const html =
      '<h3>Art. 22<sup>1</sup>c<A class="gloss-link tooltip" href="#gloss-0:4:"><sup>4)</sup>' +
      '<span class="tooltip-text"><span class="pro-gloss-inner">Dodany przez art. 1 pkt 1 ustawy.</span></span></A>.</h3>' +
      "<div>Treść.</div>";

    expect(actHtmlToText(html)).toBe("Art. 22^1c [footnote 4: Dodany przez art. 1 pkt 1 ustawy.].\n\nTreść.");
  });
});
