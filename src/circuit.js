// "Your circuit": the course drawn as real neural pathways in an anatomical
// picture (brain, brainstem, spinal cord, DRG, vagus, organs). Each track is
// one real circuit (see circuits-data.js); its units are neurons placed along
// that pathway in course order.
//   - finishing a lesson grows one dendrite on its unit's neuron
//   - the cell body fills in as the unit's lessons get done
//   - reviewing until questions reach the top boxes thickens and myelinates
//     the axons along the pathway
// When every written unit is mastered, the circuit is complete and signals
// run along every pathway.

import { content, playable } from './content.js';
import { progress, MAX_BOX } from './progress.js';
import { CIRCUITS, CIRCUIT_KEYS } from './circuits-data.js';
import { svg, esc } from './ui.js';

const VIEW_W = 360, VIEW_H = 560;
const MASTERED = 0.8;
const f = (n) => n.toFixed(1);

// ---------- anatomy ----------

// Cortex outline, front of the head on the left. Each edge is drawn as two
// outward bulges so the surface reads as folded gyri.
const CORTEX = [[40, 150], [30, 118], [36, 84], [56, 56], [88, 34], [128, 20], [172, 15], [216, 19], [256, 30], [290, 50], [316, 78], [332, 110], [334, 140], [322, 166], [300, 182], [268, 188], [240, 194], [216, 212], [180, 222], [140, 222], [108, 214], [88, 198], [82, 180], [66, 172], [50, 164]];

function gyralOutline(points, bulge = 5) {
  const cx = points.reduce((a, p) => a + p[0], 0) / points.length;
  const cy = points.reduce((a, p) => a + p[1], 0) / points.length;
  const out = (x, y) => { const d = Math.hypot(x - cx, y - cy) || 1; return [x + ((x - cx) / d) * bulge, y + ((y - cy) / d) * bulge]; };
  let d = `M${points[0][0]} ${points[0][1]}`;
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length];
    const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    for (const [a, b] of [[p, m], [m, q]]) {
      const [kx, ky] = out((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      d += `Q${f(kx)} ${f(ky)} ${f(b[0])} ${f(b[1])}`;
    }
  });
  return d + 'Z';
}

const SULCI_MAJOR = [
  'M178 17C172 45 186 65 170 92S165 125 158 140',          // central sulcus
  'M84 180C110 168 150 160 190 150S232 138 250 126',        // lateral (Sylvian) fissure
  'M292 46C296 64 290 80 300 96',                           // parieto-occipital
];
const SULCI_MINOR = [
  'M150 22C146 50 158 70 142 98S138 120 132 134',           // precentral
  'M206 22C200 48 212 70 198 98S192 118 188 130',           // postcentral
  'M110 196C145 186 190 178 230 166S262 152 282 138',       // superior temporal
  'M130 211C160 205 200 199 238 186',                       // inferior temporal
  'M128 30C100 45 80 58 62 80', 'M136 70C110 80 85 95 58 115', // frontal
  'M206 80C230 72 255 80 292 98', 'M312 110C318 130 312 150 318 162',
  'M60 128c10-8 22-4 30 4', 'M92 118c10 6 20 4 28-4', 'M238 50c8 10 20 12 30 6',
  'M162 198c8-6 18-6 24 0', 'M262 116c8 6 18 6 24 0', 'M72 96c8 4 16 2 22-4',
];
const CEREBELLUM = 'M236 200C248 186 296 182 322 196C338 208 334 236 306 246C278 254 246 246 236 228C230 218 230 208 236 200Z';
const BRAINSTEM = 'M200 192C196 206 188 222 192 238C195 250 206 258 212 284L232 284C233 262 238 240 236 224C235 210 233 200 232 190Z';
const CORD = 'M212 282C212 340 214 420 216 548L230 548C230 420 232 340 232 282Z';
const PANCREAS = 'M110 506C116 494 140 496 160 500C180 504 200 500 212 496C220 494 224 502 216 508C200 516 176 514 156 516C136 520 112 520 110 506Z';
const SPLEEN = 'M48 488C60 478 80 482 82 496C84 512 66 518 56 512C46 506 42 496 48 488Z';
const MUSCLE = 'M284 520C296 508 318 512 326 528C314 538 292 534 284 520Z';

