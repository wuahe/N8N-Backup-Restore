# ⚠️ 敏感憑證自動還原安全警告

## 🚨 重要安全提醒

設置 `AUTO_RESTORE_SENSITIVE_CREDENTIALS=true` 會帶來以下安全風險：

### 🔓 潛在風險

1. **憑證洩露**：
   - OAuth2 access tokens 可能仍然有效
   - Refresh tokens 可能被濫用
   - API 金鑰可能被未授權使用

2. **權限濫用**：
   - 還原的憑證可能具有過高權限
   - 可能訪問不應該訪問的資源
   - 跨環境權限混亂

3. **合規問題**：
   - 可能違反組織安全政策
   - 不符合數據保護法規要求
   - 審計追蹤困難

### 🛡️ 安全建議

#### ✅ 適用場景：
- **個人開發環境**
- **隔離的測試環境**
- **同一用戶的不同 N8N 實例**
- **緊急災難恢復**（臨時使用）

#### ❌ 不適用場景：
- **生產環境**
- **跨組織遷移**
- **多用戶環境**
- **雲端部署**
- **CI/CD 流水線**

### 🔒 最佳實踐

1. **僅在必要時啟用**：
   ```bash
   # 臨時啟用，用完立即關閉
   AUTO_RESTORE_SENSITIVE_CREDENTIALS=true npm start
   ```

2. **使用憑證映射替代**：
   ```bash
   # 推薦方式：保持安全模式，使用映射
   # AUTO_RESTORE_SENSITIVE_CREDENTIALS=false
   ```

3. **環境隔離**：
   ```bash
   # 開發環境
   NODE_ENV=development
   AUTO_RESTORE_SENSITIVE_CREDENTIALS=true
   
   # 生產環境
   NODE_ENV=production
   # AUTO_RESTORE_SENSITIVE_CREDENTIALS=false  # 絕不啟用
   ```

4. **定期審查**：
   - 定期檢查 `.env` 文件
   - 確保生產環境未啟用此選項
   - 監控憑證使用情況

### 🔍 檢查清單

部署前請確認：

- [ ] 生產環境未設置 `AUTO_RESTORE_SENSITIVE_CREDENTIALS=true`
- [ ] 測試環境使用後已關閉此選項
- [ ] 所有敏感憑證已重新驗證
- [ ] 權限設置符合最小權限原則
- [ ] 已建立適當的監控和審計機制

### 🚨 緊急情況處理

如果意外在生產環境啟用了此選項：

1. **立即關閉**：
   ```bash
   # 移除或註釋掉環境變數
   # AUTO_RESTORE_SENSITIVE_CREDENTIALS=true
   ```

2. **重啟服務**：
   ```bash
   npm restart
   ```

3. **審查憑證**：
   - 檢查所有還原的敏感憑證
   - 必要時撤銷和重新生成憑證
   - 檢查訪問日誌

4. **通知相關人員**：
   - 通知安全團隊
   - 記錄事件
   - 更新安全流程

## 📞 支援

如果對安全設置有疑問，請：
- 諮詢您的安全團隊
- 參考組織的安全政策
- 進行安全風險評估

記住：**安全永遠比便利更重要！**