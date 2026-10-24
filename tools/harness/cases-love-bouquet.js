"use strict";

const fs = require("fs");
const path = require("path");
const { createEnvironment, check, run } = require("./lib");
const source = ["i18n", "core", "love-deepspace-bouquet"].map(name => fs.readFileSync(path.join(__dirname, "../../assets/app", name + ".js"), "utf8")).join("\n");
const ids = ["xavier", "zayne", "rafayel", "sylus", "caleb"];
const key = "love-deepspace-bouquet-v1";
function boot(options) { const env = createEnvironment(options); env.load(source); env.App = env.window.CapitalConvert; return env; }
// Independent constructive witness, expressed in colour and petal identities,
// not tile IDs or the implementation's deck positions. It has four harmony
// edges, six rhythm edges, two rainbow squares, six occupied 2x2 squares,
// four favourite-colour centre flowers, and seven preferred-petal border blooms.
function witness(order) {
  const colors = ["ivory", "rose", "sky", "violet"], petals = [3, 5, 8];
  const colorPattern = [1, 2, 1, 2, 3, 0, 0, 3, 1, 0, 0, 2];
  const petalPattern = [0, 0, 0, 0, 1, 1, 2, 0, 0, 1, 2, 0];
  return Array.from({length:16}, (_, i) => i < 12 ? {color: colors[(colors.indexOf(order.favorite) + colorPattern[i]) % 4], petals: petals[(petals.indexOf(order.preferredPetals) + petalPattern[i]) % 3]} : null);
}
function nextWitnessCell(state, target, flower) { return target.findIndex((bloom, i) => bloom && !state.board[i] && bloom.color === flower.color && bloom.petals === flower.petals); }
function complete(App, state) {
  const target = witness(App.ldsBouquetCommission(state.partner, state.commission));
  for (let n = 0; n < 12 && !state.done; n++) {
    const cell = nextWitnessCell(state, target, state.hand[0]);
    if (!App.ldsBouquetPlace(state, 0, cell)) return false;
  }
  return state.done;
}
function mount(env, partner = "xavier", options) {
  const host = env.document.createElement("div"); env.document.body.appendChild(host);
  const rewards = [], moments = [];
  const game = env.App.mountLdsBouquet(host, Object.assign({isHidden:()=>false, onReward:(kind, token)=>rewards.push([kind,token]), onMoment:mood=>moments.push(mood)}, options));
  game.setPartner({id:partner,nameKey:"ldsPartner"+partner[0].toUpperCase()+partner.slice(1)});
  return {host,game,rewards,moments};
}
function completeUI(env, m) {
  const target = witness(m.game.inspect().commission);
  let guard = 0;
  while (!m.game.inspect().state.done && guard++ < 12) {
    const state = m.game.inspect().state, cell = nextWitnessCell(state, target, state.hand[0]);
    m.host.querySelector('[data-bouquet-hand="0"]').click();
    m.host.querySelector('[data-bouquet-cell="'+cell+'"]').click();
    m.host.querySelector('[data-i18n="ldbPlant"]').click();
  }
  return m.game.inspect().state.done;
}

run("Bouquet six independently solvable commissions", () => {
  const {App} = boot(), proofScores = [80,84,86,86,84,80];
  for (const partner of ids) for (let id=0; id<6; id++) {
    const order = App.ldsBouquetCommission(partner,id), state = App.ldsCreateBouquet(partner,id);
    check("Bouquet six independently solvable commissions", partner+" commission "+(id+1)+" is deterministic with twelve unique blooms", JSON.stringify(order)===JSON.stringify(App.ldsBouquetCommission(partner,id)) && order.deck.length===12 && new Set(order.deck.map(t=>t.id)).size===12);
    check("Bouquet six independently solvable commissions", partner+" commission "+(id+1)+" has ascending honest star thresholds", order.bands[0]<order.bands[1] && order.bands[1]<order.bands[2] && (id===0 || order.bands[0]>App.ldsBouquetCommission(partner,id-1).bands[0]));
    check("Bouquet six independently solvable commissions", partner+" commission "+(id+1)+" witness is reachable through the actual three-card draft", complete(App,state));
    const result = App.ldsEvaluateBouquet(state.board,order), metrics = result.metrics;
    check("Bouquet six independently solvable commissions", partner+" commission "+(id+1)+" matches independently counted topology and score", metrics.harmony===4 && metrics.rhythm===6 && metrics.spectrum===2 && metrics.squares===6 && metrics.centerColor===4 && metrics.borderPetals===7 && result.score===proofScores[id]);
    check("Bouquet six independently solvable commissions", partner+" commission "+(id+1)+" can meet both requests and the three-star target", result.contractsMet && result.score>=order.bands[2] && App.ldsBouquetStars(state)===3);
  }
});