// A real mouse skin afferent ending, traced by the Nathans lab (Wu et al. 2012, eLife;
// NeuroMorpho.Org neuron A11-11), where the touch pathway starts in the skin. Its
// parent axon leaves the arbor at (67.8, 84).
const SKIN_ENDING = 'M67.8 84.0 L69.2 78.9 M69.2 78.9 L70.6 77.4 M70.6 77.4 L74.9 79.3 M74.9 79.3 L81.3 84.3 L81.4 90.8 L84.9 97.9 M84.9 97.9 L93.4 97.2 M93.4 97.2 L93.7 97.1 M93.4 97.2 L99.0 93.4 M84.9 97.9 L81.7 101.3 L86.0 104.5 M74.9 79.3 L81.3 84.3 L79.6 92.5 M79.6 92.5 L76.0 90.6 M76.0 90.6 L77.7 89.3 M76.0 90.6 L75.8 91.1 M79.6 92.5 L73.6 95.1 L71.5 100.2 M71.5 100.2 L72.2 103.7 M72.2 103.7 L75.9 101.6 M75.9 101.6 L79.8 99.8 M75.9 101.6 L80.4 99.6 M72.2 103.7 L68.1 113.1 M68.1 113.1 L68.1 113.4 M68.1 113.4 L71.2 112.7 M68.1 113.4 L67.9 113.7 M68.1 113.1 L66.2 113.7 M66.2 113.7 L67.4 113.9 M66.2 113.7 L64.7 113.3 M71.5 100.2 L65.3 99.5 M70.6 77.4 L73.2 75.4 L73.4 70.2 M69.2 78.9 L62.1 79.6 L61.4 76.3 M61.4 76.3 L62.4 76.3 M61.4 76.3 L61.2 76.1 M61.2 76.1 L52.9 76.6 M61.2 76.1 L61.5 64.7 M61.5 64.7 L62.0 62.5 M62.0 62.5 L68.1 56.4 M68.1 56.4 L60.8 44.5 M60.8 44.5 L61.0 44.1 M61.0 44.1 L59.4 40.9 L53.9 40.2 M53.9 40.2 L53.9 42.9 M53.9 42.9 L55.6 45.5 M55.6 45.5 L56.3 45.0 M55.6 45.5 L55.6 45.4 M53.9 42.9 L51.3 45.1 M51.3 45.1 L53.1 45.7 M51.3 45.1 L49.7 45.7 M49.7 45.7 L50.6 44.3 M49.7 45.7 L49.3 45.8 M49.3 45.8 L42.9 43.4 L35.2 49.0 M35.2 49.0 L32.7 46.5 M32.7 46.5 L33.8 45.2 M32.7 46.5 L32.7 47.7 M32.7 47.7 L35.7 47.5 M35.7 47.5 L37.2 45.0 M35.7 47.5 L35.8 47.5 M35.8 47.5 L35.7 48.0 M35.8 47.5 L36.0 48.1 M32.7 47.7 L30.6 47.6 M35.2 49.0 L29.0 57.6 M29.0 57.6 L28.9 57.1 M29.0 57.6 L28.9 57.7 M28.9 57.7 L29.1 58.0 M29.1 58.0 L29.4 58.1 M29.1 58.0 L29.0 57.6 M28.9 57.7 L24.4 64.8 M24.4 64.8 L22.7 65.1 M22.7 65.1 L21.6 65.7 M22.7 65.1 L23.5 64.6 M24.4 64.8 L24.4 65.0 M49.3 45.8 L49.9 43.5 M53.9 40.2 L51.4 37.3 M51.4 37.3 L50.3 34.3 M50.3 34.3 L51.1 33.7 M50.3 34.3 L44.7 34.0 M44.7 34.0 L38.1 35.0 M44.7 34.0 L47.4 30.0 M47.4 30.0 L49.5 21.7 M49.5 21.7 L43.6 13.0 M43.6 13.0 L43.5 12.4 M43.5 12.4 L44.4 8.7 M43.5 12.4 L43.1 12.4 M43.1 12.4 L34.5 7.7 M34.5 7.7 L32.5 7.9 M34.5 7.7 L33.8 6.2 M43.1 12.4 L41.4 9.4 M41.4 9.4 L40.2 8.1 M40.2 8.1 L41.5 7.0 M40.2 8.1 L38.0 7.8 M41.4 9.4 L44.0 8.4 M43.6 13.0 L44.9 7.2 M44.9 7.2 L45.9 6.0 M44.9 7.2 L48.6 8.4 M48.6 8.4 L49.6 8.4 M49.6 8.4 L50.0 8.5 M50.0 8.5 L51.0 9.5 M51.0 9.5 L51.3 9.9 M51.0 9.5 L51.3 9.5 M50.0 8.5 L52.2 8.3 M52.2 8.3 L52.2 8.2 M52.2 8.2 L52.8 7.8 M52.2 8.2 L52.8 8.7 M52.2 8.3 L55.3 8.1 M55.3 8.1 L54.7 6.9 M55.3 8.1 L55.5 8.1 M49.6 8.4 L49.7 8.6 M48.6 8.4 L48.7 8.2 M49.5 21.7 L49.7 21.6 M49.7 21.6 L42.7 21.9 M42.7 21.9 L42.3 23.6 M42.3 23.6 L41.2 17.2 L36.9 14.9 L33.7 17.6 M42.3 23.6 L46.0 27.0 M46.0 27.0 L42.6 26.1 M42.6 26.1 L45.3 27.3 M42.6 26.1 L42.2 26.4 M46.0 27.0 L49.4 21.9 M42.7 21.9 L43.9 21.4 M43.9 21.4 L46.5 21.1 M43.9 21.4 L44.2 21.0 M49.7 21.6 L50.2 21.4 M50.2 21.4 L48.9 23.5 M50.2 21.4 L50.6 21.0 M50.6 21.0 L51.8 21.9 M50.6 21.0 L50.5 20.9 M50.5 20.9 L48.9 23.1 M50.5 20.9 L50.6 20.9 M50.6 20.9 L52.9 19.3 M52.9 19.3 L55.8 17.9 L61.5 21.2 L59.0 25.4 M59.0 25.4 L59.5 27.6 M59.0 25.4 L57.3 26.3 M57.3 26.3 L58.7 28.5 M57.3 26.3 L56.7 26.7 M52.9 19.3 L55.0 16.6 M55.0 16.6 L56.1 15.9 M56.1 15.9 L59.4 16.7 M56.1 15.9 L56.6 15.4 M55.0 16.6 L55.8 16.5 M50.6 20.9 L50.7 19.5 M50.7 19.5 L51.4 18.7 M50.7 19.5 L50.5 16.9 M50.5 16.9 L50.5 16.6 M50.5 16.9 L52.1 14.2 M47.4 30.0 L47.6 29.9 M51.4 37.3 L49.2 35.9 M61.0 44.1 L69.0 42.1 M69.0 42.1 L69.8 40.1 M69.8 40.1 L72.2 37.8 M69.8 40.1 L69.5 39.0 M69.5 39.0 L74.1 35.3 M69.5 39.0 L70.4 37.9 M69.0 42.1 L65.9 40.2 M60.8 44.5 L59.7 46.4 M59.7 46.4 L59.7 45.4 M59.7 45.4 L61.3 43.5 M59.7 45.4 L60.1 45.6 M60.1 45.6 L60.6 45.3 M60.6 45.3 L62.7 42.2 M62.7 42.2 L62.9 34.3 L66.2 30.5 M66.2 30.5 L70.1 35.2 M70.1 35.2 L82.5 35.9 L84.9 34.1 L83.4 32.4 M83.4 32.4 L85.2 29.9 M83.4 32.4 L83.5 32.5 M83.5 32.5 L84.4 28.0 M83.5 32.5 L80.3 35.7 M80.3 35.7 L78.2 36.6 M78.2 36.6 L77.0 36.8 M78.2 36.6 L76.9 36.8 M80.3 35.7 L80.4 35.4 M80.4 35.4 L77.7 35.5 M77.7 35.5 L76.8 36.4 M76.8 36.4 L78.4 36.2 M76.8 36.4 L76.6 36.6 M77.7 35.5 L77.5 34.4 M80.4 35.4 L80.5 35.0 M70.1 35.2 L70.8 35.8 M66.2 30.5 L67.1 22.4 L69.5 20.8 M69.5 20.8 L74.2 17.2 L75.9 21.6 M75.9 21.6 L77.0 20.1 M75.9 21.6 L79.3 21.0 M79.3 21.0 L79.8 18.7 M79.3 21.0 L81.4 21.5 M69.5 20.8 L72.2 22.3 M72.2 22.3 L72.6 25.0 M72.6 25.0 L72.3 26.1 M72.3 26.1 L72.7 25.6 M72.7 25.6 L73.1 25.5 M72.7 25.6 L72.7 25.4 M72.3 26.1 L72.1 26.7 M72.6 25.0 L73.7 25.5 M73.7 25.5 L71.8 26.9 M73.7 25.5 L74.3 25.8 M74.3 25.8 L74.5 25.8 M74.3 25.8 L74.7 25.7 M72.2 22.3 L68.8 31.2 M62.7 42.2 L62.7 42.0 M60.6 45.3 L61.5 44.2 M60.1 45.6 L60.1 46.0 M59.7 46.4 L59.8 46.8 M59.8 46.8 L60.1 46.0 M59.8 46.8 L58.9 45.8 M68.1 56.4 L69.5 55.7 M69.5 55.7 L74.2 59.6 M74.2 59.6 L75.1 59.6 M75.1 59.6 L78.2 57.1 L79.9 63.1 M79.9 63.1 L76.5 68.2 L78.8 70.5 L80.1 68.9 M80.1 68.9 L80.4 68.8 M80.1 68.9 L80.3 67.5 M80.3 67.5 L79.9 67.5 M80.3 67.5 L80.9 67.1 M80.9 67.1 L81.4 67.1 M80.9 67.1 L84.4 66.9 M79.9 63.1 L86.0 62.2 M75.1 59.6 L74.4 62.6 M74.4 62.6 L71.7 62.9 M71.7 62.9 L80.0 69.4 M80.0 69.4 L80.1 71.0 M80.0 69.4 L86.3 66.4 M86.3 66.4 L88.6 67.6 M88.6 67.6 L90.2 68.0 L86.9 73.1 M86.9 73.1 L89.4 73.4 M86.9 73.1 L86.2 73.0 M88.6 67.6 L92.3 72.3 M92.3 72.3 L92.3 72.5 M92.3 72.5 L92.7 72.1 M92.3 72.5 L93.6 73.8 M92.3 72.3 L92.4 73.1 M92.4 73.1 L93.5 73.7 M93.5 73.7 L97.4 74.0 M97.4 74.0 L100.2 72.3 M100.2 72.3 L106.1 69.6 M100.2 72.3 L100.1 72.2 M100.1 72.2 L101.3 69.6 M100.1 72.2 L100.0 72.2 M97.4 74.0 L96.0 72.7 M93.5 73.7 L94.4 74.6 M92.4 73.1 L101.7 75.2 L103.0 80.7 L107.3 82.6 M86.3 66.4 L88.7 60.9 L93.8 61.4 M71.7 62.9 L71.4 63.0 M71.4 63.0 L69.9 58.5 M69.9 58.5 L67.6 57.1 L64.9 60.3 M64.9 60.3 L66.4 64.8 M64.9 60.3 L62.4 62.4 M62.4 62.4 L61.5 60.7 M62.4 62.4 L57.5 60.0 M57.5 60.0 L55.6 55.8 M55.6 55.8 L53.7 54.3 M53.7 54.3 L51.6 56.0 M53.7 54.3 L53.4 55.3 M53.4 55.3 L53.8 55.8 M53.4 55.3 L52.1 56.1 M55.6 55.8 L55.5 55.7 M57.5 60.0 L56.8 60.2 M69.9 58.5 L72.0 61.4 M71.4 63.0 L67.9 64.9 M67.9 64.9 L72.1 61.1 M67.9 64.9 L63.0 67.6 M74.4 62.6 L73.0 61.5 M74.2 59.6 L72.6 61.7 M69.5 55.7 L72.8 50.5 M72.8 50.5 L76.1 51.0 M76.1 51.0 L83.7 47.0 M76.1 51.0 L81.6 49.4 M81.6 49.4 L82.9 50.8 M81.6 49.4 L85.1 46.0 L85.3 48.9 M72.8 50.5 L73.2 49.5 M73.2 49.5 L69.9 49.1 M69.9 49.1 L69.9 48.3 M69.9 49.1 L69.5 49.3 M69.5 49.3 L68.6 50.0 M69.5 49.3 L69.2 49.4 M73.2 49.5 L73.1 49.2 M73.1 49.2 L73.4 45.3 L76.9 47.3 M76.9 47.3 L76.8 46.8 M76.9 47.3 L75.9 50.0 M75.9 50.0 L74.9 49.3 M75.9 50.0 L76.0 50.0 M73.1 49.2 L73.2 48.6 M62.0 62.5 L60.2 60.2 M60.2 60.2 L62.9 59.6 L65.1 52.9 M60.2 60.2 L59.5 59.0 M61.5 64.7 L51.4 72.6 M51.4 72.6 L51.4 73.7 M51.4 72.6 L51.1 72.6 M51.1 72.6 L51.7 75.2 M51.7 75.2 L54.1 77.7 M54.1 77.7 L55.1 78.2 M55.1 78.2 L56.2 78.3 M56.2 78.3 L53.7 79.2 L53.7 89.2 M53.7 89.2 L56.8 88.7 L56.6 91.3 M56.6 91.3 L60.2 90.0 M60.2 90.0 L62.2 94.9 L64.8 93.2 M64.8 93.2 L65.1 92.9 M65.1 92.9 L65.3 92.9 M65.3 92.9 L66.8 98.9 M66.8 98.9 L63.6 111.1 L61.2 110.2 M61.2 110.2 L58.0 110.5 M61.2 110.2 L63.0 110.5 M66.8 98.9 L65.7 99.7 M65.3 92.9 L65.5 92.7 M65.1 92.9 L64.8 92.9 M64.8 93.2 L70.9 90.7 M70.9 90.7 L74.9 90.1 M74.9 90.1 L79.1 88.0 L80.8 81.7 M80.8 81.7 L84.4 81.4 M84.4 81.4 L87.0 81.1 M84.4 81.4 L84.2 80.9 M84.2 80.9 L82.3 81.4 M84.2 80.9 L85.2 79.8 M80.8 81.7 L80.9 78.6 L73.2 79.4 M74.9 90.1 L76.1 88.0 M70.9 90.7 L74.3 89.1 M60.2 90.0 L62.5 87.8 M62.5 87.8 L62.5 91.4 M62.5 91.4 L65.1 92.5 M62.5 91.4 L61.0 92.2 M61.0 92.2 L63.1 89.8 M63.1 89.8 L66.4 87.2 M63.1 89.8 L65.9 88.5 M65.9 88.5 L66.8 87.4 M66.8 87.4 L67.7 87.5 M67.7 87.5 L67.8 87.7 M67.7 87.5 L68.0 87.5 M66.8 87.4 L66.8 86.8 M65.9 88.5 L65.8 88.1 M61.0 92.2 L56.3 93.0 L44.8 104.8 M62.5 87.8 L62.6 87.5 M56.6 91.3 L56.6 91.5 M53.7 89.2 L50.4 90.2 M50.4 90.2 L49.7 91.3 M50.4 90.2 L47.6 92.4 M47.6 92.4 L42.9 94.2 M42.9 94.2 L37.5 97.0 M37.5 97.0 L35.3 100.7 M35.3 100.7 L29.1 87.6 M29.1 87.6 L25.5 83.2 M29.1 87.6 L25.8 82.5 M25.8 82.5 L26.6 82.3 M25.8 82.5 L25.6 82.7 M35.3 100.7 L35.3 100.8 M35.3 100.8 L35.6 101.0 M35.3 100.8 L35.9 101.4 M35.9 101.4 L35.1 102.0 M35.1 102.0 L37.8 104.2 M37.8 104.2 L37.8 104.5 M37.8 104.2 L38.1 104.8 M38.1 104.8 L35.2 107.1 M38.1 104.8 L40.2 105.0 M35.1 102.0 L34.4 102.6 M34.4 102.6 L28.3 101.4 M34.4 102.6 L28.3 101.2 L22.0 106.1 L20.4 104.5 M35.9 101.4 L35.9 101.4 M35.9 101.4 L36.6 102.5 M36.6 102.5 L36.3 102.3 M36.6 102.5 L36.7 102.8 M35.9 101.4 L37.5 101.9 M37.5 97.0 L35.8 95.3 M35.8 95.3 L34.3 93.0 M34.3 93.0 L33.0 91.0 M33.0 91.0 L33.6 90.4 M33.6 90.4 L35.4 89.7 M33.6 90.4 L33.9 90.1 M33.0 91.0 L32.2 91.3 M34.3 93.0 L34.4 93.6 M35.8 95.3 L34.4 94.9 M34.4 94.9 L30.6 97.9 L30.0 95.3 M34.4 94.9 L32.7 94.6 M42.9 94.2 L44.9 92.9 M44.9 92.9 L44.4 92.8 M44.9 92.9 L45.9 92.6 M45.9 92.6 L43.7 92.9 M45.9 92.6 L47.5 90.7 M47.5 90.7 L48.0 91.7 M47.5 90.7 L47.3 89.6 M47.3 89.6 L47.7 91.3 M47.7 91.3 L47.2 90.7 M47.7 91.3 L47.8 93.2 M47.3 89.6 L41.1 82.0 M47.6 92.4 L47.4 92.2 M56.2 78.3 L56.3 78.3 M55.1 78.2 L55.4 76.5 M54.1 77.7 L53.9 77.2 M51.7 75.2 L51.8 75.9 M51.8 75.9 L52.4 77.0 M51.8 75.9 L50.8 76.4 M51.1 72.6 L50.5 72.3 M50.5 72.3 L48.2 76.2 M48.2 76.2 L47.5 81.1 M47.5 81.1 L45.8 82.1 M45.8 82.1 L44.2 81.4 M45.8 82.1 L45.8 82.5 M47.5 81.1 L47.3 81.7 M48.2 76.2 L44.3 78.1 M44.3 78.1 L40.4 81.3 M40.4 81.3 L40.3 85.5 M40.4 81.3 L30.1 86.1 M44.3 78.1 L43.4 80.8 M43.4 80.8 L41.2 80.5 M41.2 80.5 L40.7 81.2 M40.7 81.2 L39.6 83.1 M40.7 81.2 L39.3 83.6 M41.2 80.5 L40.4 80.0 M43.4 80.8 L44.5 81.0 M50.5 72.3 L49.0 70.0 M49.0 70.0 L43.8 71.5 M49.0 70.0 L48.8 68.7 M48.8 68.7 L51.8 66.8 M51.8 66.8 L51.1 67.6 M51.8 66.8 L53.7 66.7 M48.8 68.7 L47.4 67.3 M47.4 67.3 L46.4 69.8 M47.4 67.3 L42.3 67.1 M42.3 67.1 L42.3 67.0 M42.3 67.1 L40.0 64.0 M40.0 64.0 L40.1 63.8 M40.0 64.0 L42.3 61.4 M42.3 61.4 L45.9 60.2 M45.9 60.2 L37.0 64.4 M45.9 60.2 L37.7 64.2 M37.7 64.2 L42.3 61.4 M37.7 64.2 L34.8 68.0 M34.8 68.0 L34.7 70.7 M34.7 70.7 L23.7 79.3 L24.8 89.3 L22.0 91.6 M34.7 70.7 L35.9 73.8 L33.7 73.3 M33.7 73.3 L33.1 73.6 M33.1 73.6 L27.1 72.9 M33.1 73.6 L34.4 72.3 M33.7 73.3 L33.0 72.8 M34.8 68.0 L34.1 70.7 M34.1 70.7 L25.9 70.9 M25.9 70.9 L25.4 70.9 M25.9 70.9 L24.9 73.9 M24.9 73.9 L25.5 76.2 M24.9 73.9 L26.2 76.4 M34.1 70.7 L24.3 77.8 M24.3 77.8 L19.6 79.6 M19.6 79.6 L16.8 79.1 M16.8 79.1 L16.6 79.4 M16.6 79.4 L16.4 79.0 M16.6 79.4 L16.2 79.7 M16.2 79.7 L12.7 81.7 M12.7 81.7 L13.0 82.1 M12.7 81.7 L12.9 82.3 M16.2 79.7 L16.3 79.8 M16.8 79.1 L17.1 78.8 M19.6 79.6 L17.4 79.4 M17.4 79.4 L16.1 78.9 M16.1 78.9 L15.6 78.3 M16.1 78.9 L16.0 78.2 M17.4 79.4 L17.2 79.1 M24.3 77.8 L24.0 77.7 M42.3 61.4 L44.3 59.9 M44.3 59.9 L44.4 59.7 M44.3 59.9 L47.3 58.9 M47.3 58.9 L47.2 58.9 M47.2 58.9 L47.5 58.2 M47.2 58.9 L39.3 60.6 M47.3 58.9 L47.5 59.2';

