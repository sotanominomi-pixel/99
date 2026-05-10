const MIN_N = 12;
const MAX_N = 48;
let currentN = 24; 
let isSecondsVisible = true; 
let currentLang = 'ja'; 

// プリセットの表示状態を管理
let isPresetFeatureEnabled = true; // 初期値はON
const PRESET_TOGGLE_KEY = 'nClockPresetEnabled';

// 設定保存用のキー
const SETTINGS_STORAGE_KEY = 'nClockSettings';

// N値プリセット関連の変数/初期設定
let presets = []; 
const PRESET_STORAGE_KEY = 'nClockPresets';

// 改良点: PiP用のCanvas変数
let pipCanvas = document.createElement('canvas');
pipCanvas.width = 300;
pipCanvas.height = 150;
let pipCtx = pipCanvas.getContext('2d');

// タブバーの翻訳マップ
const translations = {
    'ja': {
        'nav-clock': '時計',
        'nav-stopwatch': 'SW',
        'nav-alarm': 'アラーム',
        'nav-settings': '設定',
        'privacy-title': 'プライバシーポリシー',
        'privacy-ad': '広告の配信について',
        'privacy-ad-text': '当サイトではGoogle AdSenseを利用しています。広告配信事業者は、ユーザーの興味に応じた広告を表示するためにCookieを使用することがあります。',
        'privacy-disclaimer': '免責事項',
        'privacy-disclaimer-text': '当アプリの利用により生じた損害について、開発者は一切の責任を負いません。',
        'close': '閉じる'
    },
    'en': {
        'nav-clock': 'Clock',
        'nav-stopwatch': 'SW',
        'nav-alarm': 'Alarm',
        'nav-settings': 'Settings',
        'privacy-title': 'Privacy Policy',
        'privacy-ad': 'Advertising',
        'privacy-ad-text': 'This site uses Google AdSense. Ad providers may use cookies to serve ads based on your interests.',
        'privacy-disclaimer': 'Disclaimer',
        'privacy-disclaimer-text': 'The developer is not responsible for any damage caused by the use of this app.',
        'close': 'Close'
    }
};

// ストップウォッチ関連の変数
let stopwatchStartTime = 0;
let stopwatchElapsedTime = 0; 
let stopwatchTimer = null;
let lapTimes = []; 
let lastLapTimeTotal = 0; 


// アラーム関連の変数
let alarms = [
    {id: 1, h: 7, m: 0, enabled: true, label: 'Alarm'},
]; 
let nextAlarmId = 2;
// アラームの重複発火防止用
let lastAlarmMinute = -1; 


// ----------------------------------------------------
// N値に基づいた時計の「速さ」調整ロジック 
// ----------------------------------------------------

function calculateNTime(realTime) {
    const speedFactor = 24 / currentN; 
    const real_elapsed_seconds = realTime / 1000;
    const n_world_elapsed_seconds = real_elapsed_seconds * speedFactor;
    
    const totalSecondsIn24h = n_world_elapsed_seconds;

    const h_24 = Math.floor((totalSecondsIn24h / 3600) % 24); 
    const m_24 = Math.floor((totalSecondsIn24h % 3600) / 60);
    const s_24 = Math.floor(totalSecondsIn24h % 60);

    return { h: h_24, m: m_24, s: s_24 };
}

