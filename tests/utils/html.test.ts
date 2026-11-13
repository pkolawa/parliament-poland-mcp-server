import { htmlToText } from "../../src/utils/html.js";

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
});
