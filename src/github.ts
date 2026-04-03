import { filesMap, updateReadyStatus, runPreviewFromMap } from './main';

export async function handleGitHubSubmit() {
  const input = document.getElementById('githubInput') as HTMLInputElement;
  const url = input.value.trim();
  const statusElement = document.getElementById('githubStatus') as HTMLParagraphElement;
  
  if (!url) {
    statusElement.textContent = '❌ Please enter a valid GitHub URL.';
    return;
  }
  
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    statusElement.textContent = '❌ Invalid format. Use https://github.com/owner/repo';
    return;
  }
  
  const owner = match[1];
  const repo = match[2].replace('.git', '');
  
  statusElement.textContent = '⏳ Fetching repository metadata...';
  
  try {
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (!repoRes.ok) throw new Error('Repository not found or rate limited.');
    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch;
    
    statusElement.textContent = '⏳ Fetching file tree...';
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`);
    if (!treeRes.ok) throw new Error('Failed to fetch repository tree.');
    const treeData = await treeRes.json();
    
    const relevantFiles = treeData.tree.filter((node: any) => {
        if (node.type !== 'blob') return false;
        return node.path.match(/\.(html|css|js|json|png|jpe?g|gif|svg|webp)$/i);
    });
    
    if (relevantFiles.length === 0) {
        statusElement.textContent = '❌ No HTML/CSS/JS files found in this repository.';
        return;
    }
    
    statusElement.textContent = `⏳ Downloading ${relevantFiles.length} files...`;
    
    const downloadPromises = relevantFiles.map(async (node: any) => {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${node.path}`;
        const res = await fetch(rawUrl);
        if (!res.ok) return;
        
        const path = node.path;
        if (path.match(/\.(png|jpe?g|gif|svg|webp)$/i)) {
            const blob = await res.blob();
            filesMap[path] = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target?.result as string);
                reader.readAsDataURL(blob);
            });
        } else {
            filesMap[path] = await res.text();
        }
    });

    await Promise.all(downloadPromises);
    
    statusElement.textContent = '✅ Repository successfully loaded!';
    updateReadyStatus(`✅ Loaded ${owner}/${repo} successfully.`);
    
    // Set shareable token
    localStorage.setItem("previewSourceToken", `?repo=${owner}/${repo}`);
    
    runPreviewFromMap();

  } catch (err: any) {
    statusElement.textContent = `❌ Error: ${err.message}`;
  }
}