function updateClock() {
    const now = new Date();
    const realTimeOfDay = now.getTime() - new Date(now.toDateString()).getTime(); 
    
    const { h, m, s } = calculateNTime(realTimeOfDay); 
    
    const formattedH = String(h).padStart(2, '0');
    const formattedM = String(m).padStart(2, '0');
    const formattedS = String(s).padStart(2, '0');
    
    let timeString = `${formattedH}:${formattedM}`;
    if (isSecondsVisible) {
        timeString += `:${formattedS}`;
    }

    const clockDisplay = document.getElementById('n-clock-display');
    if (clockDisplay) {
        clockDisplay.textContent = timeString;
    }
    const nValueDisplay = document.getElementById('n-value-display');
    if (nValueDisplay) {
        nValueDisplay.textContent = `N = ${currentN} ${currentLang === 'ja' ? '時間' : 'Hours'}`;
    }

    // 改良点: PiP用のCanvas描画
    if (clockDisplay) {
        pipCtx.fillStyle = "white";
        pipCtx.fillRect(0, 0, pipCanvas.width, pipCanvas.height);
        pipCtx.fillStyle = "black";
        pipCtx.font = "bold 60px Roboto";
        pipCtx.textAlign = "center";
        pipCtx.textBaseline = "middle";
        pipCtx.fillText(timeString, pipCanvas.width/2, pipCanvas.height/2);
        
        pipCtx.font = "20px Roboto";
        pipCtx.fillText(`N=${currentN}`, pipCanvas.width/2, pipCanvas.height/2 + 50);
    }

    checkAlarms(h, m, s); 
}


// ----------------------------------------------------
// N値プリセット ロジック 
// ----------------------------------------------------

function loadPresets() {
    const savedPresets = localStorage.getItem(PRESET_STORAGE_KEY);
    if (savedPresets) {
        presets = JSON.parse(savedPresets);
    } else {
        presets = [
            { id: 1, name: "標準 (24H)", n: 24 },
            { id: 2, name: "集中モード (18H)", n: 18 },
            { id: 3, name: "リラックス (36H)", n: 36 }
        ];
    }
    nextPresetId = presets.length > 0 ? Math.max(...presets.map(p => p.id)) + 1 : 4; 
}

function savePresets() {
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
}

// 全般的な設定の保存
function saveAppSettings() {
    const settings = {
        currentN,
        isSecondsVisible,
        currentLang,
        isPresetFeatureEnabled
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

// 全般的な設定の読み込み
function loadAppSettings() {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
        const data = JSON.parse(saved);
        currentN = data.currentN || 24;
        isSecondsVisible = data.isSecondsVisible !== undefined ? data.isSecondsVisible : true;
        currentLang = data.currentLang || 'ja';
        isPresetFeatureEnabled = data.isPresetFeatureEnabled !== undefined ? data.isPresetFeatureEnabled : true;
    }
}

function loadPresetToggleState() {
    const savedState = localStorage.getItem(PRESET_TOGGLE_KEY);
    if (savedState !== null) {
        isPresetFeatureEnabled = (savedState === 'true');
    }
}

function savePresetToggleState() {
    localStorage.setItem(PRESET_TOGGLE_KEY, isPresetFeatureEnabled.toString());
}

let nextPresetId = 4; 

function applyPreset(n) {
    currentN = n;
    saveAppSettings(); 
    renderClockMode(); 
    updateClock();
}

function addCurrentNToPresets() {
    const presetName = prompt(currentLang === 'ja' ? 'プリセット名を入力してください:' : 'Enter preset name:');
    if (presetName && presetName.trim() !== "") {
        presets.push({
            id: nextPresetId++,
            name: presetName.trim(),
            n: currentN
        });
        savePresets();
        renderClockMode(); 
    }
}

function deletePreset(id) {
    presets = presets.filter(p => p.id !== id);
    savePresets();
    renderClockMode(); 
}


// ----------------------------------------------------
// ストップウォッチ ロジック
// ----------------------------------------------------

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const msRemainder = String(Math.floor((ms % 1000) / 10)).padStart(2, '0');
    
    if (totalSeconds >= 3600) {
        const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const s = String(totalSeconds % 60).padStart(2, '0');
        return `${h}:${m}:${s}.${msRemainder}`;
    } else {
        const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const s = String(totalSeconds % 60).padStart(2, '0');
        return `${m}:${s}.${msRemainder}`;
    }
}

