const express = require('express');
const axios = require('axios');
const router = express.Router();

// 獲取 N8N 環境配置
function getN8nConfig(envId = 'default') {
  const configs = {
    default: {
      baseURL: process.env.N8N_BASE_URL || 'http://localhost:5678',
      apiKey: process.env.N8N_API_KEY,
      name: '本地 N8N'
    },
    env_a: {
      baseURL: process.env.N8N_A_BASE_URL,
      apiKey: process.env.N8N_A_API_KEY,
      name: process.env.N8N_A_NAME || 'Environment A'
    },
    env_b: {
      baseURL: process.env.N8N_B_BASE_URL,
      apiKey: process.env.N8N_B_API_KEY,
      name: process.env.N8N_B_NAME || 'Environment B'
    },
    env_c: {
      baseURL: process.env.N8N_C_BASE_URL,
      apiKey: process.env.N8N_C_API_KEY,
      name: process.env.N8N_C_NAME || 'Environment C'
    }
  };
  
  return configs[envId] || configs.default;
}

// 創建 N8N API 客戶端
function createN8nApi(envId = 'default') {
  const config = getN8nConfig(envId);
  
  if (!config.baseURL || !config.apiKey) {
    throw new Error(`N8N environment ${envId} is not properly configured`);
  }
  
  return axios.create({
    baseURL: config.baseURL,
    headers: {
      'X-N8N-API-KEY': config.apiKey,
      'Content-Type': 'application/json'
    }
  });
}

