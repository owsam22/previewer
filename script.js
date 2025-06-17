const folderInput = document.getElementById('folderInput');
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');
const runBtn = document.getElementById('runButton');

let filesMap = {};

async function handleFiles(fileList) {
  filesMap = {};
  uploadStatus.textContent = '📤 Uploading...';

  for (const file of fileList) {
    const path = file.webkitRelativePath || file.name;
    filesMap[path] = await file.text();
  }

  const hasHTML = Object.keys(filesMap).some(f => f.endsWith('index.html') || f.endsWith('.html'));
  if (!hasHTML) {
    uploadStatus.textContent = "❌ No HTML file found.";
    runBtn.disabled = true;
    return;
  }

  uploadStatus.textContent = `✅ ${Object.keys(filesMap).length} files uploaded.`;
  runBtn.disabled = false;
}

folderInput.addEventListener('change', (e) => handleFiles(e.target.files));
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

runBtn.addEventListener('click', () => {
  let html = filesMap['index.html'] || Object.values(filesMap).find((_, i) => i === 0);

  for (let [path, content] of Object.entries(filesMap)) {
    if (path.endsWith('.css')) {
      html = html.replace('</head>', `<style>${content}</style></head>`);
    }
    if (path.endsWith('.js')) {
      html = html.replace('</body>', `<script>${content}</script></body>`);
    }
  }

  localStorage.setItem("previewHTML", html);
  window.location.href = 'preview.html';
});
const dropZone = document.getElementById('dropZone');

// Drag over styling
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

// Handle dropped files or folders
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
    handleFiles(e.dataTransfer.files); // fallback
  }
});

// Traverse folder recursively
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
