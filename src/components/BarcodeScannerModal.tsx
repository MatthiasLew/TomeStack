"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, X, RefreshCw, AlertCircle, CheckCircle2, Zap } from "lucide-react";
import { isValidIsbn, normalizeIsbn } from "@/lib/api/validation";
import { Language } from "@/types";

interface BarcodeScannerModalProps {
  lang: Language;
  onClose: () => void;
  onDetected: (isbn: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  lang,
  onClose,
  onDetected,
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedIsbn, setDetectedIsbn] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const callbacks = useRef({ onDetected, onClose });
  callbacks.current = { onDetected, onClose };
  const generation = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const detected = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readerElementId = "tome-barcode-reader";

  const startScanning = useCallback((cameraId?: string) => {
    const version = generation.current;
    setCameraError(null);
    setDetectedIsbn(null);
    detected.current = false;
    queue.current = queue.current.catch(() => {}).then(async () => {
      if (version !== generation.current) return;
      const scanner = scannerRef.current || new Html5Qrcode(readerElementId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.CODE_128], verbose: false,
      });
      scannerRef.current = scanner;
      if (scanner.isScanning) await scanner.stop();
      if (version !== generation.current) return;
      try {
        await scanner.start(cameraId ? { deviceId: { exact: cameraId } } : { facingMode: "environment" }, {
          fps: 15,
          qrbox: (width, height) => ({ width: Math.min(280, Math.floor(width * 0.9)), height: Math.min(160, Math.floor(height * 0.7)) }),
        }, text => {
          if (version !== generation.current || detected.current || !isValidIsbn(text)) return;
          detected.current = true;
          const isbn = normalizeIsbn(text);
          setDetectedIsbn(isbn);
          setIsScanning(false);
          queue.current = queue.current.then(async () => { if (scanner.isScanning) await scanner.stop(); }).catch(() => {});
          timer.current = setTimeout(() => {
            if (version !== generation.current) return;
            callbacks.current.onDetected(isbn);
            callbacks.current.onClose();
          }, 700);
        }, () => {});
        if (version !== generation.current) {
          if (scanner.isScanning) await scanner.stop();
          return;
        }
        setIsScanning(true);
      } catch (error) {
        if (version !== generation.current) return;
        setCameraError(error instanceof Error ? error.message : String(error));
        setIsScanning(false);
      }
    });
  }, []);

  useEffect(() => {
    const version = ++generation.current;
    Html5Qrcode.getCameras().then(devices => {
      if (version !== generation.current) return;
      setCameras(devices);
      const camera = devices.find(d => /back|tył|environment/i.test(d.label)) || devices[0];
      setSelectedCameraId(camera?.id || null);
      startScanning(camera?.id);
    }).catch(() => { if (version === generation.current) startScanning(); });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("keydown", handleKeyDown);
      }
      generation.current = version + 1;
      if (timer.current) clearTimeout(timer.current);
      queue.current = queue.current.catch(() => {}).then(async () => {
        const scanner = scannerRef.current;
        if (!scanner) return;
        if (scanner.isScanning) await scanner.stop();
        scanner.clear();
        scannerRef.current = null;
      }).catch(() => {});
    };
  }, [startScanning, onClose]);

  const handleSwitchCamera = (id: string) => {
    if (detected.current) return;
    setSelectedCameraId(id);
    startScanning(id);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="barcode-modal-title"
        className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 id="barcode-modal-title" className="text-base font-bold text-white flex items-center gap-2">
                <span>{lang === "pl" ? "Skaner Kodów Kreskowych ISBN" : "ISBN Barcode Scanner"}</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> Live Camera
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                {lang === "pl"
                  ? "Skieruj aparat na kod kreskowy EAN-13 na tylnej okładce książki"
                  : "Point your camera at the EAN-13 barcode on the back cover"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={lang === "pl" ? "Zamknij" : "Close"}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewport */}
        <div className="relative p-6 flex flex-col items-center bg-gray-950">
          {/* Target Box Overlay */}
          <div className="relative w-full max-w-sm aspect-[4/3] rounded-xl overflow-hidden bg-black border-2 border-dashed border-brand-500/40 flex items-center justify-center shadow-inner">
            <div id={readerElementId} className="w-full h-full object-cover" />

            {/* Custom Scanning Laser effect */}
            {isScanning && !detectedIsbn && (
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-brand-400 shadow-[0_0_12px_#38bdf8] animate-pulse pointer-events-none" />
            )}

            {/* Success Overlay */}
            {detectedIsbn && (
              <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce mb-2" />
                <span className="text-xs text-emerald-300 font-medium">
                  {lang === "pl" ? "Odczytano kod ISBN!" : "ISBN Detected!"}
                </span>
                <span className="text-lg font-mono font-bold text-white tracking-widest mt-1">
                  {detectedIsbn}
                </span>
              </div>
            )}
          </div>

          {/* Camera Error Message */}
          {cameraError && (
            <div className="mt-4 w-full max-w-sm p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-semibold">
                  {lang === "pl" ? "Brak dostępu do kamery" : "Camera Access Error"}
                </p>
                <p className="text-[11px] text-rose-300/80 mt-0.5">{cameraError}</p>
                <button
                  onClick={() => startScanning(selectedCameraId || undefined)}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-rose-200 hover:text-white underline"
                >
                  <RefreshCw className="w-3 h-3" />
                  {lang === "pl" ? "Spróbuj ponownie" : "Retry"}
                </button>
              </div>
            </div>
          )}

          {/* Camera Selector Switcher */}
          {cameras.length > 1 && (
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
              <span>{lang === "pl" ? "Wybierz aparat:" : "Camera:"}</span>
              <select
                value={selectedCameraId || ""}
                onChange={(e) => handleSwitchCamera(e.target.value)}
                className="bg-gray-800 text-white rounded-lg px-2.5 py-1.5 border border-gray-700 text-xs focus:outline-none focus:border-brand-500"
              >
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label || `Camera ${c.id.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer info & Cancel */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/60 flex items-center justify-between text-xs text-gray-400">
          <span>
            {lang === "pl"
              ? "Obsługuje ISBN w formatach EAN-13 i Code-128"
              : "Supports ISBN in EAN-13 and Code-128"}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-medium transition"
          >
            {lang === "pl" ? "Zamknij" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
};
