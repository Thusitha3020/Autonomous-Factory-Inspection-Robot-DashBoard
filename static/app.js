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

let state = {temp:22.6,dist:120,gas:3,batt:88,heading:0,behavior:'idle'};

function pushData(){
  if(!streaming) return;
  // simulate small random drift
  state.temp = +(state.temp + (Math.random()-0.48)*0.6).toFixed(1);
  state.dist = Math.max(5,Math.round(state.dist + (Math.random()-0.5)*6));
  state.gas = +(state.gas + (Math.random()-0.4)*0.5).toFixed(2);
  state.batt = Math.max(0,Math.round(state.batt - Math.random()*0.02*100)/1);
  state.heading = (state.heading + (Math.random()-0.5)*30) % 360;

  // update cards
  if(cardTemp) cardTemp.textContent = state.temp;
  if(cardDist) cardDist.textContent = state.dist;
  if(cardGas) cardGas.textContent = state.gas;
  if(cardBatt) cardBatt.textContent = state.batt;

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
