import { writable } from 'svelte/store';

// reactive sensor store with mock updater (used by Svelte components)
function createSensors(){
  const { subscribe, set, update } = writable({ temp:22.6, dist:120, gas:3.0, batt:88, uptime: 12200 });

  let interval = null;
  function start(){
    if(interval) return;
    interval = setInterval(()=>{
      update(s=>{
        const temp = +((s.temp + (Math.random()-0.48)*0.6).toFixed(1));
        const dist = Math.max(10, Math.round(s.dist + (Math.random()-0.5)*4));
        const gas = +((s.gas + (Math.random()-0.4)*0.4).toFixed(2));
        const batt = Math.max(0, Math.round(s.batt - Math.random()*0.02*100)/1);
        const uptime = s.uptime + 1;
        return { ...s, temp, dist, gas, batt, uptime };
      });
    }, 1200);
  }
  function stop(){ if(interval) { clearInterval(interval); interval = null; } }

  // start on module import
  start();

  return { subscribe, set, update, start, stop };
}

export const sensors = createSensors();
