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

    async function start() {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();

        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const deviceId = devices.find((d) => /back|rear|environment/i.test(d.label))?.deviceId
          ?? devices[0]?.deviceId;

        if (!deviceId) {
          setError("Keine Kamera gefunden.");
          return;
        }

        if (!videoRef.current || cancelled) return;

        const controls = await reader.decodeFromVideoDevice(deviceId, videoRef.current, (result) => {
          if (cancelled) return;
          if (result) {
            const text = result.getText();
            if (/^\d{8,14}$/.test(text)) {
              setScanning(false);
              onDetected(text);
            }
          }
        });

        stopRef.current = () => { try { controls.stop(); } catch {} };
      } catch (e) {
        if (!cancelled) setError("Kamerazugriff verweigert oder nicht verfügbar.");
        console.error(e);
      }
    }

    start();

    return () => {
      cancelled = true;
      stopRef.current?.();
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
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
