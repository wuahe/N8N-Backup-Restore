const express = require('express');
const axios = require('axios');
const router = express.Router();

// 獲取所有可用的 N8N 環境
function getAvailableEnvironments() {
  const environments = [
    {
      id: 'localhost',
      name: 'Localhost N8N',
      baseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
      apiKey: process.env.N8N_API_KEY
    }
  ];

  // 添加額外的環境
  const envKeys = ['A', 'B', 'C'];
  envKeys.forEach(key => {
    const name = process.env[`N8N_${key}_NAME`];
    const baseUrl = process.env[`N8N_${key}_BASE_URL`];
    const apiKey = process.env[`N8N_${key}_API_KEY`];
    
    if (name && baseUrl && apiKey) {
      environments.push({
        id: key.toLowerCase(),
        name,
        baseUrl,
        apiKey
      });
    }
  });

  return environments.filter(env => env.apiKey); // 只返回有 API Key 的環境
}

// 創建指定環境的 API 客戶端
function createN8nApiClient(environment) {
  return axios.create({
    baseURL: environment.baseUrl,
    headers: {
      'X-N8N-API-KEY': environment.apiKey,
      'Content-Type': 'application/json'
    },
    timeout: 30000 // 30秒超時
  });
}

// 獲取可用環境列表
router.get('/environments', (req, res) => {
  try {
    const environments = getAvailableEnvironments();
    res.json(environments.map(env => ({
      id: env.id,
      name: env.name,
      baseUrl: env.baseUrl
    })));
  } catch (error) {
    console.error('Error getting environments:', error);
    res.status(500).json({ error: 'Failed to get environments' });
  }
});

// 測試環境連接
router.post('/test-connection', async (req, res) => {
  try {
    const { environmentId } = req.body;
    const environments = getAvailableEnvironments();
    const environment = environments.find(env => env.id === environmentId);
    
    if (!environment) {
      return res.status(404).json({ error: 'Environment not found' });
    }

    const apiClient = createN8nApiClient(environment);
    
    // 測試連接
    const response = await apiClient.get('/api/v1/workflows');
    const workflows = response.data.data || response.data || [];
    
    res.json({
      success: true,
      environment: {
        id: environment.id,
        name: environment.name,
        baseUrl: environment.baseUrl
      },
      workflowCount: workflows.length,
      status: 'connected'
    });
  } catch (error) {
    console.error('Connection test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      status: 'failed'
    });
  }
});

