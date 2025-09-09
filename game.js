// Enemy destruction sprite sheets (10 frames per sheet, 1 row)
const enemyDestructionSheets = {
    basic: new Image(),
    fast: new Image(),
    zigzag: new Image()
};
enemyDestructionSheets.basic.src = "assets/sprites/enemy sprites/destruction/Kla'ed - Fighter - Destruction.png";
enemyDestructionSheets.fast.src = "assets/sprites/enemy sprites/destruction/Kla'ed - Scout - Destruction.png";
enemyDestructionSheets.zigzag.src = "assets/sprites/enemy sprites/destruction/Kla'ed - Bomber - Destruction.png";

const destructions = []; // {x, y, width, height, type, frame, frameCount}
// Load enemy sprites
const enemySprites = {
    basic: new Image(),
    fast: new Image(),
    zigzag: new Image()
};
enemySprites.basic.src = 'assets/sprites/enemy sprites/Kla\'ed - Fighter - Base.png';
enemySprites.fast.src = 'assets/sprites/enemy sprites/Kla\'ed - Scout - Base.png';
enemySprites.zigzag.src = 'assets/sprites/enemy sprites/Kla\'ed - Bomber - Base.png';
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
    dy: 0,
    health: 100,
    maxHealth: 100
};

const bullets = [];

// Player bullet sprite
const playerBulletImg = new Image();
playerBulletImg.src = 'assets/sprites/player bullet/spaceEffects_008.png';
const enemies = [];
let score = 0;
let gameOver = false;
let shooting = false;
let shootCooldown = 0;
let kills = 0;
let fireLevel = 1;
let maxFireLevel = 5;
let perkTimer = 0;
const perkDuration = 600; // frames (e.g., 10 seconds at 60fps)
let exhaust = 0;
let exhaustLimit = 40; // shots before exhaust
let exhaustCooldown = 0;
const perks = [];



// Load player sprite only
const playerImg = new Image();
playerImg.src = 'assets/sprites/spaceShips_007.png';

