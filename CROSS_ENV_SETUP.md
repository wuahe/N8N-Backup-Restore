# 🌐 跨環境備份還原設定指南

## 功能概述

跨環境功能讓你可以在不同的 N8N 實例之間進行備份和還原，例如：
- 從 Zeabur N8N 備份到 localhost N8N
- 從開發環境遷移到生產環境
- 在多個 N8N 實例間同步 workflows

## 🔧 環境配置

### 1. 編輯 .env 文件

```env
# N8N Configuration - Default (Localhost)
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your_localhost_n8n_api_key

# N8N Environment A (例如：Zeabur)
N8N_A_NAME=Zeabur N8N
N8N_A_BASE_URL=https://your-app-name.zeabur.app
N8N_A_API_KEY=your_zeabur_n8n_api_key

# N8N Environment B (例如：Production)
N8N_B_NAME=Production N8N
N8N_B_BASE_URL=https://your-production-n8n.com
N8N_B_API_KEY=your_production_n8n_api_key

# N8N Environment C (例如：Staging)
N8N_C_NAME=Staging N8N
N8N_C_BASE_URL=https://your-staging-n8n.com
N8N_C_API_KEY=your_staging_n8n_api_key
```

### 2. 獲取 N8N API Key

對於每個 N8N 環境：

1. 登入你的 N8N 實例
2. 前往 Settings → API Keys
3. 創建新的 API Key
4. 複製 API Key 到對應的環境變數

### 3. Zeabur N8N 特殊設定

如果你使用 Zeabur 部署 N8N：

1. 確保你的 Zeabur N8N 實例可以公開訪問
2. URL 格式通常是：`https://your-app-name.zeabur.app`
3. 確保 API 端點可以訪問：`https://your-app-name.zeabur.app/api/v1/workflows`

## 🚀 使用方式

### 1. 啟動應用

```bash
npm start
```

### 2. 訪問跨環境功能

1. 打開 `http://localhost:3000`
2. 登入系統
3. 點擊左側菜單的 "跨環境" 標籤

### 3. 操作模式

#### 模式 1: 只備份
- **用途**: 將某個環境的數據備份到雲端儲存
- **步驟**:
  1. 選擇來源環境
  2. 選擇儲存位置 (GitHub/Google Drive)
  3. 載入並選擇要備份的項目
  4. 執行備份

#### 模式 2: 只還原
- **用途**: 從雲端儲存還原數據到目標環境
- **步驟**:
  1. 選擇目標環境
  2. 載入備份列表
  3. 選擇要還原的備份和項目
  4. 執行還原

#### 模式 3: 完整遷移
- **用途**: 直接從一個環境遷移到另一個環境
- **步驟**:
  1. 選擇來源環境和目標環境
  2. 選擇儲存位置作為中轉
  3. 載入並選擇要遷移的項目
  4. 執行完整遷移 (自動備份 + 還原)

## 📋 實際使用案例

### 案例 1: 從 Zeabur 備份到本地

1. **配置環境**:
   ```env
   N8N_A_NAME=Zeabur N8N
   N8N_A_BASE_URL=https://my-n8n.zeabur.app
   N8N_A_API_KEY=zeabur_api_key
   
   N8N_BASE_URL=http://localhost:5678
   N8N_API_KEY=localhost_api_key
   ```

2. **操作步驟**:
   - 選擇操作模式: "完整遷移"
   - 來源環境: "Zeabur N8N"
   - 目標環境: "Localhost N8N"
   - 儲存位置: "GitHub"
   - 載入來源數據並選擇要遷移的 workflows
   - 執行遷移

### 案例 2: 開發環境到生產環境

1. **配置環境**:
   ```env
   N8N_B_NAME=Development N8N
   N8N_B_BASE_URL=https://dev-n8n.company.com
   N8N_B_API_KEY=dev_api_key
   
   N8N_C_NAME=Production N8N
   N8N_C_BASE_URL=https://prod-n8n.company.com
   N8N_C_API_KEY=prod_api_key
   ```

2. **操作步驟**:
   - 選擇操作模式: "完整遷移"
   - 來源環境: "Development N8N"
   - 目標環境: "Production N8N"
   - 選擇經過測試的 workflows 進行部署

## 🔒 安全注意事項

1. **API Key 安全**:
   - 不要在代碼中硬編碼 API Key
   - 使用環境變數儲存敏感信息
   - 定期更新 API Key

2. **網路安全**:
   - 確保所有 N8N 實例都使用 HTTPS
   - 檢查防火牆設定
   - 限制 API 訪問權限

3. **數據加密**:
   - Credentials 數據會自動加密儲存
   - 確保 ENCRYPTION_KEY 的安全性
   - 定期備份加密密鑰

## 🐛 故障排除

### 常見問題

1. **環境連接失敗**:
   ```
   檢查 N8N 實例是否正在運行
   驗證 API Key 是否正確
   確認網路連接和防火牆設定
   ```

2. **API 權限錯誤**:
   ```
   確保 API Key 有足夠的權限
   檢查 N8N 版本兼容性
   驗證 API 端點是否可訪問
   ```

3. **備份/還原失敗**:
   ```
   檢查雲端儲存配置 (GitHub/Google Drive)
   確認加密密鑰設定正確
   檢查網路連接穩定性
   ```

### 調試方法

1. **檢查環境連接**:
   - 在跨環境頁面測試每個環境的連接狀態
   - 查看瀏覽器開發者工具的網路請求

2. **查看服務器日誌**:
   ```bash
   npm start
   # 觀察控制台輸出的錯誤信息
   ```

3. **測試 API 端點**:
   ```bash
   # 測試環境列表
   curl http://localhost:3000/api/cross-env/environments
   
   # 測試環境連接
   curl -X POST http://localhost:3000/api/cross-env/test-connection \
     -H "Content-Type: application/json" \
     -d '{"environmentId": "localhost"}'
   ```

## 📈 進階功能

### 自動化腳本

你可以創建自動化腳本來定期執行跨環境同步：

```bash
#!/bin/bash
# auto-sync.sh

# 從開發環境備份到生產環境
curl -X POST http://localhost:3000/api/cross-env/backup-from/dev \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "selectedItems": {"workflows": ["all"]},
    "destination": "github",
    "backupName": "auto-sync-$(date +%Y%m%d)"
  }'
```

### 批量操作

支援批量選擇和操作多個 workflows 和 credentials，提高操作效率。

### 版本控制

結合 GitHub 儲存，可以實現 workflows 的版本控制和變更追蹤。

---

**需要幫助？** 請查看主要的 README.md 文件或創建 GitHub Issue。