function updateStopwatch() {
    const now = Date.now();
    const realTimeElapsedSinceStart = now - stopwatchStartTime;
    let totalRealAccumulated = stopwatchElapsedTime + realTimeElapsedSinceStart;
    
    const speedFactor = 24 / currentN;
    let nWorldTimeForDisplay = totalRealAccumulated * speedFactor;

    document.getElementById('stopwatch-display').textContent = formatTime(nWorldTimeForDisplay);
}

function startStopwatch() {
    if (!stopwatchTimer) {
        stopwatchStartTime = Date.now();
        stopwatchTimer = setInterval(updateStopwatch, 10); 
        document.getElementById('start-stop-btn').textContent = currentLang === 'ja' ? 'ストップ' : 'Stop';
        document.getElementById('start-stop-btn').classList.remove('start');
        document.getElementById('start-stop-btn').classList.add('stop');
        document.getElementById('lap-reset-btn').textContent = currentLang === 'ja' ? 'ラップ' : 'Lap';
        document.getElementById('lap-reset-btn').classList.remove('reset');
    } else {
        clearInterval(stopwatchTimer);
        stopwatchElapsedTime += Date.now() - stopwatchStartTime; 
        stopwatchTimer = null;
        document.getElementById('start-stop-btn').textContent = currentLang === 'ja' ? 'スタート' : 'Start';
        document.getElementById('start-stop-btn').classList.remove('stop');
        document.getElementById('start-stop-btn').classList.add('start');
        document.getElementById('lap-reset-btn').textContent = currentLang === 'ja' ? 'リセット' : 'Reset';
        document.getElementById('lap-reset-btn').classList.add('reset');
    }
}

function lapOrResetStopwatch() {
    if (stopwatchTimer) { 
        const totalRealTime = (Date.now() - stopwatchStartTime) + stopwatchElapsedTime;
        const speedFactor = 24 / currentN;
        const nWorldTotalTime = totalRealTime * speedFactor;
        const currentLapTime = nWorldTotalTime - lastLapTimeTotal; 
        lapTimes.push(currentLapTime);
        lastLapTimeTotal = nWorldTotalTime; 
        renderLaps();
    } else if (stopwatchElapsedTime > 0) { 
        stopwatchStartTime = 0;
        stopwatchElapsedTime = 0; 
        lapTimes = [];
        lastLapTimeTotal = 0; 
        document.getElementById('stopwatch-display').textContent = formatTime(0);
        document.getElementById('lap-reset-btn').textContent = currentLang === 'ja' ? 'ラップ' : 'Lap';
        document.getElementById('lap-reset-btn').classList.remove('reset');
        renderLaps();
    }
}

function renderLaps() {
    const lapsList = document.getElementById('lap-list');
    if (!lapsList) return;
    lapsList.innerHTML = '';
    lapTimes.slice().reverse().forEach((lap, index) => {
        const lapNumber = lapTimes.length - index; 
        const li = document.createElement('li');
        li.textContent = `${currentLang === 'ja' ? 'ラップ' : 'Lap'} ${lapNumber}: ${formatTime(lap)}`;
        lapsList.appendChild(li); 
    });
}


// ----------------------------------------------------
// アラーム ロジック
// ----------------------------------------------------

function addAlarm() {
    const newAlarm = {
        id: nextAlarmId++,
        h: 7, 
        m: 0, 
        enabled: true,
        label: currentLang === 'ja' ? 'アラーム' : 'Alarm',
    };
    alarms.push(newAlarm);
    renderAlarmMode(); 
}

function toggleAlarm(id) {
    const alarm = alarms.find(a => a.id === id);
    if (alarm) {
        alarm.enabled = !alarm.enabled;
        renderAlarmsList(); 
    }
}

function deleteAlarm(id) {
    alarms = alarms.filter(a => a.id !== id);
    renderAlarmMode(); 
}

