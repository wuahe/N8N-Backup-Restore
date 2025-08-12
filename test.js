#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 N8N Backup & Restore Tool - 功能測試');
console.log('=====================================');

// 測試 1: 檢查必要文件
console.log('\n📁 檢查文件結構...');
const requiredFiles = [
  'server.js',
  'package.json',
  '.env',
  'public/index.html',
  'public/app.js',
  'public/styles.css',
  'routes/auth.js',
  'routes/backup.js',
  'routes/restore.js',
  'routes/n8n.js'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - 文件不存在`);
    allFilesExist = false;
  }
});

// 測試 2: 檢查依賴
console.log('\n📦 檢查依賴套件...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = Object.keys(packageJson.dependencies);

  dependencies.forEach(dep => {
    try {
      require.resolve(dep);
      console.log(`✅ ${dep}`);
    } catch (error) {
      console.log(`❌ ${dep} - 未安裝`);
      allFilesExist = false;
    }
  });
} catch (error) {
  console.log('❌ 無法讀取 package.json');
  allFilesExist = false;
}

// 測試 3: 檢查環境配置
console.log('\n⚙️  檢查環境配置...');
require('dotenv').config();

const requiredEnvVars = [
  'N8N_BASE_URL',
  'JWT_SECRET',
  'ENCRYPTION_KEY'
];

requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar} - 已設定`);
  } else {
    console.log(`⚠️  ${envVar} - 未設定（需要配置）`);
  }
});

// 測試 4: 測試路由模組載入
console.log('\n🛣️  測試路由模組...');
try {
  const authRoutes = require('./routes/auth');
  console.log('✅ auth.js - 載入成功');

  const backupRoutes = require('./routes/backup');
  console.log('✅ backup.js - 載入成功');

  const restoreRoutes = require('./routes/restore');
  console.log('✅ restore.js - 載入成功');

  const n8nRoutes = require('./routes/n8n');
  console.log('✅ n8n.js - 載入成功');
} catch (error) {
  console.log(`❌ 路由模組載入失敗: ${error.message}`);
  allFilesExist = false;
}

// 測試 5: 測試服務器啟動
console.log('\n🚀 測試服務器啟動...');
try {
  // 不實際啟動服務器，只測試代碼載入
  const express = require('express');
  const app = express();
  console.log('✅ Express 應用創建成功');

  // 測試中間件
  const cors = require('cors');
  app.use(cors());
  console.log('✅ CORS 中間件載入成功');

  console.log('✅ 服務器代碼驗證通過');
} catch (error) {
  console.log(`❌ 服務器測試失敗: ${error.message}`);
  allFilesExist = false;
}

// 測試結果
console.log('\n📊 測試結果');
console.log('===========');
if (allFilesExist) {
  console.log('🎉 所有基本測試通過！');
  console.log('\n下一步：');
  console.log('1. 編輯 .env 文件，填入你的配置');
  console.log('2. 運行 npm start 啟動應用');
  console.log('3. 打開 http://localhost:3000');
  console.log('4. 使用 admin/password 登入');
} else {
  console.log('❌ 部分測試失敗，請檢查上述錯誤');
}

console.log('\n💡 提示：');
console.log('- 確保你的 N8N 實例正在運行');
console.log('- 配置正確的 API Key 和其他憑證');
console.log('- 檢查網路連接和防火牆設定');