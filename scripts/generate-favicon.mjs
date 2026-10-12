// Generates public/favicon.svg (padrao-projetos A.9): 32x32 rounded square, two-letter monogram in
// IBM Plex Sans 700 converted to outlines (fonts do not load inside favicons) and a 10x2 accent bar.
// Run with: npm run generate:favicon
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as fontkit from 'fontkit';

const MONOGRAM = 'SD';
const FONT_SIZE = 15;
const VIEWBOX = 32;

const OUTPUT = new URL('../public/favicon.svg', import.meta.url);

const fail = (message, error) => {
  console.error(`generate-favicon: ${message}`);
  if (error) console.error(error instanceof Error ? error.message : error);
  process.exit(1);
};

const require = createRequire(import.meta.url);
let font;
try {
  const fontPath = require.resolve('@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2');
  font = fontkit.create(readFileSync(fontPath));
} catch (error) {
  fail('could not read IBM Plex Sans from @fontsource-variable/ibm-plex-sans (run npm ci first).', error);
}
// fontkit 2.0.4 cannot instance WOFF2 variable fonts (getVariation loses the cmap and glyph outlines),
// so the outlines come from the default instance (wght 400) and are emboldened with a same-colour
// stroke equal to the 400 -> 700 stem growth of IBM Plex Sans (~62 units per em).
const STEM_GROWTH_UNITS = 62;
const run = font.layout(MONOGRAM);
const glyphs = run.glyphs;
const scale = FONT_SIZE / font.unitsPerEm;
const strokeWidth = STEM_GROWTH_UNITS * scale;
// Extra spacing keeps the emboldened letters from touching.
const letterSpacing = strokeWidth;
const advance = glyphs.reduce((total, glyph) => total + glyph.advanceWidth * scale + letterSpacing, -letterSpacing);
const capHeight = font.capHeight * scale;

// Centre the letters horizontally and sit them above the accent bar.
const originX = (VIEWBOX - advance) / 2;
const baselineY = 19.5;

let penX = originX;
const paths = glyphs.map((glyph) => {
  const path = glyph.path
    .scale(scale, -scale)
    .translate(penX, baselineY)
    .toSVG();
  penX += glyph.advanceWidth * scale + letterSpacing;
  return path;
});

const round = (value) => value.replace(/-?\d+\.\d+/g, (match) => Number(match).toFixed(2).replace(/\.?0+$/, ''));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}" width="${VIEWBOX}" height="${VIEWBOX}">
  <rect x="0.5" y="0.5" width="31" height="31" rx="7" fill="#13161c" stroke="rgba(228,231,236,0.18)"/>
  <path fill="#e4e7ec" stroke="#e4e7ec" stroke-width="${strokeWidth.toFixed(2)}" stroke-linejoin="round" d="${round(paths.join(' '))}"/>
  <rect x="11" y="${(baselineY + 3).toFixed(1)}" width="10" height="2" fill="#00f2fe"/>
</svg>
`;

try {
  writeFileSync(OUTPUT, svg);
} catch (error) {
  fail(`could not write ${OUTPUT.pathname}.`, error);
}
console.log(`favicon.svg: monogram ${MONOGRAM}, advance ${advance.toFixed(2)}px, cap height ${capHeight.toFixed(2)}px`);
