// 全局變量
let currentUser = null;
let authToken = null;
let workflows = [];
let credentials = [];
let selectedBackup = null;

// DOM 元素 - 延遲獲取，確保 DOM 已載入
let loginPage, mainPage, loginForm, logoutBtn, currentUserSpan, loadingOverlay, loadingText;

// 初始化應用
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 載入完成，開始初始化...');
    
    // 獲取 DOM 元素
    loginPage = document.getElementById('loginPage');
    mainPage = document.getElementById('mainPage');
    loginForm = document.getElementById('loginForm');
    logoutBtn = document.getElementById('logoutBtn');
    currentUserSpan = document.getElementById('currentUser');
    loadingOverlay = document.getElementById('loadingOverlay');
    loadingText = document.getElementById('loadingText');
    
    console.log('DOM 元素獲取結果:', {
        loginPage: !!loginPage,
        mainPage: !!mainPage,
        loginForm: !!loginForm,
        logoutBtn: !!logoutBtn,
        currentUserSpan: !!currentUserSpan
    });
    
    initializeApp();
    setupEventListeners();
});

// 初始化應用
function initializeApp() {
    // 檢查 URL 參數是否包含登入信息
    const urlParams = new URLSearchParams(window.location.search);
    const urlUsername = urlParams.get('username');
    const urlPassword = urlParams.get('password');
    
    if (urlUsername && urlPassword) {
        // 嘗試使用 URL 參數自動登入
        autoLoginWithParams(urlUsername, urlPassword);
        return;
    }
    
    // 檢查是否有保存的 token
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        
        // 驗證 token 是否仍然有效
        verifyTokenAndShowPage();
    } else {
        showLoginPage();
    }
}

// 驗證 token 並顯示頁面
async function verifyTokenAndShowPage() {
    try {
        console.log('開始驗證 token:', authToken ? authToken.substring(0, 50) + '...' : 'null');
        
        const response = await fetch('/api/auth/verify', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        console.log('驗證響應狀態:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('驗證結果:', result);
            
            if (result.success) {
                // Token 有效，顯示主頁面
                console.log('Token 驗證成功，顯示主頁面');
                showMainPage();
                loadInitialData();
                return;
            }
        }
        
        // Token 無效，清除並顯示登入頁面
        console.log('Token 驗證失敗，清除登入數據');
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        authToken = null;
        currentUser = null;
        showLoginPage();
        
    } catch (error) {
        console.error('Token verification error:', error);
        // 網路錯誤時，直接顯示主頁面（假設 token 有效）
        console.log('網路錯誤，直接顯示主頁面');
        showMainPage();
        loadInitialData();
    }
}

// URL 參數自動登入
async function autoLoginWithParams(username, password) {
    try {
        showLoading('自動登入中...');
        
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            authToken = result.token;
            currentUser = result.user;
            
            // 保存到 localStorage
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // 清除 URL 參數
            window.history.replaceState({}, document.title, window.location.pathname);
            
            showMainPage();
            loadInitialData();
            showNotification('自動登入成功', 'success');
        } else {
            showNotification('自動登入失敗: ' + (result.error || '未知錯誤'), 'error');
            showLoginPage();
        }
    } catch (error) {
        console.error('Auto login error:', error);
        showNotification('自動登入失敗，請手動登入', 'error');
        showLoginPage();
    } finally {
        hideLoading();
    }
}

// 設置事件監聽器
function setupEventListeners() {
    // 登入表單
    loginForm.addEventListener('submit', handleLogin);
    
    // 登出按鈕
    logoutBtn.addEventListener('click', handleLogout);
    
    // 標籤頁切換
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // 重新整理數據按鈕
    document.getElementById('refreshDataBtn').addEventListener('click', loadInitialData);
    document.getElementById('refreshBackupsBtn').addEventListener('click', loadBackupsList);
    
    // N8N 環境選擇
    document.getElementById('backupN8nSource').addEventListener('change', handleBackupN8nSourceChange);
    document.getElementById('restoreN8nTarget').addEventListener('change', handleRestoreN8nTargetChange);
    
    // 全選/取消全選按鈕
    document.getElementById('selectAllWorkflows').addEventListener('click', () => selectAllItems('workflows', true));
    document.getElementById('deselectAllWorkflows').addEventListener('click', () => selectAllItems('workflows', false));
    document.getElementById('selectAllCredentials').addEventListener('click', () => selectAllItems('credentials', true));
    document.getElementById('deselectAllCredentials').addEventListener('click', () => selectAllItems('credentials', false));
    
    // 備份按鈕
    document.getElementById('startBackupBtn').addEventListener('click', handleBackup);
    
    // 還原相關
    document.getElementById('restoreSource').addEventListener('change', loadBackupsList);
    document.getElementById('startRestoreBtn').addEventListener('click', handleRestore);
    
    // 跨環境相關
    document.getElementById('refreshEnvironmentsBtn').addEventListener('click', loadEnvironments);
    document.getElementById('sourceEnvironment').addEventListener('change', handleSourceEnvironmentChange);
    document.getElementById('targetEnvironment').addEventListener('change', handleTargetEnvironmentChange);
    document.getElementById('loadSourceDataBtn').addEventListener('click', loadSourceEnvironmentData);
    document.getElementById('startCrossEnvOperationBtn').addEventListener('click', handleCrossEnvOperation);
    
    // 操作模式變更
    document.querySelectorAll('input[name="operationMode"]').forEach(radio => {
        radio.addEventListener('change', handleOperationModeChange);
    });
}