// 從指定環境獲取 workflows
router.get('/workflows/:environmentId', async (req, res) => {
  try {
    const { environmentId } = req.params;
    const environments = getAvailableEnvironments();
    const environment = environments.find(env => env.id === environmentId);
    
    if (!environment) {
      return res.status(404).json({ error: 'Environment not found' });
    }

    const apiClient = createN8nApiClient(environment);
    const response = await apiClient.get('/api/v1/workflows');
    const workflows = response.data.data || response.data || [];
    
    // 為每個 workflow 添加相關的 credentials 信息
    const workflowsWithCredentials = workflows.map((workflow) => {
      const credentialIds = extractCredentialIds(workflow);
      const credentialDetails = extractCredentialDetails(workflow);
      
      return {
        ...workflow,
        relatedCredentialIds: credentialIds,
        relatedCredentials: credentialDetails,
        sourceEnvironment: environmentId
      };
    });
    
    res.json(workflowsWithCredentials);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// 從指定環境獲取 credentials
router.get('/credentials/:environmentId', async (req, res) => {
  try {
    const { environmentId } = req.params;
    const environments = getAvailableEnvironments();
    const environment = environments.find(env => env.id === environmentId);
    
    if (!environment) {
      return res.status(404).json({ error: 'Environment not found' });
    }

    const apiClient = createN8nApiClient(environment);
    const workflowsResponse = await apiClient.get('/api/v1/workflows');
    const workflows = workflowsResponse.data.data || workflowsResponse.data || [];
    
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
                  sourceEnvironment: environmentId,
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
    
    const credentials = Array.from(credentialMap.values());
    res.json(credentials);
  } catch (error) {
    console.error('Error fetching credentials:', error);
    res.json([]);
  }
});

// 跨環境備份：從環境 A 備份到雲端儲存
router.post('/backup-from/:sourceEnvId', async (req, res) => {
  try {
    const { sourceEnvId } = req.params;
    const { workflows, credentials, selectedItems, backupName, destination } = req.body;
    
    const environments = getAvailableEnvironments();
    const sourceEnv = environments.find(env => env.id === sourceEnvId);
    
    if (!sourceEnv) {
      return res.status(404).json({ error: 'Source environment not found' });
    }

    // 準備備份數據，添加來源環境信息
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      sourceEnvironment: {
        id: sourceEnv.id,
        name: sourceEnv.name,
        baseUrl: sourceEnv.baseUrl
      },
      workflows: [],
      credentials: []
    };
    
    // 處理選中的項目
    if (selectedItems.workflows) {
      for (const workflowId of selectedItems.workflows) {
        const workflow = workflows.find(w => w.id === workflowId);
        if (workflow) {
          backupData.workflows.push(workflow);
          
          // 自動包含相關的 credentials
          if (workflow.relatedCredentials) {
            workflow.relatedCredentials.forEach(cred => {
              if (!backupData.credentials.find(c => c.id === cred.id)) {
                backupData.credentials.push(cred);
              }
            });
          }
        }
      }
    }
    
    // 處理額外選中的 credentials
    if (selectedItems.credentials) {
      for (const credentialId of selectedItems.credentials) {
        const credential = credentials.find(c => c.id === credentialId);
        if (credential && !backupData.credentials.find(c => c.id === credentialId)) {
          backupData.credentials.push(credential);
        }
      }
    }

    // 加密敏感數據
    const encryptedData = encryptSensitiveData(backupData);
    
    // 根據目標儲存位置進行備份
    let result;
    if (destination === 'github') {
      result = await backupToGitHub(encryptedData, backupName, sourceEnv);
    } else if (destination === 'googledrive') {
      result = await backupToGoogleDrive(encryptedData, backupName, sourceEnv);
    } else {
      throw new Error('Invalid backup destination');
    }
    
    res.json({
      success: true,
      message: `Successfully backed up from ${sourceEnv.name} to ${destination.toUpperCase()}`,
      sourceEnvironment: sourceEnv.name,
      destination: destination.toUpperCase(),
      ...result
    });
    
  } catch (error) {
    console.error('Cross-environment backup error:', error);
    res.status(500).json({ error: 'Failed to perform cross-environment backup' });
  }
});

// 跨環境還原：從雲端儲存還原到環境 B
router.post('/restore-to/:targetEnvId', async (req, res) => {
  try {
    const { targetEnvId } = req.params;
    const { backupData, selectedItems, restoreMode } = req.body;
    
    const environments = getAvailableEnvironments();
    const targetEnv = environments.find(env => env.id === targetEnvId);
    
    if (!targetEnv) {
      return res.status(404).json({ error: 'Target environment not found' });
    }

    const apiClient = createN8nApiClient(targetEnv);
    
    // 解密數據
    const decryptedData = decryptSensitiveData(backupData);
    
    // 執行還原到目標環境
    const result = await performCrossEnvironmentRestore(
      apiClient, 
      decryptedData, 
      selectedItems, 
      restoreMode,
      targetEnv
    );
    
    res.json({
      success: true,
      message: `Successfully restored to ${targetEnv.name}`,
      sourceEnvironment: decryptedData.sourceEnvironment?.name || 'Unknown',
      targetEnvironment: targetEnv.name,
      result
    });
    
  } catch (error) {
    console.error('Cross-environment restore error:', error);
    res.status(500).json({ error: 'Failed to perform cross-environment restore' });
  }
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

// 輔助函數：加密敏感數據
function encryptSensitiveData(data) {
  const crypto = require('crypto');
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  
  const encryptedData = { ...data };
  
  encryptedData.credentials = data.credentials.map(cred => {
    if (cred.data) {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(algorithm, key);
      let encrypted = cipher.update(JSON.stringify(cred.data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return {
        ...cred,
        data: {
          encrypted: encrypted,
          iv: iv.toString('hex')
        }
      };
    }
    return cred;
  });
  
  return encryptedData;
}

// 輔助函數：解密敏感數據
function decryptSensitiveData(data) {
  const crypto = require('crypto');
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  
  const decryptedData = { ...data };
  
  decryptedData.credentials = data.credentials.map(cred => {
    if (cred.data && cred.data.encrypted) {
      try {
        const decipher = crypto.createDecipher(algorithm, key);
        let decrypted = decipher.update(cred.data.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return {
          ...cred,
          data: JSON.parse(decrypted)
        };
      } catch (error) {
        console.error('Error decrypting credential data:', error);
        return cred;
      }
    }
    return cred;
  });
  
  return decryptedData;
}

// 輔助函數：備份到 GitHub
async function backupToGitHub(encryptedData, backupName, sourceEnv) {
  const { Octokit } = require('@octokit/rest');
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  
  const backupContent = JSON.stringify(encryptedData, null, 2);
  const fileName = `${backupName || 'cross-env-backup'}-${sourceEnv.id}-${Date.now()}.json`;
  
  const response = await octokit.repos.createOrUpdateFileContents({
    owner: process.env.GITHUB_REPO_OWNER,
    repo: process.env.GITHUB_REPO_NAME,
    path: `cross-env-backups/${fileName}`,
    message: `Cross-environment backup from ${sourceEnv.name}: ${backupName || 'Automated backup'}`,
    content: Buffer.from(backupContent).toString('base64')
  });
  
  return {
    fileName,
    url: response.data.content.html_url
  };
}

// 輔助函數：備份到 Google Drive
async function backupToGoogleDrive(encryptedData, backupName, sourceEnv) {
  const { google } = require('googleapis');
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });
  
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
  const backupContent = JSON.stringify(encryptedData, null, 2);
  const fileName = `${backupName || 'cross-env-backup'}-${sourceEnv.id}-${Date.now()}.json`;
  
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: ['your-backup-folder-id']
    },
    media: {
      mimeType: 'application/json',
      body: backupContent
    }
  });
  
  return {
    fileName,
    fileId: response.data.id
  };
}

// 輔助函數：執行跨環境還原
async function performCrossEnvironmentRestore(apiClient, backupData, selectedItems, restoreMode, targetEnv) {
  const results = {
    workflows: { success: [], failed: [] },
    credentials: { success: [], failed: [] }
  };
  
  try {
    // 先還原 credentials
    if (selectedItems.credentials) {
      for (const credentialId of selectedItems.credentials) {
        const credential = backupData.credentials.find(c => c.id === credentialId);
        if (credential) {
          try {
            // 檢查是否已存在
            let existingCredential = null;
            try {
              const response = await apiClient.get(`/api/v1/credentials/${credential.id}`);
              existingCredential = response.data;
            } catch (error) {
              // Credential 不存在，這是正常的
            }
            
            if (existingCredential && restoreMode === 'skip') {
              results.credentials.success.push({
                id: credential.id,
                name: credential.name,
                action: 'skipped'
              });
              continue;
            }
            
            // 準備 credential 數據
            const credentialData = {
              name: credential.name,
              type: credential.type,
              data: credential.data
            };
            
            if (existingCredential && restoreMode === 'overwrite') {
              // 更新現有 credential
              await apiClient.patch(`/api/v1/credentials/${credential.id}`, credentialData);
              results.credentials.success.push({
                id: credential.id,
                name: credential.name,
                action: 'updated'
              });
            } else {
              // 創建新 credential
              const response = await apiClient.post('/api/v1/credentials', credentialData);
              results.credentials.success.push({
                id: response.data.id,
                name: credential.name,
                action: 'created'
              });
            }
          } catch (error) {
            results.credentials.failed.push({
              id: credential.id,
              name: credential.name,
              error: error.message
            });
          }
        }
      }
    }
    
    // 然後還原 workflows
    if (selectedItems.workflows) {
      for (const workflowId of selectedItems.workflows) {
        const workflow = backupData.workflows.find(w => w.id === workflowId);
        if (workflow) {
          try {
            // 檢查是否已存在
            let existingWorkflow = null;
            try {
              const response = await apiClient.get(`/api/v1/workflows/${workflow.id}`);
              existingWorkflow = response.data;
            } catch (error) {
              // Workflow 不存在，這是正常的
            }
            
            if (existingWorkflow && restoreMode === 'skip') {
              results.workflows.success.push({
                id: workflow.id,
                name: workflow.name,
                action: 'skipped'
              });
              continue;
            }
            
            // 準備 workflow 數據
            const workflowData = {
              name: workflow.name,
              nodes: workflow.nodes,
              connections: workflow.connections,
              active: workflow.active,
              settings: workflow.settings,
              tags: workflow.tags
            };
            
            if (existingWorkflow && restoreMode === 'overwrite') {
              // 更新現有 workflow
              await apiClient.patch(`/api/v1/workflows/${workflow.id}`, workflowData);
              results.workflows.success.push({
                id: workflow.id,
                name: workflow.name,
                action: 'updated'
              });
            } else {
              // 創建新 workflow
              const response = await apiClient.post('/api/v1/workflows', workflowData);
              results.workflows.success.push({
                id: response.data.id,
                name: workflow.name,
                action: 'created'
              });
            }
          } catch (error) {
            results.workflows.failed.push({
              id: workflow.id,
              name: workflow.name,
              error: error.message
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Cross-environment restore process error:', error);
    throw error;
  }
  
  return results;
}

module.exports = router;