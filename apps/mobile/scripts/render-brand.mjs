// Renders the app icon and splash PNGs from the SVG sources in assets/brand.
// Run from apps/mobile: `node scripts/render-brand.mjs`, then rebuild the native app.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const brand = (name) => readFileSync(join(root, 'assets/brand', name), 'utf8');
const out = (name) => join(root, 'assets/images', name);

/** The markup inside a 1024x1024 <svg>, so layers can be stacked into one document. */
const inner = (svg) => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const svg = (...layers) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${layers.join('')}</svg>`;

function render(markup, file, size = 1024) {
  const png = new Resvg(markup, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(out(file), png);
  console.log(`${file} (${size}px)`);
}

const background = inner(brand('background.svg'));
const foreground = inner(brand('foreground.svg'));
const monochrome = inner(brand('monochrome.svg'));

// Android adaptive icon layers (the launcher masks and parallaxes them).
render(svg(background), 'android-icon-background.png');
render(svg(foreground), 'android-icon-foreground.png');
render(svg(monochrome), 'android-icon-monochrome.png');

// Legacy square icon: both layers flattened.
render(svg(background, foreground), 'icon.png');

// Splash: the orb on its own over the light splash background. The white ripple would vanish
// on light grey, so it is drawn in the brand blue here.
render(svg(foreground.replaceAll('stroke="#FFFFFF"', 'stroke="#0067EE"')), 'splash-icon.png');
