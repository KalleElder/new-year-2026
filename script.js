const canvas = document.getElementById("fx");
const ctx = canvas.getContext("2d");

let W, H, DPR;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 1.25);
  W = Math.floor(window.innerWidth);
  H = Math.floor(window.innerHeight);
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener("resize", resize);
resize();

const rand = (a, b) => Math.random() * (b - a) + a;

class Particle {
  constructor(x, y, vx, vy, life, hue, size, gravity = 0.055) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.hue = hue;
    this.size = size;
    this.gravity = gravity;
    this.friction = 0.988;
  }
  step() {
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 1;
  }
  draw() {
    const t = this.life / this.maxLife;
    const alpha = Math.max(0, t);

    ctx.beginPath();
    ctx.fillStyle = `hsla(${this.hue}, 100%, 65%, ${alpha})`;

    // LIGHT: lower shadow blur for performance
    ctx.shadowBlur = 6;
    ctx.shadowColor = `hsla(${this.hue}, 100%, 70%, ${alpha})`;

    ctx.arc(this.x, this.y, this.size * (0.7 + 0.5 * (1 - t)), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

class Rocket {
  constructor(x, y, targetX, targetY) {
    this.x = x; this.y = y;
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.max(100, Math.hypot(dx, dy));
    this.vx = (dx / dist) * rand(6, 8.5);
    this.vy = (dy / dist) * rand(6, 8.5);
    this.hue = rand(0, 360);
    this.trail = [];
    this.alive = true;
  }
  step() {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 10) this.trail.shift();

    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.014;
    this.vx *= 0.996;

    // explode when slowing or reaching upper area
    if (this.vy > -0.15 || this.y < rand(H * 0.20, H * 0.50)) {
      this.alive = false;
      explode(this.x, this.y, this.hue);
    }
  }
  draw() {
    // trail
    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i];
      const a = i / this.trail.length;
      ctx.fillStyle = `hsla(${this.hue}, 100%, 70%, ${a * 0.28})`;
      ctx.fillRect(p.x, p.y, 2, 2);
    }

    // head
    ctx.beginPath();
    ctx.fillStyle = `hsla(${this.hue}, 100%, 70%, 0.92)`;
    ctx.shadowBlur = 8;
    ctx.shadowColor = `hsla(${this.hue}, 100%, 70%, 0.6)`;
    ctx.arc(this.x, this.y, 2.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

const rockets = [];
const particles = [];

function explode(x, y, hue) {
  // LIGHT: fewer particles per explosion
  const count = Math.floor(rand(35, 60));
  const spread = rand(3.0, 5.2);

  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2) * (i / count) + rand(-0.05, 0.05);
    const sp = rand(1.4, spread);
    const vx = Math.cos(a) * sp;
    const vy = Math.sin(a) * sp;
    const life = Math.floor(rand(44, 72));
    const size = rand(0.9, 1.9);
    const h = (hue + rand(-22, 22) + 360) % 360;
    particles.push(new Particle(x, y, vx, vy, life, h, size));
  }

  // LIGHT: fewer glitter
  const glitter = Math.floor(rand(10, 18));
  for (let i = 0; i < glitter; i++) {
    particles.push(
      new Particle(
        x, y,
        rand(-1.0, 1.0),
        rand(-1.0, 1.0),
        Math.floor(rand(18, 30)),
        60,
        rand(0.7, 1.2),
        0.02
      )
    );
  }

  // Safety cap
  const MAX = 1100;
  if (particles.length > MAX) particles.splice(0, particles.length - MAX);
}

function launch(x = rand(W * 0.15, W * 0.85), y = H + 20) {
  const tx = x + rand(-120, 120);
  const ty = rand(H * 0.20, H * 0.50);
  rockets.push(new Rocket(x, y, tx, ty));
}

function multiLaunch(x, n = 2) {
  for (let i = 0; i < n; i++) launch(x + rand(-80, 80), H + 20);
}

// Auto fireworks (light)
const startTime = performance.now();
function autoSequence(t) {
  const elapsed = (t - startTime) / 1000;

  // gentle warm-up
  if (elapsed < 1.3 && Math.random() < 0.08) launch();

  // celebration window
  if (elapsed > 1.2 && elapsed < 4.5 && Math.random() < 0.18) launch();
  if (elapsed > 2.0 && elapsed < 3.4 && Math.random() < 0.28) launch();

  // afterglow
  if (elapsed > 4.5 && elapsed < 7.0 && Math.random() < 0.10) launch();
}

function loop(t) {
  // fade background slightly for trails 
  ctx.fillStyle = "rgba(8, 8, 20, 0.25)";
  ctx.fillRect(0, 0, W, H);

  autoSequence(t);

  // rockets
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i];
    r.step();
    r.draw();
    if (!r.alive) rockets.splice(i, 1);
  }

  // particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.step();
    p.draw();
    if (p.life <= 0) particles.splice(i, 1);
  }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Click/tap to spawn fireworks (lighter than 3 rockets)
window.addEventListener("pointerdown", (e) => {
  multiLaunch(e.clientX, 2);
});

// Set years for the flip
document.getElementById("oldYear").textContent = "2025";
document.getElementById("newYear").textContent = "2026";
