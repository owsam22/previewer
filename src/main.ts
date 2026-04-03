import { handleGitHubSubmit } from './github.ts';

const folderInput = document.getElementById('folderInput') as HTMLInputElement;
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const uploadStatus = document.getElementById('uploadStatus') as HTMLParagraphElement;
const runBtn = document.getElementById('runButton') as HTMLButtonElement;
const fileList = document.getElementById('fileList') as HTMLUListElement;
const dropZone = document.getElementById('dropZone') as HTMLDivElement;

export let filesMap: Record<string, string> = {};

export async function handleFiles(fileListInput: FileList | File[]) {
  uploadStatus.innerHTML = '<i data-lucide="upload-cloud" style="width: 16px; margin-right: 6px;"></i> Uploading...';
  if ((window as any).lucide) (window as any).lucide.createIcons();

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
    uploadStatus.innerHTML = customMessage || `<i data-lucide="x-circle" style="width: 16px; margin-right: 6px; color: #ef4444;"></i> No HTML file found.`;
    if ((window as any).lucide) (window as any).lucide.createIcons();
    runBtn.disabled = true;
    return;
  }

  uploadStatus.innerHTML = customMessage || `<i data-lucide="check-circle" style="width: 16px; margin-right: 6px; color: #10b981;"></i> ${Object.keys(filesMap).length} files ready.`;
  if ((window as any).lucide) (window as any).lucide.createIcons();
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
    alert("No HTML file to preview. Please include an index.html.");
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

  localStorage.setItem("previewSourceToken", ""); // Uploads cannot be shared
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
  
  // Create a base64 token of the paste for sharing
  const pastePayload = btoa(encodeURIComponent(JSON.stringify({ h: html, c: css, j: js })));
  localStorage.setItem("previewSourceToken", `?paste=${pastePayload}`);

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
    updateReadyStatus(`<i data-lucide="info" style="width: 16px; margin-right: 6px;"></i> Started anew. Upload files to continue.`);
}

window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // 0. Check Paste parameters
    const pasteUrl = urlParams.get('paste');
    if (pasteUrl) {
        try {
            const decoded = JSON.parse(decodeURIComponent(atob(pasteUrl)));
            (document.getElementById('htmlInput') as HTMLTextAreaElement).value = decoded.h || '';
            (document.getElementById('cssInput') as HTMLTextAreaElement).value = decoded.c || '';
            (document.getElementById('jsInput') as HTMLTextAreaElement).value = decoded.j || '';
            
            const pasteTab = document.querySelector('[data-target="pastePanel"]') as HTMLElement;
            if (pasteTab) pasteTab.click();

            setTimeout(() => {
                const runBtnPaste = document.getElementById('runButtonPaste');
                if (runBtnPaste) runBtnPaste.click();
            }, 300);
            return;
        } catch (e) {
            console.error("Failed to parse paste URL", e);
        }
    }

    // 1. Check URL parameters (e.g. ?repo=owsam22/previewer)
    let repoUrl = urlParams.get('repo');

    // 2. Or check pathname if user replaced github.com -> previewer-one.vercel.app
    // Pathname might be "/owsam22/previewer"
    const path = window.location.pathname.replace(/^\/+/, '');
    // Ignore if it's just index.html, preview.html, or empty
    if (!repoUrl && path && !path.includes('.html') && path.split('/').length >= 2) {
        repoUrl = `https://github.com/${path}`;
    }

    if (repoUrl) {
        const githubInput = document.getElementById('githubInput') as HTMLInputElement;
        if (githubInput) {
            githubInput.value = repoUrl.startsWith('http') ? repoUrl : `https://github.com/${repoUrl}`;
            
            // Switch to github tab visually
            const ghTab = document.querySelector('[data-target="githubPanel"]') as HTMLElement;
            if (ghTab) ghTab.click();

            // Auto-trigger fetch
            setTimeout(() => {
                const runBtnGithub = document.getElementById('runButtonGithub');
                if (runBtnGithub) runBtnGithub.click();
            }, 300);
        }
    }
});
