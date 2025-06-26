const folderInput = document.getElementById('folderInput');
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');
const runBtn = document.getElementById('runButton');
const fileList = document.getElementById('fileList');
const dropZone = document.getElementById('dropZone');

let filesMap = {}; // Store file contents by path

// Handle file uploads
async function handleFiles(fileListInput) {
  uploadStatus.textContent = '📤 Uploading...';

  for (const file of fileListInput) {
    const path = file.webkitRelativePath || file.fullPath || file.name;

    if (!filesMap[path]) {
      // Use base64 for images, text for others
      if (file.type.startsWith('image/')) {
        filesMap[path] = await readAsDataURL(file);
      } else {
        filesMap[path] = await file.text();
      }
    }
  }

  const hasHTML = Object.keys(filesMap).some(f => f.endsWith('index.html') || f.endsWith('.html'));
  if (!hasHTML) {
    uploadStatus.textContent = "❌ No HTML file found.";
    runBtn.disabled = true;
    return;
  }

  uploadStatus.textContent = `✅ ${Object.keys(filesMap).length} files uploaded.`;
  runBtn.disabled = false;

  fileList.innerHTML = Object.keys(filesMap)
    .map(f => `<li>${f}</li>`)
    .join('');
}

// Helper: Read file as base64
function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Run button for uploaded files
runBtn.addEventListener('click', () => {
  let html = filesMap['index.html'] || Object.entries(filesMap).find(([key]) => key.endsWith('.html'))?.[1];

  if (!html) {
    alert("❌ No HTML file to preview.");
    return;
  }

  for (let [path, content] of Object.entries(filesMap)) {
    if (path.endsWith('.css')) {
      html = html.replace('</head>', `<style>${content}</style></head>`);
    }
    if (path.endsWith('.js')) {
      html = html.replace('</body>', `<script>${content}</script></body>`);
    }
  }

  // Replace image file references with base64
  for (let [path, content] of Object.entries(filesMap)) {
    if (path.match(/\.(png|jpe?g|gif|svg|webp)$/i)) {
      const filename = path.split('/').pop();
      html = html.replaceAll(filename, content);
    }
  }

  localStorage.setItem("previewHTML", html);
  window.location.href = 'preview.html';
});

// Drag and Drop Events
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

  const items = e.dataTransfer.items;
  if (items) {
    const fileEntries = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.();
      if (entry) {
        await traverseFileTree(entry, "", fileEntries);
      }
    }
    handleFiles(fileEntries);
  } else {
    handleFiles(e.dataTransfer.files);
  }
});

// Traverse folders recursively
async function traverseFileTree(item, path, files = []) {
  path = path || "";
  if (item.isFile) {
    await new Promise(resolve => {
      item.file(file => {
        file.fullPath = path + file.name;
        files.push(file);
        resolve();
      });
    });
  } else if (item.isDirectory) {
    const dirReader = item.createReader();
    const entries = await new Promise(resolve => dirReader.readEntries(resolve));
    for (const entry of entries) {
      await traverseFileTree(entry, path + item.name + "/", files);
    }
  }
}

// Input listeners
folderInput.addEventListener('change', (e) => handleFiles(e.target.files));
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

// Upload ↔ Paste UI Panel Switching
const uploadPanel = document.getElementById('uploadPanel');
const pastePanel = document.getElementById('pastePanel');
const switchToPaste = document.getElementById('switchToPaste');
const switchToUpload = document.getElementById('switchToUpload');

switchToPaste.addEventListener('click', () => {
  uploadPanel.classList.remove('active');
  pastePanel.classList.add('active');
});
switchToUpload.addEventListener('click', () => {
  pastePanel.classList.remove('active');
  uploadPanel.classList.add('active');
});

// Paste Mode Run Button
const runBtnPaste = document.getElementById('runButtonPaste');
runBtnPaste?.addEventListener('click', () => {
  const html = document.getElementById('htmlInput').value || "<!-- No HTML -->";
  const css = document.getElementById('cssInput').value || "";
  const js = document.getElementById('jsInput').value || "";

  let finalHTML = html;

  if (css) {
    finalHTML = finalHTML.replace('</head>', `<style>${css}</style></head>`);
  }
  if (js) {
    finalHTML = finalHTML.replace('</body>', `<script>${js}</script></body>`);
  }

  localStorage.setItem("previewHTML", finalHTML);
  window.location.href = 'preview.html';
});
