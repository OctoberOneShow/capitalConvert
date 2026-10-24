"use strict";
const fs = require("fs"), path = require("path");
const { createEnvironment, run, check } = require("./lib");
const files = ["i18n", "core", "game-registry", "love-deepspace-mosaic", "love-deepspace-dates", "game-love-deepspace"];
const source = files.map(name => fs.readFileSync(path.join(__dirname,"../../assets/app",name+".js"),"utf8")).join("\n");
function boot(options) { const env=createEnvironment(options); env.load(source); env.App=env.window.CapitalConvert; return env; }
function complete(R,s,swap,rotate) {
  for(let target=0;target<s.tiles.length&&!s.done;target++) {
    const origin=s.tiles.findIndex(tile=>tile.id===target);
    if(origin!==target) { if(!swap(target,origin)) return false; }
  }
  for(let i=0;i<s.tiles.length&&!s.done;i++) { let guard=0; while(s.tiles[i].turn && guard++<4) { if(!rotate(i))return false; } }
  return s.done;
}
function mount(env,options) {
  const host=env.document.createElement("div"); env.document.body.appendChild(host); const rewards=[];
  const game=env.App.mountLdsMosaic(host,Object.assign({isHidden:()=>false,onReward:(kind,token)=>rewards.push({kind,token}),onMoment(){}},options));
  return {host,game,rewards};
}
function completeUI(m) {
  for(let i=0;i<m.game.inspect().state.tiles.length;i++) {
    const state=m.game.inspect().state,origin=state.tiles.findIndex(tile=>tile.id===i);
    if(origin!==i) { m.host.querySelector('[data-mosaic-tile="'+i+'"]').click(); m.host.querySelector('[data-mosaic-tile="'+origin+'"]').click(); }
  }
  for(let i=0;i<m.game.inspect().state.tiles.length;i++) {
    let guard=0;
    while(m.game.inspect().state.tiles[i].turn&&guard++<4) {
      if(m.host.querySelector('[data-mosaic-tile="'+i+'"]').getAttribute("aria-pressed")!=="true")m.host.querySelector('[data-mosaic-tile="'+i+'"]').click();
      m.host.querySelector('[data-i18n="ldmRotate"]').click();
    }
  }
  return m.game.inspect().state.done;
}
run("Mosaic exact targets and legal solutions",()=>{
  const env=boot(),R=env.App.ldsMosaicRules,ids=["xavier","zayne","rafayel","sylus","caleb"],deals=new Set();
  for(const id of ids) {
    const saved=R.read(null);
    for(const stage of R.stages) {
      const state=R.create(stage.id,id),before=JSON.stringify(state),initial=state.par;
      check("Mosaic exact targets and legal solutions",id+" stage"+stage.id+" is reproducible and begins unsolved",JSON.stringify(R.create(stage.id,id))===before&&!R.solved(state)&&initial>0);
      deals.add(JSON.stringify(state.tiles));
      check("Mosaic exact targets and legal solutions",id+" stage"+stage.id+" has every fragment exactly once",new Set(state.tiles.map(p=>p.id)).size===stage.size*stage.size);
      const won=complete(R,state,(a,b)=>R.swap(state,a,b),i=>R.rotate(state,i));
      check("Mosaic exact targets and legal solutions",id+" stage"+stage.id+" reaches its advertised perfect target legally",won&&state.moves===initial&&R.stars(state)===3);
      check("Mosaic exact targets and legal solutions",id+" stage"+stage.id+" first clear advances saved progress exactly once",R.record(saved,id,state)&&!R.record(saved,id,state)&&R.progress(saved,id).cleared===stage.id+1);
      const completeSave=JSON.stringify(state);R.swap(state,0,1);R.rotate(state,0);R.assist(state);R.undo(state);
      check("Mosaic exact targets and legal solutions","completed puzzle ignores further mutations",JSON.stringify(state)===completeSave);
    }
    check("Mosaic exact targets and legal solutions",id+" keeps all nine three-star records",R.progress(R.read(JSON.stringify(saved)),id).totalStars===27);
  }
  check("Mosaic exact targets and legal solutions","all45 partner photographs have distinct puzzle deals",deals.size===45);
});
run("Mosaic assistance, undo and save validation",()=>{
  const R=boot().App.ldsMosaicRules,s=R.create(0,"xavier"),before=JSON.stringify(s.tiles);
  check("Mosaic assistance, undo and save validation","same-cell or invalid swaps consume nothing",!R.swap(s,0,0)&&!R.swap(s,-1,0)&&s.moves===0);
  check("Mosaic assistance, undo and save validation","introductory stages reject rotation",!R.rotate(s,0)&&s.moves===0);
  R.swap(s,0,1);R.undo(s);
  check("Mosaic assistance, undo and save validation","undo restores the board and retains spent actions",JSON.stringify(s.tiles)===before&&s.moves===1);
  R.assist(s);R.undo(s);
  check("Mosaic assistance, undo and save validation","undo cannot erase assistance grading",s.hints===1&&s.moves===2);
  let guard=0;while(!s.done&&guard++<80)R.assist(s);
  check("Mosaic assistance, undo and save validation","assistance can finish a board with an honest one-star result",s.done&&R.stars(s)===1);
  for(const raw of [null,"{broken","[]",'{"version":2}'])check("Mosaic assistance, undo and save validation","bad saves recover: "+raw,R.progress(R.read(raw),"xavier").cleared===0);
  const bad=R.read('{"version":1,"partners":{"xavier":[3,0,3,3],"caleb":[9,-1,"3"]}}');
  check("Mosaic assistance, undo and save validation","records beyond a gap and malformed stars cannot unlock content",bad.partners.xavier.join()==="3,0,0,0,0,0,0,0,0"&&R.progress(bad,"caleb").cleared===0);
  check("Mosaic assistance, undo and save validation","array-shaped objects are rejected as saved stage lists",R.progress(R.read('{"version":1,"partners":{"xavier":{"0":3}}}'),"xavier").cleared===0);
  const forged=R.create(1,"xavier");complete(R,forged,(a,b)=>R.swap(forged,a,b),i=>R.rotate(forged,i));
  check("Mosaic assistance, undo and save validation","a forged out-of-order clear earns no record",!R.record(R.read(null),"xavier",forged));
  forged.stage=0;forged.par=-1;forged.moves=0;
  check("Mosaic assistance, undo and save validation","impossible records and null state earn no record",!R.record(R.read(null),"xavier",forged)&&!R.record(R.read(null),"xavier",null));
  const wrongPartner=R.create(0,"xavier");complete(R,wrongPartner,(a,b)=>R.swap(wrongPartner,a,b),i=>R.rotate(wrongPartner,i));
  check("Mosaic assistance, undo and save validation","one partner's solved board cannot claim another partner's record",!R.record(R.read(null),"caleb",wrongPartner));
  const sparse=R.create(0,"xavier");sparse.tiles=Array(9);sparse.done=true;sparse.moves=sparse.par;
  check("Mosaic assistance, undo and save validation","missing fragments cannot masquerade as a solved photograph",!R.solved(sparse)&&!R.record(R.read(null),"xavier",sparse));
});
run("Mosaic native controls and lifecycle",()=>{
  const env=boot(),m=mount(env);check("Mosaic native controls and lifecycle","native controls legally complete the introductory photograph",completeUI(m)&&m.rewards.length===1&&m.game.getProgress().totalStars===3);
  m.host.querySelector('[data-i18n="ldmReset"]').click();completeUI(m);
  check("Mosaic native controls and lifecycle","replaying a photograph cannot duplicate its keepsake",m.rewards.length===1);
  for(let stage=1;stage<9;stage++){m.game.selectStage(stage);check("Mosaic native controls and lifecycle","real buttons solve photograph"+stage,completeUI(m));}
  check("Mosaic native controls and lifecycle","all nine real controls save27stars and9rewards",m.game.getProgress().totalStars===27&&m.rewards.length===9);
  m.game.selectStage(3);const turnIndex=m.game.inspect().state.tiles.findIndex(tile=>tile.turn!==0);m.host.querySelector('[data-mosaic-tile="'+turnIndex+'"]').click();
  const turnButton=m.host.querySelector('[data-i18n="ldmRotate"]');let turns=0;while(m.game.inspect().state.tiles[turnIndex].turn&&turns++<4){turnButton.focus();turnButton.click();}
  check("Mosaic native controls and lifecycle","upright rotation moves focus before disabling its control",env.document.activeElement===m.host.querySelector('[data-mosaic-tile="'+turnIndex+'"]'));
  m.game.selectStage(0);const help=m.host.querySelector('[data-i18n="ldmHint"]');let hintGuard=0;while(!m.game.inspect().state.done&&hintGuard++<30){help.focus();help.click();}
  check("Mosaic native controls and lifecycle","finishing with assistance keeps keyboard focus on the board",m.game.inspect().state.done&&m.host.querySelector(".ldm-board").contains(env.document.activeElement));
  const again=mount(env);again.game.selectStage(0);completeUI(again);check("Mosaic native controls and lifecycle","remount preserves collections without replay rewards",!again.rewards.length&&again.game.getProgress().cleared===9);
  const another=env.App.ldsPartners.find(p=>p.id==="caleb");m.game.setPartner(another);check("Mosaic native controls and lifecycle","partner records are isolated",m.game.getProgress().cleared===0&&m.game.inspect().state.stage===0);
  let hidden=true;const blocked=mount(env,{isHidden:()=>hidden});const before=JSON.stringify(blocked.game.inspect().state);
  blocked.host.querySelector('[data-mosaic-tile="0"]').click();blocked.host.querySelector('[data-mosaic-tile="1"]').click();blocked.host.querySelector('[data-i18n="ldmHint"]').click();
  check("Mosaic native controls and lifecycle","hidden actions and direct stage selection are ignored",JSON.stringify(blocked.game.inspect().state)===before&&!blocked.game.selectStage(0));
  hidden=false;blocked.game.pause();blocked.game.refresh();check("Mosaic native controls and lifecycle","untimed play resumes after focus or visibility returns",completeUI(blocked));
  blocked.game.selectStage(0);const tile=blocked.host.querySelector('[data-mosaic-tile="0"]');env.dispatch(tile,"keydown",{key:"ArrowRight"});check("Mosaic native controls and lifecycle","arrows move keyboard focus",env.document.activeElement===blocked.host.querySelector('[data-mosaic-tile="1"]'));
  for(const storageMode of ["absent","readwrite-throw"]){const e=boot({storageMode}),a=mount(e);completeUI(a);const b=mount(e);b.game.selectStage(0);completeUI(b);check("Mosaic native controls and lifecycle",storageMode+" supports session collections without duplicate rewards",a.rewards.length===1&&!b.rewards.length);}
});
run("Mosaic bilingual interface",()=>{
  const text=fs.readFileSync(path.join(__dirname,"../../assets/app/love-deepspace-mosaic.js"),"utf8");const keys=[...text.matchAll(/\b(ldm[A-Za-z]+|ldx[A-Za-z]+|ldsDateMosaic):\s*\[/g)].map(m=>m[1]);
  for(const language of ["en-US","zh-CN"]){const e=boot({language});for(const key of keys)check("Mosaic bilingual interface",language+" resolves "+key,e.App.t(key)!==key&&!e.App.t(key).includes("undefined"));}
});
if(require.main===module){const lib=require("./lib");console.log("Mosaic passed: "+lib.passCount+"; failed: "+lib.failures.length);lib.failures.forEach(f=>console.error(f));process.exitCode=lib.failures.length?1:0;}
