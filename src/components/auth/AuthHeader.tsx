import { AuthGrooves } from "@/components/auth/AuthGrooves";

/**
 * The head every page before the sign-in carries: the wordmark, the slogan,
 * then the card's content.
 *
 * RetroMan is **deliberately exempt** from the Codebook standard "Das
 * Markenzeichen steht auf der Kante der Anmeldekarte"
 * (docs/product-standards.md). The 84px mark overhanging the card's top edge
 * was built to the standard's measures in v1.6.0 and taken out again in
 * v1.6.1 on the user's call: it did not look good here. The standard itself
 * leaves room for that — it fixes the form for the products that carry it,
 * not a duty for every product to carry it.
 *
 * What stays, because it reads well and costs nothing: the card, and the
 * wordmark as type rather than as an image — "Retro" in the brand colour,
 * "Man" neutral, which is the one thing the standard asks for that RetroMan
 * had never done. Set in RetroMan's own sans (Geist) rather than the
 * Brandbook's Outfit: a seventh font file for one line of type costs every
 * visitor bytes for a difference nobody can name.
 *
 * One component rather than six copies — it is the first child of the card.
 */

export function AuthHeader({
  /** Pages without a title of their own make the wordmark the h1. */
  asHeading = true,
  slogan,
}: {
  asHeading?: boolean;
  slogan: string;
}) {
  const Wordmark = asHeading ? "h1" : "div";

  return (
    <div>
      <Wordmark className="text-center text-[28px] font-bold leading-tight tracking-tight">
        <span className="text-primary">Retro</span>
        <span className="text-foreground">Man</span>
      </Wordmark>
      <p className="slogan-glow mt-1 text-center text-sm italic tracking-widest">{slogan}</p>
    </div>
  );
}

/**
 * The card the header sits on, and the record's grooves behind it.
 *
 * space-y-5 is 20 px between the head and the content, and the same rhythm
 * for every further gap inside the card. The card used to carry 42 px of top
 * margin and 58 px of top padding to make room for the overhanging mark;
 * with the mark gone, so is the room — otherwise the head would float in an
 * empty band that nothing explains.
 *
 * The grooves come from here rather than from each of the six pages: they are
 * a sibling of the card inside the page's centring wrapper, so a page gets
 * them by using this card and cannot forget them. z-10 on the card keeps it
 * above the layer; the layer itself is fixed and clips its own overflow, so
 * nothing it draws can put a scrollbar on the page.
 */
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthGrooves />
      <div className="relative z-10 w-full max-w-sm space-y-5 rounded-xl border border-border bg-card p-6 shadow-xl">
        {children}
      </div>
    </>
  );
}