const LABELS = [
  ['Thalamus', 222, 136], ['Striatum', 76, 136], ['S1', 186, 9], ['Insula', 120, 164],
  ['Cerebellum', 300, 264], ['Brainstem', 174, 262], ['Spinal cord', 206, 352, 'end'],
  ['DRG', 262, 420], ['DRG', 262, 480], ['Vagus', 26, 420, 'start'], ['Nodose', 96, 296, 'end'],
  ['Pancreas', 166, 532], ['Spleen', 62, 534], ['Skin', 338, 360], ['Muscle', 306, 548], ['Hypothal.', 150, 186, 'end'],
];

// Short wandering curves, clipped to the cortex, read as folded gyri.
function gyriTexture() {
  let h = 7;
  const rnd = () => ((h = Math.imul(h ^ (h >>> 13), 1597334677) + 0x6d2b79f5) >>> 0) / 4294967296;
  const out = [];
  for (let i = 0; i < 70; i++) {
    let x = 36 + rnd() * 296, y = 20 + rnd() * 200, a = rnd() * Math.PI * 2;
    let d = `M${f(x)} ${f(y)}`;
    const steps = 3 + Math.floor(rnd() * 3);
    for (let k = 0; k < steps; k++) {
      a += (rnd() - 0.5) * 2.2;
      const len = 7 + rnd() * 8;
      const cx = x + Math.cos(a) * len * 0.6, cy = y + Math.sin(a) * len * 0.6;
      x += Math.cos(a + (rnd() - 0.5)) * len; y += Math.sin(a + (rnd() - 0.5)) * len;
      d += `Q${f(cx)} ${f(cy)} ${f(x)} ${f(y)}`;
    }
    out.push(d);
  }
  return out.join('');
}

