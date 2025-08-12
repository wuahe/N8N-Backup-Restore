# 配置文檔說明 / Configuration Documentation

## 文檔結構 / Document Structure

本專案提供多語言的配置說明文檔：
This project provides multilingual configuration documentation:

### 📋 配置文檔 / Configuration Documents

| 文檔 / Document | 語言 / Language | 說明 / Description |
|---|---|---|
| [`CONFIGURATION.md`](./CONFIGURATION.md) | 雙語導航 / Bilingual Navigation | 主要配置文檔，包含語言選擇導航 |
| [`CONFIGURATION_ZH.md`](./CONFIGURATION_ZH.md) | 繁體中文 / Traditional Chinese | 完整的繁體中文配置說明 |
| [`CONFIGURATION_EN.md`](./CONFIGURATION_EN.md) | English | Complete English configuration guide |
| [`.env.example`](./.env.example) | 雙語註釋 / Bilingual Comments | 環境變數範例檔案 |

### 🚀 快速開始 / Quick Start

#### 繁體中文用戶 / Traditional Chinese Users
1. 閱讀 [`CONFIGURATION_ZH.md`](./CONFIGURATION_ZH.md)
2. 複製 `.env.example` 到 `.env`
3. 根據說明填入配置值

#### English Users
1. Read [`CONFIGURATION_EN.md`](./CONFIGURATION_EN.md)
2. Copy `.env.example` to `.env`
3. Fill in configuration values according to the guide

### 📝 配置內容 / Configuration Contents

所有配置文檔都包含以下內容：
All configuration documents include the following content:

- **N8N 環境配置 / N8N Environment Configuration**
  - 本地實例設定 / Local instance setup
  - 多環境支援 / Multi-environment support
  - API Key 取得方法 / API Key acquisition methods

- **第三方服務配置 / Third-party Service Configuration**
  - GitHub 備份設定 / GitHub backup setup
  - Google Drive 整合 / Google Drive integration
  - OAuth 配置指南 / OAuth configuration guide

- **安全配置 / Security Configuration**
  - JWT 金鑰產生 / JWT key generation
  - 加密設定 / Encryption settings
  - 安全最佳實踐 / Security best practices

- **故障排除 / Troubleshooting**
  - 常見問題解決 / Common issue resolution
  - 配置驗證 / Configuration validation
  - 測試指導 / Testing guidance

### 🔧 環境變數範例 / Environment Variables Example

`.env.example` 檔案包含：
The `.env.example` file includes:

```env
# N8N Configuration - 本地和遠端環境
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your_api_key_here

# GitHub Configuration - 備份儲存
GITHUB_TOKEN=your_github_token
GITHUB_REPO_OWNER=your_username
GITHUB_REPO_NAME=n8n-backups

# Google Drive Configuration - 雲端備份
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Security Configuration - 安全設定
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# Server Configuration - 伺服器設定
PORT=3003
```

### 📚 相關文檔 / Related Documentation

- [`SMART_SELECTION_FEATURE.md`](./SMART_SELECTION_FEATURE.md) - 智能關聯選擇功能說明
- [`README.md`](./README.md) - 專案主要說明文檔

### 🆘 支援 / Support

如果您在配置過程中遇到問題：
If you encounter issues during configuration:

1. **檢查文檔 / Check Documentation**
   - 參考對應語言的配置說明
   - 查看故障排除章節

2. **驗證配置 / Validate Configuration**
   - 確認環境變數格式正確
   - 測試 API 連線

3. **尋求協助 / Get Help**
   - 在 GitHub Issues 中提出問題
   - 提供詳細的錯誤訊息和配置資訊

---

**注意 / Note:** 請確保不要將包含敏感資訊的 `.env` 檔案提交到版本控制系統。
Please ensure not to commit the `.env` file containing sensitive information to version control.