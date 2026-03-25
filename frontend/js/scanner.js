let html5QrCode = null;

export function startScanner(elementId, onSuccess, onReady) {
  if (html5QrCode) stopScanner();

  html5QrCode = new Html5Qrcode(elementId, { verbose: false });

  const config = {
    fps: 10,
    qrbox: { width: 250, height: 150 },
    aspectRatio: 1.333,
    disableFlip: false,
    formatsToSupport: [
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.ITF,
      Html5QrcodeSupportedFormats.QR_CODE,
    ],
  };

  Html5Qrcode.getCameras()
    .then((cameras) => {
      if (!cameras || cameras.length === 0) {
        alert("No camera found on this device.");
        return;
      }

      // Prefer rear camera
      const backCam = cameras.find((c) =>
        /back|rear|environment/i.test(c.label)
      );
      const cameraId = backCam ? backCam.id : cameras[cameras.length - 1].id;

      return html5QrCode.start(
        { facingMode: "environment" },  // use environment camera directly
        config,
        (decodedText) => { onSuccess(decodedText); stopScanner(); },
        (_err) => {}
      );
    })
    .then(() => { if (onReady) onReady(html5QrCode); })
    .catch((err) => {
      console.error("Camera error:", err);
      alert("Could not access camera. Please allow camera permissions and try again.");
    });

  return html5QrCode;
}

export function stopScanner() {
  if (html5QrCode) {
    html5QrCode.stop().catch(() => {}).finally(() => {
      html5QrCode.clear().catch(() => {});
      html5QrCode = null;
    });
  }
}