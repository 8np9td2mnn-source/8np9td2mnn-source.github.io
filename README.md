# 个人博客（GitHub Pages）

访客只能阅读；只有你能在「写文章」页面发布内容。每次发布会更新仓库里的 `posts.json`，网站自动重新部署。

## 一、第一次：上传到 GitHub

### 1. 在 GitHub 创建仓库

1. 打开 [https://github.com/new](https://github.com/new)
2. 仓库名例如：`my-blog`（记住这个名字）
3. 选 **Public（公开）**
4. 不要勾选 “Add a README”
5. 点 **Create repository**

### 2. 把本地博客推上去

在终端执行（把 `你的用户名` 和 `my-blog` 换成你的）：

```bash
cd ~/personal-blog
git init
git add .
git commit -m "初始化博客"
git branch -M main
git remote add origin https://github.com/你的用户名/my-blog.git
git push -u origin main
```

如果提示登录，按 GitHub 网页指引完成授权即可。

### 3. 开启 GitHub Pages

1. 打开仓库 → **Settings** → 左侧 **Pages**
2. **Source** 选 **GitHub Actions**
3. 等几分钟，会显示网站地址，形如：  
   `https://你的用户名.github.io/my-blog/`

---

## 二、只有你能写文章

### 1. 创建 GitHub Token（密钥）

1. GitHub 右上角头像 → **Settings**
2. 左侧最下方 **Developer settings** → **Personal access tokens**
3. 选 **Fine-grained tokens** → **Generate new token**
4. 名称随意，例如 `blog-write`
5. **Repository access** 选 **Only select repositories**，选中你的 `my-blog`
6. **Permissions** → **Contents** 选 **Read and write**
7. 生成后复制 Token（只显示一次，务必保存）

### 2. （可选）设置访问密码

```bash
cp config.example.js config.local.js
```

编辑 `config.local.js`，设一个密码。  
`config.local.js` 不会上传到 GitHub，用于本地打开 `write.html` 时多一层保护。

### 3. 日常发布文章

1. 用浏览器打开 **`write.html`**（建议收藏，不要写在公开导航里）  
   - 本地：双击 `personal-blog/write.html`  
   - 或：`https://你的用户名.github.io/my-blog/write.html`
2. 第一次填写：
   - **仓库地址**：`你的用户名/my-blog`
   - **Token**：粘贴上一步复制的密钥
3. 点 **保存设置**
4. 写文章 → 点 **发布到 GitHub（更新网站）**
5. 约 **1 分钟** 后刷新首页即可看到新文章

只有持有 Token 的人能改 `posts.json`，别人无法替你发文。

---

## 三、备用发布方式（Token 失败时）

1. 在 [GitHub 仓库](https://github.com) 打开 `posts.json` → **Edit**
2. 在 JSON 数组**最前面**加一篇（注意逗号格式），或把 `write.html` 里生成的内容粘贴进去
3. 点 **Commit changes**，网站同样会自动更新

---

## 四、改博客名 / 关于页

- 侧栏名称、简介：改 `index.html`、`article.html`、`about.html` 里的「你的名字」
- 关于页内容：改 `about.html`

---

## 文件说明

| 文件 | 作用 |
|------|------|
| `posts.json` | 所有文章（网站读这个文件） |
| `write.html` | 作者发文后台（勿公开链接） |
| `.github/workflows/pages.yml` | 自动部署网站 |