run("Bouquet actual board rules and reversible drafting", () => {
  const {App}=boot(), order=App.ldsBouquetCommission("xavier",0);
  function bloom(id,color,petals=3) { return {id,color,petals}; }
  let board=Array(16).fill(null); board[0]=bloom(0,"rose"); board[1]=bloom(1,"rose",5);
  let score=App.ldsEvaluateBouquet(board,order);
  check("Bouquet actual board rules and reversible drafting", "a same-colour pair counts once regardless of petals", score.score===7 && score.metrics.harmony===1 && score.metrics.rhythm===0);
  board=Array(16).fill(null); board[5]=bloom(0,"rose"); board[6]=bloom(1,"sky"); score=App.ldsEvaluateBouquet(board,order);
  check("Bouquet actual board rules and reversible drafting", "different colours with equal petals earn rhythm instead", score.score===6 && score.metrics.harmony===0 && score.metrics.rhythm===1);
  board=Array(16).fill(null); board[3]=bloom(0,"rose"); board[4]=bloom(1,"rose",5); board[8]=bloom(2,"sky",8);
  score=App.ldsEvaluateBouquet(board,order);
  check("Bouquet actual board rules and reversible drafting", "row boundaries and diagonal flowers never form edges", score.score===6 && score.metrics.harmony===0 && score.metrics.rhythm===0);
  board=Array(16).fill(null); [0,1,4,5].forEach((cell,i)=>board[cell]=bloom(i,["rose","sky","violet","ivory"][i],i===0?3:i===1?5:8));
  score=App.ldsEvaluateBouquet(board,order);
  check("Bouquet actual board rules and reversible drafting", "a four-colour square scores once and may include its separate rhythm edge", score.metrics.spectrum===1 && score.metrics.squares===1 && score.metrics.rhythm===1 && score.parts.spectrum===5);
  const state=App.ldsCreateBouquet("zayne",3), before=JSON.stringify(state), delta=App.ldsBouquetPreview(state,1,5);
  check("Bouquet actual board rules and reversible drafting", "preview is pure and includes actual projected points", JSON.stringify(state)===before && delta.delta===2 && delta.score===2);
  App.ldsBouquetPlace(state,1,5); const after=App.ldsEvaluateBouquet(state.board,App.ldsBouquetCommission("zayne",3));
  check("Bouquet actual board rules and reversible drafting", "placement matches preview and refills from the fixed ribbon", after.score===delta.score && state.placements===1 && state.hand.length===3 && state.cursor===4 && state.board[5].id===JSON.parse(before).hand[1].id);
  const placed=JSON.stringify(state);
  check("Bouquet actual board rules and reversible drafting", "occupied, out-of-range, fractional and absent hand placements are rejected", !App.ldsBouquetPlace(state,0,5) && !App.ldsBouquetPlace(state,0,-1) && !App.ldsBouquetPlace(state,0,16) && !App.ldsBouquetPlace(state,0,.5) && !App.ldsBouquetPlace(state,3,2) && !App.ldsBouquetPreview(state,0,5) && JSON.stringify(state)===placed);
  App.ldsBouquetUndo(state);
  const restored=JSON.parse(before); restored.selectedHand=1; restored.selectedCell=5;
  check("Bouquet actual board rules and reversible drafting", "undo restores the complete board, hand, ribbon and placement count", JSON.stringify(state)===JSON.stringify(restored));
  complete(App,state); const completed=JSON.stringify(state);
  check("Bouquet actual board rules and reversible drafting", "a thirteenth placement cannot alter a finished bouquet", !App.ldsBouquetPlace(state,0,15) && JSON.stringify(state)===completed);
  check("Bouquet actual board rules and reversible drafting", "finishing can be undone for deliberate refinement", App.ldsBouquetUndo(state) && !state.done && state.placements===11 && state.hand.length===1);
  const target=witness(App.ldsBouquetCommission(state.partner,state.commission)), cell=nextWitnessCell(state,target,state.hand[0]); App.ldsBouquetPlace(state,0,cell);
  check("Bouquet actual board rules and reversible drafting", "refinement scores the resulting board without a hidden undo penalty", App.ldsBouquetStars(state)===3);
  const unmet=App.ldsCreateBouquet("sylus",0); complete(App,unmet);
  [5,6,9,10].forEach((cell,i)=>{const corner=[0,3,12,15][i],temp=unmet.board[cell];unmet.board[cell]=unmet.board[corner];unmet.board[corner]=temp;});
  const result=App.ldsEvaluateBouquet(unmet.board,App.ldsBouquetCommission("sylus",0));
  check("Bouquet actual board rules and reversible drafting", "twelve flowers cannot clear with a missing partner request", result.metrics.flowers===12 && result.metrics.centerColor===0 && !result.contractsMet && App.ldsBouquetStars(unmet)===0);
  const gradedBoards=[{positions:[2,12,0,3,8,6,14,13,4,1,5,11],score:51,stars:1},{positions:[2,4,0,6,13,8,10,1,3,14,15,12],score:56,stars:2},{positions:[8,3,7,0,1,14,13,11,10,6,5,4],score:61,stars:3}];
  gradedBoards.forEach(example=>{const graded=App.ldsCreateBouquet("xavier",0); example.positions.forEach(cell=>App.ldsBouquetPlace(graded,0,cell));check("Bouquet actual board rules and reversible drafting", example.stars+" stars reflect an actual "+example.score+"-point arrangement",App.ldsEvaluateBouquet(graded.board,order).score===example.score && App.ldsBouquetStars(graded)===example.stars);});
});

