const SESSION_KEY = "personal-blog-write-unlocked-v1";

const gate = document.getElementById("gate");
const workspace = document.getElementById("workspace");
const gatePassword = document.getElementById("gate-password");
const gateSubmit = document.getElementById("gate-submit");
const gateError = document.getElementById("gate-error");

const repoInput = document.getElementById("repo");
const tokenInput = document.getElementById("token");
const saveSettingsBtn = document.getElementById("save-settings");
const settingsToast = document.getElementById("settings-toast");

const form = document.getElementById("write-form");
const bodyInput = document.getElementById("body");
const previewElement = document.getElementById("preview");
const dateInput = document.getElementById("date");
const publishBtn = document.getElementById("publish-btn");
const publishToast = document.getElementById("publish-toast");
const myList = document.getElementById("my-list");
const myEmpty = document.getElementById("my-empty");
const refreshPostsBtn = document.getElementById("refresh-posts");

dateInput.value = new Date().toISOString().slice(0, 10);

function showToast(el, message, isError) {
  el.hidden = false;
  el.textContent = message;
  el.classList.toggle("error", Boolean(isError));
}

function needsPassword() {
  return Boolean(window.BLOG_CONFIG && window.BLOG_CONFIG.writePassword);
}

function unlockWorkspace() {
  sessionStorage.setItem(SESSION_KEY, "1");
  gate.hidden = true;
  workspace.hidden = false;
  initWorkspace();
}

function initGate() {
  if (!needsPassword()) {
    unlockWorkspace();
    return;
  }

  if (sessionStorage.getItem(SESSION_KEY) === "1") {
    gate.hidden = true;
    workspace.hidden = false;
    initWorkspace();
    return;
  }

  gate.hidden = false;
  workspace.hidden = true;

  gateSubmit.addEventListener("click", () => {
    if (gatePassword.value === window.BLOG_CONFIG.writePassword) {
      gateError.hidden = true;
      unlockWorkspace();
    } else {
      gateError.hidden = false;
    }
  });
}

function updatePreview() {
  const markdown = bodyInput.value;
  if (!markdown.trim()) {
    previewElement.innerHTML = "";
    return;
  }
  previewElement.innerHTML = renderPostContent({
    content: markdown,
    format: "markdown",
  });
}

function wrapSelection(before, after, placeholder) {
  const start = bodyInput.selectionStart;
  const end = bodyInput.selectionEnd;
  const selected = bodyInput.value.slice(start, end) || placeholder;
  const next = `${bodyInput.value.slice(0, start)}${before}${selected}${after}${bodyInput.value.slice(end)}`;
  bodyInput.value = next;
  const cursor = start + before.length + selected.length;
  bodyInput.focus();
  bodyInput.setSelectionRange(cursor, cursor);
  updatePreview();
}

function applyToolbarAction(action) {
  const actions = {
    h1: () => wrapSelection("# ", "\n\n", "标题"),
    h2: () => wrapSelection("## ", "\n\n", "小节"),
    bold: () => wrapSelection("**", "**", "粗体"),
    italic: () => wrapSelection("*", "*", "斜体"),
    quote: () => wrapSelection("> ", "\n", "引用文字"),
    code: () => wrapSelection("`", "`", "code"),
    link: () => wrapSelection("[", "](https://)", "链接文字"),
    ul: () => wrapSelection("- ", "\n", "列表项"),
  };

  if (actions[action]) {
    actions[action]();
  }
}

function initWorkspace() {
  const settings = getSettings();
  const defaultRepo =
    window.SITE_CONFIG && window.SITE_CONFIG.githubRepo
      ? window.SITE_CONFIG.githubRepo
      : "";
  repoInput.value = settings.repo || defaultRepo;
  tokenInput.value = settings.token || "";
  updatePreview();
  renderRemotePosts();
}

document.querySelectorAll(".tool-btn").forEach((button) => {
  button.addEventListener("click", () => {
    applyToolbarAction(button.dataset.action);
  });
});

bodyInput.addEventListener("input", updatePreview);

saveSettingsBtn.addEventListener("click", () => {
  const repo = repoInput.value.trim();
  const token = tokenInput.value.trim();

  if (!repo || !token) {
    showToast(settingsToast, "请填写仓库地址和 Token", true);
    return;
  }

  try {
    parseRepo(repo);
  } catch (error) {
    showToast(settingsToast, error.message, true);
    return;
  }

  saveSettings({ repo, token });
  showToast(settingsToast, "设置已保存");
});

async function renderRemotePosts() {
  const { repo, token } = getSettings();
  myList.innerHTML = "";
  myEmpty.textContent = "加载中…";
  myEmpty.hidden = false;

  if (!repo || !token) {
    myEmpty.textContent = "请先保存 GitHub 设置";
    return;
  }

  try {
    const { posts } = await loadPostsFromGitHub(repo, token);
    myEmpty.hidden = posts.length > 0;

    if (posts.length === 0) {
      myEmpty.textContent = "暂无文章";
      return;
    }

    sortPosts(posts).forEach((post) => {
      const li = document.createElement("li");
      li.className = "my-post-item";
      li.innerHTML = `
        <span>${post.date} · ${post.title}</span>
        <button type="button" data-slug="${post.slug}">删除</button>
      `;
      li.querySelector("button").addEventListener("click", async () => {
        if (!confirm(`确定删除《${post.title}》吗？`)) {
          return;
        }
        try {
          await deletePostFromGitHub(repo, token, post.slug);
          showToast(publishToast, "已删除并更新网站");
          renderRemotePosts();
        } catch (error) {
          showToast(publishToast, error.message, true);
        }
      });
      myList.appendChild(li);
    });
  } catch (error) {
    myEmpty.textContent = error.message;
    myEmpty.hidden = false;
  }
}

refreshPostsBtn.addEventListener("click", renderRemotePosts);

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const { repo, token } = getSettings();
  if (!repo || !token) {
    showToast(publishToast, "请先完成 GitHub 设置", true);
    return;
  }

  const title = document.getElementById("title").value.trim();
  const date = dateInput.value;
  const tag = document.getElementById("tag").value.trim() || "随笔";
  const excerpt = document.getElementById("excerpt").value.trim();
  const body = bodyInput.value.trim();

  if (!title || !excerpt || !body) {
    showToast(publishToast, "请填写标题、摘要和正文", true);
    return;
  }

  const post = {
    slug: makeSlug(title),
    title,
    date,
    tag,
    excerpt,
    content: body,
    format: "markdown",
  };

  publishBtn.disabled = true;
  publishBtn.textContent = "发布中…";

  try {
    const total = await publishPost(repo, token, post);
    form.reset();
    dateInput.value = new Date().toISOString().slice(0, 10);
    document.getElementById("tag").value = "随笔";
    updatePreview();
    showToast(
      publishToast,
      `发布成功！共 ${total} 篇，约 1 分钟后在网站上可见。`
    );
    renderRemotePosts();
  } catch (error) {
    showToast(publishToast, error.message, true);
  } finally {
    publishBtn.disabled = false;
    publishBtn.textContent = "发布到 GitHub（更新网站）";
  }
});

initGate();
