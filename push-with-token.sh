#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "=========================================="
echo "  上传博客到 GitHub（覆盖旧主页）"
echo "  仓库: 8np9td2mnn-source/8np9td2mnn-source.github.io"
echo "=========================================="
echo ""
echo "需要 GitHub Classic Token（勾选 repo 权限）"
echo "创建地址: https://github.com/settings/tokens"
echo "点 Generate new token (classic) → 只勾选 repo 即可 → 生成"
echo "（若 403 错误，请看 403-解决办法.md 用网页上传）"
echo ""
read -rsp "请粘贴 Token 后按回车: " TOKEN
echo ""

if [ -z "$TOKEN" ]; then
  echo "错误: Token 不能为空"
  exit 1
fi

git config user.name "8np9td2mnn-source" 2>/dev/null || true
git config user.email "8np9td2mnn-source@users.noreply.github.com" 2>/dev/null || true

REMOTE="https://${TOKEN}@github.com/8np9td2mnn-source/8np9td2mnn-source.github.io.git"

echo ""
echo "正在推送（会用你的博客覆盖 GitHub 上的旧主页）..."
git push "$REMOTE" main --force

echo ""
echo "=========================================="
echo "  Done! 约 1～3 分钟后访问:"
echo "  https://8np9td2mnn-source.github.io/"
echo "=========================================="