// A few small cell bodies inside a ganglion.
const ganglion = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" class="a-ganglion"/>`
  + [[-0.45, -0.2], [0.1, -0.35], [0.45, 0.05], [-0.15, 0.3], [0.25, 0.4]].map(([dx, dy]) => `<circle cx="${f(cx + dx * rx)}" cy="${f(cy + dy * ry)}" r="1.5" class="a-cellbody"/>`).join('');
// A nerve drawn as a cable: a darker sheath with a lighter core.
const cable = (d, w = 3.2) => `<path d="${d}" class="a-cable-o" style="stroke-width:${w}"/><path d="${d}" class="a-cable-i" style="stroke-width:${f(w * 0.45)}"/>`;

function anatomy() {
  const roots = [];
  for (let y = 300; y <= 540; y += 20) roots.push(`M231 ${y}l8 3M213 ${y}l-8 3`);
  const folia = [];
  for (let k = 1; k <= 9; k++) { const y = 188 + k * 6; folia.push(`M${232 + k} ${y}Q284 ${y - 9 + k} ${330 - k * 2} ${y + 3}`); }
  const lobules = [];
  for (let x = 116; x <= 214; x += 7) for (const y of [502, 508, 514]) lobules.push(`<circle cx="${x + (y === 508 ? 3.5 : 0)}" cy="${y}" r="1.6"/>`);
  const striae = [];
  for (let x = 284; x <= 326; x += 4) striae.push(`M${x} 508L${x + 6} 540`);
  const cortex = gyralOutline(CORTEX);
  return `
  <defs>
    <clipPath id="nl-cb"><path d="${CEREBELLUM}"/></clipPath>
    <clipPath id="nl-cx"><path d="${cortex}"/></clipPath>
    <clipPath id="nl-pa"><path d="${PANCREAS}"/></clipPath>
    <clipPath id="nl-mu"><path d="${MUSCLE}"/></clipPath>
    <radialGradient id="nl-shade" cx="42%" cy="34%" r="72%"><stop offset="0%" class="a-shade-in"/><stop offset="100%" class="a-shade-out"/></radialGradient>
  </defs>
  <path d="${CORD}" class="a-tissue"/>
  <path d="M219 286C219 340 220 420 221 546L225 546C225 420 226 340 226 286Z" class="a-grey"/>
  <path d="${roots.join('')}" class="a-root"/>
  ${cable('M231 404L254 404M231 464L254 464', 3)}
  ${cable('M271 402C300 398 320 394 336 392M271 462C300 458 320 454 336 452M216 482C250 494 280 506 300 520')}
  ${cable('M214 268C170 280 120 300 92 330C70 356 60 400 64 470C66 482 66 488 64 494', 3.4)}
  ${cable('M150 504C180 488 214 452 254 410', 2.4)}
  ${ganglion(262, 404, 10, 7)}${ganglion(262, 464, 10, 7)}${ganglion(100, 318, 8, 6)}
  <path d="M340 364C336 400 344 440 338 482" class="a-skin"/><path d="M343 364C339 400 347 440 341 482" class="a-epi"/>
  <path d="${SKIN_ENDING}" class="a-ending" transform="translate(334 392) rotate(90) scale(0.22) translate(-67.8 -84)"><title>A traced mouse skin ending (NeuroMorpho.Org A11-11)</title></path>
  <path d="${PANCREAS}" class="a-pancreas"/><g class="a-lobule" clip-path="url(#nl-pa)">${lobules.join('')}</g>
  <path d="${SPLEEN}" class="a-spleen"/><path d="M56 492C62 488 70 490 72 496" class="a-shine"/>
  <path d="${MUSCLE}" class="a-muscle"/><path d="${striae.join('')}" class="a-striae" clip-path="url(#nl-mu)"/>
  <path d="${BRAINSTEM}" class="a-stem"/>
  <path d="${CEREBELLUM}" class="a-cerebellum"/>
  <path d="${folia.join('')}" class="a-folia" clip-path="url(#nl-cb)"/>
  <path d="${cortex}" class="a-cortex"/>
  <path d="${gyriTexture()}" class="a-gyri" clip-path="url(#nl-cx)"/>
  <path d="${SULCI_MINOR.join('')}" class="a-sulcus"/>
  <path d="${SULCI_MAJOR.join('')}" class="a-sulcus major"/>
  <g class="a-deep">
    <ellipse cx="200" cy="142" rx="17" ry="10"/>
    <path d="M150 96C126 94 112 110 116 128C120 142 138 146 152 140"/>
    <ellipse cx="140" cy="130" rx="13" ry="10"/><ellipse cx="156" cy="141" rx="7" ry="6"/>
    <ellipse cx="170" cy="158" rx="5" ry="3"/><ellipse cx="176" cy="174" rx="9" ry="6"/>
  </g>
  ${LABELS.map(([t, x, y, a = 'middle']) => `<text x="${x}" y="${y}" text-anchor="${a}" class="a-label">${t}</text>`).join('')}`;
}

