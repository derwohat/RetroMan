/**
 * The one place a mail's layout is built — Man-Suite Brandbook §13
 * "Gestaltete Mails", form "Markenkante", and Codebook docs/operations.md
 * "Gestaltete Mails: HTML im Suite-Design, Text bleibt dabei".
 *
 * The individual mails supply only heading, paragraphs, facts, button and
 * note; head, fact box, button and footer are built here. A second copy of
 * this markup is how one mail ends up without the dark-mode block or with an
 * unescaped name in it.
 *
 * Rules that are not style and must not be relaxed:
 *  - NOTHING is loaded from outside: no <img>, no <link>, no @font-face, no
 *    url(). The mark is built from table cells, so it also appears where
 *    images are blocked. No tracking pixel either.
 *  - EVERY inserted value goes through escapeHtml. A template string with a
 *    user name directly in the HTML is a bug, not a shortcut — that is why
 *    paragraphs with markup come from htmlText(), which escapes the values
 *    and trusts only the template.
 *  - The address in the button comes from the configured base address, never
 *    from a Host header.
 *  - Button and written-out address lead to the same target, so someone
 *    suspicious can see where the button goes before clicking it.
 */

/** Markup that has already been escaped or is trusted template text. */
export type Html = string & { readonly __html: unique symbol };

export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * A paragraph with markup: the template is trusted, every value is escaped.
 * `htmlText("Hallo <strong>{name}</strong>,", { name })` — a name containing
 * `<b>` arrives as text.
 */
export function htmlText(template: string, values: Record<string, unknown> = {}): Html {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in values ? escapeHtml(values[key]) : `{${key}}`,
  ) as Html;
}

export type MailFact = {
  label: string;
  value: string;
  /** Identifiers (user names, tokens) are set in monospace per §13. */
  mono?: boolean;
};

export type MailContent = {
  /** The invisible first line the inbox shows next to the subject. */
  preview: string;
  heading: string;
  /** Paragraphs; strings are escaped, Html is inserted as it stands. */
  paragraphs: Array<string | Html>;
  facts?: MailFact[];
  button?: { label: string; url: string };
  /** Shown above the "sent automatically" line, where a mail needs it. */
  note?: string;
};

// ── RetroMan's values ───────────────────────────────────────────────────────
// Derived with the Brandbook's own formulas and measured on 04.11.2026, not
// picked by eye:
//   brand            #D4177A (the light-theme primary; the mail card is white)
//   soft tint light  12% brand in #FFFFFF  -> #FAE3EF, 4.12:1 to the brand
//                                             (the formula asks for >= 3:1)
//   soft tint dark   12% brand in #161B22  -> #2D1B2D
//   contour          0.75*255 + 0.25*brand -> #F4C5DE, precomputed because
//                                             Outlook knows no rgba()
//   dark-mode text   #FF2D95, 5.46:1 on #0D1117
//   white on brand   5.00:1 (the button)
const C = {
  brand: "#D4177A",
  contour: "#F4C5DE",
  softLight: "#FAE3EF",
  softDark: "#2D1B2D",
  brandDark: "#FF2D95",
  page: "#F2F4F7",
  card: "#FFFFFF",
  line: "#E2E6EC",
  ink: "#16202E",
  // #586270 (6.18:1 on white), NOT the app's #7a8699 (3.7:1): the smallest
  // text in a mail is 12px.
  muted: "#586270",
  pageDark: "#0D1117",
  cardDark: "#161B22",
  lineDark: "#30363D",
  inkDark: "#E6EDF3",
  mutedDark: "#8B949E",
} as const;

const FONT = "'Segoe UI',Arial,Helvetica,sans-serif";
const MONO = "Consolas,'Courier New',monospace";

/** The product footer line, per §13. */
const FOOTER = "Automatisch verschickt von RetroMan, der Verwaltung für physische Sammlungen.";

/**
 * The mark, built from table cells: a 24px rounded tile in the brand colour
 * with the inner field, as §13 requires. No image — it has to appear where
 * images are blocked, and an image request would tell a third party the
 * recipient opened the mail.
 */
