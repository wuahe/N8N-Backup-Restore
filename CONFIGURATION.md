# 配置說明 / Configuration Guide

> **語言選擇 / Language Selection:**
> - [繁體中文版本 (Traditional Chinese)](./CONFIGURATION_ZH.md)
> - [English Version](./CONFIGURATION_EN.md)

本文檔說明如何配置 N8N Backup & Restore 工具的環境變量。

This document explains how to configure environment variables for the N8N Backup & Restore tool.

## 快速開始

1. 複製環境變量模板：
   ```bash
   cp .env.example .env
   ```

2. 編輯 `.env` 文件，填入您的實際配置值

## 詳細配置說明

### N8N 配置

#### 本地 N8N 實例
```env
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your_n8n_api_key_here
```

**如何獲取 N8N API Key：**
1. 登入您的 N8N 實例
2. 前往 Settings > API Keys
3. 創建新的 API Key
4. 複製生成的 API Key

#### 多環境配置
工具支援最多 4 個 N8N 環境（本地 + 3 個遠程）：

```env
# 環境 A
N8N_A_NAME=Production N8N
N8N_A_BASE_URL=https://your-production-n8n.com
N8N_A_API_KEY=your_production_api_key

# 環境 B
N8N_B_NAME=Staging N8N
N8N_B_BASE_URL=https://your-staging-n8n.com
N8N_B_API_KEY=your_staging_api_key

# 環境 C
N8N_C_NAME=Development N8N
N8N_C_BASE_URL=https://your-dev-n8n.com
N8N_C_API_KEY=your_dev_api_key
```

### GitHub 配置

```env
GITHUB_TOKEN=ghp_your_github_personal_access_token_here
GITHUB_REPO_OWNER=your_github_username
GITHUB_REPO_NAME=n8n-backups
```

**如何獲取 GitHub Personal Access Token：**
1. 前往 GitHub Settings > Developer settings > Personal access tokens
2. 點擊 "Generate new token (classic)"
3. 選擇以下權限：
   - `repo` (完整倉庫權限)
   - `write:packages` (如果需要)
4. 複製生成的 token

**倉庫設置：**
- 確保指定的倉庫存在
- 確保您有該倉庫的寫入權限

### Google Drive 配置

```env
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
GOOGLE_REFRESH_TOKEN=1//your_google_refresh_token_here
```

**如何設置 Google Drive API：**

1. **創建 Google Cloud 項目：**
   - 前往 [Google Cloud Console](https://console.cloud.google.com/)
   - 創建新項目或選擇現有項目

2. **啟用 Google Drive API：**
   - 在 API & Services > Library 中搜索 "Google Drive API"
   - 點擊啟用

3. **創建 OAuth 2.0 憑證：**
   - 前往 API & Services > Credentials
   - 點擊 "Create Credentials" > "OAuth 2.0 Client IDs"
   - 應用程序類型選擇 "Web application"
   - 添加重定向 URI: `http://localhost:3000/auth/google/callback`

4. **獲取 Refresh Token：**
   - 使用 OAuth 2.0 Playground 或運行應用程序進行首次授權
   - 保存獲得的 refresh token

### 安全配置

```env
JWT_SECRET=your_64_character_jwt_secret_key_here
ENCRYPTION_KEY=your_32_character_encryption_key_here
```

**生成安全密鑰：**

```bash
# 生成 JWT Secret (64 字符)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 生成 Encryption Key (32 字符)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### 服務器配置

```env
PORT=3003
```

確保選擇的端口沒有被其他應用程序占用。

## 環境變量驗證

啟動應用程序時，系統會自動驗證必要的環境變量是否已設置。如果缺少必要的配置，應用程序會顯示錯誤信息並提供設置指導。

## 安全注意事項

1. **永遠不要將 `.env` 文件提交到版本控制系統**
2. **定期輪換 API Keys 和 Tokens**
3. **使用強密碼和長密鑰**
4. **限制 API Keys 的權限範圍**
5. **在生產環境中使用環境變量而不是文件**

## 故障排除

### 常見問題

1. **N8N API 連接失敗**
   - 檢查 N8N_BASE_URL 是否正確
   - 確認 API Key 有效且有足夠權限
   - 檢查網絡連接

2. **GitHub 推送失敗**
   - 確認 GitHub Token 有 repo 權限
   - 檢查倉庫名稱和所有者是否正確
   - 確認倉庫存在且可訪問

3. **Google Drive 上傳失敗**
   - 檢查 OAuth 配置是否正確
   - 確認 Refresh Token 仍然有效
   - 檢查 Google Drive API 配額

### 測試配置

啟動應用程序後，您可以：
1. 訪問 `/test` 頁面測試基本功能
2. 檢查日誌輸出中的連接狀態
3. 嘗試執行小規模的備份測試

## 支援

如果您在配置過程中遇到問題，請：
1. 檢查應用程序日誌
2. 確認所有環境變量格式正確
3. 參考本文檔的故障排除部分
4. 在 GitHub Issues 中報告問題