// A slightly irregular cell body, the same shape every time for a given unit.
function blob(cx, cy, r, seed) {
  let h = [...String(seed)].reduce((a, c) => Math.imul(a ^ c.charCodeAt(0), 16777619), 2166136261);
  const rnd = () => ((h = Math.imul(h ^ (h >>> 13), 1597334677) + 0x6d2b79f5) >>> 0) / 4294967296;
  const pts = Array.from({ length: 7 }, (_, i) => { const a = (i / 7) * Math.PI * 2, rr = r * (0.86 + rnd() * 0.28); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; });
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  let d = `M${f(mid(pts[6], pts[0])[0])} ${f(mid(pts[6], pts[0])[1])}`;
  pts.forEach((p, i) => { const m = mid(p, pts[(i + 1) % 7]); d += `Q${f(p[0])} ${f(p[1])} ${f(m[0])} ${f(m[1])}`; });
  return d + 'Z';
}

// ---------- pathways ----------

// Smooth curve through the points (Catmull-Rom), sampled with arc length.
function samplePath(points, closed) {
  const n = points.length, P = (i) => points[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  const out = [];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
    for (let k = 0; k < 16; k++) {
      const t = k / 16, t2 = t * t, t3 = t2 * t;
      const c = (a, b, cc, d) => 0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3);
      out.push({ x: c(p0[0], p1[0], p2[0], p3[0]), y: c(p0[1], p1[1], p2[1], p3[1]) });
    }
  }
  const last = closed ? points[0] : points[n - 1];
  out.push({ x: last[0], y: last[1] });
  let s = 0;
  out.forEach((p, i) => { if (i) s += Math.hypot(p.x - out[i - 1].x, p.y - out[i - 1].y); p.s = s; });
  return { pts: out, length: s, closed };
}