function drawPlayer() {
    if (playerImg.complete) {
        ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
    } else {
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
}

function drawBullets() {
    bullets.forEach(bullet => {
        if (playerBulletImg.complete && playerBulletImg.naturalWidth > 0) {
            ctx.drawImage(playerBulletImg, bullet.x, bullet.y, bullet.width, bullet.height);
        } else {
            ctx.fillStyle = '#fff';
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }
    });
}

function drawEnemies() {
    const scale = 3; // Increase this value for bigger sprites
    enemies.forEach(enemy => {
        const sprite = enemySprites[enemy.type];
        const drawW = enemy.width * scale;
        const drawH = enemy.height * scale;
        const drawX = enemy.x - (drawW - enemy.width) / 2;
        const drawY = enemy.y - (drawH - enemy.height) / 2;
        if (sprite && sprite.complete) {
            ctx.save();
            if (enemy.type === 'zigzag') {
                ctx.translate(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                ctx.rotate(Math.sin(enemy.y/20) * 0.5);
                ctx.drawImage(sprite, -drawW/2, -drawH/2, drawW, drawH);
                ctx.restore();
            } else {
                ctx.drawImage(sprite, drawX, drawY, drawW, drawH);
            }
        } else {
            // fallback shapes
            if (enemy.type === 'basic') {
                ctx.fillStyle = '#ff0044';
                ctx.fillRect(drawX, drawY, drawW, drawH);
            } else if (enemy.type === 'fast') {
                ctx.fillStyle = '#00aaff';
                ctx.beginPath();
                ctx.arc(enemy.x + enemy.width/2, enemy.y + enemy.height/2, (enemy.width/2) * scale, 0, Math.PI * 2);
                ctx.fill();
            } else if (enemy.type === 'zigzag') {
                ctx.fillStyle = '#ffdd00';
                ctx.save();
                ctx.translate(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                ctx.rotate(Math.sin(enemy.y/20) * 0.5);
                ctx.fillRect(-drawW/2, -drawH/2, drawW, drawH);
                ctx.restore();
            }
        }
    });
}

function drawDestructions() {
    const scale = 3;
    destructions.forEach(d => {
        const sheet = enemyDestructionSheets[d.type];
        if (sheet && sheet.complete) {
            const frames = d.frameCount || 10;
            const frameW = sheet.width / frames;
            const frameH = sheet.height;
            ctx.drawImage(
                sheet,
                d.frame * frameW, 0, frameW, frameH,
                d.x - (d.width * scale - d.width) / 2,
                d.y - (d.height * scale - d.height) / 2,
                d.width * scale, d.height * scale
            );
        }
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
    player.y += player.dy;
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
}

function moveBullets() {
    bullets.forEach((bullet, i) => {
        bullet.y -= bullet.speed;
        if (bullet.y < 0) bullets.splice(i, 1);
    });
}

function moveEnemies() {
    enemies.forEach((enemy, i) => {
        if (enemy.type === 'basic') {
            // Galaxy Shooter style: horizontal patrol, bounce at edges, sometimes move down
            if (!enemy.dir) enemy.dir = Math.random() < 0.5 ? -1 : 1; // -1: left, 1: right
            if (!enemy.patrolSpeed) enemy.patrolSpeed = 2 + Math.random();
            if (!enemy.patrolTimer) enemy.patrolTimer = 0;
            enemy.x += enemy.dir * enemy.patrolSpeed;
            // Bounce at edges
            if (enemy.x < 0) {
                enemy.x = 0;
                enemy.dir = 1;
                enemy.y += 32; // move down when bouncing
            } else if (enemy.x + enemy.width > canvas.width) {
                enemy.x = canvas.width - enemy.width;
                enemy.dir = -1;
                enemy.y += 32;
            }
            // Occasionally move down a bit (every ~2s)
            enemy.patrolTimer++;
            if (enemy.patrolTimer > 120) {
                if (Math.random() < 0.2) enemy.y += 24;
                enemy.patrolTimer = 0;
            }
            // Always move down slowly
            enemy.y += enemy.speed * 0.15;
            // Shooting
            if (!enemy.shootTimer) enemy.shootTimer = 0;
            enemy.shootTimer += 1;
            if (enemy.shootTimer >= 210) { // 3.5s at 60fps
                shootEnemyBullet(enemy);
                enemy.shootTimer = 0;
            }
        } else if (enemy.type === 'fast') {
            enemy.y += enemy.speed * 1.7;
        } else if (enemy.type === 'zigzag') {
            enemy.y += enemy.speed;
            // Home in on player's x position, but not too fast
            const homingStrength = 0.05; // Lower = slower tracking
            let targetX = player.x + player.width/2 - enemy.width/2;
            enemy.x += (targetX - enemy.x) * homingStrength;
            // Add a little wiggle for visual effect
            let period = 120;
            let wide = Math.floor(enemy.y / period) % 2 === 0;
            let amplitude = wide ? 8 : 3;
            enemy.x += Math.sin(enemy.y / 18) * amplitude;
        }
        if (enemy.y > canvas.height) enemies.splice(i, 1);
    });
}
// Enemy bullets
const enemyBullets = [];

function drawEnemyBullets() {
    ctx.fillStyle = '#ffcc00';
    enemyBullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

function moveEnemyBullets() {
    enemyBullets.forEach((bullet, i) => {
        bullet.y += bullet.speed;
        if (bullet.y > canvas.height) enemyBullets.splice(i, 1);
    });
}

function shootEnemyBullet(enemy) {
    // Shoot towards player
    const ex = enemy.x + enemy.width / 2;
    const ey = enemy.y + enemy.height;
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    const angle = Math.atan2(py - ey, px - ex);
    const speed = 4;
    enemyBullets.push({
        x: ex - 4,
        y: ey,
        width: 8,
        height: 16,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        speed: speed,
        angle: angle
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
                // Unique score and effects per enemy type
                if (enemy.type === 'basic') score += 10;
                else if (enemy.type === 'fast') score += 18;
                else if (enemy.type === 'zigzag') score += 25;
                // For wave spawn tracking
                if (enemy.type === 'basic') {
                    if (!window.basicKills) window.basicKills = 0;
                    window.basicKills++;
                }
                // Add destruction animation
                destructions.push({
                    x: enemy.x,
                    y: enemy.y,
                    width: enemy.width,
                    height: enemy.height,
                    type: enemy.type,
                    frame: 0,
                    frameCount: 10
                });
                enemies.splice(ei, 1);
                bullets.splice(bi, 1);
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
            // Unique damage per enemy type
            if (enemy.type === 'basic') player.health -= 34;
            else if (enemy.type === 'fast') player.health -= 22;
            else if (enemy.type === 'zigzag') player.health -= 40;
            enemies.splice(ei, 1);
            fireLevel = 1; // reset fire level on hit
            if (player.health <= 0) {
                gameOver = true;
            }
        }
    });
    // Enemy bullet collision with player
    enemyBullets.forEach((bullet, bi) => {
        if (
            bullet.x < player.x + player.width &&
            bullet.x + bullet.width > player.x &&
            bullet.y < player.y + player.height &&
            bullet.y + bullet.height > player.y
        ) {
            player.health -= 18;
            enemyBullets.splice(bi, 1);
            if (player.health <= 0) gameOver = true;
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
            perkTimer = perkDuration; // Reset timer on collecting a perk
            perks.splice(pi, 1);
        }
    });
}

function spawnEnemy() {
    // If a wave is due, spawn a wave of 5 basic enemies
    if (window.basicKills && window.basicKills >= 5) {
        spawnBasicWave();
        window.basicKills = 0;
        return;
    }
    const enemyTypes = [
        { type: 'basic', width: 40, height: 40, speed: 2 },
        { type: 'fast', width: 28, height: 28, speed: 3.2 },
        { type: 'zigzag', width: 36, height: 36, speed: 2.2 }
    ];
    // Weighted random: basic more common
    const weights = [0.6, 0.25, 0.15];
    let r = Math.random();
    let idx = 0;
    for (let i = 0; i < weights.length; i++) {
        if (r < weights[i]) {
            idx = i;
            break;
        }
        r -= weights[i];
    }
    const typeObj = enemyTypes[idx];
    const x = Math.random() * (canvas.width - typeObj.width);
    if (typeObj.type === 'basic') {
        enemies.push({ x, y: -typeObj.height, width: typeObj.width, height: typeObj.height, speed: typeObj.speed, type: typeObj.type });
    } else {
        enemies.push({ x, y: -typeObj.height, width: typeObj.width, height: typeObj.height, speed: typeObj.speed, type: typeObj.type });
    }
}

function spawnBasicWave() {
    // Spawn 5 basic enemies in a horizontal wave
    const count = 5;
    const spacing = canvas.width / (count + 1);
    for (let i = 0; i < count; i++) {
        const x = spacing * (i + 1) - 20;
        enemies.push({
            x: x,
            y: -40,
            width: 40,
            height: 40,
            speed: 2,
            type: 'basic',
            dir: i % 2 === 0 ? 1 : -1,
            patrolSpeed: 2 + Math.random(),
            patrolTimer: 0,
            shootTimer: 0
        });
    }
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
    perkTimer = 0;
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
    drawEnemyBullets();
    drawEnemies();
    drawDestructions();
    drawPerks();
    drawScore();
    updateHealthBar();
    movePlayer();
    moveBullets();
    moveEnemyBullets();
    moveEnemies();
    movePerks();
    detectCollisions();

    // Animate and remove finished destructions
    for (let i = destructions.length - 1; i >= 0; i--) {
        destructions[i].frame++;
        if (destructions[i].frame >= (destructions[i].frameCount || 10)) {
            destructions.splice(i, 1);
        }
    }

    // Handle perk timer
    if (perkTimer > 0) {
        perkTimer--;
        if (perkTimer === 0) {
            fireLevel = 1; // Reset fireLevel when timer ends
        }
    }

    if (shooting && shootCooldown <= 0 && exhaustCooldown <= 0) {
        for (let i = 0; i < fireLevel; i++) {
            const offset = (i - (fireLevel-1)/2) * 18;
            bullets.push({
                x: player.x + player.width / 2 - 12 + offset,
                y: player.y,
                width: 10,
                height: 50,
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

// Keyboard controls (now support up/down)
document.addEventListener('keydown', e => {
    if (e.code === 'ArrowLeft') player.dx = -player.speed;
    if (e.code === 'ArrowRight') player.dx = player.speed;
    if (e.code === 'ArrowUp') player.dy = -player.speed;
    if (e.code === 'ArrowDown') player.dy = player.speed;
    if (e.code === 'Space') shooting = true;
});

document.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') player.dx = 0;
    if (e.code === 'ArrowUp' || e.code === 'ArrowDown') player.dy = 0;
    if (e.code === 'Space') shooting = false;
});

// Mouse movement controls
canvas.addEventListener('mousemove', function(e) {
    const rect = canvas.getBoundingClientRect();
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;
    // Center the ship on the mouse
    player.x = mouseX - player.width / 2;
    player.y = mouseY - player.height / 2;
    // Clamp to canvas
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
});

document.addEventListener('DOMContentLoaded', () => {
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
        restartBtn.addEventListener('click', resetGame);
    }
});

gameLoop();
