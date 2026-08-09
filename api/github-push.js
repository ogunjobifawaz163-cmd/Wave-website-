export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) return res.status(400).json({ error: 'GITHUB_TOKEN not configured' });

    const username = 'ogunjobifawaz163-cmd';
    const repoName = 'Wave-website-';
    const { files } = req.body || {};

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const headers = {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'waves-beats',
    };

    // 1. Create the repo (ignore error if it exists)
    await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: repoName,
        description: 'WAVES — Beat store, admin console, and Cloudflare R2 integration',
        private: false,
      }),
    });

    // 2. Get the current main branch SHA (if repo has commits)
    let parentSha = null;
    const refRes = await fetch(`https://api.github.com/repos/${username}/${repoName}/git/refs/heads/main`, { headers });
    if (refRes.ok) {
      const refData = await refRes.json();
      parentSha = refData.object.sha;
    }

    // 3. Get the current tree SHA
    let baseTreeSha = null;
    if (parentSha) {
      const commitRes = await fetch(`https://api.github.com/repos/${username}/${repoName}/git/commits/${parentSha}`, { headers });
      if (commitRes.ok) {
        const commitData = await commitRes.json();
        baseTreeSha = commitData.tree.sha;
      }
    }

    // 4. Create blobs for each file
    const treeEntries = [];
    for (const file of files) {
      const blobRes = await fetch(`https://api.github.com/repos/${username}/${repoName}/git/blobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: file.content,
          encoding: 'base64',
        }),
      });
      const blob = await blobRes.json();
      if (blob.sha) {
        treeEntries.push({ path: file.path, sha: blob.sha, mode: '100644', type: 'blob' });
      }
    }

    // 5. Create a tree (based on existing tree if available, so it replaces files)
    const treeRes = await fetch(`https://api.github.com/repos/${username}/${repoName}/git/trees`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeEntries,
      }),
    });
    const tree = await treeRes.json();

    // 6. Create a commit
    const commitRes = await fetch(`https://api.github.com/repos/${username}/${repoName}/git/commits`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'WAVES — clean push (no node_modules, .env, or dist)',
        tree: tree.sha,
        parents: parentSha ? [parentSha] : [],
      }),
    });
    const commit = await commitRes.json();

    // 7. Update main branch ref
    if (parentSha) {
      await fetch(`https://api.github.com/repos/${username}/${repoName}/git/refs/heads/main`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ sha: commit.sha, force: true }),
      });
    } else {
      await fetch(`https://api.github.com/repos/${username}/${repoName}/git/refs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sha: commit.sha, ref: 'refs/heads/main' }),
      });
    }

    // 8. Delete unwanted files/dirs from the repo (node_modules, dist, .env, .vercel, etc.)
    const toDelete = [
      'node_modules', 'dist', '.env', '.vercel', '.agon-env',
      '.vite-source-tags.js', 'uploads', 'waves-beats-project.tar.gz',
      'public/downloads',
    ];

    for (const item of toDelete) {
      // Try to get the item
      const itemRes = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${item}`, { headers });
      if (itemRes.ok) {
        const itemData = await itemRes.json();
        if (Array.isArray(itemData)) {
          // It's a directory — delete each file
          for (const f of itemData) {
            if (f.sha) {
              await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${f.path}`, {
                method: 'DELETE',
                headers,
                body: JSON.stringify({ message: `Remove ${f.path}`, sha: f.sha }),
              });
            }
          }
        } else if (itemData.sha) {
          // It's a file
          await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${item}`, {
            method: 'DELETE',
            headers,
            body: JSON.stringify({ message: `Remove ${item}`, sha: itemData.sha }),
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Pushed ${treeEntries.length} files to ${username}/${repoName}`,
      repo: `https://github.com/${username}/${repoName}`,
      commitSha: commit.sha,
    });
  } catch (err) {
    console.error('[github-push] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
