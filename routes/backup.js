const express = require('express');
const archiver = require('archiver');
const { Octokit } = require('@octokit/rest');
const { google } = require('googleapis');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');
const router = express.Router();

const execAsync = promisify(exec);

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

// 確保備份文件夾存在
async function ensureBackupFolder() {
  try {
    // 如果環境變數中指定了備份文件夾 ID，直接使用
    const specifiedFolderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
    if (specifiedFolderId) {
      // 驗證文件夾是否存在且可訪問
      try {
        await drive.files.get({
          fileId: specifiedFolderId,
          fields: 'id, name'
        });
        console.log(`Using specified backup folder ID: ${specifiedFolderId}`);
        return specifiedFolderId;
      } catch (error) {
        console.error(`Specified folder ID ${specifiedFolderId} is not accessible:`, error.message);
        // 繼續執行下面的邏輯，嘗試創建新文件夾
      }
    }
    
    const folderName = 'N8N-Backups';
    
    // 搜索是否已存在備份文件夾
    const searchResponse = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)'
    });
    
    if (searchResponse.data.files.length > 0) {
      // 文件夾已存在，返回 ID
      return searchResponse.data.files[0].id;
    }
    
    // 文件夾不存在，創建新文件夾
    const createResponse = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id'
    });
    
    console.log(`Created backup folder: ${folderName} (ID: ${createResponse.data.id})`);
    return createResponse.data.id;
    
  } catch (error) {
    console.error('Error ensuring backup folder:', error);
    // 如果創建文件夾失敗，返回 null，文件將上傳到根目錄
    return null;
  }
}

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
    
    // 確保備份文件夾存在
    let folderId = await ensureBackupFolder();
    
    // 上傳到 Google Drive
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: folderId ? [folderId] : undefined // 如果有文件夾 ID 則使用，否則上傳到根目錄
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
    // 獲取備份文件夾 ID
    const folderId = await ensureBackupFolder();
    
    // 構建搜索查詢 - 搜索所有 JSON 備份文件
    let query = "(name contains 'backup' or name contains 'n8n-backup') and mimeType='application/json'";
    if (folderId) {
      query += ` and '${folderId}' in parents`;
    }
    
    const response = await drive.files.list({
      q: query,
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
  
  // 確保 workflows 和 credentials 是數組
  const workflowsArray = Array.isArray(workflows) ? workflows : [];
  const credentialsArray = Array.isArray(credentials) ? credentials : [];
  
  console.log('Preparing backup data:', {
    inputWorkflows: workflowsArray.length,
    inputCredentials: credentialsArray.length,
    selectedWorkflows: selectedItems.workflows?.length || 0,
    selectedCredentials: selectedItems.credentials?.length || 0
  });
  
  // 處理選中的 workflows
  if (selectedItems.workflows && Array.isArray(selectedItems.workflows)) {
    for (const workflowId of selectedItems.workflows) {
      const workflow = workflowsArray.find(w => w.id === workflowId);
      if (workflow) {
        backupData.workflows.push(workflow);
        
        // 自動包含相關的 credentials（使用 relatedCredentialIds）
        if (workflow.relatedCredentialIds && Array.isArray(workflow.relatedCredentialIds)) {
          workflow.relatedCredentialIds.forEach(credId => {
            const credential = credentialsArray.find(c => c.id === credId);
            if (credential && !backupData.credentials.find(c => c.id === credId)) {
              backupData.credentials.push(credential);
            }
          });
        }
      } else {
        console.warn(`Workflow with ID ${workflowId} not found`);
      }
    }
  }
  
  // 處理額外選中的 credentials
  if (selectedItems.credentials && Array.isArray(selectedItems.credentials)) {
    for (const credentialId of selectedItems.credentials) {
      const credential = credentialsArray.find(c => c.id === credentialId);
      if (credential && !backupData.credentials.find(c => c.id === credentialId)) {
        backupData.credentials.push(credential);
      } else if (!credential) {
        console.warn(`Credential with ID ${credentialId} not found`);
      }
    }
  }
  
  // 調試：記錄備份數據統計
  console.log('Backup data prepared:', {
    workflowsCount: backupData.workflows.length,
    credentialsCount: backupData.credentials.length,
    selectedWorkflows: selectedItems.workflows?.length || 0,
    selectedCredentials: selectedItems.credentials?.length || 0
  });
  
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

// 使用 N8N CLI 進行完整備份（包含憑證數據）
router.post('/cli-export', async (req, res) => {
  try {
    const { backupName, destination, includeCredentials } = req.body;
    
    console.log('Starting CLI export with credentials...');
    
    // 使用 N8N CLI 導出
    const exportCommand = includeCredentials 
      ? 'npx n8n export:workflow --all --decrypted --pretty'
      : 'npx n8n export:workflow --all --pretty';
    
    const { stdout, stderr } = await execAsync(exportCommand);
    
    if (stderr) {
      console.warn('CLI export warning:', stderr);
    }
    
    // 解析導出的數據
    const exportData = JSON.parse(stdout);
    
    // 轉換為我們的備份格式
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      sourceEnvironment: 'default',
      workflows: exportData,
      credentials: [], // CLI 導出的憑證數據已經包含在工作流中
      exportMethod: 'cli',
      includesCredentialData: includeCredentials
    };
    
    // 如果需要，加密敏感數據
    const finalData = includeCredentials ? encryptSensitiveData(backupData) : backupData;
    
    // 創建備份文件
    const backupContent = JSON.stringify(finalData, null, 2);
    const fileName = `${backupName || 'cli-backup'}-${Date.now()}.json`;
    
    if (destination === 'googledrive') {
      // 上傳到 Google Drive
      let folderId = await ensureBackupFolder();
      
      const response = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: folderId ? [folderId] : undefined
        },
        media: {
          mimeType: 'application/json',
          body: backupContent
        }
      });
      
      res.json({
        success: true,
        message: 'CLI backup uploaded to Google Drive successfully',
        fileName,
        fileId: response.data.id,
        includesCredentialData: includeCredentials,
        workflowCount: exportData.length
      });
      
    } else if (destination === 'github') {
      // 上傳到 GitHub
      const response = await octokit.repos.createOrUpdateFileContents({
        owner: process.env.GITHUB_REPO_OWNER,
        repo: process.env.GITHUB_REPO_NAME,
        path: `backups/${fileName}`,
        message: `N8N CLI Backup: ${backupName || 'Automated backup'}`,
        content: Buffer.from(backupContent).toString('base64')
      });
      
      res.json({
        success: true,
        message: 'CLI backup uploaded to GitHub successfully',
        fileName,
        url: response.data.content.html_url,
        includesCredentialData: includeCredentials,
        workflowCount: exportData.length
      });
      
    } else {
      res.status(400).json({ error: 'Invalid destination' });
    }
    
  } catch (error) {
    console.error('CLI backup error:', error);
    res.status(500).json({ 
      error: 'Failed to perform CLI backup',
      details: error.message 
    });
  }
});

module.exports = router;