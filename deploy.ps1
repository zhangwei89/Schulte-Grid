# ==========================================
# 舒尔特方格 (Schulte Table) 一键 Push & 发布脚本
# ==========================================

param(
    [string]$Username = "",
    [string]$Repo = "schulte-grid"
)

# 确保 Git 在 PATH 中
$env:PATH = "E:\Program Files\Git\cmd;E:\Program Files\Git\bin;" + $env:PATH

Clear-Host
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  舒尔特方格网页游戏 GitHub 一键 Push 脚本  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if ([string]::IsNullOrEmpty($Username)) {
    $Username = Read-Host "请输入你的 GitHub 用户名"
}
if ([string]::IsNullOrEmpty($Username)) {
    Write-Host "错误: 用户名不能为空" -ForegroundColor Red
    pause
    exit 1
}

$inputRepo = Read-Host "请输入仓库名 [默认: $Repo]"
if (-not [string]::IsNullOrEmpty($inputRepo)) {
    $Repo = $inputRepo
}

Write-Host ""
Write-Host "正在准备仓库与文件..." -ForegroundColor Yellow

# 清理并重新初始化
git init
git branch -M main

# 配置安全目录
git config --global --add safe.directory "$PWD" 2>$null

git add -A
git commit -m "feat: 舒尔特方格网页游戏初始版本 (Schulte Focus Master)"

$remoteUrl = "https://github.com/$Username/$Repo.git"
git remote remove origin 2>$null
git remote add origin $remoteUrl

Write-Host "远程仓库地址: $remoteUrl" -ForegroundColor Green
Write-Host "正在推送到 GitHub main 分支..." -ForegroundColor Yellow

git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "  推送成功！" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "接下来开启 GitHub Pages：" -ForegroundColor Yellow
    Write-Host "1. 打开: https://github.com/$Username/$Repo/settings/pages"
    Write-Host "2. Source 选: Deploy from a branch"
    Write-Host "3. Branch 选: main / (root)，点击 Save"
    Write-Host "4. 稍等 1-2 分钟，即可通过以下地址在线游玩：" -ForegroundColor Green
    Write-Host "   https://$Username.github.io/$Repo/" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "如果提示认证失败，请在弹出的 GitHub 登录框中完成授权或输入 Personal Access Token。" -ForegroundColor Yellow
}

Write-Host ""
pause
