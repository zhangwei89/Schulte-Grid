# ========================================================
# 舒尔特方格 (Schulte Table) 一键推送到 GitHub 脚本
# 自动读取 F:\code\taken.txt 中的 Personal Access Token
# ========================================================

$ErrorActionPreference = "Stop"

# 1. 确保 Git 环境变量
$env:PATH = "E:\Program Files\Git\cmd;E:\Program Files\Git\bin;" + $env:PATH

Clear-Host
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  正在准备将项目推送到 GitHub: zhangwei89/Schulte-Grid   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 2. 读取 Token
$tokenPath = "F:\code\taken.txt"
if (-not (Test-Path $tokenPath)) {
    Write-Host "[错误] 未找到 Token 文件: $tokenPath" -ForegroundColor Red
    pause
    exit 1
}

$token = (Get-Content $tokenPath -Raw).Trim()
if ([string]::IsNullOrEmpty($token)) {
    Write-Host "[错误] Token 文件为空，请检查: $tokenPath" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "[1/4] 成功读取 GitHub Personal Access Token" -ForegroundColor Green

# 3. 初始化本地仓库与配置
Write-Host "[2/4] 初始化 Git 仓库并暂存文件..." -ForegroundColor Yellow
git init
git config user.name "zhangwei89" 2>$null
git config user.email "zhangwei89@users.noreply.github.com" 2>$null
git branch -M main

git add index.html style.css app.js README.md .gitignore
git commit -m "feat: 舒尔特方格网页游戏初始版本 (Schulte Focus Master)" 2>$null

# 4. 配置带认证的推送地址
Write-Host "[3/4] 正在推送到 GitHub main 分支..." -ForegroundColor Yellow
$authUrl = "https://zhangwei89:$token@github.com/zhangwei89/Schulte-Grid.git"
$cleanUrl = "https://github.com/zhangwei89/Schulte-Grid.git"

git remote remove origin 2>$null
git remote add origin $authUrl

# 5. 执行推送
git push -u origin main --force

# 6. 安全清理：将远程地址还原为无密码的标准 URL，避免 Token 保留在本地配置中
git remote set-url origin $cleanUrl

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  推送完成！代码已成功发布到 GitHub 仓库！               " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "下一步：开启 GitHub Pages 免费公网游玩：" -ForegroundColor Yellow
Write-Host "1. 打开浏览器访问: https://github.com/zhangwei89/Schulte-Grid/settings/pages"
Write-Host "2. 在 'Build and deployment' 下："
Write-Host "   - Source 选: Deploy from a branch"
Write-Host "   - Branch 选: main / (root)"
Write-Host "   - 点击 Save 保存"
Write-Host "3. 约 1-2 分钟后即可在线畅玩: https://zhangwei89.github.io/Schulte-Grid/" -ForegroundColor Cyan
Write-Host ""
pause
