/* Starbond Hunt: deterministic real-time combat and its canvas presentation.
 * This helper is loaded before game-love-deepspace; it adds no registry tab. */
(function (App) {
  var W = 800, H = 440, TAU = Math.PI * 2;
  function bound(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function random(s) {
    var x = s.seed;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    s.seed = x >>> 0;
    return s.seed / 4294967296;
  }
  function event(s, kind, x, y, value) { s.events.push({ kind: kind, x: x, y: y, value: value }); }
  function particles(s, x, y, color, count) {
    for (var i = 0; i < count && s.particles.length < 120; i++) {
      var angle = random(s) * TAU, speed = 30 + random(s) * 160;
      s.particles.push({ x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .55 + random(s) * .35, color: color });
    }
  }
  function spawn(s, boss) {
    var angle = (s.spawned * 2.4 + .5), id = s.nextId++;
    var kind = boss ? "boss" : ["chaser", "ranger", "striker"][s.spawned % 3];
    var hp = boss ? 480 + s.level * 100 : 48 + s.level * 8;
    s.enemies.push({ id: id, kind: kind, x: boss ? W / 2 : W / 2 + Math.cos(angle) * 335,
      y: boss ? 88 : H / 2 + Math.sin(angle) * 160, hp: hp, maxHp: hp,
      radius: boss ? 34 : 18, clock: boss ? 1.1 : .7 + id * .15, warning: 0,
      tx: s.player.x, ty: s.player.y, open: 0, freeze: 0, burn: 0, hit: 0, dash: 0, attacks: 0 });
    if (!boss) { s.spawned++; }
    else { s.bossSpawned = true; event(s, "boss", W / 2, 88); }
  }
  function createCombat(level, partner) {
    level = bound(Math.floor(level || 0), 0, 3);
    var s = { level: level, partner: partner, seed: 89273 + level * 117,
      player: { x: 400, y: 310, radius: 13, hp: 100, stamina: 100, angle: -Math.PI / 2, invulnerable: 1.2, dash: 0, dodgeCd: 0, dx: 0, dy: -1 },
      companion: { x: 356, y: 335 }, elapsed: 0, limit: 65, charge: 0, combo: 0, maxCombo: 0,
      score: 0, kills: 0, goal: 6 + level * 2, spawned: 0, nextId: 1,
      enemies: [], bolts: [], bullets: [], hazards: [], particles: [], floats: [], events: [],
      fireCd: 0, partnerCd: 1, spawnCd: 1.2, slow: 0, hurt: 0, ultimate: 0,
      field: null, bossSpawned: false, done: false, outcome: "", dodges: 0, hits: 0, shots: 0 };
    spawn(s, false); spawn(s, false); spawn(s, false);
    return s;
  }
  function nearest(s, origin) {
    var target = null, best = Infinity;
    s.enemies.forEach(function (e) { var d = distance(e, origin); if (e.hp > 0 && d < best) { target = e; best = d; } });
    return target;
  }
  function hurtPlayer(s, amount) {
    if (s.player.invulnerable > 0 || s.done) { return; }
    s.player.hp = Math.max(0, s.player.hp - amount);
    s.player.invulnerable = .75; s.hurt = .24; s.combo = 0;
    event(s, "hurt", s.player.x, s.player.y, amount);
  }
  function hurtEnemy(s, e, amount, own) {
    if (e.hp <= 0) { return; }
    var critical = e.kind === "boss" && e.open > 0;
    if (e.kind === "boss" && !critical) { amount *= .55; }
    amount = Math.round(amount * (critical ? 1.4 : 1));
    e.hp = Math.max(0, e.hp - amount); e.hit = .12;
    if (own) {
      s.hits++; s.combo++; s.maxCombo = Math.max(s.maxCombo, s.combo);
      s.charge = Math.min(100, s.charge + 6); s.score += amount;
    }
    if (s.floats.length < 24) { s.floats.push({ x: e.x, y: e.y - e.radius, value: amount, life: .65, critical: critical }); }
    particles(s, e.x, e.y, critical ? "#fff1ae" : "#b0dfff", 3);
    if (e.hp <= 0) {
      s.kills++; s.score += e.kind === "boss" ? 500 : 100;
      particles(s, e.x, e.y, "#c1b4ff", 18); event(s, "kill", e.x, e.y);
      if (e.kind === "boss") { s.done = true; s.outcome = "win"; event(s, "win", e.x, e.y); }
      else if (s.kills % 3 === 0) {
        s.player.hp = Math.min(100, s.player.hp + 5);
        event(s, "heal", s.player.x, s.player.y, 5);
      }
    }
  }
  function segmentDistance(x1, y1, x2, y2, x, y) {
    var dx = x2 - x1, dy = y2 - y1;
    var u = bound(((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    return Math.hypot(x - x1 - dx * u, y - y1 - dy * u);
  }
  function shoot(s, origin, target, companion) {
    if (!target || s.bolts.length >= 36) { return; }
    var angle = Math.atan2(target.y - origin.y, target.x - origin.x);
    s.bolts.push({ x: origin.x, y: origin.y, vx: Math.cos(angle) * 660, vy: Math.sin(angle) * 660,
      life: 1.25, damage: companion ? 9 : 18, companion: companion });
    if (!companion) { s.shots++; event(s, "shot", origin.x, origin.y); }
  }
  function perfectDodge(s) {
    s.dodges++; s.charge = Math.min(100, s.charge + 16);
    s.slow = .55; s.score += 80; event(s, "perfect", s.player.x, s.player.y);
  }
  function ultimate(s, aim) {
    if (s.charge < 100) { return false; }
    s.charge = 0; s.ultimate = .95; s.player.invulnerable = 1;
    var p = s.player, target = aim || nearest(s, p) || { x: 400, y: 180 };
    event(s, "ultimate", target.x, target.y, s.partner);
    var damage = { xavier: 115, zayne: 55, rafayel: 85, sylus: 90, caleb: 80 }[s.partner] || 85;
    if (s.partner === "zayne") { p.hp = Math.min(100, p.hp + 22); }
    if (s.partner === "sylus") { p.hp = Math.min(100, p.hp + 12); }
    s.enemies.forEach(function (e) {
      if (s.partner === "caleb" && e.kind !== "boss") { e.x += (target.x - e.x) * .75; e.y += (target.y - e.y) * .75; }
      if (s.partner === "zayne" || s.partner === "caleb") { e.freeze = 2.5; }
      if (s.partner === "rafayel") { e.burn = 3; }
      // A charged partner skill has global reach; bosses expose their core for it.
      e.open = Math.max(e.open, .5); hurtEnemy(s, e, damage, true);
    });
    s.bullets = []; s.hazards = [];
    s.field = { x: target.x, y: target.y, life: 1.1, kind: s.partner };
    particles(s, target.x, target.y, "#f5d1ff", 32);
    return true;
  }
  function stepCombat(s, delta, input) {
    if (s.done) { return s; }
    input = input || {};
    var dt = bound(Number(delta) || 0, 0, .05);
    if (!dt) { return s; }
    s.events = []; s.elapsed += dt;
    var p = s.player;
    var dx = bound(Number(input.x) || 0, -1, 1), dy = bound(Number(input.y) || 0, -1, 1);
    var magnitude = Math.hypot(dx, dy);
    s.moving = magnitude > .05;
    if (magnitude > 1) { dx /= magnitude; dy /= magnitude; }
    if (magnitude > .05) { p.dx = dx / (magnitude > 1 ? 1 : magnitude); p.dy = dy / (magnitude > 1 ? 1 : magnitude); }
    p.invulnerable = Math.max(0, p.invulnerable - dt); p.dodgeCd = Math.max(0, p.dodgeCd - dt);
    p.stamina = Math.min(100, p.stamina + dt * 22);
    s.hurt = Math.max(0, s.hurt - dt); s.ultimate = Math.max(0, s.ultimate - dt);
    s.slow = Math.max(0, s.slow - dt);
    if (input.dodge && p.dodgeCd <= 0 && p.stamina >= 25) {
      p.dash = .24; p.invulnerable = .34; p.dodgeCd = 1.1; p.stamina -= 25;
      event(s, "dodge", p.x, p.y);
      if (s.bullets.some(function (b) { return distance(p, b) < 60; }) ||
          s.hazards.some(function (h) { return h.timer < .25 && distance(p, h) < h.radius; })) { perfectDodge(s); }
    }
    if (p.dash > 0) { dx = p.dx; dy = p.dy; p.dash -= dt; }
    var speed = p.dash > 0 ? 570 : 190;
    p.x = bound(p.x + dx * speed * dt, 20, W - 20);
    p.y = bound(p.y + dy * speed * dt, 42, H - 20);
    s.companion.x += (p.x - 42 - s.companion.x) * Math.min(1, dt * 7);
    s.companion.y += (p.y + 22 - s.companion.y) * Math.min(1, dt * 7);
    var target = input.aim || nearest(s, p);
    if (target) { p.angle = Math.atan2(target.y - p.y, target.x - p.x); }
    if (input.ultimate) { ultimate(s, input.aim); }
    s.fireCd -= dt; s.partnerCd -= dt;
    if (input.attack && s.fireCd <= 0) { shoot(s, p, target, false); s.fireCd = .20; }
    if (s.partnerCd <= 0) { shoot(s, s.companion, nearest(s, s.companion), true); s.partnerCd = 1.15; }
    var worldDt = dt * (s.slow > 0 ? .4 : 1);
    s.spawnCd -= worldDt;
    if (s.spawned < s.goal && s.enemies.filter(function (e) { return e.hp > 0; }).length < 4 && s.spawnCd <= 0) {
      spawn(s, false); s.spawnCd = 1.5 - s.level * .15;
    }
    if (!s.bossSpawned && s.spawned >= s.goal && !s.enemies.some(function (e) { return e.hp > 0; })) { spawn(s, true); }
    s.enemies.forEach(function (e) {
      if (e.hp <= 0) { return; }
      e.hit = Math.max(0, e.hit - dt); e.open = Math.max(0, e.open - worldDt);
      if (e.burn > 0) {
        e.burn -= dt; e.burnClock = (e.burnClock || 0) + dt;
        if (e.burnClock >= .25) { e.burnClock -= .25; hurtEnemy(s, e, 3, false); }
      }
      if (e.freeze > 0) { e.freeze -= dt; return; }
      var d = distance(e, p), a = Math.atan2(p.y - e.y, p.x - e.x);
      if (e.kind === "chaser") {
        e.x += Math.cos(a) * worldDt * (42 + s.level * 8);
        e.y += Math.sin(a) * worldDt * (42 + s.level * 8);
      } else if (e.kind === "striker" && e.dash > 0) {
        var strikeAngle = Math.atan2(e.ty - e.y, e.tx - e.x);
        e.x += Math.cos(strikeAngle) * 360 * worldDt; e.y += Math.sin(strikeAngle) * 360 * worldDt;
        e.dash -= worldDt;
      } else if (e.kind === "ranger" && d > 275) {
        e.x += Math.cos(a) * 20 * worldDt; e.y += Math.sin(a) * 20 * worldDt;
      }
      if (distance(e, p) < e.radius + p.radius) { hurtPlayer(s, e.kind === "boss" ? 18 : 10); }
      if (e.kind === "chaser") { return; }
      e.clock -= worldDt;
      if (e.clock <= 0 && e.warning <= 0) { e.warning = e.kind === "boss" ? .85 : .7; e.tx = p.x; e.ty = p.y; }
      if (e.warning > 0) {
        e.warning -= worldDt;
        if (e.warning <= 0) {
          e.clock = e.kind === "boss" ? 1.45 : 1.65;
          e.open = e.kind === "boss" ? .9 : 0;
          e.attacks++;
          if (e.kind === "striker") { e.dash = .45; }
          else {
            var fireAngle = Math.atan2(e.ty - e.y, e.tx - e.x), count = e.kind === "boss" ? 7 + s.level * 2 : 1;
            for (var i = 0; i < count && s.bullets.length < 70; i++) {
              var spread = fireAngle + (i - (count - 1) / 2) * .17;
              s.bullets.push({ x: e.x, y: e.y, vx: Math.cos(spread) * (135 + s.level * 12), vy: Math.sin(spread) * (135 + s.level * 12), life: 6, boss: e.kind === "boss" });
            }
            if (e.kind === "boss") { s.hazards.push({ x: e.tx, y: e.ty, radius: 65, timer: 1.05, flash: 0 }); }
          }
        }
      }
      e.x = bound(e.x, 20, W - 20); e.y = bound(e.y, 40, H - 20);
    });
    s.bolts.forEach(function (b) {
      var oldX = b.x, oldY = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      for (var i = 0; i < s.enemies.length && b.life > 0; i++) {
        var e = s.enemies[i];
        if (e.hp > 0 && segmentDistance(oldX, oldY, b.x, b.y, e.x, e.y) < e.radius + 4) {
          hurtEnemy(s, e, b.damage, !b.companion); b.life = 0;
        }
      }
    });
    s.bullets.forEach(function (b) {
      var oldX = b.x, oldY = b.y;
      b.x += b.vx * worldDt; b.y += b.vy * worldDt; b.life -= worldDt;
      if (segmentDistance(oldX, oldY, b.x, b.y, p.x, p.y) < p.radius + 6) {
        if (p.dash > 0) { s.score += 10; }
        else { hurtPlayer(s, b.boss ? 14 : 9); }
        b.life = 0;
      }
    });
    s.hazards.forEach(function (h) {
      h.timer -= worldDt;
      if (h.timer <= 0 && !h.flash) {
        if (distance(p, h) < h.radius + p.radius) { hurtPlayer(s, 18); }
        h.flash = .25;
      } else if (h.flash) { h.flash = Math.max(.0001, h.flash - dt); }
    });
    s.hazards = s.hazards.filter(function (h) { return h.timer > 0 || h.flash > .0001; });
    s.enemies = s.enemies.filter(function (e) { return e.hp > 0; });
    s.bolts = s.bolts.filter(function (b) { return b.life > 0 && b.x > -20 && b.x < W + 20 && b.y > 0 && b.y < H + 20; });
    s.bullets = s.bullets.filter(function (b) { return b.life > 0 && b.x > -20 && b.x < W + 20 && b.y > 0 && b.y < H + 20; });
    s.particles.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
    s.particles = s.particles.filter(function (p) { return p.life > 0; });
    s.floats.forEach(function (f) { f.y -= dt * 30; f.life -= dt; });
    s.floats = s.floats.filter(function (f) { return f.life > 0; });
    if (s.field) { s.field.life -= dt; if (s.field.life <= 0) { s.field = null; } }
    // Zero health takes precedence; a boss killed at the deadline still clears.
    if (p.hp <= 0) { s.done = true; s.outcome = "defeat"; }
    else if (s.elapsed >= s.limit && !s.done) { s.done = true; s.outcome = "timeout"; }
    return s;
  }
  function combatStars(s) {
    return s.outcome !== "win" ? 0 : s.player.hp >= 75 && s.elapsed <= 40 ? 3 : s.player.hp >= 40 ? 2 : 1;
  }

  function drawCombat(ctx, s, accent, portrait, reduced, text) {
    var clock = s.elapsed, p = s.player;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!reduced && s.hurt > 0) { ctx.translate(Math.sin(clock * 71) * 4, Math.cos(clock * 61) * 3); }
    var sky = ctx.createLinearGradient(0, 0, W, H);
    sky.addColorStop(0, "#11172f"); sky.addColorStop(.55, "#171833"); sky.addColorStop(1, "#0c2636");
    ctx.fillStyle = sky; ctx.fillRect(-6, -6, W + 12, H + 12);
    var nebula = ctx.createRadialGradient(420, 85, 12, 420, 85, 300);
    nebula.addColorStop(0, "#62518155"); nebula.addColorStop(1, "#12162a00");
    ctx.fillStyle = nebula; ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < 45; i++) {
      ctx.globalAlpha = .25 + (reduced ? .2 : (Math.sin(clock + i) + 1) * .15);
      ctx.fillStyle = "#d8e3ff"; ctx.fillRect(i * 139 % W, i * 83 % 240, i % 4 ? 1 : 2, 2);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#6d85b22a"; ctx.lineWidth = 1;
    for (i = 0; i < 11; i++) {
      ctx.beginPath(); ctx.moveTo(W / 2, 85); ctx.lineTo((i - 2) * 130, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 100 + i * i * 3.4); ctx.lineTo(W, 100 + i * i * 3.4); ctx.stroke();
    }
    ctx.strokeStyle = "#809fd940"; ctx.strokeRect(16, 36, W - 32, H - 52);
    // The route portal opens into a rotating core when the boss arrives.
    ctx.save(); ctx.translate(400, 85); if (!reduced) { ctx.rotate(clock * .2); }
    for (i = 0; i < 3; i++) {
      ctx.strokeStyle = i ? "#bda3ea28" : "#c1b7ed66"; ctx.lineWidth = i ? 1 : 2;
      ctx.beginPath(); ctx.ellipse(0, 0, 64 + i * 18, 24 + i * 11, i * .6, 0, TAU); ctx.stroke();
    }
    ctx.restore();
    s.hazards.forEach(function (h) {
      ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, TAU);
      ctx.fillStyle = h.flash ? "#ec789877" : "#ee75952b"; ctx.fill();
      ctx.strokeStyle = "#ff99b7"; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(h.x, h.y, h.radius * bound(1 - h.timer / 1.05, 0, 1), 0, TAU); ctx.stroke();
      ctx.fillStyle = "#ffd9e4"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("!", h.x, h.y + 7);
    });
    s.enemies.forEach(function (e) {
      if (e.warning > 0) {
        ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = "#fc8cab88"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.tx, e.ty); ctx.stroke(); ctx.restore();
        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + 9, -.5 * Math.PI, -.5 * Math.PI + TAU * (1 - e.warning / .85));
        ctx.strokeStyle = "#ffadc4"; ctx.lineWidth = 3; ctx.stroke();
      }
      ctx.save(); ctx.translate(e.x, e.y);
      var boss = e.kind === "boss", r = e.radius;
      var glow = e.freeze > 0 ? "#95e7ff" : e.open > 0 ? "#ffe6a2" : boss ? "#ed89b9" : e.kind === "ranger" ? "#97d9eb" : e.kind === "striker" ? "#f1b68e" : "#b69ceb";
      if (!reduced) { ctx.shadowColor = glow; ctx.shadowBlur = e.hit ? 22 : 8; }
      ctx.fillStyle = e.hit ? "#fff5fd" : e.freeze > 0 ? "#48698a" : "#433157";
      ctx.strokeStyle = glow; ctx.lineWidth = 2;
      ctx.beginPath();
      var sides = boss ? 10 : e.kind === "ranger" ? 8 : e.kind === "striker" ? 4 : 6;
      for (var n = 0; n < sides; n++) {
        var a = n / sides * TAU + (!reduced ? clock * .3 : 0);
        var rr = n % 2 ? r * .67 : r + 4;
        if (!n) { ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        else { ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = glow; ctx.beginPath(); ctx.ellipse(0, 0, r * .35, r * .16, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = glow; ctx.beginPath(); ctx.moveTo(-r, 8); ctx.lineTo(-r - 8, 15); ctx.moveTo(r, 8); ctx.lineTo(r + 8, 15); ctx.stroke();
      if (e.burn > 0) { ctx.strokeStyle = "#ffab6e"; ctx.beginPath(); ctx.arc(0, 0, r + 7, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = "#111524"; ctx.fillRect(-r, -r - 12, r * 2, 4);
      ctx.fillStyle = glow; ctx.fillRect(-r, -r - 12, r * 2 * e.hp / e.maxHp, 4);
      ctx.restore();
    });
    s.bolts.forEach(function (b) {
      ctx.strokeStyle = b.companion ? accent : "#9aebff"; ctx.lineWidth = b.companion ? 3 : 4;
      ctx.beginPath(); ctx.moveTo(b.x - b.vx * .025, b.y - b.vy * .025); ctx.lineTo(b.x, b.y); ctx.stroke();
    });
    s.bullets.forEach(function (b) {
      ctx.fillStyle = b.boss ? "#ff93ad" : "#dfb0f5";
      ctx.beginPath(); ctx.arc(b.x, b.y, b.boss ? 6 : 5, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#ffffff77"; ctx.lineWidth = 1; ctx.stroke();
    });
    if (s.field && !reduced) {
      var f = s.field, radius = (1.2 - f.life) * 220 + 25;
      ctx.globalAlpha = bound(f.life, 0, .75);
      ctx.strokeStyle = accent; ctx.lineWidth = f.kind === "xavier" ? 6 : 3;
      ctx.beginPath(); ctx.arc(f.x, f.y, radius, 0, TAU); ctx.stroke();
      for (i = 0; i < 7; i++) {
        var fa = i * TAU / 7 + clock;
        ctx.beginPath(); ctx.moveTo(f.x + Math.cos(fa) * 20, f.y + Math.sin(fa) * 20);
        ctx.lineTo(f.x + Math.cos(fa) * radius, f.y + Math.sin(fa) * radius); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // Hunter avatar: animated boots, cape, and a weapon that tracks the aim.
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = "#00000055"; ctx.beginPath(); ctx.ellipse(0, 12, 19, 8, 0, 0, TAU); ctx.fill();
    var walk = !reduced && (s.moving || p.dash > 0) ? Math.sin(clock * 18) * 4 : 0;
    ctx.fillStyle = "#313c69"; ctx.beginPath(); ctx.moveTo(-9, -3); ctx.lineTo(-13 + walk, 15); ctx.lineTo(8, 13); ctx.lineTo(10, -3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#b1cfff"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-4, 5); ctx.lineTo(-5 - walk, 12); ctx.moveTo(4, 5); ctx.lineTo(5 + walk, 12); ctx.stroke();
    ctx.fillStyle = "#ecedff"; ctx.beginPath(); ctx.arc(0, -7, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = "#c7a7dc"; ctx.beginPath(); ctx.ellipse(-5, -10, 9, 4, -.5, 0, TAU); ctx.fill();
    ctx.rotate(p.angle); ctx.strokeStyle = "#91ecff"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(22, 4); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = p.dash > 0 ? "#fff4c9" : "#95d5ff77"; ctx.lineWidth = p.dash > 0 ? 3 : 1;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.dash > 0 ? 25 : 19, 0, TAU); ctx.stroke();
    if (!reduced && p.dash > 0) {
      for (i = 1; i < 4; i++) {
        ctx.globalAlpha = .4 / i; ctx.beginPath(); ctx.arc(p.x - p.dx * i * 18, p.y - p.dy * i * 18, 14, 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    var companion = s.companion;
    ctx.save(); ctx.strokeStyle = accent; ctx.globalAlpha = .35; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(companion.x, companion.y); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(companion.x, companion.y, 18, 0, TAU); ctx.clip();
    ctx.fillStyle = "#30334b"; ctx.fillRect(companion.x - 18, companion.y - 18, 36, 36);
    if (portrait.complete && portrait.naturalWidth > 0) {
      var crop = portrait.naturalHeight * .62, focus = s.partner === "rafayel" ? .34 : .62;
      ctx.drawImage(portrait, bound(portrait.naturalWidth * focus - crop / 2, 0, portrait.naturalWidth - crop), 0, crop, crop, companion.x - 18, companion.y - 18, 36, 36);
    }
    ctx.restore(); ctx.strokeStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(companion.x, companion.y, 20, 0, TAU); ctx.stroke();
    if (!reduced) {
      s.particles.forEach(function (q) { ctx.globalAlpha = Math.min(1, q.life * 2); ctx.fillStyle = q.color; ctx.fillRect(q.x, q.y, 3, 3); });
      ctx.globalAlpha = 1;
      s.floats.forEach(function (f) {
        ctx.globalAlpha = Math.min(1, f.life * 3); ctx.font = (f.critical ? "bold 19px" : "14px") + " sans-serif";
        ctx.textAlign = "center"; ctx.fillStyle = f.critical ? "#ffedb2" : "#cfeaff"; ctx.fillText(String(f.value), f.x, f.y);
      });
      ctx.globalAlpha = 1;
    }
    var boss = s.enemies.filter(function (e) { return e.kind === "boss"; })[0];
    if (boss) {
      ctx.fillStyle = "#111525cc"; ctx.fillRect(235, 15, 330, 22);
      ctx.fillStyle = boss.open > 0 ? "#ffe7b5" : "#dd87b8"; ctx.fillRect(239, 31, 322 * boss.hp / boss.maxHp, 3);
      ctx.font = "11px sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#f4deee";
      ctx.fillText(text(boss.open > 0 ? "ldsBossExposed" : "ldsBossName"), 400, 27);
    }
    ctx.restore();
  }

  function mountCombat(host, options) {
    var t = App.t, state, partner, active = false, paused = false, raf = null, lastTime = 0;
    var keys = {}, stick = { x: 0, y: 0, id: null }, pointer = { held: false, id: null, aim: null };
    var fireHeld = false, pulse = 0, dodgePressed = false, evolPressed = false;
    var audio = null, sound = false, voices = [], announcement = "", announcementTime = 0;
    var cutinTime = 0, shownHp = -1, shownSeconds = -1, shownCharge = -1;
    function el(tag, cls, key, parent) {
      var element = document.createElement(tag);
      if (cls) { element.className = cls; }
      if (key) { element.setAttribute("data-i18n", key); element.textContent = t(key); }
      if (parent) { parent.appendChild(element); }
      return element;
    }
    function btn(cls, key, parent, handler) {
      var element = el("button", cls, key, parent); element.type = "button";
      if (handler) { element.addEventListener("click", handler); }
      return element;
    }
    function reducedMotion() {
      return document.documentElement.getAttribute("data-motion") === "off" ||
        (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
    var root = el("section", "lds-combat", null, host);
    root.setAttribute("aria-label", t("ldsArenaTitle"));
    var header = el("div", "lds-combat-header", null, root);
    var identity = el("div", "lds-combat-identity", null, header);
    var portrait = el("img", "lds-combat-avatar", null, identity); portrait.alt = "";
    var titleWrap = el("div", "", null, identity);
    el("strong", "", "ldsArenaTitle", titleWrap);
    var subtitle = el("span", "lds-combat-subtitle", null, titleWrap);
    var pauseBtn = btn("lds-small-button", "ldsBattlePause", header, function () { if (active) { pause(); } else { start(); } });
    var soundBtn = btn("lds-small-button", "ldsSoundOff", header, function () {
      var Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) { announce("ldsAudioUnavailable"); return; }
      try {
        if (!audio) { audio = new Audio(); }
        if (audio.state === "suspended") { var resumed = audio.resume(); if (resumed && resumed.catch) { resumed.catch(function () {}); } }
        sound = !sound; if (!sound) { stopSound(); }
        soundBtn.textContent = t(sound ? "ldsSoundOn" : "ldsSoundOff");
        soundBtn.setAttribute("aria-pressed", String(sound));
      } catch (error) { sound = false; announce("ldsAudioUnavailable"); }
    });
    soundBtn.setAttribute("aria-pressed", "false");
    var stats = el("div", "lds-combat-stats", null, root);
    function stat(key) { var item = el("div", "", null, stats); el("span", "", key, item); return el("strong", "", null, item); }
    var hpValue = stat("ldsHealth"), timeValue = stat("ldsBattleTime"), waveValue = stat("ldsWave"), comboValue = stat("ldsCombo");
    var field = el("div", "lds-arena-field", null, root);
    var canvas = el("canvas", "lds-arena-canvas", null, field);
    canvas.width = W; canvas.height = H; canvas.tabIndex = 0;
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", t("ldsArenaControls"));
    canvas.setAttribute("aria-describedby", "ldsCombatInstructions");
    canvas.textContent = t("ldsArenaControls");
    var ctx = canvas.getContext("2d");
    var cutin = el("div", "lds-battle-cutin", null, field); cutin.hidden = true; cutin.setAttribute("aria-hidden", "true");
    var cutinImage = el("img", "", null, cutin); cutinImage.alt = "";
    var cutinName = el("strong", "", null, cutin);
    var cutinEvol = el("span", "", null, cutin);
    var overlay = el("div", "lds-arena-overlay", null, field);
    var overlayTitle = el("h4", "", "ldsBattleReady", overlay);
    var overlayText = el("p", "", "ldsBattleIntro", overlay);
    var startBtn = btn("primary lds-battle-start", "ldsBattleStart", overlay, start);
    var returnBtn = btn("lds-small-button", "ldsReturnCharacter", overlay, function () { pause(); options.onFocus(false); });
    returnBtn.hidden = true;
    var notices = el("p", "lds-combat-notice", null, root);
    notices.setAttribute("role", "status"); notices.setAttribute("aria-live", "polite");
    var controls = el("div", "lds-battle-controls", null, root);
    var joystick = el("div", "lds-joystick", null, controls);
    joystick.tabIndex = 0; joystick.setAttribute("aria-label", t("ldsJoystickLabel"));
    var knob = el("span", "lds-joystick-knob", null, joystick);
    var controlGroup = el("div", "lds-combat-buttons", null, controls);
    var fireBtn = btn("lds-battle-fire", "ldsBattleFire", controlGroup, function () { pulse = .23; });
    var dodgeBtn = btn("lds-battle-dodge", null, controlGroup, function () { dodgePressed = true; });
    el("span", "", "ldsBattleDodge", dodgeBtn);
    // Keep the resource visible even when the next dodge is still cooling down.
    var staminaTrack = el("span", "lds-combat-charge", null, dodgeBtn);
    staminaTrack.setAttribute("role", "progressbar"); staminaTrack.setAttribute("aria-label", t("ldsStamina"));
    staminaTrack.setAttribute("data-i18n-aria", "ldsStamina");
    staminaTrack.setAttribute("aria-valuemin", "0"); staminaTrack.setAttribute("aria-valuemax", "100");
    var staminaFill = el("i", "", null, staminaTrack);
    var evolBtn = btn("lds-battle-evol", null, controlGroup, function () { evolPressed = true; });
    var chargeLabel = el("strong", "", null, evolBtn);
    var chargeTrack = el("span", "lds-combat-charge", null, evolBtn);
    var chargeFill = el("i", "", null, chargeTrack);
    var instructions = el("p", "lds-combat-instructions", "ldsArenaControls", root); instructions.id = "ldsCombatInstructions";
    var partnerDetail = el("p", "lds-combat-perk", null, root);
    function announce(key) { announcement = t(key); announcementTime = 1.7; notices.textContent = announcement; }
    function stopSound() {
      voices.forEach(function (voice) { try { voice.stop(); } catch (error) {} }); voices = [];
    }
    function tone(kind) {
      if (!sound || !audio || audio.state !== "running" || voices.length > 8) { return; }
      try {
        var oscillator = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
        oscillator.type = kind === "shot" ? "triangle" : "sine";
        oscillator.frequency.setValueAtTime(kind === "shot" ? 520 : kind === "hurt" ? 95 : kind === "ultimate" ? 220 : 760, now);
        oscillator.frequency.exponentialRampToValueAtTime(kind === "hurt" ? 45 : 180, now + .12);
        gain.gain.setValueAtTime(.035, now); gain.gain.exponentialRampToValueAtTime(.001, now + .14);
        oscillator.connect(gain); gain.connect(audio.destination);
        voices.push(oscillator);
        oscillator.onended = function () { voices = voices.filter(function (v) { return v !== oscillator; }); oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(now); oscillator.stop(now + .15);
      } catch (error) { sound = false; soundBtn.textContent = t("ldsSoundOff"); soundBtn.setAttribute("aria-pressed", "false"); }
    }
    function clearInput() {
      keys = {}; stick.x = 0; stick.y = 0; stick.id = null;
      pointer.held = false; pointer.id = null; pointer.aim = null;
      fireHeld = false; pulse = 0; dodgePressed = false; evolPressed = false;
      knob.style.transform = "translate(0, 0)";
    }
    function draw() { if (ctx && state) { drawCombat(ctx, state, partner.color, portrait, reducedMotion(), t); } }
    function sync() {
      var seconds = Math.max(0, Math.ceil(state.limit - state.elapsed));
      if (shownHp !== state.player.hp) { hpValue.textContent = String(state.player.hp); shownHp = state.player.hp; }
      if (shownSeconds !== seconds) { timeValue.textContent = seconds + "s"; shownSeconds = seconds; }
      waveValue.textContent = state.bossSpawned ? t("ldsBossShort") : (state.kills < state.goal / 2 ? "1" : "2") + "/3";
      comboValue.textContent = state.combo + "×";
      if (shownCharge !== state.charge) {
        chargeLabel.textContent = t("ldsBattleEvol", { n: Math.round(state.charge) });
        chargeFill.style.width = state.charge + "%"; shownCharge = state.charge;
      }
      evolBtn.disabled = !active || state.charge < 100;
      fireBtn.disabled = !active; dodgeBtn.disabled = !active;
      dodgeBtn.setAttribute("data-ready", String(state.player.dodgeCd <= 0 && state.player.stamina >= 25));
      staminaFill.style.width = state.player.stamina + "%";
      staminaTrack.setAttribute("aria-valuenow", String(Math.round(state.player.stamina)));
      root.setAttribute("data-state", active ? "running" : paused ? "paused" : state.done ? state.outcome : "ready");
    }
    function cancelLoop() { if (raf !== null) { window.cancelAnimationFrame(raf); raf = null; } }
    function pause() {
      if (!active) { clearInput(); stopSound(); return; }
      active = false; paused = true; cancelLoop(); clearInput(); stopSound();
      cutin.hidden = true; cutinTime = 0;
      overlay.hidden = false; overlayTitle.textContent = t("ldsBattlePaused"); overlayText.textContent = t("ldsBattlePauseHint");
      startBtn.textContent = t("ldsBattleResume"); returnBtn.hidden = false;
      pauseBtn.textContent = t("ldsBattleResume"); overlay.scrollTop = 0; sync();
    }
    function finish() {
      active = false; paused = false; cancelLoop(); clearInput(); stopSound(); cutin.hidden = true;
      overlay.hidden = false; overlayTitle.textContent = t(state.outcome === "win" ? "ldsBattleVictory" : "ldsBattleDefeat");
      overlayText.textContent = state.outcome === "win" ? t("ldsBattleScore", { s: combatStars(state), n: state.score, c: state.maxCombo, d: state.dodges }) :
        t(state.outcome === "timeout" ? "ldsBattleTimeout" : "ldsBattleRetryHint");
      startBtn.textContent = t("ldsBattleAgain"); returnBtn.hidden = false; pauseBtn.textContent = t("ldsBattleAgain");
      var reward = options.onFinish(state, combatStars(state));
      if (reward) { overlayText.textContent += " " + reward; }
      overlay.scrollTop = 0;
      sync();
    }
    function frame(timestamp) {
      raf = null;
      if (!active) { return; }
      if (document.hidden || options.isHidden() || timestamp - lastTime > 1000) { pause(); return; }
      var delta = Math.max(0, (timestamp - lastTime) / 1000); lastTime = timestamp;
      stepCombat(state, delta, {
        x: stick.x || ((keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0)),
        y: stick.y || ((keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0)),
        attack: !!(keys.j || fireHeld || pointer.held || pulse > 0), aim: pointer.held ? pointer.aim : null,
        dodge: dodgePressed, ultimate: evolPressed,
      });
      pulse = Math.max(0, pulse - delta); dodgePressed = false; evolPressed = false;
      state.events.forEach(function (ev) {
        if (ev.kind === "shot" || ev.kind === "hurt" || ev.kind === "perfect" || ev.kind === "ultimate") { tone(ev.kind); }
        if (ev.kind === "perfect") { announce("ldsPerfectDodge"); }
        if (ev.kind === "boss") { announce("ldsBossWarning"); }
        if (ev.kind === "ultimate") {
          announce("ldsEvolReleased"); cutinTime = .95;
          cutin.hidden = reducedMotion(); options.onMoment("Skill");
        }
        if (ev.kind === "hurt") { options.onMoment("Miss"); }
      });
      if (cutinTime > 0) { cutinTime -= delta; if (cutinTime <= 0) { cutin.hidden = true; } }
      if (announcementTime > 0) { announcementTime -= delta; if (announcementTime <= 0) { notices.textContent = ""; } }
      draw(); sync();
      if (state.done) { finish(); }
      else { raf = window.requestAnimationFrame(frame); }
    }
    function start() {
      if (active || !state) { return; }
      if (state.done) { reset(state.level, partner); }
      clearInput(); active = true; paused = false; overlay.hidden = true;
      pauseBtn.textContent = t("ldsBattlePause"); options.onFocus(true);
      canvas.focus({ preventScroll: true });
      var dialog = root.closest(".game-dialog"); if (dialog) { dialog.scrollTop = 0; }
      lastTime = performance.now(); sync();
      raf = window.requestAnimationFrame(frame);
    }
    function reset(level, nextPartner) {
      active = false; paused = false; cancelLoop(); clearInput(); stopSound();
      partner = nextPartner; state = createCombat(level, partner.id);
      portrait.src = "assets/media/love-deepspace/" + partner.id + ".webp";
      cutinImage.src = portrait.src; cutinName.textContent = t(partner.nameKey); cutinEvol.textContent = "Evol · " + t(partner.evolKey);
      root.style.setProperty("--lds-battle-accent", partner.color); root.setAttribute("data-partner", partner.id);
      subtitle.textContent = t(partner.nameKey) + " · " + t(options.routeLabel());
      partnerDetail.textContent = t("ldsBattlePerk" + partner.id.charAt(0).toUpperCase() + partner.id.slice(1));
      overlay.hidden = false; overlayTitle.textContent = t("ldsBattleReady"); overlayText.textContent = t("ldsBattleIntro");
      startBtn.textContent = t("ldsBattleStart"); pauseBtn.textContent = t("ldsBattleStart"); returnBtn.hidden = true;
      cutin.hidden = true; cutinTime = 0; notices.textContent = "";
      overlay.scrollTop = 0;
      shownHp = -1; shownSeconds = -1; shownCharge = -1; sync(); draw();
    }
    portrait.addEventListener("load", function () { if (!active) { draw(); } });
    root.addEventListener("keydown", function (ev) {
      var key = String(ev.key).toLowerCase();
      if (key === "enter" && ev.target === canvas && !active) { ev.preventDefault(); start(); return; }
      if (!active) { return; }
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "j", " ", "e", "escape", "p"].indexOf(key) < 0) { return; }
      ev.preventDefault(); ev.stopPropagation(); keys[key] = true;
      if ((key === "escape" || key === "p") && !ev.repeat) { pause(); }
      if (key === " " && !ev.repeat) { dodgePressed = true; }
      if (key === "e" && !ev.repeat) { evolPressed = true; }
    });
    root.addEventListener("keyup", function (ev) { delete keys[String(ev.key).toLowerCase()]; });
    root.addEventListener("focusout", function (ev) { if (!ev.relatedTarget || !root.contains(ev.relatedTarget)) { pause(); } });
    function capture(target, ev) { if (target.setPointerCapture && ev.pointerId !== undefined) { target.setPointerCapture(ev.pointerId); } }
    function aimAt(ev) {
      var rect = canvas.getBoundingClientRect();
      return { x: bound((ev.clientX - rect.left) / rect.width * W, 0, W), y: bound((ev.clientY - rect.top) / rect.height * H, 0, H) };
    }
    canvas.addEventListener("pointerdown", function (ev) {
      if (!active || (ev.button !== undefined && ev.button !== 0)) { return; }
      ev.preventDefault(); canvas.focus({ preventScroll: true }); capture(canvas, ev);
      pointer.held = true; pointer.id = ev.pointerId; pointer.aim = aimAt(ev);
    });
    canvas.addEventListener("pointermove", function (ev) { if (pointer.held && ev.pointerId === pointer.id) { pointer.aim = aimAt(ev); } });
    function releaseAim(ev) { if (ev.pointerId === pointer.id) { pointer.held = false; pointer.id = null; pointer.aim = null; } }
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (name) { canvas.addEventListener(name, releaseAim); });
    function moveStick(ev) {
      var rect = joystick.getBoundingClientRect(), x = (ev.clientX - rect.left - rect.width / 2) / (rect.width * .35), y = (ev.clientY - rect.top - rect.height / 2) / (rect.height * .35);
      var length = Math.max(1, Math.hypot(x, y)); stick.x = x / length; stick.y = y / length;
      knob.style.transform = "translate(" + stick.x * 22 + "px," + stick.y * 22 + "px)";
    }
    joystick.addEventListener("pointerdown", function (ev) { if (!active || stick.id !== null) { return; } ev.preventDefault(); stick.id = ev.pointerId; capture(joystick, ev); moveStick(ev); });
    joystick.addEventListener("pointermove", function (ev) { if (ev.pointerId === stick.id) { moveStick(ev); } });
    function releaseStick(ev) { if (ev.pointerId === stick.id) { stick.id = null; stick.x = 0; stick.y = 0; knob.style.transform = "translate(0,0)"; } }
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (name) { joystick.addEventListener(name, releaseStick); });
    fireBtn.addEventListener("pointerdown", function (ev) { if (active) { ev.preventDefault(); capture(fireBtn, ev); fireHeld = true; } });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (name) { fireBtn.addEventListener(name, function () { fireHeld = false; }); });
    return { reset: reset, pause: pause, start: start, state: function () { return state; }, element: root };
  }

  App.ldsCreateCombat = createCombat;
  App.ldsStepCombat = stepCombat;
  App.ldsCombatStars = combatStars;
  App.mountLdsCombat = mountCombat;
})(window.CapitalConvert = window.CapitalConvert || {});
