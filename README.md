# N8N Backup & Restore Tool

一個功能完整的 N8N workflow 和 credentials 備份還原工具，支援 GitHub 和 Google Drive 儲存，具有類似 N8N 的直觀 UI 介面。

## 功能特色

- 🔄 **智能備份**: 自動識別 workflow 相關的 credentials 並一起備份
- 🎯 **選擇性操作**: 可選擇全部或部分項目進行備份/還原
- 🔒 **安全加密**: credentials 數據採用 AES-256 加密儲存
- ☁️ **多平台支援**: 支援 GitHub 和 Google Drive 作為備份儲存空間
- 🎨 **直觀介面**: 類似 N8N 的現代化 UI 設計
- 📱 **響應式設計**: 支援桌面和移動設備

## 安裝步驟

### 1. 克隆專案
```bash
git clone <repository-url>
cd n8n-backup-restore
```

### 2. 安裝依賴
```bash
npm install
```

### 3. 環境配置
複製 `.env.example` 為 `.env` 並填入相應配置：

```bash
cp .env.example .env
```

編輯 `.env` 文件：

```env
# N8N Configuration
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your_n8n_api_key

# GitHub Configuration
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_REPO_OWNER=your_username
GITHUB_REPO_NAME=n8n-backups

# Google Drive Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
GOOGLE_REFRESH_TOKEN=your_google_refresh_token

# Security
JWT_SECRET=your_jwt_secret_key
ENCRYPTION_KEY=your_32_character_encryption_key

# Server Configuration
PORT=3000
```

### 4. 配置說明

#### N8N API Key
1. 登入你的 N8N 實例
2. 前往 Settings > API Keys
3. 創建新的 API Key 並複製

#### GitHub Token
1. 前往 GitHub Settings > Developer settings > Personal access tokens
2. 創建新 token，需要 `repo` 權限
3. 創建一個專門的 repository 用於儲存備份

#### Google Drive API
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建新專案或選擇現有專案
3. 啟用 Google Drive API
4. 創建 OAuth 2.0 憑證
5. 獲取 refresh token

#### 加密密鑰
生成 32 字符的隨機密鑰：
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### 5. 啟動應用
```bash
# 開發模式
npm run dev

# 生產模式
npm start
```

應用將在 `http://localhost:3000` 啟動。

## 使用說明

### 登入
- 預設用戶名: `admin`
- 預設密碼: `password`

### 備份流程
1. 選擇要備份的 workflows 和 credentials
2. 輸入備份名稱（可選）
3. 選擇備份目標（GitHub 或 Google Drive）
4. 點擊「開始備份」

### 還原流程
1. 切換到「還原」標籤頁
2. 選擇備份來源
3. 從列表中選擇要還原的備份
4. 選擇要還原的項目
5. 設定衝突處理方式
6. 點擊「開始還原」

### 智能關聯
當你選擇備份某個 workflow 時，系統會自動：
- 識別該 workflow 使用的所有 credentials
- 將相關的 credentials 一併加入備份
- 在還原時確保 workflow 和其 credentials 的完整性

## API 端點

### 認證
- `POST /api/auth/login` - 用戶登入
- `GET /api/auth/verify` - 驗證 token

### N8N 數據
- `GET /api/n8n/workflows` - 獲取所有 workflows
- `GET /api/n8n/credentials` - 獲取所有 credentials
- `GET /api/n8n/workflows/:id` - 獲取特定 workflow
- `GET /api/n8n/credentials/:id` - 獲取特定 credential

### 備份
- `POST /api/backup/github` - 備份到 GitHub
- `POST /api/backup/googledrive` - 備份到 Google Drive
- `GET /api/backup/github/list` - 獲取 GitHub 備份列表
- `GET /api/backup/googledrive/list` - 獲取 Google Drive 備份列表

### 還原
- `POST /api/restore/github` - 從 GitHub 還原
- `POST /api/restore/googledrive` - 從 Google Drive 還原
- `GET /api/restore/github/preview/:fileName` - 預覽 GitHub 備份
- `GET /api/restore/googledrive/preview/:fileId` - 預覽 Google Drive 備份

## 安全特性

- **數據加密**: 所有 credentials 數據使用 AES-256 加密
- **JWT 認證**: 使用 JSON Web Token 進行用戶認證
- **權限控制**: 所有 API 端點都需要有效的認證 token
- **安全傳輸**: 支援 HTTPS 部署

## 故障排除

### 常見問題

1. **N8N 連接失敗**
   - 檢查 N8N_BASE_URL 是否正確
   - 確認 N8N_API_KEY 有效且有足夠權限

2. **GitHub 上傳失敗**
   - 檢查 GitHub token 權限
   - 確認 repository 存在且可寫入

3. **Google Drive 上傳失敗**
   - 檢查 Google API 憑證配置
   - 確認 refresh token 有效

4. **加密/解密失敗**
   - 檢查 ENCRYPTION_KEY 長度是否為 32 字符
   - 確保備份和還原使用相同的加密密鑰

## 開發

### 專案結構
```
├── server.js              # 主服務器文件
├── routes/                 # API 路由
│   ├── auth.js            # 認證路由
│   ├── backup.js          # 備份路由
│   ├── restore.js         # 還原路由
│   └── n8n.js             # N8N API 路由
├── public/                 # 前端文件
│   ├── index.html         # 主頁面
│   ├── styles.css         # 樣式文件
│   └── app.js             # 前端 JavaScript
├── package.json           # 專案配置
└── README.md              # 說明文件
```

### 貢獻指南
1. Fork 專案
2. 創建功能分支
3. 提交更改
4. 推送到分支
5. 創建 Pull Request

## 授權
MIT License

## 支援
如有問題或建議，請創建 Issue 或聯繫開發團隊。