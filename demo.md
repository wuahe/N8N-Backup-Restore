# N8N Backup & Restore Tool - 使用演示

## 🚀 快速開始

### 1. 啟動應用
```bash
npm start
```

應用將在 `http://localhost:3000` 啟動

### 2. 登入系統
- 用戶名: `admin`
- 密碼: `password`

## 📋 功能演示

### 備份流程演示

1. **選擇備份項目**
   - 在「備份」頁面，你會看到所有可用的 workflows 和 credentials
   - 每個 workflow 會顯示相關的 credentials 數量
   - 選擇你想要備份的項目

2. **智能關聯備份**
   - 當你選擇一個 workflow 時，系統會自動識別它使用的 credentials
   - 這些相關的 credentials 會自動包含在備份中
   - 確保備份的完整性

3. **選擇備份目標**
   - GitHub: 備份到你的 GitHub repository
   - Google Drive: 備份到你的 Google Drive

4. **執行備份**
   - 點擊「開始備份」
   - 系統會加密敏感數據並上傳到選定的平台

### 還原流程演示

1. **選擇備份來源**
   - 切換到「還原」頁面
   - 選擇備份來源（GitHub 或 Google Drive）

2. **瀏覽可用備份**
   - 系統會列出所有可用的備份文件
   - 顯示備份時間、大小等信息

3. **預覽備份內容**
   - 點擊「預覽」查看備份包含的 workflows 和 credentials
   - 確認這是你需要的備份

4. **選擇還原項目**
   - 選擇要還原的 workflows 和 credentials
   - 設定衝突處理方式（跳過或覆蓋）

5. **執行還原**
   - 點擊「開始還原」
   - 系統會解密數據並還原到 N8N

## 🔧 配置說明

### 必要配置

編輯 `.env` 文件：

```env
# N8N 配置
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=你的N8N_API密鑰

# GitHub 配置（可選）
GITHUB_TOKEN=你的GitHub個人訪問令牌
GITHUB_REPO_OWNER=你的GitHub用戶名
GITHUB_REPO_NAME=備份倉庫名稱

# Google Drive 配置（可選）
GOOGLE_CLIENT_ID=你的Google客戶端ID
GOOGLE_CLIENT_SECRET=你的Google客戶端密鑰
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
GOOGLE_REFRESH_TOKEN=你的Google刷新令牌

# 安全配置
JWT_SECRET=你的JWT密鑰
ENCRYPTION_KEY=32字符的加密密鑰

# 服務器配置
PORT=3000
```

### 獲取 N8N API Key

1. 登入你的 N8N 實例
2. 前往 Settings → API Keys
3. 創建新的 API Key
4. 複製並填入 `.env` 文件

### 設定 GitHub 備份

1. 創建 GitHub Personal Access Token
   - 前往 GitHub Settings → Developer settings → Personal access tokens
   - 創建新 token，需要 `repo` 權限

2. 創建備份倉庫
   - 在 GitHub 創建新的 private repository
   - 用於儲存備份文件

### 設定 Google Drive 備份

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建新專案或選擇現有專案
3. 啟用 Google Drive API
4. 創建 OAuth 2.0 憑證
5. 獲取 refresh token

## 🔒 安全特性

### 數據加密
- 所有 credentials 數據使用 AES-256 加密
- 加密密鑰儲存在本地環境變數中
- 備份文件中不包含明文敏感信息

### 訪問控制
- JWT token 認證
- API 端點權限控制
- 安全的會話管理

### 傳輸安全
- 支援 HTTPS 部署
- 安全的 API 通信
- 加密的數據傳輸

## 🎯 使用場景

### 1. 定期備份
- 設定定期備份重要的 workflows
- 確保數據安全和可恢復性

### 2. 環境遷移
- 從開發環境遷移到生產環境
- 在不同 N8N 實例間同步 workflows

### 3. 版本控制
- 使用 GitHub 進行版本控制
- 追蹤 workflows 的變更歷史

### 4. 災難恢復
- 快速恢復損壞或丟失的 workflows
- 最小化停機時間

## 🐛 故障排除

### 常見問題

1. **連接 N8N 失敗**
   ```
   檢查 N8N_BASE_URL 是否正確
   確認 N8N 實例正在運行
   驗證 API Key 是否有效
   ```

2. **GitHub 上傳失敗**
   ```
   檢查 GitHub token 權限
   確認倉庫存在且可寫入
   檢查網路連接
   ```

3. **Google Drive 上傳失敗**
   ```
   檢查 Google API 憑證
   確認 refresh token 有效
   檢查 API 配額限制
   ```

4. **加密/解密錯誤**
   ```
   檢查 ENCRYPTION_KEY 長度（32字符）
   確保備份和還原使用相同密鑰
   ```

### 日誌查看
```bash
# 查看服務器日誌
npm start

# 開發模式（詳細日誌）
npm run dev
```

## 📈 進階功能

### 自動化備份
可以結合 cron job 實現自動化備份：

```bash
# 每天凌晨 2 點自動備份
0 2 * * * curl -X POST http://localhost:3000/api/backup/github \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"backupName":"auto-backup","selectedItems":{"workflows":["all"]}}'
```

### 批量操作
支援批量選擇和操作多個 workflows 和 credentials

### 備份歷史管理
- 查看所有備份歷史
- 比較不同備份版本
- 清理舊的備份文件

## 🤝 支援

如有問題或建議：
1. 檢查本文檔的故障排除部分
2. 查看應用日誌
3. 創建 GitHub Issue
4. 聯繫開發團隊

---

**祝你使用愉快！** 🎉