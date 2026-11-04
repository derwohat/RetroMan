/**
 * The record's grooves behind the sign-in card.
 *
 * Chosen by the user from five forms (`/visuell`, 04.11.2026): rings only, no
 * disc body — a filled disc would cover the synthwave grid the whole app sits
 * on, and in the light theme its edge reads as a patch lying ON the page. The
 * rings lie over the grid instead of replacing it.
 *
 * Same vocabulary as the shell's brand band (`AppHeader`): the `.groove-ring`
 * class from globals.css, the colour ramp from the brand pink outwards to the
 * cyan, brighter near the card and almost gone at the edge. Reusing the class
 * rather than copying its declarations is what makes the reduced-motion rule
 * in globals.css apply here too — there the rings stand still at 45% of their
 * peak, so the cadence below is for everybody else.
 *
 * The layer is `fixed` on purpose. The rings reach far past the card, and the
 * card's own page wrapper does not clip: a layer inside the flow would push
 * scrollbars onto every sign-in page. Fixed means the viewport is both the
 * containing block and the clip, and since the page centres the card, the
 * viewport's middle is the card's middle. On a form taller than the screen the
 * rings stay put while the card scrolls, which is the better of the two
 * behaviours — grooves that scroll away look like a mistake.
 */

const RING_COUNT = 7;
/** First radius, in px: just outside the 384px card's corner. */
const FIRST_R = 210;
const RING_STEP = 58;

/**
 * 3 seconds, chosen from four cadences (7 / 4,5 / 3 / 2). The band upstairs
 * runs at 7s; here the record is the only thing moving, and at 7s one waits
 * for it. At 2s the page flickers while somebody types a password.
 */
const CYCLE_S = 3;
/**
 * The stagger scales WITH the cadence — 0.26s of the band's 7s, so a
 * twenty-seventh of the cycle. Kept fixed, the rings bunch up at a short
 * cadence and the whole thing reads as one flash instead of a wave running
 * outwards.
 */
const STAGGER_S = (0.26 / 7) * CYCLE_S;

const RING_FROM = [0xff, 0x2d, 0x95] as const;
const RING_TO = [0x00, 0xf5, 0xd4] as const;

function ringColor(i: number): string {
  const t = Math.min(1, i / (RING_COUNT - 2));
  const c = RING_FROM.map((from, k) => Math.round(from + (RING_TO[k] - from) * t));
  return `rgb(${c.join(",")})`;
}

/** Brighter near the card, almost gone at the edge. */
function ringPeak(i: number): number {
  return 0.5 * Math.pow(1 - i / RING_COUNT, 1.3) + 0.04;
}

export function AuthGrooves() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {Array.from({ length: RING_COUNT }, (_, i) => {
        const d = (FIRST_R + i * RING_STEP) * 2;
        return (
          <span
            key={i}
            className="groove-ring"
            style={{
              width: d,
              height: d,
              borderColor: ringColor(i),
              ["--groove-peak" as string]: ringPeak(i).toFixed(3),
              animationDuration: `${CYCLE_S}s`,
              animationDelay: `${(i * STAGGER_S).toFixed(3)}s`,
            }}
          />
        );
      })}
    </div>
  );
}
