"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, X, RefreshCw, AlertCircle, CheckCircle2, Zap } from "lucide-react";
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
  const readerElementId = "tome-barcode-reader";

  const handleScanSuccess = useCallback((decodedText: string) => {
    // Sanitize alphanumeric ISBN
    const clean = decodedText.replace(/[^0-9X]/gi, "");
    if (clean.length >= 10) {
      setDetectedIsbn(clean);
      // Play brief success sound / feedback if available
      try {
        if ("vibrate" in navigator) {
          navigator.vibrate(100);
        }
      } catch {
        // vibration not supported
      }

      // Stop scanner and notify parent
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
      setTimeout(() => {
        onDetected(clean);
        onClose();
      }, 700);
    }
  }, [onDetected, onClose]);

  const startScanning = useCallback(async (cameraId?: string) => {
    setCameraError(null);
    setDetectedIsbn(null);

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(readerElementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.UPC_A,
          ],
          verbose: false,
        });
      }

      // If scanner is already active, stop before restarting
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      const cameraConfig = cameraId
        ? { deviceId: { exact: cameraId } }
        : { facingMode: "environment" };

      await scannerRef.current.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.333333,
        },
        handleScanSuccess,
        () => {
          // Frame scanned without barcode match, continue silently
        }
      );

      setIsScanning(true);
    } catch (err: unknown) {
      console.error("Camera startup error:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "Nie udało się uruchomić kamery. Upewnij się, że przyznano uprawnienia.";
      setCameraError(msg);
      setIsScanning(false);
    }
  }, [handleScanSuccess]);

  // Enumerate cameras and auto-start
  useEffect(() => {
    let isMounted = true;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!isMounted) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera (environment) if available
          const backCam = devices.find((d) =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("tył") ||
            d.label.toLowerCase().includes("environment")
          );
          const chosen = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(chosen);
          startScanning(chosen);
        } else {
          startScanning();
        }
      })
      .catch(() => {
        if (!isMounted) return;
        // Fallback to start with facingMode environment
        startScanning();
      });

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {});
        }
        try {
          scannerRef.current.clear();
        } catch {
          // ignore clear error on unmount
        }
      }
    };
  }, [startScanning]);

  const handleSwitchCamera = (newCamId: string) => {
    setSelectedCameraId(newCamId);
    startScanning(newCamId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
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
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition"
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
              ? "Obsługuje formaty EAN-13, EAN-8, UPC, Code-128"
              : "Supports EAN-13, EAN-8, UPC, Code-128"}
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
