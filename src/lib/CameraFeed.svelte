<script>
  import { onMount, onDestroy } from 'svelte';
  import { sensors } from '../stores/sensors.js';

  let useWebcam = true;
  let stream = null;
  let videoEl;
  let canvasEl;
  let animId = null;
  let mode = 'auto'; // auto | live | mock
  let ctx;
  let w = 640, h = 360;
  let timestamp = '';
  let subs;
  let sensorState = {};

  subs = sensors.subscribe(v => sensorState = v);

  async function startWebcam(){
    try{
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
      videoEl.srcObject = stream;
      await videoEl.play();
      mode = 'live';
      cancelMock();
    }catch(e){
      mode = 'mock';
      startMock();
    }
  }

  function stopWebcam(){
    if(stream){
      stream.getTracks().forEach(t=>t.stop());
      stream = null;
    }
    if(videoEl) videoEl.srcObject = null;
  }

  function drawMockFrame(){
    if(!ctx) return;
    ctx.fillStyle = '#1a1f24';
    ctx.fillRect(0,0,w,h);

    // moving rectangles to simulate activity
    const t = Date.now()/600;
    for(let i=0;i<6;i++){
      const x = (Math.sin(t + i) + 1)/2 * (w - 120);
      const y = 40 + i*48;
      ctx.fillStyle = `rgba(${40+i*30},${120+i*10},${200-i*20},0.9)`;
      ctx.fillRect(40 + x, y, 100, 28);
    }

    // overlay: crosshair
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w/2-20, h/2);
    ctx.lineTo(w/2+20, h/2);
    ctx.moveTo(w/2, h/2-20);
    ctx.lineTo(w/2, h/2+20);
    ctx.stroke();

    // telemetry overlay
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(8,8,220,66);
    ctx.fillStyle = '#8bd3ff';
    ctx.font = '14px Inter, system-ui, sans-serif';
    timestamp = new Date().toLocaleTimeString();
    ctx.fillText(`CAM MODE: MOCK`, 16, 28);
    ctx.fillText(`TIME: ${timestamp}`, 16, 48);
    ctx.fillText(`TEMP: ${sensorState.temp ?? '-'} °C`, 16, 68);

    animId = requestAnimationFrame(drawMockFrame);
  }

  function startMock(){
    if(!canvasEl) return;
    ctx = canvasEl.getContext('2d');
    w = canvasEl.width; h = canvasEl.height;
    cancelMock();
    animId = requestAnimationFrame(drawMockFrame);
  }

  function cancelMock(){
    if(animId) cancelAnimationFrame(animId);
    animId = null;
  }

  onMount(()=>{
    // choose default: try webcam, else mock
    if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
      startWebcam();
    }else{
      mode = 'mock';
      startMock();
    }
  });

  onDestroy(()=>{
    stopWebcam();
    cancelMock();
    if(subs) subs();
  });

  function toggleMode(){
    if(mode==='live'){
      stopWebcam();
      mode='mock';
      startMock();
    }else{
      startWebcam();
    }
  }
</script>

<div class="camera-card">
  <div class="camera-header">
    <div class="title">Front Camera</div>
    <div class="controls">
      <button on:click={toggleMode} class="small">{mode==='live'?'Switch to Mock':'Use Webcam'}</button>
    </div>
  </div>

  <div class="camera-stage">
    <video bind:this={videoEl} class="camera-video" autoplay playsinline muted></video>
    <canvas bind:this={canvasEl} width="640" height="360" class="camera-canvas"></canvas>
    <div class="cam-overlay">
      <div class="badge">{mode.toUpperCase()}</div>
      <div class="cam-meta">{timestamp}</div>
    </div>
  </div>

  <div class="camera-footer">
    <div class="meta">Resolution: {videoEl && videoEl.videoWidth ? `${videoEl.videoWidth}x${videoEl.videoHeight}` : '—'}</div>
    <div class="meta">Battery: {sensorState.batt ?? '—'}%</div>
  </div>
</div>

<style>
.camera-card{background:linear-gradient(180deg,rgba(255,255,255,0.02),transparent);border-radius:10px;padding:10px;color:var(--text);}
.camera-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.camera-stage{position:relative;width:100%;max-width:900px;height:auto;border-radius:8px;overflow:hidden;background:#111}
.camera-video{display:block;width:100%;height:auto;object-fit:cover}
.camera-canvas{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}
.cam-overlay{position:absolute;left:8px;top:8px;color:#8bd3ff;font-weight:600}
.cam-overlay .badge{background:rgba(0,0,0,0.5);padding:6px 8px;border-radius:6px}
.camera-footer{display:flex;justify-content:space-between;padding-top:8px;font-size:13px;color:var(--muted-text)}
.video-hidden{display:none}
</style>
