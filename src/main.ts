import { handleGitHubSubmit } from './github.ts';

const folderInput = document.getElementById('folderInput') as HTMLInputElement;
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const uploadStatus = document.getElementById('uploadStatus') as HTMLParagraphElement;
const runBtn = document.getElementById('runButton') as HTMLButtonElement;
const fileList = document.getElementById('fileList') as HTMLUListElement;
const dropZone = document.getElementById('dropZone') as HTMLDivElement;

export let filesMap: Record<string, string> = {};

export async function handleFiles(fileListInput: FileList | File[]) {
  uploadStatus.textContent = '📤 Uploading...';

  for (const file of Array.from(fileListInput)) {
    const path = file.webkitRelativePath || (file as any).fullPath || file.name;

    if (!filesMap[path]) {
      if (file.type.startsWith('image/')) {
        filesMap[path] = await readAsDataURL(file);
      } else {
        filesMap[path] = await file.text();
      }
    }
  }
  updateReadyStatus();
}

export function updateReadyStatus(customMessage?: string) {
  const hasHTML = Object.keys(filesMap).some(f => f.endsWith('index.html') || f.endsWith('.html'));
  if (!hasHTML) {
    uploadStatus.textContent = customMessage || "❌ No HTML file found.";
    runBtn.disabled = true;
    return;
  }

  uploadStatus.textContent = customMessage || `✅ ${Object.keys(filesMap).length} files ready.`;
  runBtn.disabled = false;

  fileList.innerHTML = Object.keys(filesMap)
    .map(f => `<li>${f}</li>`)
    .join('');
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function runPreviewFromMap() {
  let html: string = filesMap['index.html'] || Object.entries(filesMap).find(([key]) => key.endsWith('.html'))?.[1] || "";

  if (!html) {
    alert("❌ No HTML file to preview.");
    return;
  }

  for (let [path, content] of Object.entries(filesMap)) {
    if (path.endsWith('.css')) {
      html = html.replace('</head>', `<style>${content}</style></head>`);
      html = html.replace(/<link[^>]*rel=["']stylesheet["'][^>]*href=["'][./]*style\.css["'][^>]*>/i, '');
    }
    if (path.endsWith('.js')) {
      html = html.replace('</body>', `<script>${content}</script></body>`);
      html = html.replace(/<script[^>]*src=["'][./]*script\.js["'][^>]*><\/script>/i, '');
    }
  }

  for (let [path, content] of Object.entries(filesMap)) {
    if (path.match(/\.(png|jpe?g|gif|svg|webp)$/i)) {
      const filename = path.split('/').pop() || path;
      html = html.replaceAll(filename, content);
    }
  }

  localStorage.setItem("previewHTML", html);
  window.location.href = 'preview.html';
}

if (runBtn) {
  runBtn.addEventListener('click', runPreviewFromMap);
}

if (dropZone) {
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });
  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');

    const items = e.dataTransfer?.items;
    if (items) {
      const fileEntries: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry) {
          await traverseFileTree(entry, "", fileEntries);
        }
      }
      handleFiles(fileEntries);
    } else if (e.dataTransfer?.files) {
      handleFiles(e.dataTransfer.files);
    }
  });
}

async function traverseFileTree(item: any, path: string, files: File[] = []) {
  path = path || "";
  if (item.isFile) {
    await new Promise<void>(resolve => {
      item.file((file: File) => {
        (file as any).fullPath = path + file.name;
        files.push(file);
        resolve();
      });
    });
  } else if (item.isDirectory) {
    const dirReader = item.createReader();
    const entries = await new Promise<any[]>(resolve => dirReader.readEntries(resolve));
    for (const entry of entries) {
      await traverseFileTree(entry, path + item.name + "/", files);
    }
  }
}

if (folderInput) folderInput.addEventListener('change', (e) => handleFiles((e.target as HTMLInputElement).files!));
if (fileInput) fileInput.addEventListener('change', (e) => handleFiles((e.target as HTMLInputElement).files!));

// UI Panel Switching
const tabs = document.querySelectorAll('.tab-btn');
const panels = document.querySelectorAll('.panel');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.getAttribute('data-target');
    if (!target) return;
    
    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    
    tab.classList.add('active');
    document.getElementById(target)?.classList.add('active');
  });
});

const runBtnPaste = document.getElementById('runButtonPaste');
runBtnPaste?.addEventListener('click', () => {
  const html = (document.getElementById('htmlInput') as HTMLTextAreaElement).value || "<!-- No HTML -->";
  const css = (document.getElementById('cssInput') as HTMLTextAreaElement).value || "";
  const js = (document.getElementById('jsInput') as HTMLTextAreaElement).value || "";

  let finalHTML = html;

  if (css) {
    if (finalHTML.includes('</head>')) {
      finalHTML = finalHTML.replace('</head>', `<style>${css}</style></head>`);
    } else {
      finalHTML = `<style>${css}</style>` + finalHTML;
    }
  }
  if (js) {
    if (finalHTML.includes('</body>')) {
      finalHTML = finalHTML.replace('</body>', `<script>${js}</script></body>`);
    } else {
      finalHTML = finalHTML + `<script>${js}</script>`;
    }
  }

  localStorage.setItem("previewHTML", finalHTML);
  window.location.href = 'preview.html';
});

const runBtnGithub = document.getElementById('runButtonGithub');
runBtnGithub?.addEventListener('click', handleGitHubSubmit);

const shareButton = document.getElementById('shareButton');
if (shareButton) {
  shareButton.addEventListener('click', async () => {
    const shareData = {
      title: 'Live Web Previewer',
      text: 'Check out this awesome Live Web Previewer! It lets you instantly preview your HTML, CSS, and JS projects without a server.',
      url: window.location.origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        alert('Website URL copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  });
}

export function resetAppState() {
    filesMap = {};
    updateReadyStatus("Started anew. Upload files to continue.");
}
