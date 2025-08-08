# 跨環境備份還原功能實現

## 功能概述

我們已經成功實現了跨環境備份還原功能，允許用戶在備份和還原頁面選擇不同的 N8N 環境來源。

## 主要改進

### 1. 前端界面改進

#### 備份頁面
- 添加了 **N8N 來源環境** 選擇器
- 支持選擇以下環境：
  - 本地 N8N (localhost:5678)
  - Zeabur N8N
  - Production N8N  
  - Staging N8N
- 添加了環境連接狀態顯示
- 實時測試環境連接並顯示 workflows 數量

#### 還原頁面
- 添加了 **N8N 目標環境** 選擇器
- 支持還原到不同的 N8N 環境
- 同樣包含環境連接狀態顯示

### 2. 後端 API 改進

#### N8N 路由 (`routes/n8n.js`)
- 添加了 `getN8nConfig()` 函數來管理多環境配置
- 添加了 `createN8nApi()` 函數來創建不同環境的 API 客戶端
- 修改了 `/workflows` 和 `/credentials` 端點支持 `env` 參數
- 新增了 `/test-connection` 端點來測試環境連接

#### 備份路由 (`routes/backup.js`)
- 修改備份函數接收 `sourceEnvironment` 參數
- 在備份數據中記錄來源環境信息
- 支持從不同 N8N 環境獲取數據進行備份

#### 還原路由 (`routes/restore.js`)
- 修改還原函數接收 `targetEnvironment` 參數
- 支持還原到不同的 N8N 環境
- 使用對應環境的 API 客戶端進行還原操作

### 3. 環境配置

在 `.env` 文件中配置多個 N8N 環境：

```env
# 默認環境 (本地)
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your_local_api_key

# 環境 A (Zeabur)
N8N_A_NAME=Zeabur N8N
N8N_A_BASE_URL=https://your-zeabur-n8n.zeabur.app
N8N_A_API_KEY=your_zeabur_api_key

# 環境 B (Production)
N8N_B_NAME=Production N8N
N8N_B_BASE_URL=https://your-production-n8n.com
N8N_B_API_KEY=your_production_api_key

# 環境 C (Staging)
N8N_C_NAME=Staging N8N
N8N_C_BASE_URL=https://your-staging-n8n.com
N8N_C_API_KEY=your_staging_api_key
```

### 4. 用戶體驗改進

- **智能環境檢測**：自動測試環境連接並顯示狀態
- **視覺化狀態指示**：
  - 🟡 測試連接中...
  - ✅ 已連接 (顯示 workflows 數量)
  - ❌ 連接失敗 (顯示錯誤信息)
- **響應式設計**：環境選擇器採用網格布局，適應不同屏幕尺寸

### 5. CSS 樣式改進

添加了環境狀態的專用樣式：
- `.env-status.testing` - 測試中狀態 (黃色)
- `.env-status.connected` - 連接成功狀態 (綠色)  
- `.env-status.failed` - 連接失敗狀態 (紅色)

## 使用流程

### 備份流程
1. 選擇 N8N 來源環境
2. 系統自動測試連接並載入數據
3. 選擇要備份的 workflows 和 credentials
4. 選擇備份目標 (GitHub/Google Drive)
5. 執行備份

### 還原流程
1. 選擇 N8N 目標環境
2. 系統測試目標環境連接
3. 選擇備份來源 (GitHub/Google Drive)
4. 選擇要還原的備份文件
5. 選擇要還原的項目
6. 執行還原到指定環境

## 技術特點

- **環境隔離**：每個環境使用獨立的 API 客戶端
- **錯誤處理**：完善的連接測試和錯誤提示
- **數據完整性**：備份文件包含來源環境信息
- **向後兼容**：保持與原有功能的兼容性

## 下一步改進建議

1. 添加環境管理界面，允許用戶動態添加/編輯環境
2. 實現環境間的直接遷移功能
3. 添加備份文件的環境標籤和過濾功能
4. 實現批量環境操作功能