function markCells(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="24" style="width:24px;border-collapse:separate;"><tr><td width="24" height="24" bgcolor="${C.brand}" style="width:24px;height:24px;background:${C.brand};border:1px solid ${C.contour};border-radius:7px;text-align:center;vertical-align:middle;line-height:0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;border-collapse:separate;"><tr><td width="8" height="8" bgcolor="${C.contour}" style="width:8px;height:8px;background:${C.contour};border-radius:2px;line-height:0;font-size:0;">&nbsp;</td></tr></table></td></tr></table>`;
}

function factRows(facts: MailFact[]): string {
  return facts
    .map(
      (f) => `<tr>
<td style="padding:0 0 6px 0;font-family:${FONT};font-size:12.5px;color:${C.muted};width:120px;vertical-align:top;" class="rm-muted">${escapeHtml(f.label)}</td>
<td style="padding:0 0 6px 0;font-family:${f.mono ? MONO : FONT};font-size:14px;font-weight:700;color:${C.ink};vertical-align:top;" class="rm-ink">${escapeHtml(f.value)}</td>
</tr>`,
    )
    .join("");
}

export function renderMailHtml(content: MailContent): string {
  const paragraphs = content.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 12px 0;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.ink};" class="rm-ink">${
          typeof p === "string" ? escapeHtml(p) : p
        }</p>`,
    )
    .join("");

  const facts = content.facts?.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:${C.softLight};border-radius:8px;" bgcolor="${C.softLight}" class="rm-soft"><tr><td style="padding:14px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">${factRows(content.facts)}</table></td></tr></table><div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>`
    : "";

  // The cell carries bgcolor as well as the style, because Outlook ignores
  // background on a styled element but honours the attribute.
  const button = content.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${C.brand}" style="background:${C.brand};border-radius:8px;"><a href="${escapeHtml(
        content.button.url,
      )}" style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;">${escapeHtml(
        content.button.label,
      )}</a></td></tr></table><div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>
<p style="margin:0 0 4px 0;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.muted};" class="rm-muted">Funktioniert der Knopf nicht? Diese Adresse führt zum selben Ziel:</p>
<p style="margin:0 0 12px 0;font-family:${MONO};font-size:12.5px;line-height:1.5;color:${C.muted};word-break:break-all;" class="rm-muted">${escapeHtml(
        content.button.url,
      )}</p>`
    : "";

  const note = content.note
    ? `<p style="margin:0 0 8px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};" class="rm-muted">${escapeHtml(content.note)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="de"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<style>
/* Apple Mail, iOS and Outlook for Mac follow this; Gmail and Outlook on
   Windows recolour on their own. Values from Brandbook §4.1. */
@media (prefers-color-scheme: dark) {
  .rm-page { background:${C.pageDark} !important; }
  .rm-card { background:${C.cardDark} !important; border-color:${C.lineDark} !important; }
  .rm-ink { color:${C.inkDark} !important; }
  .rm-muted { color:${C.mutedDark} !important; }
  .rm-soft { background:${C.softDark} !important; }
  .rm-brand { color:${C.brandDark} !important; }
  .rm-line { border-color:${C.lineDark} !important; }
}
/* Phone: 16px inner padding, 8px outer margin (§13 point 6). */
@media only screen and (max-width:480px) {
  .rm-pad { padding:16px !important; }
  .rm-gutter { padding:8px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};" bgcolor="${C.page}" class="rm-page">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(content.preview)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:${C.page};" bgcolor="${C.page}" class="rm-page">
<tr><td align="center" style="padding:24px;" class="rm-gutter">
<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"><tr><td><![endif]-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;max-width:600px;background:${C.card};border:1px solid ${C.line};border-top:3px solid ${C.brand};border-radius:8px;" bgcolor="${C.card}" class="rm-card">
<tr><td style="padding:24px;" class="rm-pad">

<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle;padding-right:8px;">${markCells()}</td>
<td style="vertical-align:middle;font-family:${FONT};font-size:15px;font-weight:700;color:${C.ink};" class="rm-ink"><span style="color:${C.brand};" class="rm-brand">Retro</span>Man</td>
</tr></table>
<div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>

<h1 style="margin:0 0 12px 0;font-family:${FONT};font-size:22px;font-weight:700;line-height:1.3;color:${C.ink};" class="rm-ink">${escapeHtml(content.heading)}</h1>
${paragraphs}
${facts}
${button}

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;"><tr><td style="border-top:1px solid ${C.line};padding-top:14px;" class="rm-line">
${note}<p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};" class="rm-muted">${escapeHtml(FOOTER)}</p>
</td></tr></table>

</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>`;
}

/**
 * The text version, written on its own terms — "Über diesen Link", never
 * "Über den Knopf". Whoever turns HTML off reads this one.
 */
export function renderMailText(content: MailContent): string {
  const teile: string[] = [content.heading, ""];
  for (const p of content.paragraphs) {
    // The HTML version may carry <strong> and escaped entities; the text
    // version carries neither. Without the second step a name with an
    // ampersand arrived in the text mail as "Meyer &amp; Sohn".
    teile.push(
      String(p)
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'"),
      "",
    );
  }
  if (content.facts?.length) {
    for (const f of content.facts) teile.push(`${f.label}: ${f.value}`);
    teile.push("");
  }
  if (content.button) {
    teile.push(`${content.button.label} — über diesen Link:`, content.button.url, "");
  }
  if (content.note) teile.push(content.note, "");
  teile.push(FOOTER);
  return teile.join("\n");
}
