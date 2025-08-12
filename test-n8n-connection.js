const axios = require('axios');
require('dotenv').config();

async function testN8nConnection() {
  try {
    console.log('🔍 測試 N8N API 連接...');
    
    const baseUrl = process.env.N8N_BASE_URL;
    const apiKey = process.env.N8N_API_KEY;
    
    console.log('🌐 N8N URL:', baseUrl);
    console.log('🔑 API Key:', apiKey ? `${apiKey.substring(0, 20)}...` : '未設置');
    
    if (!baseUrl || !apiKey) {
      console.error('❌ N8N 配置不完整');
      return;
    }
    
    // 測試 workflows API
    console.log('\n📋 測試 Workflows API...');
    const workflowsResponse = await axios.get(`${baseUrl}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': apiKey
      }
    });
    
    console.log('✅ Workflows API 成功');
    console.log(`📊 找到 ${workflowsResponse.data.data.length} 個 workflows`);
    
    // 顯示前 5 個 workflows
    const workflows = workflowsResponse.data.data.slice(0, 5);
    workflows.forEach(workflow => {
      console.log(`  - ${workflow.name} (ID: ${workflow.id}, 狀態: ${workflow.active ? '啟用' : '停用'})`);
    });
    
    // 測試 credentials API
    console.log('\n🔑 測試 Credentials API...');
    const credentialsResponse = await axios.get(`${baseUrl}/api/v1/credentials`, {
      headers: {
        'X-N8N-API-KEY': apiKey
      }
    });
    
    console.log('✅ Credentials API 成功');
    console.log(`🔐 找到 ${credentialsResponse.data.data.length} 個 credentials`);
    
    // 顯示前 5 個 credentials
    const credentials = credentialsResponse.data.data.slice(0, 5);
    credentials.forEach(credential => {
      console.log(`  - ${credential.name} (類型: ${credential.type})`);
    });
    
  } catch (error) {
    console.error('❌ N8N API 連接失敗:', error.message);
    
    if (error.response) {
      console.error('📊 響應狀態:', error.response.status);
      console.error('📝 響應數據:', error.response.data);
    }
    
    console.error('\n🔧 請檢查以下配置:');
    console.error('1. N8N_BASE_URL 是否正確');
    console.error('2. N8N_API_KEY 是否有效');
    console.error('3. N8N 服務是否正在運行');
    console.error('4. API Key 是否有足夠的權限');
  }
}

// 執行測試
testN8nConnection();