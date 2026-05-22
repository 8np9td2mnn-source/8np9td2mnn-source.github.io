const SETTINGS_KEY = "personal-blog-github-settings-v1";

function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { repo: "", token: "" };
  } catch {
    return { repo: "", token: "" };
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

async function loadPosts() {
  const res = await fetch("./posts.json", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("无法加载文章列表");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function sortPosts(posts) {
  return [...posts].sort((a, b) => (a.date < b.date ? 1 : -1));
}

function findPost(posts, slug) {
  return posts.find((post) => post.slug === slug);
}

function makeSlug(title) {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fff-]/g, "")
    .slice(0, 40);
  return base ? `${base}-${Date.now().toString(36)}` : `post-${Date.now().toString(36)}`;
}

function textToContent(text) {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

function isHtmlContent(content) {
  return /^\s*<(p|h[1-6]|ul|ol|blockquote|pre|div|article)/i.test(String(content).trim());
}

function renderPostContent(post) {
  const raw = post.content || "";

  if (post.format === "html" || (post.format !== "markdown" && isHtmlContent(raw))) {
    return raw;
  }

  if (typeof marked !== "undefined") {
    marked.setOptions({ breaks: true, gfm: true });
    return marked.parse(raw);
  }

  return textToContent(raw);
}

function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function parseRepo(repo) {
  const parts = repo.trim().split("/").filter(Boolean);
  if (parts.length !== 2) {
    throw new Error("仓库地址格式应为：你的用户名/仓库名");
  }
  return { owner: parts[0], name: parts[1] };
}

async function githubRequest(repo, token, path, options = {}) {
  const { owner, name } = parseRepo(repo);
  const url = `https://api.github.com/repos/${owner}/${name}/contents/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub 请求失败（${res.status}）`);
  }

  return res.json();
}

function base64ToUtf8(base64) {
  const binary = atob(base64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function loadPostsFromGitHub(repo, token) {
  const { owner, name } = parseRepo(repo);
  const url = `https://api.github.com/repos/${owner}/${name}/contents/posts.json`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 404) {
    return { posts: [], sha: null };
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub 请求失败（${res.status}）`);
  }

  const data = await res.json();
  const json = JSON.parse(base64ToUtf8(data.content));
  return { posts: Array.isArray(json) ? json : [], sha: data.sha };
}

async function savePostsToGitHub(repo, token, posts, sha) {
  const body = JSON.stringify(posts, null, 2);
  const payload = {
    message: `更新博客文章 ${new Date().toISOString().slice(0, 10)}`,
    content: utf8ToBase64(body),
    committer: {
      name: "Blog Author",
      email: "blog@users.noreply.github.com",
    },
  };

  if (sha) {
    payload.sha = sha;
  }

  await githubRequest(repo, token, "posts.json", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function publishPost(repo, token, post) {
  const { posts, sha } = await loadPostsFromGitHub(repo, token);
  const next = [post, ...posts.filter((item) => item.slug !== post.slug)];
  await savePostsToGitHub(repo, token, next, sha);
  return next.length;
}

async function deletePostFromGitHub(repo, token, slug) {
  const { posts, sha } = await loadPostsFromGitHub(repo, token);
  const next = posts.filter((item) => item.slug !== slug);
  await savePostsToGitHub(repo, token, next, sha);
}
