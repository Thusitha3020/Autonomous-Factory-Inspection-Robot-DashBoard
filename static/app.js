// App behavior: datetime, mock live data, Chart.js, UI interactions
const dtEl = document.getElementById('datetime');
const statusPill = document.getElementById('statusPill');
const pauseBtn = document.getElementById('pauseBtn');
let streaming = true;

function updateDateTime(){
  const now = new Date();
  if(dtEl) dtEl.textContent = now.toLocaleString();
}
setInterval(updateDateTime,1000);
updateDateTime();

// Navigation
document.querySelectorAll('.nav-item').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    btn.classList.add('active');
    const view = btn.dataset.view;
    // hide all content areas, show only the selected view with enter animation
    document.querySelectorAll('.content').forEach(v=>{ v.hidden = true; v.classList.remove('view-enter'); });
    const target = document.getElementById('view-'+view);
    if(target) {
      target.hidden = false;
      // trigger CSS entrance animation
      target.classList.remove('view-enter');
      void target.offsetWidth;
      target.classList.add('view-enter');
      const onEnd = ()=>{ target.classList.remove('view-enter'); target.removeEventListener('animationend',onEnd); };
      target.addEventListener('animationend', onEnd);
    }
  });
});

// Chart.js setup
const ctx = document.getElementById('liveChart')?.getContext('2d');
const maxPoints = 30;
const getTime = ()=>new Date().toLocaleTimeString().replace(/(:\d+ )/,' ');
let labels = Array.from({length:maxPoints},(_,i)=>'');
const data = {
  labels: labels,
  datasets: [
    {label:'Temperature (°C)',borderColor:'#00B8FF',backgroundColor:'rgba(0,184,255,0.06)',data:Array(maxPoints).fill(null),tension:0.25},
    {label:'Gas (PPM)',borderColor:'#9B6CFF',backgroundColor:'rgba(155,108,255,0.04)',data:Array(maxPoints).fill(null),tension:0.25},
    {label:'Distance (cm)',borderColor:'#66D0FF',backgroundColor:'rgba(102,208,255,0.04)',data:Array(maxPoints).fill(null),tension:0.25}
  ]
};
let chart = null;
if(ctx){
  chart = new Chart(ctx,{type:'line',data:data,options:{animation:{duration:300},responsive:true,plugins:{legend:{position:'top'}},scales:{x:{display:true},y:{display:true}}}});
}

// Mock sensor values & updates
const cardTemp = document.querySelector('#card-temp .value');
const cardDist = document.querySelector('#card-dist .value');
const cardGas = document.querySelector('#card-gas .value');
const cardBatt = document.querySelector('#card-batt .value');

let state = {temp:22.6,dist:120,gas:3,batt:88,signal:-45,heading:0,behavior:'idle'};

function pushData(){
  if(!streaming) return;
  // simulate small random drift
  state.temp = +(state.temp + (Math.random()-0.48)*0.6).toFixed(1);
  state.dist = Math.max(5,Math.round(state.dist + (Math.random()-0.5)*6));
  state.gas = +(state.gas + (Math.random()-0.4)*0.5).toFixed(2);
  state.batt = Math.max(0,Math.round(state.batt - Math.random()*0.005*100)/1);
  state.signal = Math.max(-95, Math.min(-20, state.signal + (Math.random()-0.5)*4));
  state.heading = (state.heading + (Math.random()-0.5)*30) % 360;

  // update cards
  if(cardTemp) cardTemp.textContent = state.temp;
  if(cardDist) cardDist.textContent = state.dist;
  if(cardGas) cardGas.textContent = state.gas;
  if(cardBatt) cardBatt.textContent = state.batt;

  // update signal strength
  const signalBars = document.getElementById('signalBars');
  if(signalBars) updateSignalBars(signalBars, state.signal);

  // update live view elements if present
  const lt = document.getElementById('live-temp');
  const ld = document.getElementById('live-dist');
  const lg = document.getElementById('live-gas');
  const lb = document.getElementById('live-batt');
  if(lt) lt.textContent = state.temp + ' °C';
  if(ld) ld.textContent = state.dist + ' cm';
  if(lg) lg.textContent = state.gas + ' PPM';
  if(lb) lb.textContent = state.batt + ' %';

  // append recent readings table
  const recent = document.getElementById('recentReadings');
  if(recent){
    const tr = document.createElement('tr');
    const now = new Date();
    tr.innerHTML = `<td style="padding:6px">${now.toLocaleTimeString()}</td><td style="padding:6px">${state.temp} °C</td><td style="padding:6px">${state.gas} PPM</td><td style="padding:6px">${state.dist} cm</td>`;
    recent.prepend(tr);
    while(recent.children.length>10) recent.removeChild(recent.lastChild);
  }

  // update chart
  if(chart){
    const tlabel = new Date().toLocaleTimeString().replace(/(:\d+ )/,' ');
    chart.data.labels.push(tlabel);
    if(chart.data.labels.length>maxPoints) chart.data.labels.shift();
    chart.data.datasets[0].data.push(state.temp); if(chart.data.datasets[0].data.length>maxPoints) chart.data.datasets[0].data.shift();
    chart.data.datasets[1].data.push(state.gas); if(chart.data.datasets[1].data.length>maxPoints) chart.data.datasets[1].data.shift();
    chart.data.datasets[2].data.push(state.dist); if(chart.data.datasets[2].data.length>maxPoints) chart.data.datasets[2].data.shift();
    chart.update('quiet');
  }

  behaviorMachine();
}
setInterval(pushData,1200);

pauseBtn?.addEventListener('click',()=>{streaming=!streaming; if(pauseBtn) pauseBtn.textContent = streaming? '⏸':'▶';});

