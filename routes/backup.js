const express = require('express');
const archiver = require('archiver');
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

// 備份到 GitHub
router.post('/github', async (req, res) => {
  try {
    const { workflows, credentials, selectedItems, backupName, sourceEnvironment } = req.body;
    
    // 準備備份數據
    const backupData = await prepareBackupData(workflows, credentials, selectedItems, sourceEnvironment);
    
    // 加密敏感數據
    const encryptedData = encryptSensitiveData(backupData);
    
    // 創建備份文件內容
    const backupContent = JSON.stringify(encryptedData, null, 2);
    const fileName = `${backupName || 'n8n-backup'}-${Date.now()}.json`;
    
    // 上傳到 GitHub
    const response = await octokit.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_REPO_OWNER,
      repo: process.env.GITHUB_REPO_NAME,
      path: `backups/${fileName}`,
      message: `N8N Backup: ${backupName || 'Automated backup'}`,
      content: Buffer.from(backupContent).toString('base64')
    });
    
    res.json({
      success: true,
      message: 'Backup uploaded to GitHub successfully',
      fileName,
      url: response.data.content.html_url
    });
    
  } catch (error) {
    console.error('GitHub backup error:', error);
    res.status(500).json({ error: 'Failed to backup to GitHub' });
  }
});

// 備份到 Google Drive
router.post('/googledrive', async (req, res) => {
  try {
    const { workflows, credentials, selectedItems, backupName, sourceEnvironment } = req.body;
    
    // 準備備份數據
    const backupData = await prepareBackupData(workflows, credentials, selectedItems, sourceEnvironment);
    
    // 加密敏感數據
    const encryptedData = encryptSensitiveData(backupData);
    
    // 創建備份文件
    const backupContent = JSON.stringify(encryptedData, null, 2);
    const fileName = `${backupName || 'n8n-backup'}-${Date.now()}.json`;
    
    // 上傳到 Google Drive
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: ['your-backup-folder-id'] // 可選：指定父文件夾
      },
      media: {
        mimeType: 'application/json',
        body: backupContent
      }
    });
    
    res.json({
      success: true,
      message: 'Backup uploaded to Google Drive successfully',
      fileName,
      fileId: response.data.id
    });
    
  } catch (error) {
    console.error('Google Drive backup error:', error);
    res.status(500).json({ error: 'Failed to backup to Google Drive' });
  }
});

// 獲取 GitHub 備份列表
router.get('/github/list', async (req, res) => {
  try {
    const response = await octokit.repos.getContent({
      owner: process.env.GITHUB_REPO_OWNER,
      repo: process.env.GITHUB_REPO_NAME,
      path: 'backups'
    });
    
    const backups = response.data
      .filter(file => file.name.endsWith('.json'))
      .map(file => ({
        name: file.name,
        size: file.size,
        downloadUrl: file.download_url,
        createdAt: file.name.match(/(\d+)\.json$/)?.[1] 
          ? new Date(parseInt(file.name.match(/(\d+)\.json$/)[1])).toISOString()
          : null
      }));
    
    res.json(backups);
  } catch (error) {
    console.error('Error listing GitHub backups:', error);
    res.status(500).json({ error: 'Failed to list GitHub backups' });
  }
});

// 獲取 Google Drive 備份列表
router.get('/googledrive/list', async (req, res) => {
  try {
    const response = await drive.files.list({
      q: "name contains 'n8n-backup' and mimeType='application/json'",
      fields: 'files(id, name, size, createdTime, modifiedTime)'
    });
    
    const backups = response.data.files.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size,
      createdAt: file.createdTime,
      modifiedAt: file.modifiedTime
    }));
    
    res.json(backups);
  } catch (error) {
    console.error('Error listing Google Drive backups:', error);
    res.status(500).json({ error: 'Failed to list Google Drive backups' });
  }
});

// 輔助函數：準備備份數據
async function prepareBackupData(workflows, credentials, selectedItems, sourceEnvironment = 'default') {
  const backupData = {
    timestamp: new Date().toISOString(),
    version: '1.0',
    sourceEnvironment: sourceEnvironment,
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
  
  return backupData;
}

// 輔助函數：加密敏感數據
function encryptSensitiveData(data) {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  
  // 加密 credentials 中的敏感數據
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

module.exports = router;