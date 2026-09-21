/**
 * Whether request authentication is skipped and the first account is assumed.
 *
 * This used to be plain `NODE_ENV !== "production"`, which fails open: a
 * deployment that loses or misspells NODE_ENV serves the whole app — including
 * user administration — to anyone who knows the address, and looks completely
 * normal while doing it. Now the bypass needs its own deliberate switch, so a
 * missing variable locks the door instead of opening it.
 *
 * The NODE_ENV check stays as a second barrier: even with DEV_SKIP_AUTH set,
 * a production build never skips authentication.
 */
export function authBypassEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEV_SKIP_AUTH === "true";
}
