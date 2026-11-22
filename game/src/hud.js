// NIGHTMAIL — the HUD panel, banners, title and end screens. One job:
// everything the player reads that is not the train car itself.

import { COLORS, PANEL_X, VIEW_W, VIEW_H, PLAY_W, TILE, PLAY_Y } from './config.js';
import { lightAt } from './vision.js';

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function bar(ctx, x, y, w, h, frac, fill, bg) {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
}

function row(ctx, x, y, label, value, valueColor) {
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y);
  ctx.fillStyle = valueColor || COLORS.text;
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(value, PANEL_X + 300, y);
  ctx.textAlign = 'left';
}

export function drawHud(ctx, world) {
  const x = PANEL_X + 16;
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(PANEL_X, 0, VIEW_W - PANEL_X, VIEW_H);
  ctx.fillStyle = COLORS.panelEdge;
  ctx.fillRect(PANEL_X, 0, 3, VIEW_H);

  ctx.fillStyle = COLORS.brass;
  ctx.font = 'bold 15px monospace';
  ctx.fillText('NIGHTMAIL', x, 30);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 13px monospace';
  ctx.fillText(world.def.name, x, 52);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px monospace';
  const objLines = wrapLines(ctx, world.def.objective, 288);
  objLines.forEach((line, i) => ctx.fillText(line, x, 72 + i * 16));

  let y = 72 + objLines.length * 16 + 14;
  const maxSuspicion = world.guards.reduce((m, g) => Math.max(m, g.suspicion), 0);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '11px monospace';
  ctx.fillText('DETECTION', x, y);
  y += 6;
  const detColor = maxSuspicion >= 100 ? COLORS.danger : maxSuspicion >= 50 ? '#ff9a2e' : COLORS.ok;
  bar(ctx, x, y, 288, 12, maxSuspicion / 100, detColor, '#00000066');
  y += 30;

  const alarmColor =
    world.alarm === 'ALARM' ? COLORS.danger : world.alarm === 'QUIET' ? COLORS.ok : '#ff9a2e';
  row(ctx, x, y, 'ALARM', world.alarm, alarmColor);
  y += 22;
  const vis = world.player ? lightAt(world, world.player.x, world.player.y) : 'shadow';
  const visText = world.player && world.player.hidden ? 'HIDDEN' : vis === 'lit' ? 'IN THE LIGHT' : 'IN SHADOW';
  row(ctx, x, y, 'VISIBILITY', visText, visText === 'IN THE LIGHT' ? '#ff9a2e' : COLORS.ok);
  y += 22;
  row(ctx, x, y, 'NOISE', world.noiseLoud ? 'LOUD' : 'SILENT', world.noiseLoud ? '#ff9a2e' : COLORS.text);
  y += 22;
  row(ctx, x, y, 'LOOT', `${world.lootGot}/${world.loot.length} ${world.def.lootName}`);
  y += 22;
  row(ctx, x, y, 'SPOTTED', String(world.spottedCount), world.spottedCount > 0 ? COLORS.danger : COLORS.text);
  y += 22;
  const t = Math.floor(world.time);
  row(ctx, x, y, 'TIME', `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}  (par ${world.def.parTime}s)`);
  y += 22;
  row(ctx, x, y, 'COINS', String(world.player ? world.player.coins : 0));
  y += 22;
  row(ctx, x, y, 'SCORE', String(world.score));
  y += 30;

  ctx.fillStyle = COLORS.textDim;
  ctx.font = '11px monospace';
  ctx.fillText('CONDUCTORS ON PATROL', x, y);
  y += 8;
  for (const g of world.guards) {
    y += 18;
    const label =
      g.state === 'patrol'
        ? 'PATROL'
        : g.state === 'investigate'
          ? 'SUSPICIOUS'
          : g.state === 'chase'
            ? 'HUNTING'
            : g.state === 'search'
              ? 'SEARCHING'
              : 'RETURNING';
    const c = g.state === 'chase' ? COLORS.danger : g.state === 'patrol' ? COLORS.textDim : '#ff9a2e';
    // Colour swatch in the guard's uniform colour — the same colour as
    // the figure on the floor, so the list and the car match at a glance.
    ctx.fillStyle = g.look.coat;
    ctx.beginPath();
    ctx.arc(x + 5, y - 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = COLORS.text;
    ctx.font = '12px monospace';
    ctx.fillText(g.name, x + 16, y);
    ctx.fillStyle = c;
    ctx.textAlign = 'right';
    ctx.fillText(label, PANEL_X + 300, y);
    ctx.textAlign = 'left';
  }

  y += 28;
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '11px monospace';
  ctx.fillText('WASD move · SHIFT sneak · CLICK throw coin', x, y);
  y += 16;
  ctx.fillText('E hide · SPACE sprint (loud) · ESC pause', x, y);
  y += 16;
  ctx.fillText('R retry level', x, y);
}

export function drawBanner(ctx, world) {
  if (!world.banner || world.banner.ttl <= 0) return;
  const cx = PLAY_W / 2;
  ctx.save();
  ctx.globalAlpha = Math.min(1, world.banner.ttl);
  ctx.fillStyle = 'rgba(8, 10, 24, 0.85)';
  ctx.fillRect(cx - 260, 84, 520, 64);
  ctx.strokeStyle = world.banner.color;
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - 260, 84, 520, 64);
  ctx.fillStyle = world.banner.color;
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(world.banner.text, cx, 112);
  ctx.fillStyle = COLORS.text;
  ctx.font = '13px monospace';
  ctx.fillText(world.banner.sub, cx, 136);
  ctx.restore();
  ctx.textAlign = 'left';
}

