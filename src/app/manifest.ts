import type { MetadataRoute } from "next";

// Android reads the icons from here, not from the apple-touch-icon. Without a
// manifest, adding the app to the home screen yields a screenshot of whatever
// was on screen — behind a login that is the sign-in form, identical on every
// device (Codebook product-standards.md).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RetroMan",
    short_name: "RetroMan",
    description: "Deine Sammlung physischer Medien",
    start_url: "/",
    // The browser chrome disappears, and with it the back button — RetroMan's
    // sidebar carries navigation on its own, so nothing becomes unreachable.
    display: "standalone",
    // Splash uses the app's own dark ground rather than the brand tone; a
    // full-bleed magenta splash before a dark interface reads as a flash.
    background_color: "#0d0b1e",
    theme_color: "#ff2d78",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // Its own artwork, not a copy of the iOS one: launchers crop to a
      // circle, squircle or teardrop, and only a circle of 80% diameter is
      // guaranteed to survive.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
