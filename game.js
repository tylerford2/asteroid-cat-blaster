const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const catSpriteSheet = new Image();
catSpriteSheet.src = "witchKitty_curiousIdleBreaker.png";

const SPRITE_COLS = 3;
const SPRITE_ROWS = 4;
const SPRITE_WIDTH = 64;
const SPRITE_HEIGHT = 64;

const menu = document.getElementById("menu");
const startBtn = document.getElementById("startBtn");

let difficulty = null;
let winScore = 0;
let gameStarted = false;
let leaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];
let leaderboardShown = false;

const difficulties = {
  easy: 2500,
  medium: 5000,
  hard: 7500,
};

function selectDifficulty(level) {
  difficulty = level;
  startBtn.style.display = "inline-block";
}

function confirmStart() {
  winScore = difficulties[difficulty];
  menu.style.display = "none";
  canvas.style.display = "block";
  resetGame();
  gameStarted = true;
}

let ship = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 20,
  color: "orange",
  dx: 0,
  dy: 0,
  speed: 0.5,
  friction: 0.98,
  hits: 0,
};

const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  Space: false,
};

let score = 0;
let gameOver = false;
let youWin = false;
let bullets = [];
const bulletSpeed = 6;

let asteroids = [];
const numAsteroids = 10;

let canShoot = true;
let shootInterval = null;
let cooldown = false;
let cooldownStart = null;
let spaceHeldStart = null;
let holdCheckInterval = null;

function createAsteroid() {
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    dx: (Math.random() - 0.5) * 2 * (Math.random() * 2 + 0.5),
    dy: (Math.random() - 0.5) * 2 * (Math.random() * 2 + 0.5),
    radius: 32,
    frame: Math.floor(Math.random() * (SPRITE_COLS * SPRITE_ROWS)),
  };
}

function spawnAsteroid() {
  asteroids.push(createAsteroid());
}

function resetGame() {
  score = 0;
  ship.hits = 0;
  gameOver = false;
  youWin = false;
  leaderboardShown = false;

  ship.x = canvas.width / 2;
  ship.y = canvas.height / 2;
  ship.dx = 0;
  ship.dy = 0;

  bullets = [];
  asteroids = [];

  canShoot = true;
  cooldown = false;
  cooldownStart = null;
  shootInterval = null;

  for (let i = 0; i < numAsteroids; i++) {
    spawnAsteroid();
  }

  gameStarted = true;
}

document.addEventListener("keydown", (e) => {
  if (e.key in keys) keys[e.key] = true;

  if (
    e.code === "Space" &&
    canShoot &&
    !cooldown &&
    !shootInterval &&
    gameStarted &&
    !gameOver
  ) {
    shootBullet();
    shootInterval = setInterval(() => {
      if (canShoot && !cooldown) shootBullet();
    }, 200);
    spaceHeldStart = Date.now();

    holdCheckInterval = setInterval(() => {
      if (Date.now() - spaceHeldStart >= 5000 && !cooldown) {
        clearInterval(shootInterval);
        shootInterval = null;
        triggerCooldown();
        clearInterval(holdCheckInterval);
      }
    }, 100);
  }

  if ((gameOver || youWin) && e.key.toLowerCase() === "r") {
    location.reload();
  }

  if ((gameOver || youWin) && e.key.toLowerCase() === "s") {
    saveScoreToLeaderboard();
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key in keys) keys[e.key] = false;

  if (e.code === "Space") {
    clearInterval(shootInterval);
    shootInterval = null;
    clearInterval(holdCheckInterval);
    if (!cooldown && Date.now() - spaceHeldStart > 500) {
      triggerCooldown();
    }
  }
});

function triggerCooldown() {
  cooldown = true;
  canShoot = false;
  cooldownStart = Date.now();

  setTimeout(() => {
    cooldown = false;
    canShoot = true;
    cooldownStart = null;
  }, 10000);
}

function shootBullet() {
  if (gameOver || cooldown || youWin) return;
  bullets.push({
    x: ship.x,
    y: ship.y,
    dx: ship.dx * 0.5,
    dy: ship.dy * 0.5 - bulletSpeed,
    radius: 4,
    color: "black",
  });
}