function pointAt(path, s) {
  const { pts } = path;
  let i = 1;
  while (i < pts.length - 1 && pts[i].s < s) i++;
  const a = pts[i - 1], b = pts[i], t = (s - a.s) / ((b.s - a.s) || 1);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x) };
}

function slice(path, s0, s1) {
  const seg = (a, b) => [pointAt(path, a), ...path.pts.filter((p) => p.s > a && p.s < b), pointAt(path, b)];
  const list = s1 >= s0 ? seg(s0, s1) : [...seg(s0, path.length), ...seg(0, s1)]; // wraps on a loop
  return 'M' + list.map((p) => `${f(p.x)} ${f(p.y)}`).join('L');
}

const fullPath = (path) => 'M' + path.pts.map((p) => `${f(p.x)} ${f(p.y)}`).join('L');

// Which circuit each track uses: its own "circuit" setting, else the next free one.
export function circuitFor() {
  const used = new Set(content.tracks.map((t) => t.circuit).filter((c) => CIRCUITS[c]));
  const free = CIRCUIT_KEYS.filter((k) => !used.has(k));
  let extra = 0;
  return new Map(content.tracks.map((t) => {
    if (CIRCUITS[t.circuit]) return [t.id, { key: t.circuit, offset: 0 }];
    if (free.length) return [t.id, { key: free.shift(), offset: 0 }];
    return [t.id, { key: CIRCUIT_KEYS[extra % CIRCUIT_KEYS.length], offset: 6 * (1 + Math.floor(extra++ / CIRCUIT_KEYS.length)) }];
  }));
}

