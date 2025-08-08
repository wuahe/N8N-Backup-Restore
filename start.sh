#!/bin/bash

# N8N Backup & Restore Tool 啟動腳本

echo "🚀 N8N Backup & Restore Tool"
echo "============================"

# 檢查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安裝，請先安裝 Node.js"
    exit 1
fi

# 檢查依賴
if [ ! -d "node_modules" ]; then
    echo "📦 安裝依賴中..."
    npm install
fi

# 檢查 .env 文件
if [ ! -f ".env" ]; then
    echo "📝 創建環境配置文件..."
    cp .env.example .env
    echo ""
    echo "⚠️  重要：請編輯 .env 文件並填入以下配置："
    echo "   - N8N_BASE_URL: 你的 N8N 實例地址"
    echo "   - N8N_API_KEY: 你的 N8N API 密鑰"
    echo "   - JWT_SECRET: JWT 密鑰"
    echo "   - ENCRYPTION_KEY: 32字符加密密鑰"
    echo ""
    echo "可選配置（用於備份到雲端）："
    echo "   - GitHub Token 和倉庫信息"
    echo "   - Google Drive API 憑證"
    echo ""
    read -p "按 Enter 繼續編輯 .env 文件..."
    
    # 嘗試打開編輯器
    if command -v code &> /dev/null; then
        code .env
    elif command -v nano &> /dev/null; then
        nano .env
    elif command -v vim &> /dev/null; then
        vim .env
    else
        echo "請手動編輯 .env 文件"
    fi
    
    echo ""
    read -p "配置完成後按 Enter 繼續..."
fi

# 生成加密密鑰（如果需要）
if ! grep -q "ENCRYPTION_KEY=" .env || grep -q "your_32_character_encryption_key" .env; then
    echo "🔐 生成加密密鑰..."
    ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
    
    # 更新 .env 文件
    if grep -q "ENCRYPTION_KEY=" .env; then
        sed -i.bak "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$ENCRYPTION_KEY/" .env
    else
        echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env
    fi
    
    echo "✅ 加密密鑰已生成並保存到 .env 文件"
fi

# 生成 JWT 密鑰（如果需要）
if ! grep -q "JWT_SECRET=" .env || grep -q "your_jwt_secret_key" .env; then
    echo "🔑 生成 JWT 密鑰..."
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    
    # 更新 .env 文件
    if grep -q "JWT_SECRET=" .env; then
        sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    else
        echo "JWT_SECRET=$JWT_SECRET" >> .env
    fi
    
    echo "✅ JWT 密鑰已生成並保存到 .env 文件"
fi

echo ""
echo "🎯 啟動應用..."
echo "應用將在 http://localhost:3000 啟動"
echo ""
echo "預設登入信息："
echo "用戶名: admin"
echo "密碼: password"
echo ""
echo "按 Ctrl+C 停止服務器"
echo ""

# 啟動服務器
npm start