// Controls
document.querySelectorAll('.dir').forEach(b=>b.addEventListener('click',e=>{
  const cmd = e.currentTarget.dataset.cmd;
  flashAction(cmd);
}));

const stopBtn = document.getElementById('stopBtn');
stopBtn?.addEventListener('click',()=>{flashAction('STOP');stopPulse();addAlert('critical','Emergency STOP engaged');});

function flashAction(cmd){
  const tmp = document.createElement('div');tmp.className='action-flash';tmp.textContent = cmd;document.body.appendChild(tmp);
  setTimeout(()=>tmp.remove(),600);
}
function stopPulse(){stopBtn.classList.add('pulse-stop');setTimeout(()=>stopBtn.classList.remove('pulse-stop'),1600);}

// Toggles
const alarmEl = document.getElementById('alarm');
alarmEl?.addEventListener('change',e=>{
  if(e.target.checked) addAlert('warning','Alarm enabled');
});

// Alerts
const alertsList = document.getElementById('alertsList');
function addAlert(level,msg){
  const li = document.createElement('li');
  const color = level==='critical'? 'red': level==='warning'? 'orange':'green';
  li.innerHTML = `<div class="meta"><span class="status-dot ${color}"></span><div><div class="msg">${msg}</div><div class="ts">${new Date().toLocaleTimeString()}</div></div></div><div class="actions"><button class="small muted" onclick="this.closest('li').remove()">Dismiss</button></div>`;
  // add to dashboard alerts list if present
  if(alertsList) alertsList.prepend(li.cloneNode(true));
  const mainAlerts = document.getElementById('alertsMainList');
  if(mainAlerts) mainAlerts.prepend(li);
}

document.getElementById('clearAlerts')?.addEventListener('click',()=>{
  const a = document.getElementById('alertsList'); if(a) a.innerHTML='';
  const b = document.getElementById('alertsMainList'); if(b) b.innerHTML='';
});

// seed alerts
addAlert('warning','Gas level rising near Sector 4');
addAlert('critical','Proximity sensor failure detected');

// small UI polish for navigation: keep dashboard visible by default
const vd = document.getElementById('view-dashboard'); if(vd) vd.hidden = false;

// keyboard accessibility: WASD to control
window.addEventListener('keydown',e=>{
  const map = {ArrowUp:'forward',ArrowDown:'back',ArrowLeft:'left',ArrowRight:'right'};
  if(map[e.key]) flashAction(map[e.key]);
  if(e.key===' ') { stopBtn?.click(); }
});

// Smart Remote Control Features
function initSmartRemoteControl(){
  // Direction buttons
  document.querySelectorAll('.dir-btn').forEach(btn=>{
    btn.addEventListener('click',e=>{
      const cmd = e.currentTarget.dataset.cmd;
      flashAction(cmd.charAt(0).toUpperCase() + cmd.slice(1));
      logCommand(cmd.charAt(0).toUpperCase() + cmd.slice(1));
    });
  });

  // Speed control with visual feedback
  const speedRange = document.getElementById('speedRange');
  const speedValue = document.getElementById('speedValue');
  const speedBar = document.getElementById('speedBar');
  if(speedRange){
    speedRange.addEventListener('input',e=>{
      const val = e.target.value;
      if(speedValue) speedValue.textContent = val + '%';
      if(speedBar) speedBar.style.width = val + '%';
    });
  }

  // Mode buttons
  document.querySelectorAll('.mode-btn').forEach(btn=>{
    btn.addEventListener('click',e=>{
      document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const mode = e.currentTarget.dataset.mode;
      const modeText = mode.charAt(0).toUpperCase() + mode.slice(1);
      document.getElementById('tele-mode').textContent = modeText;
      logCommand('Mode: ' + modeText);
      state.mode = mode;
    });
  });

  // Emergency Stop
  const emergencyBtn = document.getElementById('emergencyStopBtn');
  if(emergencyBtn){
    emergencyBtn.addEventListener('click',()=>{
      stopBtn?.click();
      emergencyBtn.classList.add('pulse-stop');
      logCommand('⚠️ EMERGENCY STOP ACTIVATED');
      addAlert('critical','Emergency stop activated!');
      setTimeout(()=>emergencyBtn.classList.remove('pulse-stop'),1600);
    });
  }

  // Smart features
  document.getElementById('autoAvoid')?.addEventListener('change',e=>{
    logCommand(e.target.checked ? 'Auto Avoidance: ON' : 'Auto Avoidance: OFF');
  });

  document.getElementById('headlights')?.addEventListener('change',e=>{
    logCommand(e.target.checked ? 'Headlights: ON' : 'Headlights: OFF');
  });

  document.getElementById('alarm')?.addEventListener('change',e=>{
    logCommand(e.target.checked ? 'Alarm: ON' : 'Alarm: OFF');
    if(e.target.checked) addAlert('warning','Alarm enabled');
  });

  document.getElementById('recording')?.addEventListener('change',e=>{
    logCommand(e.target.checked ? 'Recording: ON' : 'Recording: OFF');
  });

  // Calibrate button
  document.getElementById('calibrateBtn')?.addEventListener('click',()=>{
    logCommand('Sensors calibrated');
    addAlert('warning','Calibration in progress...');
    setTimeout(()=>addAlert('warning','Calibration complete'),2000);
  });
}

// Log command to command log
function logCommand(cmd){
  const cmdLog = document.getElementById('cmdLog');
  if(cmdLog){
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.textContent = `[${time}] ${cmd}`;
    entry.style.color = 'var(--primary)';
    cmdLog.insertBefore(entry, cmdLog.firstChild);
    // limit entries
    while(cmdLog.children.length > 15) cmdLog.removeChild(cmdLog.lastChild);
  }
}