function unitState(unit, skipLesson) {
  const written = unit.lessons.filter(playable);
  const done = written.filter((id) => id !== skipLesson && progress.isComplete(id));
  const boxes = [];
  for (const [key, r] of Object.entries(progress.state.review)) {
    const lessonId = key.slice(0, key.lastIndexOf(':'));
    if (written.includes(lessonId)) boxes.push(r.box);
  }
  const doneFrac = written.length ? done.length / written.length : 0;
  const boxFactor = boxes.length ? boxes.reduce((a, b) => a + b, 0) / boxes.length / MAX_BOX : 1;
  return { written, done, doneFrac, mastery: doneFrac * boxFactor };
}

function layout() {
  const mapping = circuitFor();
  const tracks = [];
  const nodes = new Map();
  for (const t of content.tracks) {
    const { key, offset } = mapping.get(t.id);
    const def = CIRCUITS[key];
    const path = samplePath(def.points.map(([x, y]) => [x + offset, y + offset]), def.closed);
    const n = t.units.length;
    const spacing = path.length / Math.max(n, 1);
    const at = (i) => def.closed ? (path.length * i) / n : n === 1 ? path.length / 2 : path.length * (0.05 + (0.9 * i) / (n - 1));
    const units = t.units.map((u, i) => {
      const s = at(i), p = pointAt(path, s);
      const node = { ...p, s, unit: u, track: t, spacing };
      nodes.set(u.id, node);
      return node;
    });
    tracks.push({ track: t, def, path, units });
  }
  return { tracks, nodes };
}

/**
 * Returns { el: <svg>, summary }.
 * highlightUnit: pulse this neuron; newLesson: animate the dendrite (and any
 * axons) that finishing this lesson just added.
 */