function update() {
  if (!gameStarted || gameOver || youWin) return;

  if (keys.ArrowUp) ship.dy -= ship.speed;
  if (keys.ArrowDown) ship.dy += ship.speed;
  if (keys.ArrowLeft) ship.dx -= ship.speed;
  if (keys.ArrowRight) ship.dx += ship.speed;

  ship.dx *= ship.friction;
  ship.dy *= ship.friction;

  ship.x += ship.dx;
  ship.y += ship.dy;

  if (ship.x <= 0 || ship.x >= canvas.width) ship.dx = -ship.dx;
  if (ship.y <= 0 || ship.y >= canvas.height) ship.dy = -ship.dy;

  bullets.forEach((b, i) => {
    b.x += b.dx;
    b.y += b.dy;
    if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
      bullets.splice(i, 1);
    }
  });

  asteroids.forEach((a) => {
    a.x += a.dx;
    a.y += a.dy;
    if (a.x < 0 || a.x > canvas.width) a.dx = -a.dx;
    if (a.y < 0 || a.y > canvas.height) a.dy = -a.dy;
  });

  asteroids.forEach((a) => {
    const dist = Math.hypot(ship.x - a.x, ship.y - a.y);
    if (dist < ship.size + a.radius) {
      ship.hits++;
      a.x = Math.random() * canvas.width;
      a.y = Math.random() * canvas.height;
      if (ship.hits >= 20) gameOver = true;
    }
  });

  bullets.forEach((b, bIndex) => {
    asteroids.forEach((a, aIndex) => {
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      if (dist < a.radius + b.radius) {
        score += 100;
        bullets.splice(bIndex, 1);
        asteroids.splice(aIndex, 1);
        spawnAsteroid();
        if (score >= winScore) youWin = true;
      }
    });
  });
}

function drawShip() {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.fillStyle = ship.color;
  ctx.beginPath();
  ctx.moveTo(0, -ship.size);
  ctx.lineTo(-ship.size, ship.size);
  ctx.lineTo(ship.size, ship.size);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBullets() {
  bullets.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.fill();
  });
}

function drawAsteroids() {
  asteroids.forEach((a) => {
    const sx = (a.frame % SPRITE_COLS) * SPRITE_WIDTH;
    const sy = Math.floor(a.frame / SPRITE_COLS) * SPRITE_HEIGHT;

    ctx.drawImage(
      catSpriteSheet,
      sx, sy, SPRITE_WIDTH, SPRITE_HEIGHT,
      a.x - SPRITE_WIDTH / 2,
      a.y - SPRITE_HEIGHT / 2,
      SPRITE_WIDTH,
      SPRITE_HEIGHT
    );
  });
}

function drawScore() {
  ctx.fillStyle = "black";
  ctx.font = "20px Courier New";
  ctx.fillText("Score: " + score, 20, 30);
  ctx.fillText("Hits: " + ship.hits + " / 20", 20, 60);

  if (cooldown) {
    const secondsLeft = Math.ceil(10 - (Date.now() - cooldownStart) / 1000);
    ctx.fillStyle = "red";
    ctx.fillText("Cooling down... (" + secondsLeft + "s)", 20, 90);
  }

  if (gameOver || youWin) {
    ctx.fillStyle = "blue";
    ctx.fillText("Press 'R' to Restart", canvas.width - 220, 30);
    ctx.fillText("Press 'S' to Save Score", canvas.width - 220, 60);
  }
}

function drawGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = "36px Courier New";
  ctx.textAlign = "center";
  ctx.fillText("💀 GAME OVER", canvas.width / 2, canvas.height / 2 - 40);
  ctx.font = "20px Courier New";
  ctx.fillText("Score: " + score, canvas.width / 2, canvas.height / 2);
  ctx.fillText("Press 'R' to Try Again", canvas.width / 2, canvas.height / 2 + 40);
  ctx.fillText("Press 'S' to Save to Leaderboard", canvas.width / 2, canvas.height / 2 + 70);
}

function drawWinScreen() {
  ctx.fillStyle = "rgba(0,255,0,0.2)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "black";
  ctx.font = "36px Courier New";
  ctx.textAlign = "center";
  ctx.fillText("🎉 YOU WIN!", canvas.width / 2, canvas.height / 2 - 40);
  ctx.font = "20px Courier New";
  ctx.fillText("Score: " + score, canvas.width / 2, canvas.height / 2);
  ctx.fillText("Press 'R' to Play Again", canvas.width / 2, canvas.height / 2 + 40);
  ctx.fillText("Press 'S' to Save to Leaderboard", canvas.width / 2, canvas.height / 2 + 70);
}

function saveScoreToLeaderboard() {
  const name = prompt("Enter your name to save your score:");
  if (!name) return;
  leaderboard.push({ name, score });
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 10);
  localStorage.setItem("leaderboard", JSON.stringify(leaderboard));
  updateLeaderboardDisplay();
}

function updateLeaderboardDisplay() {
  const leaderboardDiv = document.getElementById("leaderboard");
  const list = document.getElementById("leaderboardList");
  list.innerHTML = "";

  leaderboard.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = `${entry.name}: ${entry.score}`;
    list.appendChild(li);
  });

  leaderboardDiv.style.display = "block";
}

function maybeShowLeaderboard() {
  if ((gameOver || youWin) && !leaderboardShown) {
    updateLeaderboardDisplay();
    leaderboardShown = true;
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "pink";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!gameStarted) return;

  drawShip();
  drawBullets();
  drawAsteroids();
  drawScore();

  if (gameOver) drawGameOver();
  if (youWin) drawWinScreen();

  maybeShowLeaderboard();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
