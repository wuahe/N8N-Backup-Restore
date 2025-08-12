const axios = require('axios');

// 測試 GitHub 備份功能
async function testGitHubBackup() {
    try {
        console.log('🔍 測試 GitHub 備份功能...');
        
        // 1. 登入
        const loginResponse = await axios.post('http://localhost:3004/api/auth/login', {
            username: 'albouwu@gmail.com',
            password: 'FI@600828'
        });
        
        const authToken = loginResponse.data.token;
        console.log('✅ 登入成功');
        
        // 2. 獲取 N8N 數據
        console.log('\n2. 獲取 N8N 數據...');
        const n8nDataResponse = await axios.get('http://localhost:3004/api/n8n/data', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        console.log('N8N 數據:', {
            workflows: n8nDataResponse.data.workflows?.length || 0,
            credentials: n8nDataResponse.data.credentials?.length || 0
        });
        
        if (n8nDataResponse.data.workflows && n8nDataResponse.data.workflows.length > 0) {
            // 3. 測試 GitHub 備份
            console.log('\n3. 測試 GitHub 備份...');
            const backupData = {
                workflows: n8nDataResponse.data.workflows,
                credentials: n8nDataResponse.data.credentials,
                selectedItems: {
                    workflows: [n8nDataResponse.data.workflows[0].id], // 只選擇第一個工作流
                    credentials: n8nDataResponse.data.credentials?.length > 0 ? [n8nDataResponse.data.credentials[0].id] : []
                },
                backupName: 'github-test-backup',
                sourceEnvironment: 'default'
            };
            
            console.log('GitHub 備份請求數據:', {
                workflowsCount: backupData.workflows.length,
                credentialsCount: backupData.credentials?.length || 0,
                selectedWorkflows: backupData.selectedItems.workflows.length,
                selectedCredentials: backupData.selectedItems.credentials.length
            });
            
            const backupResponse = await axios.post('http://localhost:3004/api/backup/github', backupData, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('GitHub 備份結果:', backupResponse.data);
            
            if (backupResponse.data.success) {
                console.log('✅ GitHub 備份測試成功');
                console.log(`📁 文件名: ${backupResponse.data.fileName}`);
                console.log(`🔗 URL: ${backupResponse.data.url}`);
                
                // 4. 驗證備份文件是否可以列出
                console.log('\n4. 驗證 GitHub 備份列表...');
                const listResponse = await axios.get('http://localhost:3004/api/backup/github/list', {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                
                console.log(`📋 GitHub 備份列表: ${listResponse.data.length} 個文件`);
                const newBackup = listResponse.data.find(backup => backup.name === backupResponse.data.fileName);
                if (newBackup) {
                    console.log('✅ 新備份文件已出現在 GitHub 列表中');
                } else {
                    console.log('⚠️  新備份文件未在 GitHub 列表中找到');
                }
                
            } else {
                console.log('❌ GitHub 備份測試失敗:', backupResponse.data.error);
            }
        } else {
            console.log('⚠️  沒有找到工作流數據');
        }
        
    } catch (error) {
        console.error('❌ 測試過程中發生錯誤:');
        if (error.response) {
            console.error('狀態碼:', error.response.status);
            console.error('錯誤信息:', JSON.stringify(error.response.data, null, 2));
            
            // 如果是 GitHub API 錯誤，提供更詳細的信息
            if (error.response.status === 401) {
                console.error('🔑 GitHub 認證失敗 - 請檢查 GITHUB_TOKEN');
            } else if (error.response.status === 404) {
                console.error('📁 GitHub 儲存庫不存在 - 請檢查 GITHUB_REPO_OWNER 和 GITHUB_REPO_NAME');
            }
        } else {
            console.error('錯誤詳情:', error.message);
        }
    }
}

// 執行測試
testGitHubBackup();