export function renderCircuit({ highlightUnit = null, newLesson = null } = {}) {
  const { tracks, nodes } = layout();
  const now = new Map(), before = new Map();
  for (const [id, n] of nodes) {
    now.set(id, unitState(n.unit));
    before.set(id, newLesson ? unitState(n.unit, newLesson) : now.get(id));
  }
  const written = [...now.values()].filter((s) => s.written.length);
  const summary = {
    wired: written.filter((s) => s.done.length).length,
    myelinated: written.filter((s) => s.mastery >= MASTERED).length,
    total: written.length,
    complete: written.length > 0 && written.every((s) => s.mastery >= MASTERED),
  };

  const tractLayer = [], axonLayer = [], neuronLayer = [], signals = [];
  let axonId = 0;
  const axon = (d, color, sa, sb, wasLit) => {
    const m = Math.min(sa.mastery, sb.mastery);
    const grow = wasLit ? '' : ' grow" pathLength="100';
    const id = `nl-ax${axonId++}`;
    axonLayer.push(`<path id="${id}" d="${d}" class="c-axon on${grow}" style="stroke:${color};stroke-width:${f(1.4 + 1.6 * m)}"/>`);
    // Mastered: myelin wraps the axon in segments, with bare nodes between them.
    if (m >= MASTERED) {
      axonLayer.push(`<path d="${d}" class="c-myelin-o" style="stroke:${color}"/>`);
      axonLayer.push(`<path d="${d}" class="c-myelin-i" style="stroke:color-mix(in srgb, ${color} 22%, var(--surface))"/>`);
    }
    signals.push({ id, color });
  };

  for (const { track, path, units } of tracks) {
    // The pathway itself: a faint tract you can see before you've learned it.
    tractLayer.push(`<path d="${fullPath(path)}" class="c-tract-glow" style="stroke:${track.color}"/>`);
    tractLayer.push(`<path d="${fullPath(path)}" class="c-tract" style="stroke:${track.color}"/>`);
    const links = units.slice(1).map((u, i) => [units[i], u]);
    if (path.closed && units.length > 2) links.push([units[units.length - 1], units[0]]);
    for (const [a, b] of links) {
      const sa = now.get(a.unit.id), sb = now.get(b.unit.id);
      if (!(sa.done.length && sb.done.length)) continue;
      const wasLit = before.get(a.unit.id).done.length && before.get(b.unit.id).done.length;
      axon(slice(path, a.s, b.s), track.color, sa, sb, wasLit);
    }
  }

  // Neurons: cell body + one dendrite per written lesson, pointing upstream.
  for (const [id, n] of nodes) {
    const st = now.get(id), color = n.track.color;
    if (!st.written.length) { neuronLayer.push(`<circle cx="${f(n.x)}" cy="${f(n.y)}" r="2" class="c-ghost" style="fill:${color}"/>`); continue; }
    const count = Math.min(st.written.length, 8);
    const soma = 3.4 + 2.6 * st.doneFrac;
    const len = Math.max(5, Math.min(11, n.spacing * 0.32));
    const parts = [];
    st.written.slice(0, count).forEach((lessonId, k) => {
      const ang = n.angle + Math.PI + (k - (count - 1) / 2) * ((Math.PI * 1.4) / Math.max(count, 2));
      const x0 = n.x + Math.cos(ang) * soma * 0.8, y0 = n.y + Math.sin(ang) * soma * 0.8;
      const xf = n.x + Math.cos(ang) * (soma + len * 0.65), yf = n.y + Math.sin(ang) * (soma + len * 0.65);
      const tw = (s) => `M${f(xf)} ${f(yf)}L${f(xf + Math.cos(ang + s) * len * 0.45)} ${f(yf + Math.sin(ang + s) * len * 0.45)}`;
      const bend = (k % 2 ? -0.25 : 0.25);
      const trunk = `M${f(x0)} ${f(y0)}Q${f(n.x + Math.cos(ang + bend) * (soma + len * 0.3))} ${f(n.y + Math.sin(ang + bend) * (soma + len * 0.3))} ${f(xf)} ${f(yf)}`;
      const isDone = st.done.includes(lessonId), grow = lessonId === newLesson ? ' grow" pathLength="100' : '';
      const paint = isDone ? ` style="stroke:${color}"` : '';
      // A tapering dendrite: a thick trunk that forks into two thin twigs.
      parts.push(`<path d="${trunk}" class="c-dend${isDone ? '' : ' off'}${grow}"${paint}/><path d="${tw(0.5)}${tw(-0.45)}" class="c-twig${isDone ? '' : ' off'}${grow}"${paint}/>`);
    });
    const filled = st.done.length > 0, hl = id === highlightUnit;
    neuronLayer.push(`<g class="c-neuron">${parts.join('')}`
      + (st.mastery >= MASTERED ? `<circle cx="${f(n.x)}" cy="${f(n.y)}" r="${f(soma + 4)}" class="c-halo" style="fill:${color}"/>` : '')
      + (hl ? `<circle cx="${f(n.x)}" cy="${f(n.y)}" r="${f(soma + 2)}" class="c-ping" style="stroke:${color}"/>` : '')
      + `<path d="${blob(n.x, n.y, soma, id)}" class="c-soma${filled ? '' : ' off'}" style="${filled ? `fill:${color};` : ''}stroke:${filled ? `color-mix(in srgb, ${color} 70%, #000)` : color}"/>`
      + (filled ? `<circle cx="${f(n.x - soma * 0.12)}" cy="${f(n.y - soma * 0.1)}" r="${f(soma * 0.38)}" class="c-nucleus"/>` : '')
      + `<title>${esc(n.unit.id)}: ${esc(n.unit.title)} — ${st.done.length}/${st.written.length} lessons</title></g>`);
  }

  if (summary.complete) {
    signals.forEach(({ id, color }, k) => neuronLayer.push(
      `<circle r="2.4" fill="${color}" class="c-signal"><animateMotion dur="1.8s" begin="${f((k * 0.29) % 1.8)}s" repeatCount="indefinite"><mpath href="#${id}"/></animateMotion></circle>`));
  }

  const label = `Your circuit: ${summary.wired} of ${summary.total} neurons wired, ${summary.myelinated} myelinated${summary.complete ? '. Circuit complete.' : '.'}`;
  const el = svg(`<svg class="circuit" viewBox="0 0 ${VIEW_W} ${VIEW_H}" role="img" aria-label="${label}">${anatomy()}${tractLayer.join('')}${axonLayer.join('')}${neuronLayer.join('')}</svg>`);
  return { el, summary };
}

// Per-track progress and circuit names, for the legend.
export function trackProgress() {
  const mapping = circuitFor();
  return content.tracks.map((t) => {
    const states = t.units.map((u) => unitState(u)).filter((s) => s.written.length);
    return { track: t, circuit: CIRCUITS[mapping.get(t.id).key], wired: states.filter((s) => s.done.length).length, total: states.length };
  });
}
