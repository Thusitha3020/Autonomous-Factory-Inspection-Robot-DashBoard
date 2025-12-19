<script>
  // This page embeds the existing static prototype for quick preview.
  // For production migration we should port the markup into Svelte components.
</script>

<style>
  .frame {height:100vh}
  .note {color:var(--muted-text);padding:12px}
</style>

<script>
  import RobotStage from '../lib/RobotStage.svelte';
  import CameraFeed from '../lib/CameraFeed.svelte';
  import { sensors } from '../stores/sensors.js';
  let state = {};
  const unsub = sensors.subscribe(v=> state = v);
</script>

<div class="frame">
  <div class="note">Live Svelte components: Robot visualization and sensor preview. The old static prototype has been removed.</div>

  <section style="display:grid;grid-template-columns:2fr 1fr;gap:18px;margin:16px 0;">
    <div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <CameraFeed />
        </div>
        <div>
          <RobotStage />
        </div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="card" style="padding:12px">
        <div class="label">Temperature</div>
        <div style="font-size:28px;font-weight:700">{state.temp} °C</div>
      </div>
      <div class="card" style="padding:12px">
        <div class="label">Proximity</div>
        <div style="font-size:28px;font-weight:700">{state.dist} cm</div>
      </div>
      <div class="card" style="padding:12px">
        <div class="label">Gas</div>
        <div style="font-size:28px;font-weight:700">{state.gas} PPM</div>
      </div>
    </div>
  </section>

  <section style="margin-top:12px;display:flex;gap:12px;align-items:center">
    <div class="card" style="padding:12px;display:flex;gap:8px;align-items:center">
      <div style="min-width:120px">Set Sensors</div>
      <input type="number" bind:value={tempVal} step="0.1" min="-40" max="120" style="width:110px;padding:8px;border-radius:8px;border:none;background:rgba(255,255,255,0.02);color:var(--text)">
      <input type="range" bind:value={distVal} min="5" max="500" style="width:160px">
      <input type="number" bind:value={gasVal} step="0.01" min="0" max="100" style="width:90px;padding:8px;border-radius:8px;border:none;background:rgba(255,255,255,0.02);color:var(--text)">
      <input type="range" bind:value={battVal} min="0" max="100" style="width:120px">
      <button class="small" on:click={applySensors}>Apply</button>
      <button class="small muted" on:click={resetSensors}>Reset</button>
    </div>
  </section>

  <!-- static prototype removed -->
</div>

<script>
  // cleanup
  export function onDestroy(){ unsub(); }
</script>

<script>
  // local control bindings
  import { sensors } from '../stores/sensors.js';
  let tempVal = 22.6;
  let distVal = 120;
  let gasVal = 3.0;
  let battVal = 88;
  function applySensors(){
    sensors.update(s=>({ ...s, temp: parseFloat(tempVal)||s.temp, dist: parseInt(distVal)||s.dist, gas: parseFloat(gasVal)||s.gas, batt: parseInt(battVal)||s.batt }));
  }
  function resetSensors(){
    tempVal = 22.6; distVal = 120; gasVal = 3.0; battVal = 88; applySensors();
  }
</script>