// 顯示登入頁面
function showLoginPage() {
    console.log('顯示登入頁面');
    if (loginPage) loginPage.classList.remove('hidden');
    if (mainPage) mainPage.classList.add('hidden');
}

// 顯示主頁面
function showMainPage() {
    console.log('顯示主頁面');
    if (loginPage) loginPage.classList.add('hidden');
    if (mainPage) mainPage.classList.remove('hidden');
    if (currentUserSpan && currentUser) {
        currentUserSpan.textContent = currentUser.username;
    }
}

// 處理登入
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(loginForm);
    const loginData = {
        username: String(formData.get('username') || '').trim(),
        password: String(formData.get('password') || '').trim()
    };
    
    try {
        showLoading('登入中...');
        
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            authToken = result.token;
            currentUser = result.user;
            
            // 保存到 localStorage
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showMainPage();
            loadInitialData();
            showNotification('登入成功', 'success');
        } else {
            showNotification(result.error || '登入失敗', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('登入失敗，請檢查網路連接', 'error');
    } finally {
        hideLoading();
    }
}

// 處理登出
function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    showLoginPage();
    showNotification('已登出', 'info');
}

// 切換標籤頁
function switchTab(tabName) {
    // 更新菜單項狀態
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // 更新內容區域
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // 根據標籤頁載入相應數據
    if (tabName === 'restore') {
        loadBackupsList();
    } else if (tabName === 'history') {
        loadHistoryList();
    } else if (tabName === 'cross-env') {
        loadEnvironments();
    }
}

// 處理備份 N8N 來源環境變更
async function handleBackupN8nSourceChange() {
    const sourceEnv = document.getElementById('backupN8nSource').value;
    const statusElement = document.getElementById('backupN8nStatus');
    
    // 測試連接並載入數據
    await testN8nConnection(sourceEnv, statusElement);
    
    // 如果連接成功，重新載入數據
    if (statusElement.classList.contains('connected')) {
        loadInitialData();
    }
}

// 處理還原 N8N 目標環境變更
async function handleRestoreN8nTargetChange() {
    const targetEnv = document.getElementById('restoreN8nTarget').value;
    const statusElement = document.getElementById('restoreN8nStatus');
    
    // 測試連接
    await testN8nConnection(targetEnv, statusElement);
}

// 測試 N8N 環境連接
async function testN8nConnection(envId, statusElement) {
    if (!statusElement) return;
    
    statusElement.textContent = '測試連接中...';
    statusElement.className = 'env-status testing';
    
    try {
        const response = await fetch('/api/n8n/test-connection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ environmentId: envId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            statusElement.textContent = `✅ 已連接 (${result.workflowCount || 0} 個 workflows)`;
            statusElement.className = 'env-status connected';
        } else {
            statusElement.textContent = `❌ 連接失敗: ${result.error}`;
            statusElement.className = 'env-status failed';
        }
    } catch (error) {
        statusElement.textContent = `❌ 連接錯誤: ${error.message}`;
        statusElement.className = 'env-status failed';
    }
}

// 載入初始數據
async function loadInitialData() {
    try {
        showLoading('載入數據中...');
        
        // 獲取當前選擇的 N8N 環境
        const backupSourceSelect = document.getElementById('backupN8nSource');
        const selectedEnv = backupSourceSelect ? backupSourceSelect.value : 'default';
        
        // 並行載入 workflows 和 credentials
        const [workflowsResponse, credentialsResponse] = await Promise.all([
            fetch(`/api/n8n/workflows?env=${selectedEnv}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }),
            fetch(`/api/n8n/credentials?env=${selectedEnv}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            })
        ]);
        
        workflows = await workflowsResponse.json();
        credentials = await credentialsResponse.json();
        
        renderWorkflowsList();
        renderCredentialsList();
        
        showNotification('數據載入完成', 'success');
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('載入數據失敗', 'error');
    } finally {
        hideLoading();
    }
}

