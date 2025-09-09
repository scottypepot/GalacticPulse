const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const player = {
    x: canvas.width / 2 - 20,
    y: canvas.height - 60,
    width: 40,
    height: 40,
    speed: 5,
    color: '#00ffea',
    dx: 0,
    health: 100,
    maxHealth: 100
};

const bullets = [];
const enemies = [];
let score = 0;
let gameOver = false;
let shooting = false;
let shootCooldown = 0;
let kills = 0;
let fireLevel = 1;
let maxFireLevel = 5;
let exhaust = 0;
let exhaustLimit = 40; // shots before exhaust
let exhaustCooldown = 0;
const perks = [];

function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function drawBullets() {
    ctx.fillStyle = '#fff';
    bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

function drawEnemies() {
    ctx.fillStyle = '#ff0044';
    enemies.forEach(enemy => {
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    });
}

function drawScore() {
    ctx.font = '20px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText('Score: ' + score, 10, 30);
}

function updateHealthBar() {
    const healthBar = document.getElementById('healthBar');
    if (healthBar) {
        let percent = Math.max(0, player.health) / player.maxHealth * 100;
        if (gameOver) percent = 0;
        healthBar.style.width = percent + '%';
        healthBar.style.background = percent > 40 ? 'linear-gradient(90deg, #00ffea, #00ff44)' : 'linear-gradient(90deg, #ff0044, #ff8800)';
    }
}

function drawPerks() {
    perks.forEach(perk => {
        ctx.save();
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 32;
        ctx.beginPath();
        ctx.arc(perk.x + perk.size/2, perk.y + perk.size/2, perk.size/2 + 12, 0, Math.PI * 2);
        ctx.fillStyle = '#00ff88';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(perk.x + perk.size/2, perk.y + perk.size/2, perk.size/2, 0, Math.PI * 2);
        ctx.fillStyle = '#00ff44';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();
    });
}

function movePlayer() {
    player.x += player.dx;
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
}

function moveBullets() {
    bullets.forEach((bullet, i) => {
        bullet.y -= bullet.speed;
        if (bullet.y < 0) bullets.splice(i, 1);
    });
}

function moveEnemies() {
    enemies.forEach((enemy, i) => {
        enemy.y += enemy.speed;
        if (enemy.y > canvas.height) enemies.splice(i, 1);
    });
}

function movePerks() {
    perks.forEach((perk, i) => {
        perk.y += perk.speed;
        if (perk.y > canvas.height) perks.splice(i, 1);
    });
}

function detectCollisions() {
    enemies.forEach((enemy, ei) => {
        bullets.forEach((bullet, bi) => {
            if (
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y
            ) {
                enemies.splice(ei, 1);
                bullets.splice(bi, 1);
                score += 10;
                kills++;
            }
        });
        // Player collision
        if (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y
        ) {
            player.health -= 34;
            enemies.splice(ei, 1);
            fireLevel = 1; // reset fire level on hit
            if (player.health <= 0) {
                gameOver = true;
            }
        }
    });
    detectPerkCollisions();
}

function detectPerkCollisions() {
    perks.forEach((perk, pi) => {
        if (
            player.x < perk.x + perk.size &&
            player.x + player.width > perk.x &&
            player.y < perk.y + perk.size &&
            player.y + player.height > perk.y
        ) {
            fireLevel = Math.min(maxFireLevel, fireLevel + 1);
            perks.splice(pi, 1);
        }
    });
}

function spawnEnemy() {
    const width = 40;
    const height = 40;
    const x = Math.random() * (canvas.width - width);
    enemies.push({ x, y: -height, width, height, speed: 2 });
}

function spawnPerk() {
    const size = 48; // much larger perk size
    const x = Math.random() * (canvas.width - size);
    perks.push({ x, y: -size, size, speed: 2 });
}

function showGameOverUI() {
    const overlay = document.getElementById('gameOverOverlay');
    const scoreEl = document.getElementById('finalScore');
    const killsEl = document.getElementById('finalKills');
    if (overlay && scoreEl && killsEl) {
        scoreEl.textContent = 'Score: ' + score;
        killsEl.textContent = 'Enemies Destroyed: ' + kills;
        overlay.style.display = 'flex';
    }
}

function hideGameOverUI() {
    const overlay = document.getElementById('gameOverOverlay');
    if (overlay) overlay.style.display = 'none';
}

function resetGame() {
    score = 0;
    kills = 0;
    player.health = player.maxHealth;
    bullets.length = 0;
    enemies.length = 0;
    perks.length = 0;
    fireLevel = 1;
    exhaust = 0;
    exhaustCooldown = 0;
    gameOver = false;
    shooting = false;
    shootCooldown = 0;
    hideGameOverUI();
    gameLoop();
}

function gameLoop() {
    if (gameOver) {
        updateHealthBar();
        showGameOverUI();
        ctx.fillStyle = '#fff';
        ctx.font = '40px Arial';
        ctx.fillText('Game Over', canvas.width / 2 - 100, canvas.height / 2);
        ctx.font = '20px Arial';
        ctx.fillText('Score: ' + score, canvas.width / 2 - 40, canvas.height / 2 + 40);
        return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayer();
    drawBullets();
    drawEnemies();
    drawPerks();
    drawScore();
    updateHealthBar();
    movePlayer();
    moveBullets();
    moveEnemies();
    movePerks();
    detectCollisions();
    if (shooting && shootCooldown <= 0 && exhaustCooldown <= 0) {
        for (let i = 0; i < fireLevel; i++) {
            const offset = (i - (fireLevel-1)/2) * 14;
            bullets.push({
                x: player.x + player.width / 2 - 4 + offset,
                y: player.y,
                width: 8,
                height: 16,
                speed: 7
            });
        }
        shootCooldown = 28; // much slower fire rate
        exhaust++;
        if (exhaust >= exhaustLimit) {
            exhaustCooldown = 60; // frames to cool down
            exhaust = 0;
        }
    }
    if (shootCooldown > 0) shootCooldown--;
    if (exhaustCooldown > 0) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#ff8800';
        ctx.fillRect(player.x, player.y + player.height, player.width, 12);
        ctx.restore();
        exhaustCooldown--;
    }
    if (Math.random() < 0.02) spawnEnemy();
    if (Math.random() < 0.005) spawnPerk();
    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', e => {
    if (e.code === 'ArrowLeft') player.dx = -player.speed;
    if (e.code === 'ArrowRight') player.dx = player.speed;
    if (e.code === 'Space') shooting = true;
});

document.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') player.dx = 0;
    if (e.code === 'Space') shooting = false;
});

document.addEventListener('DOMContentLoaded', () => {
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
        restartBtn.addEventListener('click', resetGame);
    }
});

gameLoop();
