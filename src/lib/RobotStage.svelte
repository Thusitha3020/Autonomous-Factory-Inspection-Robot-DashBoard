<script>
  import { onDestroy } from 'svelte';
  import { sensors } from '../stores/sensors.js';
  let state = { temp:0, dist:0, gas:0, batt:0 };
  const unsub = sensors.subscribe(v=> state = v);
  import { theme } from '../stores/theme.js';
  let currentTheme = 'factory';
  const unsubTheme = theme.subscribe(t => currentTheme = t);
  onDestroy(()=>unsub());
</script>

<div class="robot-stage">
  <div class="robot-scene {`env-${currentTheme}`}" aria-hidden="true">
    <div class="robot" bind:this={robotEl} style="left:10%" id="svelteRobot">
      <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
        <g>
          <rect x="18" y="12" width="84" height="44" rx="8" fill="#0F171D" stroke="#0B98E6" stroke-width="2"/>
          <rect x="36" y="4" width="48" height="20" rx="6" fill="#071018" stroke="#9B6CFF" stroke-width="1"/>
          <circle class="wheel left" cx="34" cy="64" r="8" fill="#0B1218" stroke="#666"/>
          <circle class="wheel right" cx="86" cy="64" r="8" fill="#0B1218" stroke="#666"/>
          <circle class="eye" cx="60" cy="32" r="6" fill="#00B8FF" opacity="0.95"/>
        </g>
      </svg>
    </div>
  </div>
  <div style="display:flex;gap:8px;width:100%;justify-content:space-between">
    <div class="label">Robot position</div>
    <div style="color:var(--muted-text)" id="robotPos">{state.dist} cm</div>
  </div>
</div>

<script>
  let robotEl;
  // map distance to left percent
  function update(){
    if(!robotEl) return;
    const min = 10, max = 500; const clamped = Math.max(min, Math.min(max, state.dist || 10));
    const pct = ((clamped - min) / (max - min)) * 70 + 10; // 10..80
    robotEl.style.left = pct + '%';
  }

  // subscribe to store updates for animation
  const u = sensors.subscribe(v=>{ state = v; update(); });
  onDestroy(()=>u());
  onDestroy(()=>unsubTheme());
</script>

<style>
/* local tweaks (global styles live in static/styles.css)
   keep styles small and component-scoped */
.robot-stage{width:100%}
.robot{transition:transform 480ms cubic-bezier(.2,.9,.3,1),left 560ms cubic-bezier(.2,.9,.3,1)}
.wheel{animation:wheelSpin 800ms linear infinite}
@keyframes wheelSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
</style>