// 渲染 workflows 列表
function renderWorkflowsList() {
    const container = document.getElementById('workflowsList');
    const countElement = document.getElementById('workflowCount');
    
    countElement.textContent = workflows.length;
    
    container.innerHTML = workflows.map(workflow => `
        <div class="item-checkbox">
            <input type="checkbox" id="workflow-${workflow.id}" value="${workflow.id}" data-type="workflow" 
                   data-related-credentials="${(workflow.relatedCredentialIds || []).join(',')}"
                   onchange="handleWorkflowSelection(this)">
            <div class="item-info">
                <div class="item-name">${workflow.name}</div>
                <div class="item-details">
                    <span class="item-status ${workflow.active ? 'status-active' : 'status-inactive'}">
                        <i class="fas ${workflow.active ? 'fa-play' : 'fa-pause'}"></i>
                        ${workflow.active ? '啟用' : '停用'}
                    </span>
                    ${workflow.tags ? workflow.tags.map(tag => `<span class="item-tag">${tag}</span>`).join('') : ''}
                    <span>相關憑證: ${workflow.relatedCredentials ? workflow.relatedCredentials.length : 0}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// 渲染 credentials 列表
function renderCredentialsList() {
    const container = document.getElementById('credentialsList');
    const countElement = document.getElementById('credentialCount');
    
    countElement.textContent = credentials.length;
    
    container.innerHTML = credentials.map(credential => `
        <div class="item-checkbox">
            <input type="checkbox" id="credential-${credential.id}" value="${credential.id}" data-type="credential">
            <div class="item-info">
                <div class="item-name">${credential.name}</div>
                <div class="item-details">
                    <span>類型: ${credential.type}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// 全選/取消全選項目
function selectAllItems(type, select) {
    const checkboxes = document.querySelectorAll(`input[data-type="${type === 'workflows' ? 'workflow' : 'credential'}"]`);
    checkboxes.forEach(checkbox => {
        checkbox.checked = select;
        // 如果是 workflow，觸發智能關聯
        if (type === 'workflows') {
            handleWorkflowSelection(checkbox);
        }
    });
}

// 處理 workflow 選擇的智能關聯功能
function handleWorkflowSelection(workflowCheckbox) {
    const isChecked = workflowCheckbox.checked;
    const relatedCredentialIds = workflowCheckbox.dataset.relatedCredentials;
    
    if (relatedCredentialIds) {
        const credentialIds = relatedCredentialIds.split(',').filter(id => id.trim());
        
        credentialIds.forEach(credentialId => {
            const credentialCheckbox = document.getElementById(`credential-${credentialId}`);
            if (credentialCheckbox) {
                if (isChecked) {
                    // 勾選 workflow 時，自動勾選相關的 credentials
                    credentialCheckbox.checked = true;
                    // 添加視覺提示
                    credentialCheckbox.parentElement.classList.add('auto-selected');
                } else {
                    // 取消勾選 workflow 時，檢查是否還有其他 workflow 使用這個 credential
                    const stillNeeded = isCredentialStillNeeded(credentialId);
                    if (!stillNeeded) {
                        credentialCheckbox.checked = false;
                        credentialCheckbox.parentElement.classList.remove('auto-selected');
                    }
                }
            }
        });
    }
}

// 檢查 credential 是否還被其他已選中的 workflow 需要
function isCredentialStillNeeded(credentialId) {
    const selectedWorkflows = document.querySelectorAll('input[data-type="workflow"]:checked');
    
    for (const workflowCheckbox of selectedWorkflows) {
        const relatedCredentialIds = workflowCheckbox.dataset.relatedCredentials;
        if (relatedCredentialIds && relatedCredentialIds.split(',').includes(credentialId)) {
            return true;
        }
    }
    
    return false;
}

// 處理備份
async function handleBackup() {
    const backupName = document.getElementById('backupName').value;
    const destination = document.getElementById('backupDestination').value;
    const sourceEnv = document.getElementById('backupN8nSource').value;
    
    // 獲取選中的項目
    const selectedWorkflows = Array.from(document.querySelectorAll('input[data-type="workflow"]:checked'))
        .map(cb => cb.value);
    const selectedCredentials = Array.from(document.querySelectorAll('input[data-type="credential"]:checked'))
        .map(cb => cb.value);
    
    if (selectedWorkflows.length === 0 && selectedCredentials.length === 0) {
        showNotification('請至少選擇一個項目進行備份', 'warning');
        return;
    }
    
    try {
        showLoading('正在備份...');
        
        const backupData = {
            workflows,
            credentials,
            selectedItems: {
                workflows: selectedWorkflows,
                credentials: selectedCredentials
            },
            backupName: backupName || `backup-${new Date().toISOString().split('T')[0]}`,
            sourceEnvironment: sourceEnv
        };
        
        const response = await fetch(`/api/backup/${destination}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(backupData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`備份成功上傳到 ${destination.toUpperCase()}`, 'success');
            // 清空表單
            document.getElementById('backupName').value = '';
            selectAllItems('workflows', false);
            selectAllItems('credentials', false);
        } else {
            showNotification(result.error || '備份失敗', 'error');
        }
    } catch (error) {
        console.error('Backup error:', error);
        showNotification('備份失敗，請檢查網路連接', 'error');
    } finally {
        hideLoading();
    }
}

// 載入備份列表
async function loadBackupsList() {
    const source = document.getElementById('restoreSource').value;
    
    try {
        showLoading('載入備份列表...');
        
        const response = await fetch(`/api/backup/${source}/list`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const backups = await response.json();
        renderBackupsList(backups, source);
        
    } catch (error) {
        console.error('Error loading backups:', error);
        showNotification('載入備份列表失敗', 'error');
    } finally {
        hideLoading();
    }
}

// 渲染備份列表
function renderBackupsList(backups, source) {
    const container = document.getElementById('availableBackups');
    
    if (backups.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">沒有找到備份文件</p>';
        return;
    }
    
    container.innerHTML = backups.map(backup => `
        <div class="backup-item" data-backup-id="${backup.id || backup.name}" data-source="${source}">
            <div class="backup-info">
                <div class="backup-name">${backup.name}</div>
                <div class="backup-meta">
                    <span><i class="fas fa-calendar"></i> ${formatDate(backup.createdAt || backup.createdTime)}</span>
                    <span><i class="fas fa-hdd"></i> ${formatFileSize(backup.size)}</span>
                </div>
            </div>
            <div class="backup-actions">
                <button class="btn btn-sm btn-outline" onclick="previewBackup('${backup.id || backup.name}', '${source}')">
                    <i class="fas fa-eye"></i> 預覽
                </button>
                <button class="btn btn-sm btn-primary" onclick="selectBackup('${backup.id || backup.name}', '${source}')">
                    <i class="fas fa-check"></i> 選擇
                </button>
            </div>
        </div>
    `).join('');
}

// 預覽備份
async function previewBackup(backupId, source) {
    try {
        showLoading('載入備份預覽...');
        
        const response = await fetch(`/api/restore/${source}/preview/${backupId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const preview = await response.json();
        
        // 顯示預覽對話框（這裡簡化處理）
        const message = `
備份時間: ${formatDate(preview.timestamp)}
Workflows: ${preview.workflows.length} 個
Credentials: ${preview.credentials.length} 個

Workflows:
${preview.workflows.map(w => `- ${w.name} (${w.active ? '啟用' : '停用'})`).join('\n')}

Credentials:
${preview.credentials.map(c => `- ${c.name} (${c.type})`).join('\n')}
        `;
        
        alert(message);
        
    } catch (error) {
        console.error('Error previewing backup:', error);
        showNotification('載入預覽失敗', 'error');
    } finally {
        hideLoading();
    }
}

// 選擇備份
async function selectBackup(backupId, source) {
    // 更新選中狀態
    document.querySelectorAll('.backup-item').forEach(item => {
        item.classList.remove('selected');
    });
    document.querySelector(`[data-backup-id="${backupId}"]`).classList.add('selected');
    
    selectedBackup = { id: backupId, source };
    
    // 載入備份內容用於選擇還原項目
    try {
        showLoading('載入備份內容...');
        
        const response = await fetch(`/api/restore/${source}/preview/${backupId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const preview = await response.json();
        renderRestoreItemsSelection(preview);
        
        document.getElementById('restoreOptions').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading backup content:', error);
        showNotification('載入備份內容失敗', 'error');
    } finally {
        hideLoading();
    }
}

// 渲染還原項目選擇
function renderRestoreItemsSelection(preview) {
    const container = document.getElementById('restoreItemsSelection');
    
    container.innerHTML = `
        <div class="selection-section">
            <div class="section-header">
                <h3>
                    <i class="fas fa-project-diagram"></i>
                    Workflows
                    <span class="item-count">${preview.workflows.length}</span>
                </h3>
                <div class="selection-controls">
                    <button class="btn btn-sm" onclick="selectAllRestoreItems('workflows', true)">全選</button>
                    <button class="btn btn-sm" onclick="selectAllRestoreItems('workflows', false)">取消全選</button>
                </div>
            </div>
            <div class="items-list">
                ${preview.workflows.map(workflow => `
                    <div class="item-checkbox">
                        <input type="checkbox" id="restore-workflow-${workflow.id}" value="${workflow.id}" data-type="restore-workflow" checked>
                        <div class="item-info">
                            <div class="item-name">${workflow.name}</div>
                            <div class="item-details">
                                <span class="item-status ${workflow.active ? 'status-active' : 'status-inactive'}">
                                    <i class="fas ${workflow.active ? 'fa-play' : 'fa-pause'}"></i>
                                    ${workflow.active ? '啟用' : '停用'}
                                </span>
                                ${workflow.tags ? workflow.tags.map(tag => `<span class="item-tag">${tag}</span>`).join('') : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="selection-section">
            <div class="section-header">
                <h3>
                    <i class="fas fa-key"></i>
                    Credentials
                    <span class="item-count">${preview.credentials.length}</span>
                </h3>
                <div class="selection-controls">
                    <button class="btn btn-sm" onclick="selectAllRestoreItems('credentials', true)">全選</button>
                    <button class="btn btn-sm" onclick="selectAllRestoreItems('credentials', false)">取消全選</button>
                </div>
            </div>
            <div class="items-list">
                ${preview.credentials.map(credential => `
                    <div class="item-checkbox">
                        <input type="checkbox" id="restore-credential-${credential.id}" value="${credential.id}" data-type="restore-credential" checked>
                        <div class="item-info">
                            <div class="item-name">${credential.name}</div>
                            <div class="item-details">
                                <span>類型: ${credential.type}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// 全選/取消全選還原項目
function selectAllRestoreItems(type, select) {
    const checkboxes = document.querySelectorAll(`input[data-type="restore-${type === 'workflows' ? 'workflow' : 'credential'}"]`);
    checkboxes.forEach(checkbox => {
        checkbox.checked = select;
    });
}

// 處理還原
async function handleRestore() {
    if (!selectedBackup) {
        showNotification('請先選擇要還原的備份', 'warning');
        return;
    }
    
    const restoreMode = document.getElementById('restoreMode').value;
    const targetEnv = document.getElementById('restoreN8nTarget').value;
    
    // 獲取選中的項目
    const selectedWorkflows = Array.from(document.querySelectorAll('input[data-type="restore-workflow"]:checked'))
        .map(cb => cb.value);
    const selectedCredentials = Array.from(document.querySelectorAll('input[data-type="restore-credential"]:checked'))
        .map(cb => cb.value);
    
    if (selectedWorkflows.length === 0 && selectedCredentials.length === 0) {
        showNotification('請至少選擇一個項目進行還原', 'warning');
        return;
    }
    
    try {
        showLoading('正在還原...');
        
        const restoreData = {
            [selectedBackup.source === 'github' ? 'fileName' : 'fileId']: selectedBackup.id,
            selectedItems: {
                workflows: selectedWorkflows,
                credentials: selectedCredentials
            },
            restoreMode,
            targetEnvironment: targetEnv
        };
        
        const response = await fetch(`/api/restore/${selectedBackup.source}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(restoreData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('還原完成', 'success');
            
            // 顯示詳細結果
            const summary = `
還原結果:
Workflows - 成功: ${result.result.workflows.success.length}, 失敗: ${result.result.workflows.failed.length}
Credentials - 成功: ${result.result.credentials.success.length}, 失敗: ${result.result.credentials.failed.length}
            `;
            
            console.log('Restore result:', result.result);
            
            // 重新載入數據
            loadInitialData();
        } else {
            showNotification(result.error || '還原失敗', 'error');
        }
    } catch (error) {
        console.error('Restore error:', error);
        showNotification('還原失敗，請檢查網路連接', 'error');
    } finally {
        hideLoading();
    }
}

// 載入歷史記錄
async function loadHistoryList() {
    const source = document.getElementById('historySource').value;
    
    try {
        showLoading('載入歷史記錄...');
        
        let allBackups = [];
        
        if (source === 'all' || source === 'github') {
            const githubResponse = await fetch('/api/backup/github/list', {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const githubBackups = await githubResponse.json();
            allBackups = allBackups.concat(githubBackups.map(b => ({ ...b, source: 'github' })));
        }
        
        if (source === 'all' || source === 'googledrive') {
            const driveResponse = await fetch('/api/backup/googledrive/list', {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const driveBackups = await driveResponse.json();
            allBackups = allBackups.concat(driveBackups.map(b => ({ ...b, source: 'googledrive' })));
        }
        
        renderHistoryList(allBackups);
        
    } catch (error) {
        console.error('Error loading history:', error);
        showNotification('載入歷史記錄失敗', 'error');
    } finally {
        hideLoading();
    }
}

// 渲染歷史記錄列表
function renderHistoryList(backups) {
    const container = document.getElementById('historyList');
    
    if (backups.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">沒有找到歷史記錄</p>';
        return;
    }
    
    // 按時間排序
    backups.sort((a, b) => new Date(b.createdAt || b.createdTime) - new Date(a.createdAt || a.createdTime));
    
    container.innerHTML = backups.map(backup => `
        <div class="history-item">
            <div class="history-info">
                <div class="history-name">${backup.name}</div>
                <div class="history-meta">
                    <span><i class="fas fa-calendar"></i> ${formatDate(backup.createdAt || backup.createdTime)}</span>
                    <span><i class="fas fa-hdd"></i> ${formatFileSize(backup.size)}</span>
                    <span><i class="fas fa-cloud"></i> ${backup.source.toUpperCase()}</span>
                </div>
            </div>
            <div class="backup-actions">
                <button class="btn btn-sm btn-outline" onclick="previewBackup('${backup.id || backup.name}', '${backup.source}')">
                    <i class="fas fa-eye"></i> 預覽
                </button>
            </div>
        </div>
    `).join('');
}

// 工具函數
function showLoading(text = '載入中...') {
    if (loadingText) loadingText.textContent = text;
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.getElementById('notifications').appendChild(notification);
    
    // 3秒後自動移除
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function formatDate(dateString) {
    if (!dateString) return '未知';
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW');
}

function formatFileSize(bytes) {
    if (!bytes) return '未知';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}
// 跨環境功能
let availableEnvironments = [];
let sourceEnvData = { workflows: [], credentials: [] };

// 載入可用環境
async function loadEnvironments() {
    try {
        showLoading('載入環境列表...');
        
        const response = await fetch('/api/cross-env/environments', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        availableEnvironments = await response.json();
        
        // 更新環境選擇下拉選單
        const sourceSelect = document.getElementById('sourceEnvironment');
        const targetSelect = document.getElementById('targetEnvironment');
        
        sourceSelect.innerHTML = '<option value="">選擇來源環境...</option>';
        targetSelect.innerHTML = '<option value="">選擇目標環境...</option>';
        
        availableEnvironments.forEach(env => {
            const sourceOption = new Option(env.name, env.id);
            const targetOption = new Option(env.name, env.id);
            sourceSelect.add(sourceOption);
            targetSelect.add(targetOption);
        });
        
        showNotification(`載入了 ${availableEnvironments.length} 個環境`, 'success');
    } catch (error) {
        console.error('Error loading environments:', error);
        showNotification('載入環境失敗', 'error');
    } finally {
        hideLoading();
    }
}

// 處理來源環境變更
async function handleSourceEnvironmentChange() {
    const sourceEnvId = document.getElementById('sourceEnvironment').value;
    const statusElement = document.getElementById('sourceEnvStatus');
    
    if (!sourceEnvId) {
        statusElement.textContent = '';
        statusElement.className = 'env-status';
        return;
    }
    
    // 測試連接
    statusElement.textContent = '測試連接中...';
    statusElement.className = 'env-status testing';
    
    try {
        const response = await fetch('/api/cross-env/test-connection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ environmentId: sourceEnvId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            statusElement.textContent = `✅ 已連接 (${result.workflowCount} 個 workflows)`;
            statusElement.className = 'env-status connected';
        } else {
            statusElement.textContent = `❌ 連接失敗: ${result.error}`;
            statusElement.className = 'env-status failed';
        }
    } catch (error) {
        statusElement.textContent = `❌ 連接錯誤: ${error.message}`;
        statusElement.className = 'env-status failed';
    }
}

// 處理目標環境變更
async function handleTargetEnvironmentChange() {
    const targetEnvId = document.getElementById('targetEnvironment').value;
    const statusElement = document.getElementById('targetEnvStatus');
    
    if (!targetEnvId) {
        statusElement.textContent = '';
        statusElement.className = 'env-status';
        return;
    }
    
    // 測試連接
    statusElement.textContent = '測試連接中...';
    statusElement.className = 'env-status testing';
    
    try {
        const response = await fetch('/api/cross-env/test-connection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ environmentId: targetEnvId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            statusElement.textContent = `✅ 已連接 (${result.workflowCount} 個 workflows)`;
            statusElement.className = 'env-status connected';
        } else {
            statusElement.textContent = `❌ 連接失敗: ${result.error}`;
            statusElement.className = 'env-status failed';
        }
    } catch (error) {
        statusElement.textContent = `❌ 連接錯誤: ${error.message}`;
        statusElement.className = 'env-status failed';
    }
}

// 處理操作模式變更
function handleOperationModeChange() {
    const selectedMode = document.querySelector('input[name="operationMode"]:checked').value;
    const sourceSelect = document.getElementById('sourceEnvironment');
    const targetSelect = document.getElementById('targetEnvironment');
    const loadDataBtn = document.getElementById('loadSourceDataBtn');
    
    // 根據模式調整 UI
    if (selectedMode === 'backup') {
        sourceSelect.disabled = false;
        targetSelect.disabled = true;
        targetSelect.value = '';
        loadDataBtn.textContent = '載入來源數據';
    } else if (selectedMode === 'restore') {
        sourceSelect.disabled = true;
        sourceSelect.value = '';
        targetSelect.disabled = false;
        loadDataBtn.textContent = '載入備份列表';
    } else if (selectedMode === 'migrate') {
        sourceSelect.disabled = false;
        targetSelect.disabled = false;
        loadDataBtn.textContent = '載入來源數據';
    }
}

// 載入來源環境數據
async function loadSourceEnvironmentData() {
    const sourceEnvId = document.getElementById('sourceEnvironment').value;
    const selectedMode = document.querySelector('input[name="operationMode"]:checked').value;
    
    if (!sourceEnvId && selectedMode !== 'restore') {
        showNotification('請先選擇來源環境', 'warning');
        return;
    }
    
    try {
        showLoading('載入數據中...');
        
        if (selectedMode === 'restore') {
            // 載入備份列表
            await loadBackupsList();
        } else {
            // 載入來源環境的 workflows 和 credentials
            const [workflowsResponse, credentialsResponse] = await Promise.all([
                fetch(`/api/cross-env/workflows/${sourceEnvId}`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }),
                fetch(`/api/cross-env/credentials/${sourceEnvId}`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                })
            ]);
            
            sourceEnvData.workflows = await workflowsResponse.json();
            sourceEnvData.credentials = await credentialsResponse.json();
            
            // 渲染項目選擇
            renderCrossEnvItemsSelection();
        }
        
        document.getElementById('startCrossEnvOperationBtn').classList.remove('hidden');
        showNotification('數據載入完成', 'success');
    } catch (error) {
        console.error('Error loading source data:', error);
        showNotification('載入數據失敗', 'error');
    } finally {
        hideLoading();
    }
}

// 渲染跨環境項目選擇
function renderCrossEnvItemsSelection() {
    const container = document.getElementById('crossEnvItemsSelection');
    
    container.innerHTML = `
        <div class="selection-section">
            <div class="section-header">
                <h3>
                    <i class="fas fa-project-diagram"></i>
                    Workflows
                    <span class="item-count">${sourceEnvData.workflows.length}</span>
                </h3>
                <div class="selection-controls">
                    <button class="btn btn-sm" onclick="selectAllCrossEnvItems('workflows', true)">全選</button>
                    <button class="btn btn-sm" onclick="selectAllCrossEnvItems('workflows', false)">取消全選</button>
                </div>
            </div>
            <div class="items-list">
                ${sourceEnvData.workflows.map(workflow => `
                    <div class="item-checkbox">
                        <input type="checkbox" id="crossenv-workflow-${workflow.id}" value="${workflow.id}" 
                               data-type="crossenv-workflow" 
                               data-related-credentials="${(workflow.relatedCredentialIds || []).join(',')}"
                               onchange="handleCrossEnvWorkflowSelection(this)">
                        <div class="item-info">
                            <div class="item-name">${workflow.name}</div>
                            <div class="item-details">
                                <span class="item-status ${workflow.active ? 'status-active' : 'status-inactive'}">
                                    <i class="fas ${workflow.active ? 'fa-play' : 'fa-pause'}"></i>
                                    ${workflow.active ? '啟用' : '停用'}
                                </span>
                                <span>相關憑證: ${workflow.relatedCredentials ? workflow.relatedCredentials.length : 0}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="selection-section">
            <div class="section-header">
                <h3>
                    <i class="fas fa-key"></i>
                    Credentials
                    <span class="item-count">${sourceEnvData.credentials.length}</span>
                </h3>
                <div class="selection-controls">
                    <button class="btn btn-sm" onclick="selectAllCrossEnvItems('credentials', true)">全選</button>
                    <button class="btn btn-sm" onclick="selectAllCrossEnvItems('credentials', false)">取消全選</button>
                </div>
            </div>
            <div class="items-list">
                ${sourceEnvData.credentials.map(credential => `
                    <div class="item-checkbox" id="crossenv-credential-item-${credential.id}">
                        <input type="checkbox" id="crossenv-credential-${credential.id}" value="${credential.id}" data-type="crossenv-credential">
                        <div class="item-info">
                            <div class="item-name">${credential.name}</div>
                            <div class="item-details">
                                <span>類型: ${credential.type}</span>
                                <span>使用次數: ${credential.usedInWorkflows || 0}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    container.classList.remove('hidden');
}

// 全選/取消全選跨環境項目
function selectAllCrossEnvItems(type, select) {
    const checkboxes = document.querySelectorAll(`input[data-type="crossenv-${type === 'workflows' ? 'workflow' : 'credential'}"]`);
    checkboxes.forEach(checkbox => {
        checkbox.checked = select;
        if (type === 'workflows') {
            handleCrossEnvWorkflowSelection(checkbox);
        }
    });
}

// 處理跨環境 workflow 選擇
function handleCrossEnvWorkflowSelection(workflowCheckbox) {
    const isChecked = workflowCheckbox.checked;
    const relatedCredentialIds = workflowCheckbox.dataset.relatedCredentials;
    
    if (relatedCredentialIds) {
        const credentialIds = relatedCredentialIds.split(',').filter(id => id.trim());
        
        credentialIds.forEach(credentialId => {
            const credentialCheckbox = document.getElementById(`crossenv-credential-${credentialId}`);
            const credentialItem = document.getElementById(`crossenv-credential-item-${credentialId}`);
            
            if (credentialCheckbox && credentialItem) {
                if (isChecked) {
                    credentialCheckbox.checked = true;
                    credentialItem.classList.add('auto-selected');
                } else {
                    const stillNeeded = isCrossEnvCredentialStillNeeded(credentialId);
                    if (!stillNeeded) {
                        credentialCheckbox.checked = false;
                        credentialItem.classList.remove('auto-selected');
                    }
                }
            }
        });
    }
}

// 檢查跨環境 credential 是否還被需要
function isCrossEnvCredentialStillNeeded(credentialId) {
    const selectedWorkflows = document.querySelectorAll('input[data-type="crossenv-workflow"]:checked');
    
    for (const workflowCheckbox of selectedWorkflows) {
        const relatedCredentialIds = workflowCheckbox.dataset.relatedCredentials;
        if (relatedCredentialIds && relatedCredentialIds.split(',').includes(credentialId)) {
            return true;
        }
    }
    
    return false;
}

// 處理跨環境操作
async function handleCrossEnvOperation() {
    const selectedMode = document.querySelector('input[name="operationMode"]:checked').value;
    const sourceEnvId = document.getElementById('sourceEnvironment').value;
    const targetEnvId = document.getElementById('targetEnvironment').value;
    const destination = document.getElementById('crossEnvDestination').value;
    
    // 驗證必要參數
    if (selectedMode === 'backup' && !sourceEnvId) {
        showNotification('請選擇來源環境', 'warning');
        return;
    }
    
    if ((selectedMode === 'restore' || selectedMode === 'migrate') && !targetEnvId) {
        showNotification('請選擇目標環境', 'warning');
        return;
    }
    
    // 獲取選中的項目
    const selectedWorkflows = Array.from(document.querySelectorAll('input[data-type="crossenv-workflow"]:checked'))
        .map(cb => cb.value);
    const selectedCredentials = Array.from(document.querySelectorAll('input[data-type="crossenv-credential"]:checked'))
        .map(cb => cb.value);
    
    if (selectedWorkflows.length === 0 && selectedCredentials.length === 0) {
        showNotification('請至少選擇一個項目', 'warning');
        return;
    }
    
    try {
        showLoading('執行跨環境操作中...');
        
        if (selectedMode === 'backup') {
            await performCrossEnvBackup(sourceEnvId, destination, selectedWorkflows, selectedCredentials);
        } else if (selectedMode === 'restore') {
            await performCrossEnvRestore(targetEnvId, selectedWorkflows, selectedCredentials);
        } else if (selectedMode === 'migrate') {
            // 先備份，再還原
            await performCrossEnvBackup(sourceEnvId, destination, selectedWorkflows, selectedCredentials);
            await performCrossEnvRestore(targetEnvId, selectedWorkflows, selectedCredentials);
        }
        
        showNotification('跨環境操作完成', 'success');
    } catch (error) {
        console.error('Cross-environment operation error:', error);
        showNotification('跨環境操作失敗', 'error');
    } finally {
        hideLoading();
    }
}

// 執行跨環境備份
async function performCrossEnvBackup(sourceEnvId, destination, selectedWorkflows, selectedCredentials) {
    const backupName = `cross-env-backup-${Date.now()}`;
    
    const response = await fetch(`/api/cross-env/backup-from/${sourceEnvId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
            workflows: sourceEnvData.workflows,
            credentials: sourceEnvData.credentials,
            selectedItems: {
                workflows: selectedWorkflows,
                credentials: selectedCredentials
            },
            backupName,
            destination
        })
    });
    
    const result = await response.json();
    
    if (!result.success) {
        throw new Error(result.error || '備份失敗');
    }
    
    console.log('Backup completed:', result);
}

// 執行跨環境還原
async function performCrossEnvRestore(targetEnvId, selectedWorkflows, selectedCredentials) {
    // 這裡需要從備份中獲取數據，簡化處理
    const restoreMode = 'overwrite'; // 可以讓用戶選擇
    
    const response = await fetch(`/api/cross-env/restore-to/${targetEnvId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
            backupData: {
                workflows: sourceEnvData.workflows,
                credentials: sourceEnvData.credentials
            },
            selectedItems: {
                workflows: selectedWorkflows,
                credentials: selectedCredentials
            },
            restoreMode
        })
    });
    
    const result = await response.json();
    
    if (!result.success) {
        throw new Error(result.error || '還原失敗');
    }
    
    console.log('Restore completed:', result);
}