function checkAlarms(currentH_24, currentM_24, currentS_24) {
    const currentTotalMinutes = currentH_24 * 60 + currentM_24;
    if (currentS_24 === 0 && lastAlarmMinute !== currentTotalMinutes) { 
        alarms.forEach(alarm => {
            if (alarm.enabled) {
                if (alarm.h === currentH_24 && alarm.m === currentM_24) {
                    lastAlarmMinute = currentTotalMinutes; 
                    alert(`${currentLang === 'ja' ? 'アラームが鳴りました！' : 'Alarm Triggered!'}\n${String(alarm.h).padStart(2, '0')}:${String(alarm.m).padStart(2, '0')}`);
                }
            }
        });
    }
}

function handleTimeClick(id) {
    const alarm = alarms.find(a => a.id === id);
    if (!alarm) return;
    const itemDiv = document.getElementById(`alarm-item-${id}`); 
    if (!itemDiv) return;

    const hourSelect = Array.from({ length: 24 }, (_, i) => 
        `<option value="${i}" ${i === alarm.h ? 'selected' : ''}>${String(i).padStart(2, '0')}</option>`
    ).join('');
    
    const minuteSelect = Array.from({ length: 60 }, (_, i) => 
        `<option value="${i}" ${i === alarm.m ? 'selected' : ''}>${String(i).padStart(2, '0')}</option>`
    ).join('');

    itemDiv.innerHTML = `
        <div class="alarm-time-setting-container">
            <select id="hour-${id}" class="time-select">${hourSelect}</select>
            <span>:</span>
            <select id="minute-${id}" class="time-select">${minuteSelect}</select>
        </div>
        <div class="alarm-actions">
             <button onclick="saveAlarmTime(${id})" class="save-btn action-button">
                ${currentLang === 'ja' ? '保存' : 'Save'}
            </button>
        </div>
    `;
}

function saveAlarmTime(id) {
    const alarm = alarms.find(a => a.id === id);
    if (!alarm) return;
    const hourSelect = document.getElementById(`hour-${id}`);
    const minuteSelect = document.getElementById(`minute-${id}`);
    if (hourSelect && minuteSelect) {
        alarm.h = parseInt(hourSelect.value);
        alarm.m = parseInt(minuteSelect.value);
        renderAlarmsList(); 
    }
}

function renderAlarmsList() {
    const list = document.getElementById('alarms-list');
    if (!list) return;
    list.innerHTML = alarms.map(alarm => `
        <li class="alarm-item" id="alarm-item-${alarm.id}">
            <div id="alarm-time-${alarm.id}" class="alarm-time" onclick="handleTimeClick(${alarm.id})">
                ${String(alarm.h).padStart(2, '0')}:${String(alarm.m).padStart(2, '0')}
            </div>
            <div class="alarm-actions">
                <button onclick="deleteAlarm(${alarm.id})" class="delete-btn action-button">
                    ${currentLang === 'ja' ? '削除' : 'Delete'}
                </button>
                <label class="toggle-switch" style="float:none; margin-left: 10px;">
                    <input type="checkbox" ${alarm.enabled ? 'checked' : ''} onchange="toggleAlarm(${alarm.id})">
                    <span class="slider"></span>
                </label>
            </div>
        </li>
    `).join('');
}


// ----------------------------------------------------
// アコーディオンロジック
// ----------------------------------------------------

function toggleAccordion() {
    const header = document.getElementById('accordion-header');
    const content = document.getElementById('clock-explanation');
    header.classList.toggle('active');
    content.classList.toggle('open');
    if (content.classList.contains('open')) {
        content.style.maxHeight = content.scrollHeight + 36 + "px"; 
    } else {
        content.style.maxHeight = null;
    }
}

// ----------------------------------------------------
// 改良点: PiP制御ロジック 
// ----------------------------------------------------

async function togglePiP() {
    const video = document.getElementById('pip-video');
    try {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else {
            const stream = pipCanvas.captureStream(10); 
            video.srcObject = stream;
            video.play();
            await video.requestPictureInPicture();
        }
    } catch (error) {
        console.error('PiP失敗:', error);
        alert(currentLang === 'ja' ? 'お使いのブラウザはPiPに対応していないか、設定が必要です。' : 'PiP is not supported or needs permission.');
    }
}