// 獲取所有 workflows
router.get('/workflows', async (req, res) => {
  try {
    const envId = req.query.env || 'default';
    const n8nApi = createN8nApi(envId);
    
    const response = await n8nApi.get('/api/v1/workflows');
    const workflows = response.data.data || response.data;
    
    // 為每個 workflow 添加相關的 credentials 信息
    const workflowsWithCredentials = workflows.map((workflow) => {
      const credentialIds = extractCredentialIds(workflow);
      const credentialDetails = extractCredentialDetails(workflow);
      
      return {
        ...workflow,
        relatedCredentialIds: credentialIds,
        relatedCredentials: credentialDetails
      };
    });
    
    res.json(workflowsWithCredentials);
  } catch (error) {
    console.error('Error fetching workflows:', error.message);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// 獲取所有 credentials
router.get('/credentials', async (req, res) => {
  try {
    const envId = req.query.env || 'default';
    const n8nApi = createN8nApi(envId);
    
    console.log('Fetching credentials...');
    
    // 由於 N8N API 的 credentials 端點有限制，我們通過 workflows 來收集 credential 信息
    const workflowsResponse = await n8nApi.get('/api/v1/workflows');
    const workflows = workflowsResponse.data.data || workflowsResponse.data || [];
    
    console.log(`Found ${workflows.length} workflows`);
    
    const credentialMap = new Map();
    
    // 從所有 workflows 中提取 credential 信息
    workflows.forEach(workflow => {
      if (workflow.nodes) {
        workflow.nodes.forEach(node => {
          if (node.credentials) {
            Object.entries(node.credentials).forEach(([credType, credInfo]) => {
              if (credInfo.id && credInfo.name) {
                credentialMap.set(credInfo.id, {
                  id: credInfo.id,
                  name: credInfo.name,
                  type: credType,
                  // 添加一些額外信息
                  usedInWorkflows: credentialMap.has(credInfo.id) 
                    ? credentialMap.get(credInfo.id).usedInWorkflows + 1 
                    : 1
                });
              }
            });
          }
        });
      }
    });
    
    // 嘗試獲取完整的憑證數據
    const credentialsWithData = [];
    for (const [credId, credInfo] of credentialMap) {
      try {
        // 嘗試獲取完整的憑證數據
        const credResponse = await n8nApi.get(`/api/v1/credentials/${credId}`);
        const fullCredential = credResponse.data;
        
        credentialsWithData.push({
          ...credInfo,
          data: fullCredential.data || {},
          nodesAccess: fullCredential.nodesAccess || []
        });
        
        console.log(`✅ 獲取憑證數據成功: ${credInfo.name}`);
      } catch (error) {
        // 如果無法獲取完整數據，使用基本信息
        console.warn(`⚠️  無法獲取憑證 ${credInfo.name} 的完整數據:`, error.message);
        credentialsWithData.push({
          ...credInfo,
          data: {},
          dataAvailable: false
        });
      }
    }
    
    console.log(`Extracted ${credentialsWithData.length} unique credentials`);
    
    res.json(credentialsWithData);
  } catch (error) {
    console.error('Error fetching credentials:', error.message);
    res.json([]);
  }
});

// 獲取特定 workflow
router.get('/workflows/:id', async (req, res) => {
  try {
    const response = await n8nApi.get(`/api/v1/workflows/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching workflow:', error.message);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

// 獲取特定 credential
router.get('/credentials/:id', async (req, res) => {
  try {
    const response = await n8nApi.get(`/api/v1/credentials/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching credential:', error.message);
    res.status(500).json({ error: 'Failed to fetch credential' });
  }
});

// 創建 workflow
router.post('/workflows', async (req, res) => {
  try {
    const response = await n8nApi.post('/api/v1/workflows', req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Error creating workflow:', error.message);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// 創建 credential
router.post('/credentials', async (req, res) => {
  try {
    const response = await n8nApi.post('/api/v1/credentials', req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Error creating credential:', error.message);
    res.status(500).json({ error: 'Failed to create credential' });
  }
});

// 調試端點 - 測試 N8N API 連接
router.get('/debug', async (req, res) => {
  const debug = {
    n8nBaseUrl: N8N_BASE_URL,
    hasApiKey: !!N8N_API_KEY,
    apiKeyLength: N8N_API_KEY ? N8N_API_KEY.length : 0,
    tests: {}
  };
  
  // 測試 workflows API
  try {
    const workflowsResponse = await n8nApi.get('/api/v1/workflows');
    debug.tests.workflows = {
      success: true,
      count: (workflowsResponse.data.data || workflowsResponse.data || []).length
    };
  } catch (error) {
    debug.tests.workflows = {
      success: false,
      error: error.message
    };
  }
  
  // 測試 credentials API (多種方法)
  debug.tests.credentials = [];
  
  // 方法 1: 標準 API
  try {
    const response = await n8nApi.get('/api/v1/credentials');
    debug.tests.credentials.push({
      method: 'GET /api/v1/credentials',
      success: true,
      count: (response.data.data || response.data || []).length
    });
  } catch (error) {
    debug.tests.credentials.push({
      method: 'GET /api/v1/credentials',
      success: false,
      error: error.message
    });
  }
  
  // 方法 2: 內部 REST API
  try {
    const internalApi = axios.create({
      baseURL: N8N_BASE_URL,
      headers: { 'Content-Type': 'application/json' }
    });
    const response = await internalApi.get('/rest/credentials');
    debug.tests.credentials.push({
      method: 'GET /rest/credentials',
      success: true,
      count: (response.data.data || response.data || []).length
    });
  } catch (error) {
    debug.tests.credentials.push({
      method: 'GET /rest/credentials',
      success: false,
      error: error.message
    });
  }
  
  res.json(debug);
});

// 輔助函數：從 workflow 中提取 credential IDs
function extractCredentialIds(workflow) {
  const credentialIds = new Set();
  
  if (workflow.nodes) {
    workflow.nodes.forEach(node => {
      if (node.credentials) {
        Object.values(node.credentials).forEach(cred => {
          if (cred.id) {
            credentialIds.add(cred.id);
          }
        });
      }
    });
  }
  
  return Array.from(credentialIds);
}

// 輔助函數：從 workflow 中提取 credential 詳細信息
function extractCredentialDetails(workflow) {
  const credentialMap = new Map();
  
  if (workflow.nodes) {
    workflow.nodes.forEach(node => {
      if (node.credentials) {
        Object.entries(node.credentials).forEach(([credType, credInfo]) => {
          if (credInfo.id && credInfo.name) {
            credentialMap.set(credInfo.id, {
              id: credInfo.id,
              name: credInfo.name,
              type: credType
            });
          }
        });
      }
    });
  }
  
  return Array.from(credentialMap.values());
}

// 輔助函數：根據 IDs 獲取 credentials
async function getCredentialsByIds(credentialIds) {
  const credentials = [];
  
  for (const id of credentialIds) {
    try {
      const response = await n8nApi.get(`/api/v1/credentials/${id}`);
      credentials.push(response.data);
    } catch (error) {
      console.error(`Error fetching credential ${id}:`, error.message);
    }
  }
  
  return credentials;
}

// 獲取所有 N8N 數據（workflows 和 credentials）
router.get('/data', async (req, res) => {
  try {
    const envId = req.query.env || 'default';
    const n8nApi = createN8nApi(envId);
    
    console.log(`Fetching N8N data for environment: ${envId}`);
    
    // 獲取 workflows
    const workflowsResponse = await n8nApi.get('/api/v1/workflows');
    const workflows = workflowsResponse.data.data || workflowsResponse.data || [];
    
    console.log(`Found ${workflows.length} workflows`);
    
    // 為每個 workflow 添加相關的 credentials 信息
    const workflowsWithCredentials = workflows.map((workflow) => {
      const credentialIds = extractCredentialIds(workflow);
      const credentialDetails = extractCredentialDetails(workflow);
      
      return {
        ...workflow,
        relatedCredentialIds: credentialIds,
        relatedCredentials: credentialDetails
      };
    });
    
    // 獲取 credentials
    const credentialMap = new Map();
    
    // 從所有 workflows 中提取 credential 信息
    workflows.forEach(workflow => {
      if (workflow.nodes) {
        workflow.nodes.forEach(node => {
          if (node.credentials) {
            Object.entries(node.credentials).forEach(([credType, credInfo]) => {
              if (credInfo.id && credInfo.name) {
                const existing = credentialMap.get(credInfo.id);
                credentialMap.set(credInfo.id, {
                  id: credInfo.id,
                  name: credInfo.name,
                  type: credType,
                  usedInWorkflows: existing ? existing.usedInWorkflows + 1 : 1
                });
              }
            });
          }
        });
      }
    });
    
    // 嘗試獲取完整的憑證數據
    const credentialsWithData = [];
    for (const [credId, credInfo] of credentialMap) {
      try {
        // 嘗試獲取完整的憑證數據
        const credResponse = await n8nApi.get(`/api/v1/credentials/${credId}`);
        const fullCredential = credResponse.data;
        
        credentialsWithData.push({
          ...credInfo,
          data: fullCredential.data || {},
          nodesAccess: fullCredential.nodesAccess || []
        });
        
        console.log(`✅ 獲取憑證數據成功: ${credInfo.name} (${credInfo.type})`);
      } catch (error) {
        // 如果無法獲取完整數據，使用基本信息
        console.warn(`⚠️  無法獲取憑證 ${credInfo.name} 的完整數據:`, error.message);
        credentialsWithData.push({
          ...credInfo,
          data: {},
          dataAvailable: false
        });
      }
    }
    
    console.log(`Extracted ${credentialsWithData.length} unique credentials with data`);
    
    res.json({
      workflows: workflowsWithCredentials,
      credentials: credentialsWithData
    });
    
  } catch (error) {
    console.error('Error fetching N8N data:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch N8N data',
      details: error.message 
    });
  }
});

// 測試 N8N 環境連接
router.post('/test-connection', async (req, res) => {
  try {
    const { environmentId } = req.body;
    const envId = environmentId || 'default';
    
    const config = getN8nConfig(envId);
    
    if (!config.baseURL || !config.apiKey) {
      return res.json({
        success: false,
        error: `環境 ${config.name} 配置不完整`
      });
    }
    
    const n8nApi = createN8nApi(envId);
    
    // 測試連接並獲取 workflows 數量
    const response = await n8nApi.get('/api/v1/workflows');
    const workflows = response.data.data || response.data || [];
    
    res.json({
      success: true,
      workflowCount: workflows.length,
      environmentName: config.name,
      baseURL: config.baseURL
    });
    
  } catch (error) {
    console.error('N8N connection test failed:', error.message);
    res.json({
      success: false,
      error: error.message || '連接失敗'
    });
  }
});

module.exports = router;