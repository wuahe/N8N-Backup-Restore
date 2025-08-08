const express = require('express');
const axios = require('axios');
const { Octokit } = require('@octokit/rest');
const { google } = require('googleapis');
const crypto = require('crypto');
const router = express.Router();

// GitHub 配置 (需要安裝 @octokit/rest)
const octokit = process.env.GITHUB_TOKEN ? new Octokit({
  auth: process.env.GITHUB_TOKEN
}) : null;

// Google Drive 配置
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

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

// 從 GitHub 還原
router.post('/github', async (req, res) => {
  try {
    const { fileName, selectedItems, restoreMode, targetEnvironment } = req.body;
    const envId = targetEnvironment || 'default';
    const n8nApi = createN8nApi(envId);
    
    // 從 GitHub 下載備份文件
    const response = await octokit.repos.getContent({
      owner: process.env.GITHUB_REPO_OWNER,
      repo: process.env.GITHUB_REPO_NAME,
      path: `backups/${fileName}`
    });
    
    const backupContent = Buffer.from(response.data.content, 'base64').toString('utf8');
    const backupData = JSON.parse(backupContent);
    
    // 解密數據
    const decryptedData = decryptSensitiveData(backupData);
    
    // 執行還原
    const result = await performRestore(decryptedData, selectedItems, restoreMode);
    
    res.json({
      success: true,
      message: 'Restore from GitHub completed successfully',
      result
    });
    
  } catch (error) {
    console.error('GitHub restore error:', error);
    res.status(500).json({ error: 'Failed to restore from GitHub' });
  }
});

// 從 Google Drive 還原
router.post('/googledrive', async (req, res) => {
  try {
    const { fileId, selectedItems, restoreMode, targetEnvironment } = req.body;
    const envId = targetEnvironment || 'default';
    const n8nApi = createN8nApi(envId);
    
    // 從 Google Drive 下載備份文件
    const response = await drive.files.get({
      fileId: fileId,
      alt: 'media'
    });
    
    const backupData = JSON.parse(response.data);
    
    // 解密數據
    const decryptedData = decryptSensitiveData(backupData);
    
    // 執行還原
    const result = await performRestore(decryptedData, selectedItems, restoreMode);
    
    res.json({
      success: true,
      message: 'Restore from Google Drive completed successfully',
      result
    });
    
  } catch (error) {
    console.error('Google Drive restore error:', error);
    res.status(500).json({ error: 'Failed to restore from Google Drive' });
  }
});

// 預覽備份內容 (GitHub)
router.get('/github/preview/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    const response = await octokit.repos.getContent({
      owner: process.env.GITHUB_REPO_OWNER,
      repo: process.env.GITHUB_REPO_NAME,
      path: `backups/${fileName}`
    });
    
    const backupContent = Buffer.from(response.data.content, 'base64').toString('utf8');
    const backupData = JSON.parse(backupContent);
    
    // 返回預覽信息（不包含敏感數據）
    const preview = {
      timestamp: backupData.timestamp,
      version: backupData.version,
      workflows: backupData.workflows.map(w => ({
        id: w.id,
        name: w.name,
        active: w.active,
        tags: w.tags
      })),
      credentials: backupData.credentials.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type
      }))
    };
    
    res.json(preview);
  } catch (error) {
    console.error('Error previewing GitHub backup:', error);
    res.status(500).json({ error: 'Failed to preview backup' });
  }
});

// 預覽備份內容 (Google Drive)
router.get('/googledrive/preview/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const response = await drive.files.get({
      fileId: fileId,
      alt: 'media'
    });
    
    const backupData = JSON.parse(response.data);
    
    // 返回預覽信息（不包含敏感數據）
    const preview = {
      timestamp: backupData.timestamp,
      version: backupData.version,
      workflows: backupData.workflows.map(w => ({
        id: w.id,
        name: w.name,
        active: w.active,
        tags: w.tags
      })),
      credentials: backupData.credentials.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type
      }))
    };
    
    res.json(preview);
  } catch (error) {
    console.error('Error previewing Google Drive backup:', error);
    res.status(500).json({ error: 'Failed to preview backup' });
  }
});

// 輔助函數：執行還原
async function performRestore(backupData, selectedItems, restoreMode) {
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
              const response = await n8nApi.get(`/api/v1/credentials/${credential.id}`);
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
              await n8nApi.patch(`/api/v1/credentials/${credential.id}`, credentialData);
              results.credentials.success.push({
                id: credential.id,
                name: credential.name,
                action: 'updated'
              });
            } else {
              // 創建新 credential
              const response = await n8nApi.post('/api/v1/credentials', credentialData);
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
              const response = await n8nApi.get(`/api/v1/workflows/${workflow.id}`);
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
              await n8nApi.patch(`/api/v1/workflows/${workflow.id}`, workflowData);
              results.workflows.success.push({
                id: workflow.id,
                name: workflow.name,
                action: 'updated'
              });
            } else {
              // 創建新 workflow
              const response = await n8nApi.post('/api/v1/workflows', workflowData);
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
    console.error('Restore process error:', error);
    throw error;
  }
  
  return results;
}

// 輔助函數：解密敏感數據
function decryptSensitiveData(data) {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  
  const decryptedData = { ...data };
  
  decryptedData.credentials = data.credentials.map(cred => {
    if (cred.data && cred.data.encrypted) {
      try {
        const iv = Buffer.from(cred.data.iv, 'hex');
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

module.exports = router;