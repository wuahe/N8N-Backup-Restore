#!/bin/bash

echo "🚀 N8N Backup & Restore Tool 安裝腳本"
echo "======================================"

# 檢查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安裝，請先安裝 Node.js"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"

# 檢查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安裝"
    exit 1
fi

echo "✅ npm 版本: $(npm --version)"

# 安裝依賴
echo "📦 安裝依賴套件..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依賴安裝失敗"
    exit 1
fi

echo "✅ 依賴安裝完成"

# 檢查 .env 文件
if [ ! -f .env ]; then
    echo "📝 創建環境配置文件..."
    cp .env.example .env
    echo "⚠️  請編輯 .env 文件並填入正確的配置信息"
    echo "   - N8N API Key"
    echo "   - GitHub Token"
    echo "   - Google Drive API 憑證"
    echo "   - 加密密鑰"
else
    echo "✅ .env 文件已存在"
fi

echo ""
echo "🎉 安裝完成！"
echo ""
echo "下一步："
echo "1. 編輯 .env 文件並填入配置"
echo "2. 運行 'npm start' 啟動應用"
echo "3. 打開 http://localhost:3000"
echo ""
echo "預設登入信息："
echo "用戶名: admin"
echo "密碼: password"