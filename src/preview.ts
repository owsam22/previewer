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

(window as any).sharePreview = async () => {
  const token = localStorage.getItem("previewSourceToken");
  if (!token) {
    alert("Local file uploads cannot be shared via URL. Please use the Paste or GitHub features to generate a shareable link!");
    return;
  }

  // Construct URL. e.g. https://previewer-one.vercel.app/?repo=user/repo
  // We use standard pathname (origin) + token, removing any preview.html that might be in the path locally.
  const appBaseUrl = window.location.origin + window.location.pathname.replace('preview.html', '');
  const shareUrl = appBaseUrl + token;

  const shareData = {
    title: 'Live Web Preview',
    text: 'Check out this live preview I generated!',
    url: shareUrl
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert('Preview URL copied to clipboard!');
    }
  } catch (err) {
    console.error('Error sharing:', err);
  }
};