run("Bouquet commission gates and lasting keepsakes", () => {
  const env=boot(),App=env.App;
  for(const raw of ["bad json","null",'{"version":8,"partners":{"xavier":[3]}}','{"version":1,"partners":{"xavier":[0,3,3]}}','{"version":1,"partners":{"xavier":["3",3]}}']) {
    check("Bouquet commission gates and lasting keepsakes", "invalid or noncontiguous records cannot skip commissions", App.ldsBouquetProgress(App.ldsReadBouquet(raw),"xavier").cleared===0);
  }
  const records=App.ldsReadBouquet(JSON.stringify({version:1,partners:{xavier:[2,4,3],caleb:[1,0,3]}}));
  check("Bouquet commission gates and lasting keepsakes", "only valid contiguous stars survive save validation", records.partners.xavier.join() === [2,0,0,0,0,0].join() && records.partners.caleb.join()===[1,0,0,0,0,0].join());
  const clean=App.ldsReadBouquet(),locked=App.ldsCreateBouquet("xavier",4); complete(App,locked);
  check("Bouquet commission gates and lasting keepsakes", "a valid board for a locked commission cannot award progress", !App.ldsRecordBouquet(clean,locked) && App.ldsBouquetProgress(clean,"xavier").cleared===0);
  const valid=App.ldsCreateBouquet("xavier",0); complete(App,valid); const duplicate=JSON.parse(JSON.stringify(valid)); duplicate.board[0]=duplicate.board[1];
  check("Bouquet commission gates and lasting keepsakes", "duplicated flowers and malformed finished states cannot award progress", !App.ldsRecordBouquet(clean,duplicate) && !App.ldsRecordBouquet(clean,{partner:"xavier",commission:99,done:true}) && !App.ldsRecordBouquet(clean,{partner:"unknown",commission:0}));
  const m=mount(env); check("Bouquet commission gates and lasting keepsakes", "only the first commission is initially available", !m.game.selectCommission(5) && m.host.querySelector('[data-bouquet-commission="5"]').disabled);
  for(let i=0;i<6;i++) check("Bouquet commission gates and lasting keepsakes", "legal visible clicks clear commission "+(i+1), m.game.selectCommission(i) && completeUI(env,m));
  check("Bouquet commission gates and lasting keepsakes", "all commissions save their best stars and distinct memories", m.game.getProgress().cleared===6 && m.game.getProgress().totalStars===18 && m.rewards.length===6 && new Set(m.rewards.map(r=>r.join())).size===6);
  m.host.querySelector('[data-i18n="ldbUndo"]').click(); completeUI(env,m);
  check("Bouquet commission gates and lasting keepsakes", "undoing and replanting a winning flower cannot farm rewards", m.rewards.length===6 && m.game.getProgress().totalStars===18);
  m.game.selectCommission(0); completeUI(env,m);
  check("Bouquet commission gates and lasting keepsakes", "a full replay does not grant another keepsake", m.rewards.length===6);
  const weaker=App.ldsCreateBouquet("xavier",0);[2,12,0,3,8,6,14,13,4,1,5,11].forEach(cell=>App.ldsBouquetPlace(weaker,0,cell)); const best=App.ldsReadBouquet(env.store.get(key));App.ldsRecordBouquet(best,weaker);
  check("Bouquet commission gates and lasting keepsakes", "a lower-scoring replay cannot downgrade the saved best",best.partners.xavier[0]===3);
  const reload=boot({store:env.store}), reopened=mount(reload); reopened.game.selectCommission(0); completeUI(reload,reopened);
  check("Bouquet commission gates and lasting keepsakes", "reload keeps stars and first-clear reward protection", reopened.game.getProgress().totalStars===18 && !reopened.rewards.length);
  m.game.setPartner({id:"zayne",nameKey:"ldsPartnerZayne"}); completeUI(env,m);
  check("Bouquet commission gates and lasting keepsakes", "partner requests and keepsakes are independent", m.game.getProgress().partner==="zayne" && m.game.getProgress().cleared===1 && m.rewards.length===7);
  m.game.setPartner({id:"xavier",nameKey:"ldsPartnerXavier"}); const snapshot=m.game.inspect(); snapshot.state.hand.length=0; snapshot.progress.stars[0]=0;
  check("Bouquet commission gates and lasting keepsakes", "inspection cannot mutate the live board or saved best result", m.game.inspect().state.hand.length===3 && m.game.getProgress().totalStars===18 && JSON.parse(env.store.get(key)).partners.xavier.every(n=>n===3));
  for(const storageMode of ["absent","readwrite-throw"]) { const blocked=boot({storageMode}), a=mount(blocked); completeUI(blocked,a); const b=mount(blocked); b.game.selectCommission(0); completeUI(blocked,b); check("Bouquet commission gates and lasting keepsakes", storageMode+" storage permits play and session reward protection", a.game.getProgress().cleared===1 && a.rewards.length===1 && !b.rewards.length); }
});