// ----------------------------------------------------
// モードのレンダリング関数
// ----------------------------------------------------

function renderClockMode() {
    document.getElementById('content-area').innerHTML = `
        <div class="mode-title">${currentLang === 'ja' ? '時計' : 'Clock'}</div>
        <div id="n-clock-display" class="clock-display">--:--</div>
        
        <div class="pip-button-container">
            <button id="pip-start-btn" class="action-button pip-btn">
                <!-- 改良点: 名称変更 -->
                ${currentLang === 'ja' ? 'ピクチャインピクチャ' : 'Picture in Picture'}
            </button>
        </div>

        <div class="control-panel">
            <label for="n-slider" style="font-weight: 700;">1日の時間 (N)</label>
            <input type="range" id="n-slider" min="${MIN_N}" max="${MAX_N}" value="${currentN}">
            <div id="n-value-display" style="text-align: center; font-weight: 700;">N = ${currentN} ${currentLang === 'ja' ? '時間' : 'Hours'}</div>
        </div>
        
        ${isPresetFeatureEnabled ? `
            <div class="preset-container">
                <div class="preset-header">
                    <h3>${currentLang === 'ja' ? 'N値プリセット' : 'N Value Presets'}</h3>
                    <button onclick="addCurrentNToPresets()" class="action-button save-preset-btn">
                        ${currentLang === 'ja' ? '現在のN値を保存' : 'Save Current N'}
                    </button>
                </div>
                <ul class="preset-list">
                    ${presets.map(p => `
                        <li class="preset-item" onclick="applyPreset(${p.n})">
                            <span class="preset-name">${p.name}</span>
                            <span class="preset-value">N = ${p.n}</span>
                            <button onclick="event.stopPropagation(); deletePreset(${p.id})" class="delete-preset-btn">
                                ${currentLang === 'ja' ? '削除' : 'Del'}
                            </button>
                        </li>
                    `).join('')}
                </ul>
            </div>
        ` : ''} 
        <button id="accordion-header" class="accordion-header" onclick="toggleAccordion()">
            <span>N Clock アプリの説明と使い方</span>
            <span class="accordion-icon">▼</span>
        </button>
        
        <div id="clock-explanation" class="accordion-content">
            <h2>N Clock：時間の進みを操るカスタム時計 PWA</h2>
            <p>N Clockは、**「N値」**という独自の基準に基づき、時間の速さを自由に設定できるユニークな時計アプリです。</p>
            <p>**Nを大きくする（N > 24）**: 時間の進みがゆっくりに。</p>
            <p>**Nを小さくする（N < 24）**: 時間の進みが早くに。</p>
        </div>
    `;
    setupNControl(); 
    
    // 改良点: PiPイベント登録
    const pipBtn = document.getElementById('pip-start-btn');
    if(pipBtn) pipBtn.onclick = togglePiP;

    updateClock();
}

