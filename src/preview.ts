const html = localStorage.getItem("previewHTML");
const iframe = document.getElementById("previewFrame") as HTMLIFrameElement;
const deviceFrame = document.getElementById("deviceFrame") as HTMLDivElement;

if (html && iframe) {
  iframe.srcdoc = html;
} else if (iframe) {
  iframe.srcdoc = `<h2 style="padding:2rem;font-family:'Outfit',sans-serif;text-align:center;">❌ No preview found. Go back and upload your project again.</h2>`;
}

(window as any).restartPreview = () => {
  location.reload();
};

(window as any).goHome = () => {
  window.location.href = 'index.html';
};

(window as any).setDevice = (type: string) => {
  if (deviceFrame) {
    deviceFrame.className = 'preview-container ' + type;
  }
};