run("Bouquet preview, keyboard and visibility", () => {
  const env=boot(); let hidden=false; const m=mount(env,"xavier",{isHidden:()=>hidden});
  const cell=()=>m.host.querySelector('[data-bouquet-cell="0"]'), plant=()=>m.host.querySelector('[data-i18n="ldbPlant"]');
  cell().click(); const original=m.game.inspect();
  check("Bouquet preview, keyboard and visibility", "touch selection previews without committing", original.aimed && original.state.placements===0 && !plant().disabled && m.host.querySelector(".ldb-preview").textContent.includes("+"));
  hidden=true; plant().click(); check("Bouquet preview, keyboard and visibility", "hidden activity refuses a confirmed placement", m.game.inspect().state.placements===0);
  hidden=false; m.game.pause(); plant().click(); check("Bouquet preview, keyboard and visibility", "paused activity refuses a confirmed placement", m.game.inspect().paused && m.game.inspect().state.placements===0);
  m.game.refresh(); env.dispatch(cell(),"keydown",{key:"Enter",repeat:true}); check("Bouquet preview, keyboard and visibility", "held keys cannot draft repeated flowers", m.game.inspect().state.placements===0);
  env.dispatch(cell(),"keydown",{key:"Enter",repeat:false}); check("Bouquet preview, keyboard and visibility", "Enter plants the previewed bloom", m.game.inspect().state.placements===1);
  cell().focus(); env.dispatch(cell(),"keydown",{key:"ArrowRight"}); check("Bouquet preview, keyboard and visibility", "arrow movement gives the next cell native focus and preview", env.document.activeElement===m.host.querySelector('[data-bouquet-cell="1"]') && m.game.inspect().state.selectedCell===1);
  env.setHidden(true); plant().click(); env.setHidden(false); check("Bouquet preview, keyboard and visibility", "background documents cannot plant", m.game.inspect().state.placements===1);
  plant().focus(); plant().click(); check("Bouquet preview, keyboard and visibility", "confirmation moves focus inside before its button becomes disabled", m.game.inspect().state.placements===2 && env.document.activeElement===m.host.querySelector('[data-bouquet-cell="1"]'));
  m.game.pause(); hidden=true; m.game.refresh(); check("Bouquet preview, keyboard and visibility", "hidden refresh cannot resume the activity", m.game.inspect().paused); hidden=false; m.game.refresh(); check("Bouquet preview, keyboard and visibility", "visible refresh resumes the same arrangement", !m.game.inspect().paused && m.game.inspect().state.placements===2);
  const chinese=boot({language:"zh-CN"}), translated=mount(chinese); translated.game.refresh();
  check("Bouquet preview, keyboard and visibility", "headings, contract text and cell descriptions are bilingual", translated.host.querySelector(".ldb-heading h4").textContent==="花语工坊" && translated.host.querySelector(".ldb-contract").textContent.includes("相邻") && translated.host.querySelector('[data-bouquet-cell="0"]').getAttribute("aria-label").includes("第 1 行"));
});

if(require.main===module) { const lib=require("./lib"); console.log("Bouquet checks passed: "+lib.passCount+"; failed: "+lib.failures.length); lib.failures.forEach(line=>console.log(line)); process.exitCode=lib.failures.length?1:0; }