function renderStopwatchMode() {
    const totalRealTime = stopwatchElapsedTime + (stopwatchTimer ? Date.now() - stopwatchStartTime : 0);
    const speedFactor = 24 / currentN;
    const displayTime = formatTime(totalRealTime * speedFactor);
    
    document.getElementById('content-area').innerHTML = `
        <div class="mode-title">${currentLang === 'ja' ? 'ストップウォッチ' : 'Stopwatch'}</div>
        <div id="stopwatch-display" class="clock-display">${displayTime}</div>
        <div class="stopwatch-controls">
            <button id="lap-reset-btn" class="control-button rounded-square-btn gray-btn ${stopwatchTimer ? '' : (stopwatchElapsedTime > 0 ? 'reset' : '')}">
                ${stopwatchTimer ? (currentLang === 'ja' ? 'ラップ' : 'Lap') : (stopwatchElapsedTime > 0 ? (currentLang === 'ja' ? 'リセット' : 'Reset') : (currentLang === 'ja' ? 'ラップ' : 'Lap'))}
            </button>
            <button id="start-stop-btn" class="control-button rounded-square-btn ${stopwatchTimer ? 'stop' : (stopwatchElapsedTime > 0 ? 'start' : 'start')}">
                ${stopwatchTimer ? (currentLang === 'ja' ? 'ストップ' : 'Stop') : (currentLang === 'ja' ? 'スタート' : 'Start')}
            </button>
        </div>
        <ul id="lap-list" class="lap-list"></ul>
    `;
    document.getElementById('start-stop-btn').addEventListener('click', startStopwatch);
    document.getElementById('lap-reset-btn').addEventListener('click', lapOrResetStopwatch);
    renderLaps();
}

function renderAlarmMode() {
    document.getElementById('content-area').innerHTML = `
        <div class="mode-title">${currentLang === 'ja' ? 'アラーム' : 'Alarm'}</div>
        <div style="text-align:center; padding: 10px 0;">
            <button id="add-alarm-btn" onclick="addAlarm()" class="add-button action-button">
                <!-- 改良点: イラスト（＋）を削除 -->
                ${currentLang === 'ja' ? 'アラームを追加' : 'Add Alarm'}
            </button>
        </div>
        <ul id="alarms-list" class="alarms-list"></ul>
    `;
    renderAlarmsList();
}

function renderSettingsMode() {
    const t = translations[currentLang];
    document.getElementById('content-area').innerHTML = `
        <div class="mode-title">${t['nav-settings']}</div>
        <ul class="settings-list">
            <li>
                <span>${currentLang === 'ja' ? '秒数表示' : 'Show Seconds'}</span>
                <label class="toggle-switch">
                    <input type="checkbox" id="seconds-toggle">
                    <span class="slider"></span>
                </label>
            </li>
            <li>
                <span>${currentLang === 'ja' ? 'N値プリセット機能' : 'N Preset Feature'}</span>
                <label class="toggle-switch">
                    <input type="checkbox" id="preset-toggle">
                    <span class="slider"></span>
                </label>
            </li>
            <li>
                <span>${currentLang === 'ja' ? '言語表示' : 'Language'}</span>
                <div class="segmented-control" id="language-control">
                    <button data-lang="ja" class="segment-button ${currentLang === 'ja' ? 'active' : ''}">JP</button>
                    <button data-lang="en" class="segment-button ${currentLang === 'en' ? 'active' : ''}">EN</button>
                </div>
            </li>
            <li onclick="togglePrivacyModal(true)" style="cursor:pointer">
                <span class="settings-link">${t['privacy-title']}</span>
                <span class="disclosure-arrow">></span>
            </li>
        </ul>

        <div id="privacy-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999; justify-content:center; align-items:center;">
            <div style="background:#fff; width:85%; max-width:400px; padding:25px; border-radius:20px; color:#333; max-height:80vh; overflow-y:auto;">
                <h2 style="font-size:18px; margin-top:0;">${t['privacy-title']}</h2>
                <h3 style="font-size:14px;">${t['privacy-ad']}</h3>
                <p style="font-size:12px; line-height:1.5;">${t['privacy-ad-text']}</p>
                <h3 style="font-size:14px;">${t['privacy-disclaimer']}</h3>
                <p style="font-size:12px; line-height:1.5;">${t['privacy-disclaimer-text']}</p>
                <button onclick="togglePrivacyModal(false)" style="width:100%; margin-top:20px; padding:12px; background:#000; color:#fff; border:none; border-radius:12px; font-weight:bold;">${t['close']}</button>
            </div>
        </div>
    `;
    setupSettings(); 
}

window.togglePrivacyModal = function(show) {
    const modal = document.getElementById('privacy-modal');
    if (modal) modal.style.display = show ? 'flex' : 'none';
};