export function drawHint(ctx, world) {
  if (!world.hint || world.hintTimer <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, world.hintTimer);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(world.hint, PLAY_W / 2, PLAY_Y + 688);
  ctx.restore();
  ctx.textAlign = 'left';
}

export function drawTitle(ctx, world) {
  ctx.fillStyle = '#070a18';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // A warm lamp glow behind the title, like the train at night.
  const glow = ctx.createRadialGradient(640, 210, 10, 640, 210, 420);
  glow.addColorStop(0, 'rgba(255, 179, 71, 0.28)');
  glow.addColorStop(1, 'rgba(255, 179, 71, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.fillStyle = COLORS.brass;
  ctx.font = 'bold 84px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('NIGHTMAIL', 640, 190);
  ctx.fillStyle = COLORS.text;
  ctx.font = '20px monospace';
  ctx.fillText('a heist aboard the midnight express', 640, 226);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '14px monospace';
  ctx.fillText('Slip through three cars. Take every prize. Never be seen.', 640, 258);

  world.titleButtons = [];
  const cars = [
    { label: 'CAR 1 — BAGGAGE', sub: '2 guards · 3 mail sacks', par: 'par 75s' },
    { label: 'CAR 2 — DINING', sub: '3 guards · 4 jewel cases', par: 'par 100s' },
    { label: 'CAR 3 — SLEEPER', sub: '4 guards · 5 prizes', par: 'par 120s' },
  ];
  cars.forEach((car, i) => {
    const bx = 290 + i * 240;
    const by = 330;
    const bw = 210;
    const bh = 110;
    ctx.fillStyle = '#141a33';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = COLORS.brass;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 15px monospace';
    ctx.fillText(car.label, bx + bw / 2, by + 44);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '12px monospace';
    ctx.fillText(car.sub, bx + bw / 2, by + 66);
    ctx.fillText(car.par, bx + bw / 2, by + 86);
    world.titleButtons.push({ x: bx, y: by, w: bw, h: bh, level: i });
  });

  ctx.fillStyle = COLORS.textDim;
  ctx.font = '13px monospace';
  ctx.fillText('WASD move · SHIFT sneak · CLICK throw a coin · E hide · SPACE sprint (loud)', 640, 500);
  ctx.fillText('Stay out of the lantern cones. Hide in shadow. Coins distract conductors.', 640, 524);
  ctx.fillText('Click a car above to begin.', 640, 556);
  ctx.textAlign = 'left';
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(5, 7, 16, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', 640, 340);
  ctx.font = '15px monospace';
  ctx.fillText('ESC to resume · R to retry the car', 640, 378);
  ctx.textAlign = 'left';
}

export function drawBusted(ctx, world) {
  ctx.fillStyle = 'rgba(20, 4, 6, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = COLORS.danger;
  ctx.font = 'bold 64px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CAUGHT!', 640, 300);
  ctx.fillStyle = COLORS.text;
  ctx.font = '18px monospace';
  ctx.fillText(`${world.caughtBy || 'A conductor'} grabbed the Fox by the collar.`, 640, 342);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '15px monospace';
  ctx.fillText(`Loot ${world.lootGot}/${world.loot.length} · press R to retry the car`, 640, 380);
  ctx.textAlign = 'left';
}

function drawRouteMap(ctx, world, cx, cy, scale) {
  const w = 30 * TILE * scale;
  const h = 22 * TILE * scale;
  ctx.save();
  ctx.fillStyle = '#0d1126';
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  ctx.strokeStyle = COLORS.panelEdge;
  ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
  // Tall and low cover, faint, so the route reads against the car.
  for (let y = 0; y < 22; y++) {
    for (let x = 0; x < 30; x++) {
      const t = world.grid[y][x];
      if (t === 'T' || t === 'l') {
        ctx.fillStyle = t === 'T' ? 'rgba(190, 160, 90, 0.28)' : 'rgba(190, 160, 90, 0.13)';
        ctx.fillRect(cx - w / 2 + x * TILE * scale, cy - h / 2 + y * TILE * scale, TILE * scale, TILE * scale);
      }
    }
  }
  // Loot dots: bright where taken, dim where missed.
  for (const loot of world.loot) {
    ctx.fillStyle = loot.taken ? COLORS.lootGold : 'rgba(255, 215, 94, 0.35)';
    ctx.beginPath();
    ctx.arc(cx - w / 2 + (loot.x + 0.5) * TILE * scale, cy - h / 2 + (loot.y + 0.5) * TILE * scale, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Exit marker.
  const ex = cx - w / 2 + (world.exit.x + 0.5) * TILE * scale;
  const ey = cy - h / 2 + (world.exit.y + 0.5) * TILE * scale;
  ctx.fillStyle = COLORS.exitGreen;
  ctx.beginPath();
  ctx.arc(ex, ey, 4, 0, Math.PI * 2);
  ctx.fill();
  // The player's route, dashed.
  ctx.strokeStyle = COLORS.lootGold;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  world.player.path.forEach((p, i) => {
    const qx = cx - w / 2 + p.x * scale;
    const qy = cy - h / 2 + (p.y - PLAY_Y) * scale;
    if (i === 0) ctx.moveTo(qx, qy);
    else ctx.lineTo(qx, qy);
  });
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function drawLevelComplete(ctx, world) {
  ctx.fillStyle = 'rgba(5, 7, 16, 0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const ghost = world.spottedCount === 0;
  ctx.fillStyle = ghost ? COLORS.lootGold : COLORS.ok;
  ctx.font = 'bold 56px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(ghost ? 'GHOST — CLEAN GETAWAY' : 'CLEAN GETAWAY', 640, 150);
  ctx.fillStyle = COLORS.text;
  ctx.font = '17px monospace';
  const s = world.endStats;
  ctx.fillText(
    `${world.def.subtitle} · time ${s.time}s (par ${world.def.parTime}s) · loot ${s.loot}/${s.lootTotal} · spotted ${s.spotted} · score ${s.score}`,
    640,
    190,
  );
  drawRouteMap(ctx, world, 640, 350, 0.38);
  const badges = [];
  if (s.spotted === 0) badges.push('Never spotted');
  if (s.loot === s.lootTotal) badges.push('Every prize');
  if (s.time <= world.def.parTime) badges.push(`Under ${world.def.parTime}s`);
  ctx.fillStyle = COLORS.brass;
  ctx.font = 'bold 15px monospace';
  ctx.fillText(badges.length ? badges.join('   ·   ') : 'No badges this car', 640, 510);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '15px monospace';
  ctx.fillText(
    world.levelIndex + 1 < 3 ? 'Press any key for the next car' : 'Press any key for the final tally',
    640,
    552,
  );
  ctx.textAlign = 'left';
}

export function drawCampaign(ctx, world) {
  ctx.fillStyle = '#070a18';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = COLORS.lootGold;
  ctx.font = 'bold 52px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('THE MAIL IS YOURS', 640, 190);
  ctx.fillStyle = COLORS.text;
  ctx.font = '18px monospace';
  const c = world.campaign;
  ctx.fillText(`Total score ${c.score} · total time ${c.time}s · spotted ${c.spotted} times`, 640, 232);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '15px monospace';
  c.levels.forEach((lv, i) => {
    ctx.fillText(
      `${lv.name}: ${lv.time}s · loot ${lv.loot}/${lv.lootTotal} · ${lv.spotted === 0 ? 'GHOST' : `spotted ${lv.spotted}`}`,
      640,
      290 + i * 30,
    );
  });
  ctx.fillText('NIGHTMAIL — a heist aboard the midnight express', 640, 430);
  ctx.fillText('Press R to ride again', 640, 462);
  ctx.textAlign = 'left';
}