// Update telemetry display
function updateTelemetry(){
  const distEl = document.getElementById('tele-dist');
  const tempEl = document.getElementById('tele-temp');
  const headingEl = document.getElementById('tele-heading');
  const batteryPercent = document.getElementById('batteryPercent');
  const batteryBar = document.getElementById('batteryBar');
  const signalEl = document.getElementById('liveSignal');

  if(distEl) distEl.textContent = state.dist + ' cm';
  if(tempEl) tempEl.textContent = state.temp + ' °C';
  if(headingEl) headingEl.textContent = Math.round(state.heading) + '°';
  if(batteryPercent) batteryPercent.textContent = state.batt + '%';
  if(batteryBar) batteryBar.style.width = state.batt + '%';
  
  // Update signal bars in control panel
  if(signalEl){
    const bars = 4;
    const normalized = Math.max(0, Math.min(1, (state.signal + 95) / 75));
    const activeBars = Math.ceil(normalized * bars);
    let html = '';
    for(let i=0; i<bars; i++){
      const isActive = i < activeBars;
      const height = ((i+1)/bars)*100;
      html += `<div style="height:${height}%;width:4px;border-radius:1px;background:${isActive ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}"></div>`;
    }
    signalEl.innerHTML = html;
  }
}

// Initialize smart remote control on page load
initSmartRemoteControl();
// Update telemetry every 500ms
setInterval(updateTelemetry, 500);