// ----------------------------------------------------
// コントロール/イベントハンドラの設定
// ----------------------------------------------------

function setupNControl() {
    const slider = document.getElementById('n-slider');
    if (slider) {
        slider.oninput = (e) => {
            currentN = parseInt(e.target.value);
            saveAppSettings(); 
            updateClock();
        };
    }
}

function setupSettings() {
    const secondsToggle = document.getElementById('seconds-toggle');
    if (secondsToggle) {
        secondsToggle.checked = isSecondsVisible;
        secondsToggle.onchange = (e) => {
            isSecondsVisible = e.target.checked;
            saveAppSettings(); 
            updateClock(); 
        };
    }
    
    const presetToggle = document.getElementById('preset-toggle');
    if (presetToggle) {
        presetToggle.checked = isPresetFeatureEnabled;
        presetToggle.onchange = (e) => {
            isPresetFeatureEnabled = e.target.checked;
            savePresetToggleState();
            saveAppSettings(); 
            if (document.querySelector('.tab-item.active').id === 'nav-clock') renderClockMode();
        };
    }

    const langControl = document.getElementById('language-control');
    if (langControl) {
        langControl.querySelectorAll('.segment-button').forEach(button => {
            button.addEventListener('click', () => {
                currentLang = button.dataset.lang;
                saveAppSettings(); 
                renderCurrentMode(); 
                updateClock();
                updateTabBarText(); 
            });
        });
    }
}

function renderCurrentMode() {
    const activeTab = document.querySelector('.tab-item.active');
    if (!activeTab) return;
    switch (activeTab.id) {
        case 'nav-clock': renderClockMode(); break;
        case 'nav-stopwatch': renderStopwatchMode(); break;
        case 'nav-alarm': renderAlarmMode(); break;
        case 'nav-settings': renderSettingsMode(); break;
    }
}

function updateTabBarText() {
    document.querySelectorAll('.tab-item').forEach(button => {
        const text = translations[currentLang][button.id];
        const label = button.querySelector('.label');
        if (label) label.textContent = text;
    });
}

function setupNavigation() {
    document.querySelectorAll('.tab-item').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-item').forEach(btn => btn.classList.remove('active'));
            e.currentTarget.classList.add('active');
            renderCurrentMode();
        });
    });
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js', { scope: './' }) 
                .then(reg => console.log('SW OK'))
                .catch(err => console.log('SW Fail'));
        });
    }
}

function initApp() {
    registerServiceWorker(); 
    loadAppSettings();
    loadPresets(); 
    loadPresetToggleState(); 
    setInterval(updateClock, 100); 
    setupNavigation();
    updateTabBarText(); 
    renderClockMode(); 
}

document.addEventListener('DOMContentLoaded', initApp);


/* --- 【追加改善】デバイス切り替え・全体ドラッグ・常時更新ループ --- */

let deviceMode = 'pc'; 

function toggleFloatingClock() {
    const fc = document.getElementById('floating-clock');
    if (fc) {
        fc.style.display = (fc.style.display === 'none') ? 'block' : 'none';
    }
}

// 吹き出し全体でドラッグ移動
function setupFloatingDraggable() {
    const el = document.getElementById('floating-clock');
    if (!el) return;

    let offsetX, offsetY;
    el.addEventListener('touchstart', (e) => {
        if (e.target.id === 'floating-close') return;
        const touch = e.touches[0];
        offsetX = touch.clientX - el.offsetLeft;
        offsetY = touch.clientY - el.offsetTop;
    }, {passive: false});

    el.addEventListener('touchmove', (e) => {
        if (e.target.id === 'floating-close') return;
        e.preventDefault(); 
        const touch = e.touches[0];
        el.style.left = (touch.clientX - offsetX) + 'px';
        el.style.top = (touch.clientY - offsetY) + 'px';
    }, {passive: false});
}

