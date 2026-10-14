// OFL-licensed substitutes are served by this app; logical DOCX names stay intact.
import carlitoRegular from "@fontsource/carlito/files/carlito-latin-400-normal.woff2?url";
import carlitoBold from "@fontsource/carlito/files/carlito-latin-700-normal.woff2?url";
import carlitoItalic from "@fontsource/carlito/files/carlito-latin-400-italic.woff2?url";
import carlitoBoldItalic from "@fontsource/carlito/files/carlito-latin-700-italic.woff2?url";
import arimoRegular from "@fontsource/arimo/files/arimo-latin-400-normal.woff2?url";
import arimoBold from "@fontsource/arimo/files/arimo-latin-700-normal.woff2?url";
import arimoItalic from "@fontsource/arimo/files/arimo-latin-400-italic.woff2?url";
import arimoBoldItalic from "@fontsource/arimo/files/arimo-latin-700-italic.woff2?url";
import tinosRegular from "@fontsource/tinos/files/tinos-latin-400-normal.woff2?url";
import tinosBold from "@fontsource/tinos/files/tinos-latin-700-normal.woff2?url";
import tinosItalic from "@fontsource/tinos/files/tinos-latin-400-italic.woff2?url";
import tinosBoldItalic from "@fontsource/tinos/files/tinos-latin-700-italic.woff2?url";
import cousineRegular from "@fontsource/cousine/files/cousine-latin-400-normal.woff2?url";
import cousineBold from "@fontsource/cousine/files/cousine-latin-700-normal.woff2?url";
import cousineItalic from "@fontsource/cousine/files/cousine-latin-400-italic.woff2?url";
import cousineBoldItalic from "@fontsource/cousine/files/cousine-latin-700-italic.woff2?url";
const family = (name, sources) => ({
  family: name,
  faces: sources.map((source, i) => ({
    source,
    weight: i % 2 ? 700 : 400,
    style: i >= 2 ? "italic" : "normal",
  })),
});
export const fonts = {
  bundled: false,
  map: {
    Calibri: "Carlito",
    Arial: "Arimo",
    "Times New Roman": "Tinos",
  },
  families: [
    family("Cousine", [
      cousineRegular,
      cousineBold,
      cousineItalic,
      cousineBoldItalic,
    ]),
    family("Carlito", [
      carlitoRegular,
      carlitoBold,
      carlitoItalic,
      carlitoBoldItalic,
    ]),
    family("Arimo", [arimoRegular, arimoBold, arimoItalic, arimoBoldItalic]),
    family("Tinos", [tinosRegular, tinosBold, tinosItalic, tinosBoldItalic]),
  ],
};

// Prefer the actual installed Courier New. Use the OFL substitute only when
// local font lookup fails, without changing the DOCX's logical font name.
export async function loadLocalCourier() {
  const sources = [
    cousineRegular,
    cousineBold,
    cousineItalic,
    cousineBoldItalic,
  ];
  const localNames = [
    "Courier New",
    "Courier New Bold",
    "Courier New Italic",
    "Courier New Bold Italic",
  ];
  await Promise.all(
    sources.map(async (source, i) => {
      const face = new FontFace(
        "Courier New",
        `local("${localNames[i]}"), url("${source}")`,
        {
          weight: i % 2 ? "700" : "400",
          style: i >= 2 ? "italic" : "normal",
        },
      );
      document.fonts.add(await face.load());
    }),
  );
}
