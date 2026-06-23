"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onDetected: (ean: string) => void;
  onClose: () => void;
};

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>("");
  const [scanning, setScanning] = useState(true);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function start() {
      try {
        if (!videoRef.current || cancelled) return;
        const video = videoRef.current;

        // Get camera stream — only await that can legitimately trigger setError
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        // Configure BEFORE attaching stream (required order for iOS)
        video.muted = true;
        video.setAttribute("playsinline", "true");
        video.setAttribute("autoplay", "true");
        video.srcObject = stream;

        // Fire-and-forget play() — do NOT await.
        // After getUserMedia's permission dialog the user-gesture context may have
        // expired, so play() can throw NotAllowedError. We ignore it here because
        // the autoplay attributes + muted will trigger playback automatically.
        video.play().catch(() => {});

        stopRef.current = () => {
          if (intervalId) clearInterval(intervalId);
          stream.getTracks().forEach((t) => t.stop());
          video.srcObject = null;
        };

        // Load ZXing once, then poll frames — the loop self-guards with readyState
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const canvas = document.createElement("canvas");

        intervalId = setInterval(() => {
          if (cancelled || video.readyState < 2 || video.videoWidth === 0) return;
          canvas.width  = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(video, 0, 0);
          try {
            const result = reader.decodeFromCanvas(canvas);
            const text = result.getText();
            if (/^\d{8,14}$/.test(text)) {
              if (intervalId) clearInterval(intervalId);
              setScanning(false);
              onDetected(text);
            }
          } catch {
            // NotFoundException on every empty frame — expected
          }
        }, 250);

      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          setError(/permission|denied|not allowed/i.test(msg)
            ? "Kamerazugriff verweigert. Bitte in den Browser-Einstellungen erlauben."
            : "Kamera nicht verfügbar.");
        }
        console.error(e);
      }
    }

    start();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      stopRef.current?.();
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-card overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-heading text-[10px] text-primary uppercase tracking-widest">Barcode scannen</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
        </div>

        {error ? (
          <div className="p-6 text-center space-y-2">
            <p className="text-sm text-destructive">{error}</p>
            <button onClick={onClose} className="text-xs text-primary hover:underline">Schließen</button>
          </div>
        ) : (
          <div className="relative">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} className="w-full aspect-square object-cover" playsInline />
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-32 border-2 border-primary rounded-md shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br" />
                </div>
              </div>
            )}
          </div>
        )}

        <p className="px-4 py-3 text-center text-[10px] text-muted-foreground">
          EAN/UPC-Barcode in den Rahmen halten
        </p>
      </div>
    </div>
  );
}