// Smart Camera Control Features
function initSmartCameraControl(){
  let isRecording = false;
  let recordingTime = 0;
  let recordingSize = 0;

  // Recording functionality
  const recordBtn = document.getElementById('recordBtn');
  const recordingIndicator = document.getElementById('recordingIndicator');
  const recordingStatus = document.getElementById('recordingStatus');
  const recordingDuration = document.getElementById('recordingDuration');
  const recordingSize_el = document.getElementById('recordingSize');

  if(recordBtn){
    recordBtn.addEventListener('click',()=>{
      isRecording = !isRecording;
      if(isRecording){
        recordBtn.style.background = 'rgba(255,75,75,0.3)';
        recordBtn.style.color = '#FF4B4B';
        recordingIndicator.style.display = 'block';
        recordingStatus.textContent = 'Recording';
        recordingStatus.style.color = '#FF4B4B';
        logCommand('Recording started');
      } else {
        recordBtn.style.background = 'rgba(255,75,75,0.1)';
        recordBtn.style.color = '#FF4B4B';
        recordingIndicator.style.display = 'none';
        recordingStatus.textContent = 'Idle';
        recordingStatus.style.color = 'var(--muted-text)';
        logCommand('Recording stopped');
      }
    });
  }

  // Simulate recording progress
  setInterval(()=>{
    if(isRecording){
      recordingTime += 1;
      recordingSize += 2.4; // ~2.4 MB per second at 5.2 Mbps
      const hours = Math.floor(recordingTime / 3600);
      const mins = Math.floor((recordingTime % 3600) / 60);
      const secs = recordingTime % 60;
      const timeStr = `${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
      if(recordingDuration) recordingDuration.textContent = timeStr;
      if(recordingSize_el) recordingSize_el.textContent = recordingSize.toFixed(1) + ' MB';
    }
  }, 1000);

  // Screenshot functionality
  const screenshotBtn = document.getElementById('screenshotBtn');
  if(screenshotBtn){
    screenshotBtn.addEventListener('click',()=>{
      logCommand('Screenshot captured');
      addAlert('warning','Screenshot saved');
      // Add to gallery
      const gallery = document.getElementById('snapshotGallery');
      if(gallery){
        const snap = document.createElement('div');
        snap.style.cssText = 'aspect-ratio:16/9;background:linear-gradient(135deg,rgba(0,184,255,0.2),rgba(155,108,255,0.2));border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--muted-text);font-size:11px;cursor:pointer';
        snap.textContent = new Date().toLocaleTimeString();
        snap.title = 'Click to view';
        gallery.insertBefore(snap, gallery.firstChild);
        while(gallery.children.length > 6) gallery.removeChild(gallery.lastChild);
      }
    });
  }

  // Zoom control
  const zoomRange = document.getElementById('zoomRange');
  const zoomValue = document.getElementById('zoomValue');
  const zoomIn = document.getElementById('zoomIn');
  const zoomOut = document.getElementById('zoomOut');

  if(zoomRange){
    zoomRange.addEventListener('input',e=>{
      if(zoomValue) zoomValue.textContent = e.target.value + '%';
    });
  }

  if(zoomIn){
    zoomIn.addEventListener('click',()=>{
      const current = parseInt(zoomRange.value);
      zoomRange.value = Math.min(300, current + 20);
      zoomRange.dispatchEvent(new Event('input'));
    });
  }

  if(zoomOut){
    zoomOut.addEventListener('click',()=>{
      const current = parseInt(zoomRange.value);
      zoomRange.value = Math.max(100, current - 20);
      zoomRange.dispatchEvent(new Event('input'));
    });
  }

  // Quality buttons
  document.querySelectorAll('.quality-btn').forEach(btn=>{
    btn.addEventListener('click',e=>{
      document.querySelectorAll('.quality-btn').forEach(b=>b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const quality = e.currentTarget.dataset.quality;
      const resolutions = {low:'640x480',medium:'1280x720',high:'1920x1080',ultra:'3840x2160'};
      const bitrates = {low:'1.2 Mbps',medium:'2.5 Mbps',high:'5.2 Mbps',ultra:'12 Mbps'};
      document.getElementById('streamResolution').textContent = resolutions[quality];
      document.getElementById('streamBitrate').textContent = bitrates[quality];
      logCommand(`Quality changed to ${quality.charAt(0).toUpperCase() + quality.slice(1)}`);
    });
  });

  // Smart features
  document.getElementById('motionDetection')?.addEventListener('change',e=>{
    logCommand(e.target.checked ? 'Motion Detection: ON' : 'Motion Detection: OFF');
  });

  document.getElementById('nightVision')?.addEventListener('change',e=>{
    logCommand(e.target.checked ? 'Night Vision: ON' : 'Night Vision: OFF');
  });

  document.getElementById('stabilization')?.addEventListener('change',e=>{
    logCommand(e.target.checked ? 'Image Stabilization: ON' : 'Image Stabilization: OFF');
  });

  document.getElementById('autoFocus')?.addEventListener('change',e=>{
    logCommand(e.target.checked ? 'Auto Focus: ON' : 'Auto Focus: OFF');
  });

  // Image adjustment sliders
  const brightnessSlider = document.getElementById('brightnessSlider');
  const contrastSlider = document.getElementById('contrastSlider');
  const saturationSlider = document.getElementById('saturationSlider');

  if(brightnessSlider){
    brightnessSlider.addEventListener('input',e=>{
      const feed = document.getElementById('cameraFeed');
      if(feed) feed.style.filter = `brightness(${(e.target.value/50).toFixed(2)})`;
    });
  }

  if(contrastSlider){
    contrastSlider.addEventListener('input',e=>{
      // Can be combined with other filters
    });
  }

  if(saturationSlider){
    saturationSlider.addEventListener('input',e=>{
      // Can be combined with other filters
    });
  }

  // FPS selection
  document.getElementById('fpsSelect')?.addEventListener('change',e=>{
    document.getElementById('streamFps').textContent = e.target.value;
    logCommand(`FPS changed to ${e.target.value}`);
  });

  // Fullscreen button
  document.getElementById('fullscreenBtn')?.addEventListener('click',()=>{
    const feed = document.getElementById('cameraFeed');
    if(feed){
      if(feed.requestFullscreen){
        feed.requestFullscreen();
      }
      logCommand('Fullscreen mode enabled');
    }
  });

  // Simulate stream latency changes
  setInterval(()=>{
    const latency = Math.floor(Math.random() * 40 + 30);
    document.getElementById('streamLatency').textContent = latency + 'ms';
  }, 2000);
}

initSmartCameraControl();

// animate sensor icons briefly on update and apply status pulses
function animateSensorIcons(){
  const icons = document.querySelectorAll('.card-icon');
  icons.forEach((el, idx)=>{
    const icon = el; icon.classList.add('sensor-icon','anim-pop');
    setTimeout(()=>icon.classList.remove('anim-pop'),420);
    if(idx===2 && state.gas>5) { icon.classList.add('pulse'); setTimeout(()=>icon.classList.remove('pulse'),1400); }
    if(idx===0 && state.temp>40) { icon.classList.add('pulse'); setTimeout(()=>icon.classList.remove('pulse'),1400); }
  });
}

// Update signal strength bars visualization
function updateSignalBars(container, dbm){
  const bars = 4;
  const normalized = Math.max(0, Math.min(1, (dbm + 95) / 75)); // -95 (0%) to -20 (100%)
  const activeBars = Math.ceil(normalized * bars);
  let html = '';
  for(let i=0; i<bars; i++){
    const isActive = i < activeBars;
    const height = ((i+1)/bars)*100;
    html += `<div class="bar" style="height:${height}%;background:${isActive ? 'var(--primary)' : 'rgba(255,255,255,0.1)'};width:4px;margin:0 2px;border-radius:2px"></div>`;
  }
  container.innerHTML = html;
}

// Simple behavior/state machine for robot
function behaviorMachine(){
  const auto = document.getElementById('autoMode')?.checked;
  if(!auto){ state.behavior = 'idle'; return; }
  if(state.batt < 20) { state.behavior = 'return'; return; }
  if(state.dist < 30 || state.gas > 5) { state.behavior = 'avoid'; return; }
  state.behavior = 'explore';
}

// Robot visual: move robot based on distance (simulate X position)
function updateRobotVisual(){
  const robot = document.getElementById('robot');
  const label = document.getElementById('robotPosLabel');
  const cone = document.getElementById('sensorCone');
  const pathEl = document.getElementById('robotPath');
  const behaviorEl = document.getElementById('robotBehavior');
  if(!robot) return;
  const min = 10, max = 500; const clamped = Math.max(min, Math.min(max, state.dist));
  const pct = ((clamped - min) / (max - min)) * 70 + 10; // 10..80
  robot.style.left = pct + '%';
  const topPct = 45 + Math.sin(Date.now()/600 + pct)*2;
  robot.style.top = topPct + '%';
  robot.style.transform = `translate(-50%,-50%) rotate(${state.heading}deg)`;
  if(label) label.textContent = Math.round(clamped) + ' cm';
  if(cone){
    cone.style.left = `calc(${pct}% - 60px)`;
    cone.style.top = `calc(${topPct}% - 60px)`;
    cone.style.transform = `rotate(${state.heading}deg) scale(${Math.max(0.6, 1 - (clamped/600))})`;
  }
  if(pathEl){
    const dot = document.createElement('div'); dot.className = 'dot';
    const scene = document.getElementById('robotScene');
    if(scene){
      const rect = robot.getBoundingClientRect();
      const parent = scene.getBoundingClientRect();
      const x = ((rect.left + rect.width/2) - parent.left) / parent.width * 100;
      const y = ((rect.top + rect.height/2) - parent.top) / parent.height * 100;
      dot.style.left = x + '%'; dot.style.top = y + '%';
      pathEl.appendChild(dot);
      setTimeout(()=>{ dot.style.opacity = '0'; setTimeout(()=>dot.remove(),900); }, 1400);
    }
  }
  if(behaviorEl){ behaviorEl.textContent = state.behavior.charAt(0).toUpperCase()+state.behavior.slice(1); behaviorEl.className = 'robot-behavior '+state.behavior; }
}

// call animations after data updates
setInterval(()=>{ animateSensorIcons(); updateRobotVisual(); },1500);

// Sensor controls wiring (static HTML inputs)
function initSensorControls(){
  const tIn = document.getElementById('ctlTemp');
  const dIn = document.getElementById('ctlDist');
  const gIn = document.getElementById('ctlGas');
  const bIn = document.getElementById('ctlBatt');
  const apply = document.getElementById('applySensors');
  const rand = document.getElementById('randomSensors');
  const reset = document.getElementById('resetSensors');
  if(!apply) return;
  // initialize inputs
  if(tIn) tIn.value = state.temp;
  if(dIn) dIn.value = state.dist;
  if(gIn) gIn.value = state.gas;
  if(bIn) bIn.value = state.batt;

  apply.addEventListener('click', ()=>{
    if(tIn) state.temp = parseFloat(tIn.value) || state.temp;
    if(dIn) state.dist = parseFloat(dIn.value) || state.dist;
    if(gIn) state.gas = parseFloat(gIn.value) || state.gas;
    if(bIn) state.batt = parseFloat(bIn.value) || state.batt;
  });

  rand.addEventListener('click', ()=>{
    state.temp = +(20 + Math.random()*30).toFixed(1);
    state.dist = Math.round(20 + Math.random()*400);
    state.gas = +(Math.random()*8).toFixed(2);
    state.batt = Math.round(20 + Math.random()*80);
    if(tIn) tIn.value = state.temp; if(dIn) dIn.value = state.dist; if(gIn) gIn.value = state.gas; if(bIn) bIn.value = state.batt;
  });

  reset.addEventListener('click', ()=>{
    state = {temp:22.6,dist:120,gas:3,batt:88,heading:0,behavior:'idle'};
    if(tIn) tIn.value = state.temp; if(dIn) dIn.value = state.dist; if(gIn) gIn.value = state.gas; if(bIn) bIn.value = state.batt;
  });
}
initSensorControls();

// Theme picker wiring
function initThemePicker(){
  const thumbs = document.querySelectorAll('.theme-thumb');
  const sel = document.getElementById('themeSelect');
  function applyTheme(t){
    const scene = document.getElementById('robotScene');
    if(!scene) return;
    ['env-factory','env-night','env-warehouse','env-chemical'].forEach(c=>scene.classList.remove(c));
    scene.classList.add('env-'+t);
    thumbs.forEach(x=> x.classList.toggle('active', x.dataset.theme===t));
    if(sel) sel.value = t;
    localStorage.setItem('afir_theme', t);
  }
  thumbs.forEach(t=>t.addEventListener('click',()=>applyTheme(t.dataset.theme)));
  sel?.addEventListener('change',()=>applyTheme(sel.value));
  const saved = localStorage.getItem('afir_theme') || 'factory';
  applyTheme(saved);
}
initThemePicker();

// Smart Live Sensor Features
function initSmartLiveSensors(){
  let sensorReadings = {temps: [], gases: [], distances: [], battery: []};
  let updateInterval = 2000;

  // Update interval selection
  const updateIntervalSelect = document.getElementById('updateInterval');
  if(updateIntervalSelect){
    updateIntervalSelect.addEventListener('change',e=>{
      updateInterval = parseInt(e.target.value);
      logCommand(`Sensor update interval changed to ${updateInterval}ms`);
    });
  }

  // Threshold controls
  const tempThreshold = document.getElementById('tempThreshold');
  const gasThreshold = document.getElementById('gasThreshold');
  const battThreshold = document.getElementById('battThreshold');

  if(tempThreshold){
    tempThreshold.addEventListener('input',e=>{
      document.getElementById('tempThresholdValue').textContent = e.target.value + '°C';
    });
  }

  if(gasThreshold){
    gasThreshold.addEventListener('input',e=>{
      document.getElementById('gasThresholdValue').textContent = e.target.value + ' PPM';
    });
  }

  if(battThreshold){
    battThreshold.addEventListener('input',e=>{
      document.getElementById('battThresholdValue').textContent = e.target.value + '%';
    });
  }

  // Trend filter buttons
  document.querySelectorAll('.trend-filter').forEach(btn=>{
    btn.addEventListener('click',e=>{
      document.querySelectorAll('.trend-filter').forEach(b=>b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const sensor = e.currentTarget.dataset.sensor;
      logCommand(`Sensor filter: ${sensor.toUpperCase()}`);
    });
  });

  // Export functions
  document.getElementById('exportCSV')?.addEventListener('click',()=>{
    let csv = 'Time,Temperature,Gas,Distance,Battery\n';
    // Simulate data export
    logCommand('Data exported to CSV');
    addAlert('warning','CSV export downloaded');
  });

  document.getElementById('exportJSON')?.addEventListener('click',()=>{
    logCommand('Data exported to JSON');
    addAlert('warning','JSON export downloaded');
  });

  document.getElementById('clearHistory')?.addEventListener('click',()=>{
    const recentReadings = document.getElementById('recentReadings');
    if(recentReadings) recentReadings.innerHTML = '';
    sensorReadings = {temps: [], gases: [], distances: [], battery: []};
    logCommand('Sensor history cleared');
    addAlert('warning','Reading history cleared');
  });

  // Update sensor bars and stats
  function updateSensorDisplay(){
    // Update bars
    const tempPercent = Math.max(0, Math.min(100, (state.temp + 40) / 160 * 100));
    const distPercent = Math.max(0, Math.min(100, (state.dist / 500) * 100));
    const gasPercent = Math.max(0, Math.min(100, (state.gas / 100) * 100));
    const battPercent = state.batt;

    document.getElementById('tempBar').style.width = tempPercent + '%';
    document.getElementById('distBar').style.width = distPercent + '%';
    document.getElementById('gasBar').style.width = gasPercent + '%';
    document.getElementById('battBar').style.width = battPercent + '%';

    // Check thresholds and trigger alerts
    const tempThresh = parseInt(tempThreshold?.value) || 40;
    const gasThresh = parseInt(gasThreshold?.value) || 5;
    const battThresh = parseInt(battThreshold?.value) || 20;

    if(state.temp > tempThresh){
      document.querySelector('[style*="Temperature"]')?.parentElement?.style?.setProperty('border-color', 'rgba(255,75,75,0.5)');
    }

    if(state.gas > gasThresh){
      document.querySelector('[style*="💨"]')?.parentElement?.style?.setProperty('border-color', 'rgba(255,75,75,0.5)');
    }

    if(state.batt < battThresh){
      document.querySelector('[style*="🔋"]')?.parentElement?.style?.setProperty('border-color', 'rgba(255,75,75,0.5)');
    }

    // Update statistics
    if(sensorReadings.temps.length > 0){
      const avgTemp = (sensorReadings.temps.reduce((a,b)=>a+b,0) / sensorReadings.temps.length).toFixed(1);
      document.getElementById('stat-temp-avg').textContent = avgTemp + '°C';
    }

    if(sensorReadings.distances.length > 0){
      const minDist = Math.min(...sensorReadings.distances);
      document.getElementById('stat-dist-min').textContent = minDist + ' cm';
    }

    if(sensorReadings.gases.length > 0){
      const maxGas = Math.max(...sensorReadings.gases).toFixed(2);
      document.getElementById('stat-gas-max').textContent = maxGas + ' PPM';
    }

    document.getElementById('stat-data-points').textContent = sensorReadings.temps.length;

    // Store readings
    sensorReadings.temps.push(state.temp);
    sensorReadings.gases.push(state.gas);
    sensorReadings.distances.push(state.dist);
    sensorReadings.battery.push(state.batt);

    // Limit storage
    if(sensorReadings.temps.length > 100){
      sensorReadings.temps.shift();
      sensorReadings.gases.shift();
      sensorReadings.distances.shift();
      sensorReadings.battery.shift();
    }
  }

  // Update sensor display periodically
  setInterval(updateSensorDisplay, updateInterval);
  updateSensorDisplay();
}

initSmartLiveSensors();

// Smart Dashboard Features
function initSmartDashboard(){
  let uptimeSeconds = 0;
  
  function updateSystemHealth(){
    const tempStatus = state.temp < 40 ? 'good' : state.temp < 50 ? 'warning' : 'critical';
    const gasStatus = state.gas < 5 ? 'good' : state.gas < 8 ? 'warning' : 'critical';
    const battStatus = state.batt > 20 ? 'good' : state.batt > 10 ? 'warning' : 'critical';
    let healthPercent = 95;
    if(tempStatus !== 'good') healthPercent -= 10;
    if(gasStatus !== 'good') healthPercent -= 10;
    if(battStatus !== 'good') healthPercent -= 15;
    document.getElementById('sysHealth').textContent = Math.max(0, healthPercent) + '%';
    const sysHealthEl = document.getElementById('sysHealth').parentElement?.parentElement;
    if(sysHealthEl){
      if(healthPercent < 50) sysHealthEl.style.borderColor = 'rgba(255,75,75,0.3)';
      else if(healthPercent < 75) sysHealthEl.style.borderColor = 'rgba(255,159,67,0.3)';
      else sysHealthEl.style.borderColor = 'rgba(0,184,255,0.3)';
    }
  }
  
  function updateDiagnostics(){
    const latency = Math.floor(Math.random() * 40 + 20);
    document.getElementById('diagLatency').textContent = latency + 'ms';
    uptimeSeconds += 1;
    const hours = Math.floor(uptimeSeconds / 3600);
    const mins = Math.floor((uptimeSeconds % 3600) / 60);
    const secs = uptimeSeconds % 60;
    document.getElementById('diagSync').textContent = (hours > 0 ? hours + 'h ' : '') + mins + 'm ' + secs + 's';
  }
  
  document.getElementById('dashGoControl')?.addEventListener('click',()=>{
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    document.querySelector('[data-view="control"]').classList.add('active');
    document.getElementById('view-dashboard').hidden = true;
    document.getElementById('view-control').hidden = false;
    void document.getElementById('view-control').offsetWidth;
    document.getElementById('view-control').classList.add('view-enter');
  });
  
  document.getElementById('dashGoCamera')?.addEventListener('click',()=>{
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    document.querySelector('[data-view="camera"]').classList.add('active');
    document.getElementById('view-dashboard').hidden = true;
    document.getElementById('view-camera').hidden = false;
    void document.getElementById('view-camera').offsetWidth;
    document.getElementById('view-camera').classList.add('view-enter');
  });
  
  document.getElementById('dashGoSensors')?.addEventListener('click',()=>{
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    document.querySelector('[data-view="live"]').classList.add('active');
    document.getElementById('view-dashboard').hidden = true;
    document.getElementById('view-live').hidden = false;
    void document.getElementById('view-live').offsetWidth;
    document.getElementById('view-live').classList.add('view-enter');
  });
  
  function updateRobotStatus(){
    const modeEl = document.getElementById('dashRobotMode');
    const stateEl = document.getElementById('dashRobotState');
    const signalEl = document.getElementById('dashRobotSignal');
    if(modeEl) modeEl.textContent = state.mode ? (state.mode.charAt(0).toUpperCase() + state.mode.slice(1)) : 'Manual';
    if(stateEl) stateEl.textContent = state.behavior.charAt(0).toUpperCase() + state.behavior.slice(1);
    if(signalEl) signalEl.textContent = state.signal + ' dBm';
  }
  
  updateSystemHealth();
  updateDiagnostics();
  updateRobotStatus();
  setInterval(updateSystemHealth, 1500);
  setInterval(updateDiagnostics, 1000);
  setInterval(updateRobotStatus, 800);
}

initSmartDashboard();

// Smart Alerts Features
function initSmartAlerts(){
  let alertHistory = [];
  let currentFilter = 'all';
  let silenced = false;

  // Update alert counts
  function updateAlertCounts(){
    const all = alertHistory.length;
    const warnings = alertHistory.filter(a => a.level === 'warning').length;
    const critical = alertHistory.filter(a => a.level === 'critical').length;
    const resolved = alertHistory.filter(a => a.resolved).length;

    document.getElementById('alertCountActive').textContent = all - resolved;
    document.getElementById('alertCountWarning').textContent = warnings;
    document.getElementById('alertCountCritical').textContent = critical;
    document.getElementById('alertCountResolved').textContent = resolved;

    // Calculate summary stats
    const lastHour = alertHistory.filter(a => {
      const now = Date.now();
      return a.timestamp && (now - a.timestamp) < 3600000;
    }).length;
    
    document.getElementById('alertCountLastHour').textContent = lastHour + ' alerts';
    
    // Most frequent alert type
    if(alertHistory.length > 0){
      const types = {};
      alertHistory.forEach(a => {
        types[a.message?.split(' ')[0] || 'Unknown'] = (types[a.message?.split(' ')[0] || 'Unknown'] || 0) + 1;
      });
      const most = Object.keys(types).reduce((a, b) => types[a] > types[b] ? a : b);
      document.getElementById('alertMostFrequent').textContent = most || '--';
    }

    // Average response time (simulated)
    const avgResponse = Math.floor(Math.random() * 500 + 100);
    document.getElementById('alertAvgResponse').textContent = avgResponse + ' ms';
  }

  // Update timestamp
  setInterval(() => {
    const now = new Date();
    document.getElementById('alertTimestamp').textContent = now.toLocaleTimeString();
  }, 1000);

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentFilter = e.currentTarget.dataset.filter;
      applyFilter();
    });
  });

  // Apply filter to alert list
  function applyFilter(){
    const items = document.querySelectorAll('#alertsMainList li');
    items.forEach(item => {
      let show = true;
      if(currentFilter === 'warning') show = item.querySelector('.status-dot.orange') !== null;
      else if(currentFilter === 'critical') show = item.querySelector('.status-dot.red') !== null;
      else if(currentFilter === 'resolved') show = item.classList.contains('resolved-alert');
      item.style.display = show ? '' : 'none';
    });
  }

  // Acknowledge all alerts
  document.getElementById('alertAckAll')?.addEventListener('click', () => {
    alertHistory.forEach(a => a.resolved = true);
    document.querySelectorAll('#alertsMainList li').forEach(li => li.classList.add('resolved-alert'));
    updateAlertCounts();
    logCommand('All alerts acknowledged');
  });

  // Clear resolved alerts
  document.getElementById('alertClearResolved')?.addEventListener('click', () => {
    alertHistory = alertHistory.filter(a => !a.resolved);
    document.querySelectorAll('#alertsMainList li.resolved-alert').forEach(li => li.remove());
    updateAlertCounts();
    logCommand('Resolved alerts cleared');
  });

  // Export alert log
  document.getElementById('alertExport')?.addEventListener('click', () => {
    const json = JSON.stringify(alertHistory, null, 2);
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'alert-log-' + new Date().toISOString() + '.json';
    a.click();
    logCommand('Alert log exported');
    addAlert('warning', 'Alert log exported to JSON');
  });

  // View critical only
  document.getElementById('alertViewCritical')?.addEventListener('click', () => {
    const btn = document.querySelector('[data-filter="critical"]');
    if(btn) btn.click();
    logCommand('Filtering: Critical alerts only');
  });

  // Silence notifications
  document.getElementById('alertSilenceAll')?.addEventListener('click', () => {
    silenced = !silenced;
    const btn = document.getElementById('alertSilenceAll');
    if(silenced){
      btn.style.background = 'rgba(40,208,123,0.15)';
      btn.style.color = '#28D07B';
      btn.textContent = '🔇 Notifications Silenced';
      logCommand('Alert notifications silenced');
    } else {
      btn.style.background = 'rgba(255,159,67,0.15)';
      btn.style.color = '#FF9F43';
      btn.textContent = '🔊 Silence Notifications';
      logCommand('Alert notifications enabled');
    }
  });

  // Auto resolve warnings
  document.getElementById('alertAutoResolve')?.addEventListener('click', () => {
    const warnings = alertHistory.filter(a => a.level === 'warning' && !a.resolved);
    warnings.forEach(w => w.resolved = true);
    document.querySelectorAll('#alertsMainList li').forEach(li => {
      if(li.querySelector('.status-dot.orange')) li.classList.add('resolved-alert');
    });
    updateAlertCounts();
    logCommand(`Auto-resolved ${warnings.length} warning(s)`);
    addAlert('warning', `${warnings.length} warnings auto-resolved`);
  });

  // Override original addAlert to track history
  const originalAddAlert = window.addAlert;
  window.addAlert = function(level, msg){
    const alert = {
      level: level,
      message: msg,
      timestamp: Date.now(),
      resolved: false
    };
    alertHistory.push(alert);
    
    // Keep only last 50 alerts
    if(alertHistory.length > 50) alertHistory.shift();
    
    // Limit display to 20 items
    const items = document.querySelectorAll('#alertsMainList li');
    if(items.length > 20) items[items.length - 1].remove();
    
    updateAlertCounts();
    return originalAddAlert(level, msg);
  };

  // Initial update
  updateAlertCounts();
  
  // Update counts every 2 seconds
  setInterval(updateAlertCounts, 2000);
}

initSmartAlerts();

// Smart Settings Features
function initSmartSettings(){
  // Load settings from localStorage
  function loadSettings(){
    const saved = localStorage.getItem('appSettings');
    return saved ? JSON.parse(saved) : {
      darkMode: true,
      reducedMotion: false,
      compactView: false,
      allNotif: true,
      criticalNotif: true,
      soundAlert: true,
      autoCalib: true,
      timeSync: true,
      autoRestart: true,
      autoResolve: false,
      logRotate: true,
      healthInterval: '2 minutes',
      tempOffset: 0.2,
      proxOffset: 1
    };
  }

  // Save settings to localStorage
  function saveSettings(settings){
    localStorage.setItem('appSettings', JSON.stringify(settings));
    logCommand('Settings saved to browser storage');
    addAlert('warning', 'Settings have been saved');
  }

  // Update statistics display
  function updateSettingsStats(){
    const settings = loadSettings();
    
    // Theme mode
    document.getElementById('settingThemeMode').textContent = settings.darkMode ? 'Dark' : 'Light';
    
    // Notification status
    const notifStatus = settings.allNotif ? 'On' : 'Off';
    document.getElementById('settingNotifStatus').textContent = notifStatus;
    
    // Count active automations
    const autoCount = [settings.autoRestart, settings.autoResolve, settings.logRotate].filter(Boolean).length;
    document.getElementById('settingAutoCount').textContent = autoCount;
    
    // Data usage (simulated)
    const usage = Math.floor(Math.random() * 30 + 35);
    document.getElementById('settingDataUsage').textContent = usage + '%';
  }

  // Load and apply all settings
  const settings = loadSettings();
  
  // Apply toggle states
  document.getElementById('settingDarkMode').checked = settings.darkMode;
  document.getElementById('settingReduceMotion').checked = settings.reducedMotion;
  document.getElementById('settingCompactView').checked = settings.compactView;
  document.getElementById('settingAutoCalib').checked = settings.autoCalib;
  document.getElementById('settingTimeSync').checked = settings.timeSync;
  document.getElementById('settingAllNotif').checked = settings.allNotif;
  document.getElementById('settingCriticalNotif').checked = settings.criticalNotif;
  document.getElementById('settingSoundAlert').checked = settings.soundAlert;
  document.getElementById('settingAutoRestart').checked = settings.autoRestart;
  document.getElementById('settingAutoResolve').checked = settings.autoResolve;
  document.getElementById('settingLogRotate').checked = settings.logRotate;
  document.getElementById('settingHealthInterval').value = settings.healthInterval;
  document.getElementById('settingTempOffset').value = settings.tempOffset;
  document.getElementById('settingProxOffset').value = settings.proxOffset;

  // Add toggle change listeners
  document.querySelectorAll('.setting-toggle').forEach(toggle => {
    toggle.addEventListener('change', e => {
      const key = e.target.id.replace('setting', '');
      const lowercaseKey = key[0].toLowerCase() + key.slice(1);
      settings[lowercaseKey] = e.target.checked;
      updateSettingsStats();
      logCommand(`Setting changed: ${key} = ${e.target.checked}`);
    });
  });

  // Add select change listeners
  document.getElementById('settingHealthInterval').addEventListener('change', e => {
    settings.healthInterval = e.target.value;
    logCommand(`Health check interval set to ${e.target.value}`);
  });

  // Add number input listeners
  document.getElementById('settingTempOffset').addEventListener('change', e => {
    settings.tempOffset = parseFloat(e.target.value);
    logCommand(`Temperature offset set to ${e.target.value}°C`);
  });

  document.getElementById('settingProxOffset').addEventListener('change', e => {
    settings.proxOffset = parseFloat(e.target.value);
    logCommand(`Proximity offset set to ${e.target.value}cm`);
  });

  // Save Settings button
  document.getElementById('settingsSave').addEventListener('click', () => {
    saveSettings(settings);
    updateSettingsStats();
  });

  // Export Config button
  document.getElementById('settingsExport').addEventListener('click', () => {
    const config = {
      exportDate: new Date().toISOString(),
      settings: settings,
      systemInfo: {
        ip: document.getElementById('settingNetworkIP').textContent,
        theme: settings.darkMode ? 'Dark' : 'Light'
      }
    };
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'settings-config-' + new Date().toISOString() + '.json';
    a.click();
    logCommand('Settings configuration exported');
    addAlert('warning', 'Configuration exported to JSON file');
  });

  // Reset to Default button
  document.getElementById('settingsReset').addEventListener('click', () => {
    if(confirm('Reset all settings to defaults? This cannot be undone.')){
      localStorage.removeItem('appSettings');
      location.reload();
    }
  });

  // Clear Cache button
  document.getElementById('settingsClear').addEventListener('click', () => {
    if(confirm('Clear all cached data? This cannot be undone.')){
      localStorage.clear();
      sessionStorage.clear();
      logCommand('Application cache cleared');
      addAlert('warning', 'Cache cleared, reloading...');
      setTimeout(() => location.reload(), 1500);
    }
  });

  // Initial update
  updateSettingsStats();
  
  // Update stats every 3 seconds
  setInterval(updateSettingsStats, 3000);
}

initSmartSettings();