// 画面遷移しても止まらない「常時更新ループ」
function startGlobalUpdateLoop() {
    if (window.globalClockTimer) clearInterval(window.globalClockTimer);
    window.globalClockTimer = setInterval(() => {
        updateClock(); // 内部ロジック更新
        const fDisplay = document.getElementById('floating-display');
        const clockDisplay = document.getElementById('n-clock-display');
        
        // 現在のリアルタイムに基づいた正確な時間を再計算（どの画面でも共通）
        const now = new Date();
        const realTimeOfDay = now.getTime() - new Date(now.toDateString()).getTime(); 
        const { h, m, s } = calculateNTime(realTimeOfDay);
        const timeString = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}${isSecondsVisible ? ':' + String(s).padStart(2, '0') : ''}`;

        // フローティング表示の更新
        if (fDisplay) {
            fDisplay.textContent = timeString;
        }
        
        // メイン時計の更新（存在する場合）
        if (clockDisplay) {
            clockDisplay.textContent = timeString;
        }

        // PiP用Canvasの更新（既存のロジック）
        if (pipCtx) {
            pipCtx.fillStyle = "white";
            pipCtx.fillRect(0, 0, pipCanvas.width, pipCanvas.height);
            pipCtx.fillStyle = "black";
            pipCtx.font = "bold 60px Roboto";
            pipCtx.textAlign = "center";
            pipCtx.textBaseline = "middle";
            pipCtx.fillText(timeString, pipCanvas.width/2, pipCanvas.height/2);
            pipCtx.font = "20px Roboto";
            pipCtx.fillText(`N=${currentN}`, pipCanvas.width/2, pipCanvas.height/2 + 50);
        }
        
        checkAlarms(h, m, s);
    }, 100);
}

// 既存関数の拡張
const originalInitApp = initApp;
initApp = function() {
    originalInitApp();
    startGlobalUpdateLoop();
};

const originalRenderClockMode = renderClockMode;
renderClockMode = function() {
    originalRenderClockMode();
    const pipContainer = document.querySelector('.pip-button-container');
    if (pipContainer && deviceMode === 'mobile') {
        pipContainer.innerHTML = `<button onclick="toggleFloatingClock()" class="action-button pip-btn" style="background-color: #f39c12;">${currentLang === 'ja' ? 'フローティング時計を表示' : 'Show Floating Clock'}</button>`;
    }
};

const originalRenderSettingsMode = renderSettingsMode;
renderSettingsMode = function() {
    originalRenderSettingsMode();
    const list = document.querySelector('.settings-list');
    if (list) {
        const li = document.createElement('li');
        li.innerHTML = `<span>${currentLang === 'ja' ? 'デバイス設定' : 'Device Mode'}</span><div class="segmented-control"><button id="mode-pc" class="segment-button ${deviceMode === 'pc' ? 'active' : ''}">PC</button><button id="mode-mobile" class="segment-button ${deviceMode === 'mobile' ? 'active' : ''}">Mobile</button></div>`;
        list.insertBefore(li, list.firstChild);
        document.getElementById('mode-pc').onclick = () => { deviceMode = 'pc'; renderSettingsMode(); };
        document.getElementById('mode-mobile').onclick = () => { deviceMode = 'mobile'; renderSettingsMode(); };
    }
};

document.addEventListener('DOMContentLoaded', setupFloatingDraggable);

/* --- 最終的な追加修正：画面切り替え時のチラつき防止 --- */
const finalRenderCurrentMode = renderCurrentMode;
renderCurrentMode = function() {
    finalRenderCurrentMode();
    const now = new Date();
    const realTimeOfDay = now.getTime() - new Date(now.toDateString()).getTime();
    const { h, m, s } = calculateNTime(realTimeOfDay);
    const clockDisplay = document.getElementById('n-clock-display');
    if (clockDisplay) {
        clockDisplay.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}${isSecondsVisible ? ':' + String(s).padStart(2, '0') : ''}`;
    }
};
