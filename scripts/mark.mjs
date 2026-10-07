// The mark: two condensed capitals, the first name in bone and the surname in
// red, the same split the homepage and the cards use for the full name. Drawn
// from rectangles rather than set in Archivo so it needs no font and stays
// sharp: every edge falls on the 32-unit grid, one pixel at 16×16.

export const colors = { room: "#0b0a0a", bone: "#f1f1ef", red: "#ff3247" };

// One E, 160×320: stem, arms and gaps all 64 units; the middle arm is shorter.
const E = (x, y) =>
  `M${x} ${y}h160v64h-96v64h64v64h-64v64h96v64h-160z`;

/** The two letters alone, in a 512 box. `scale` shrinks them about the centre. */
export const glyphs = (scale = 1) => {
  const g = `<path d="${E(80, 96)}" fill="${colors.bone}"/><path d="${E(272, 96)}" fill="${colors.red}"/>`;
  return scale === 1 ? g : `<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${g}</g>`;
};

/**
 * The full icon. `radius` rounds the tile (0 for full-bleed icons that the
 * platform masks itself, as iOS and Android maskable icons are).
 */
export const icon = ({ radius = 112, scale = 1 } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${radius}" fill="${colors.room}"/>${glyphs(scale)}</svg>`;

/** The letters without a tile, cropped to their own bounds, for use on a dark ground. */
export const lettermark = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="80 96 352 320">${glyphs()}</svg>`;
