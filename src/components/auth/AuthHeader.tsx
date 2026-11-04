import Image from "next/image";

/**
 * The head every page before the sign-in carries.
 *
 * Codebook docs/product-standards.md, "Das Markenzeichen steht auf der Kante
 * der Anmeldekarte": the mark large and centred, half of it above the card's
 * top edge, the wordmark centred under it, then the card's content. Measures
 * are fixed by that standard and written out below next to each value, because
 * a number without its reason gets tidied away.
 *
 * One component rather than six copies — it goes in as the first child of the
 * card, and the mark sits absolutely so it moves nothing in the content.
 *
 * Two deliberate departures, both named in the Codebook entry:
 *  - The wordmark is set in RetroMan's own sans (Geist), not the Brandbook's
 *    Outfit. Shipping a seventh font file for one line of type costs every
 *    visitor bytes for a difference nobody can name; the FORM the standard
 *    asks for — large, centred, domain part in the brand colour — is what
 *    carries it.
 *  - The slogan stays. It is RetroMan's own and sits inside the 20px gap the
 *    standard leaves between wordmark and content, so the rhythm is unchanged.
 */

const MARK_PX = 84; // Brandbook: 80–90 px on the sign-in page
const BACKING_PX = 4; // card-coloured ring, or the card edge cuts the mark
const CARD_PAD_TOP_PX = 58;

export function AuthHeader({
  /** Pages without a title of their own make the wordmark the h1. */
  asHeading = true,
  slogan,
}: {
  asHeading?: boolean;
  slogan: string;
}) {
  const Wordmark = asHeading ? "h1" : "div";

  // What has to sit half above the card's edge is the MARK, not the ring
  // around it, and the offset is measured from this header — which starts
  // below the card's border AND its top padding. Each term named, because
  // every one of them cost a pixel when it was missing: positioning the ring
  // instead of the mark measured 41 px of overhang, and forgetting the card's
  // own border measured 41 again. Measured 42 with all four.
  const CARD_BORDER_PX = 1;
  const BACKING_BORDER_PX = 1;
  const markTop = -(
    CARD_BORDER_PX +
    CARD_PAD_TOP_PX +
    MARK_PX / 2 +
    BACKING_PX +
    BACKING_BORDER_PX
  );

  return (
    <div className="relative">
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-[22px] border border-border bg-card"
        style={{ top: markTop, padding: BACKING_PX }}
        aria-hidden="true"
      >
        <Image
          src="/icon-512.png"
          alt=""
          width={MARK_PX}
          height={MARK_PX}
          sizes={`${MARK_PX}px`}
          priority
          className="block"
        />
      </div>

      <Wordmark className="text-center text-[28px] font-bold leading-tight tracking-tight">
        <span className="text-primary">Retro</span>
        <span className="text-foreground">Man</span>
      </Wordmark>
      <p className="slogan-glow mt-1 text-center text-sm italic tracking-widest">{slogan}</p>
    </div>
  );
}

/**
 * The card the header sits on, with the room the overhang needs.
 *
 * space-y-5 is the 20 px the standard puts between the wordmark and the
 * content; every further gap inside the card follows the same rhythm.
 */
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-full max-w-sm space-y-5 rounded-xl border border-border bg-card px-6 pb-6 shadow-xl"
      style={{ marginTop: MARK_PX / 2, paddingTop: CARD_PAD_TOP_PX }}
    >
      {children}
    </div>
  );
}
