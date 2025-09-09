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
const HEALTH_PERK = 'health';
const FIRE_PERK = 'fire';
let level = 1;
const maxLevel = 5;
const killsToNextLevel = [20, 30, 40, 50, 60];
let levelComplete = false;

let bossActive = false;
let boss = null;
let bossProjectiles = [];
let bossPause = 0;
let playerPowerUp = 0;
let bossWaveAngle = 0;
let bossBurst = false;
let bossPattern = null;
let bossFadeIn = 0;
let bossesPerLevel = 2 + Math.floor(Math.random() * 2); // 2-3 bosses per level
let currentBossNum = 0;
let usedBossPatterns = [];
let bossPhase = false;
let bossKillTargets = [];
let bossScoreTargets = [];



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
        if (perk.type === HEALTH_PERK) {
            ctx.shadowColor = '#ffe600';
            ctx.shadowBlur = 32;
            ctx.beginPath();
            ctx.arc(perk.x + perk.size/2, perk.y + perk.size/2, perk.size/2 + 10, 0, Math.PI * 2);
            ctx.fillStyle = '#ffe600'; // yellow glow
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(perk.x + perk.size/2, perk.y + perk.size/2, perk.size/2, 0, Math.PI * 2);
            ctx.fillStyle = '#ff2222'; // bright red core
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4;
            ctx.stroke();
        } else {
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.arc(perk.x + perk.size/2, perk.y + perk.size/2, perk.size/2 + 6, 0, Math.PI * 2);
            ctx.fillStyle = '#00ff88';
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(perk.x + perk.size/2, perk.y + perk.size/2, perk.size/2, 0, Math.PI * 2);
            ctx.fillStyle = '#00ff44';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
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
            if (typeof FIRE_PERK !== 'undefined' && typeof HEALTH_PERK !== 'undefined' && perk.type) {
                if (perk.type === FIRE_PERK) {
                    fireLevel = Math.min(maxFireLevel, fireLevel + 1);
                    perkTimer = perkDuration;
                } else if (perk.type === HEALTH_PERK) {
                    player.health = Math.min(player.maxHealth, player.health + 40);
                }
            } else {
                fireLevel = Math.min(maxFireLevel, fireLevel + 1);
                perkTimer = perkDuration;
            }
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

function spawnPerk(type = FIRE_PERK) {
    const size = 28;
    const x = Math.random() * (canvas.width - size);
    perks.push({ x, y: -size, size, speed: 2, type });
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

function showLevelCompleteUI() {
    const overlay = document.getElementById('levelCompleteOverlay');
    const info = document.getElementById('levelCompleteInfo');
    const title = document.getElementById('levelCompleteTitle');
    const nextBtn = document.getElementById('nextLevelBtn');
    if (overlay && info && title && nextBtn) {
        overlay.style.display = 'flex';
        if (level < maxLevel) {
            title.textContent = 'Level ' + level + ' Complete!';
            info.textContent = 'Enemies Destroyed: ' + kills + '\nPrepare for Level ' + (level+1) + '!';
            nextBtn.style.display = 'inline-block';
        } else {
            title.textContent = 'Congratulations!';
            info.textContent = 'You finished all levels!\nTotal Enemies Destroyed: ' + kills;
            nextBtn.style.display = 'none';
        }
    }
}

function hideLevelCompleteUI() {
    const overlay = document.getElementById('levelCompleteOverlay');
    if (overlay) overlay.style.display = 'none';
}

function nextLevel() {
    if (level < maxLevel) {
        level++;
        kills = 0;
        score = 0;
        player.health = player.maxHealth;
        bullets.length = 0;
        enemies.length = 0;
        perks.length = 0;
        fireLevel = 1;
        exhaust = 0;
        exhaustCooldown = 0;
        bossActive = false;
        boss = null;
        bossProjectiles = [];
        currentBossNum = 0;
        bossesPerLevel = (level === 1) ? 2 : 2 + Math.floor(Math.random() * 2);
        usedBossPatterns = [];
        bossPhase = false;
        bossScoreTargets = [];
        if (level === 1) {
            bossScoreTargets = [800, 1500];
        } else {
            let base = Math.floor(120 + level * 60);
            for (let i = 0; i < bossesPerLevel; i++) bossScoreTargets[i] = base + i * 100;
        }
        hideDashboardOverlay();
        gameLoop();
    }
}

function drawLevel() {
    ctx.font = '22px Arial';
    ctx.fillStyle = '#ffe600';
    ctx.fillText('Level: ' + level, canvas.width - 120, 30);
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
    level = 1;
    exhaustLimit = 40;
    gameOver = false;
    shooting = false;
    shootCooldown = 0;
    levelComplete = false;
    hideGameOverUI();
    hideLevelCompleteUI();
    gameLoop();
}

function getUniqueBossPattern() {
    let available = [0,1,2,3].filter(p => !usedBossPatterns.includes(p));
    if (available.length === 0) usedBossPatterns = [];
    let pattern = available[Math.floor(Math.random() * available.length)];
    usedBossPatterns.push(pattern);
    return pattern;
}

function spawnBoss() {
    bossActive = true;
    bossPattern = getUniqueBossPattern();
    boss = {
        x: canvas.width / 2 - 60,
        y: 60,
        width: 120,
        height: 60,
        health: 120 + level * 80,
        maxHealth: 120 + level * 80,
        dx: 1.2 + level * 0.5,
        direction: 1,
        attackCooldown: 0,
        moveCooldown: 0,
        chargeCooldown: 0
    };
    bossProjectiles = [];
    bossPause = 0;
    bossWaveAngle = 0;
    bossBurst = false;
    enemies.length = 0; // clear all regular enemies
    bullets.length = 0; // clear all player bullets for clarity
    perks.length = 0; // clear perks
}

function drawBoss() {
    if (!bossActive || !boss) return;
    ctx.save();
    let alpha = bossFadeIn > 0 ? 0.85 : 1; // Always mostly visible
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#ffea00';
    ctx.shadowBlur = 32;
    ctx.fillStyle = '#ff8800';
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    ctx.strokeRect(boss.x, boss.y, boss.width, boss.height);
    // Boss health bar
    ctx.fillStyle = '#ff2222';
    ctx.fillRect(boss.x, boss.y - 18, boss.width * (boss.health / boss.maxHealth), 12);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(boss.x, boss.y - 18, boss.width, 12);
    ctx.restore();
}

function moveBoss() {
    if (!bossActive || !boss) return;
    if (bossPause > 0) {
        bossPause--;
        return;
    }
    // Unique movement patterns
    if (bossPattern === 0) {
        // Wave pattern
        boss.x += boss.dx * boss.direction;
        if (boss.x < 0 || boss.x + boss.width > canvas.width) boss.direction *= -1;
        bossWaveAngle += 0.04 + level * 0.01;
        boss.y = 60 + Math.sin(bossWaveAngle) * (30 + level * 5);
    } else if (bossPattern === 1) {
        // Zigzag pattern
        boss.x += boss.dx * boss.direction;
        boss.y += Math.sin(bossWaveAngle) * (2 + level);
        bossWaveAngle += 0.12 + level * 0.02;
        if (boss.x < 0 || boss.x + boss.width > canvas.width) boss.direction *= -1;
        if (boss.y < 40) boss.y = 40;
        if (boss.y > 180) boss.y = 180;
    } else if (bossPattern === 2) {
        // Pause and jump pattern
        if (boss.moveCooldown <= 0) {
            boss.x = Math.random() * (canvas.width - boss.width);
            boss.y = 60 + Math.random() * 80;
            boss.moveCooldown = 60 - level * 5;
        } else {
            boss.moveCooldown--;
        }
    } else if (bossPattern === 3) {
        // Fast charge pattern
        if (boss.chargeCooldown <= 0) {
            boss.direction = Math.random() < 0.5 ? 1 : -1;
            boss.chargeCooldown = 40 - level * 4;
        }
        boss.x += (boss.dx + level * 0.8) * boss.direction;
        if (boss.x < 0 || boss.x + boss.width > canvas.width) boss.direction *= -1;
        boss.y = 60 + Math.cos(bossWaveAngle) * (20 + level * 4);
        bossWaveAngle += 0.08 + level * 0.02;
    }
    // Boss burst attack
    let attackRate = bossPattern === 3 ? 18 : bossPattern === 2 ? 40 : 80 - level * 8;
    if (boss.attackCooldown <= 0) {
        bossBurst = Math.random() < 0.3 + level * 0.05; // higher chance for burst at higher levels
        let shots = bossBurst ? 4 + level : 1 + Math.floor(level/2);
        for (let i = 0; i < shots; i++) {
            bossProjectiles.push({
                x: boss.x + boss.width / 2 - 8 + i * 18 - (shots-1)*9,
                y: boss.y + boss.height,
                width: 16,
                height: 24,
                speed: 7 + level * 1.2
            });
        }
        boss.attackCooldown = attackRate;
        bossPause = bossBurst ? 10 : 40;
        playerPowerUp = bossBurst ? 30 : 60;
    } else {
        boss.attackCooldown--;
    }
}

function drawBossProjectiles() {
    ctx.fillStyle = '#ff0044';
    bossProjectiles.forEach(p => {
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });
}

function moveBossProjectiles() {
    bossProjectiles.forEach((p, i) => {
        p.y += p.speed;
        if (p.y > canvas.height) bossProjectiles.splice(i, 1);
    });
}

function detectBossCollisions() {
    if (!bossActive || !boss) return;
    // Player bullets hit boss
    bullets.forEach((bullet, bi) => {
        if (
            bullet.x < boss.x + boss.width &&
            bullet.x + bullet.width > boss.x &&
            bullet.y < boss.y + boss.height &&
            bullet.y + bullet.height > boss.y
        ) {
            boss.health -= 12;
            bullets.splice(bi, 1);
        }
    });
    // Boss projectiles hit player
    bossProjectiles.forEach((p, pi) => {
        if (
            player.x < p.x + p.width &&
            player.x + player.width > p.x &&
            player.y < p.y + p.height &&
            player.y + player.height > p.y
        ) {
            player.health -= 30;
            bossProjectiles.splice(pi, 1);
            if (player.health <= 0) gameOver = true;
        }
    });
}

function showDashboardOverlay() {
    const overlay = document.getElementById('dashboardOverlay');
    const info = document.getElementById('dashboardInfo');
    const title = document.getElementById('dashboardTitle');
    if (overlay && info && title) {
        overlay.style.display = 'flex';
        title.textContent = 'Thanks for playing!';
        info.textContent = 'You defeated both bosses!';
    }
}

function hideDashboardOverlay() {
    const overlay = document.getElementById('dashboardOverlay');
    if (overlay) overlay.style.display = 'none';
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
    if (levelComplete) {
        updateHealthBar();
        showLevelCompleteUI();
        return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayer();
    drawBullets();
    drawEnemyBullets();
    drawEnemies();
    drawDestructions();
    drawPerks();
    drawBoss();
    drawBossProjectiles();
    drawScore();
    drawLevel();
    updateHealthBar();
    movePlayer();
    moveBullets();
    moveEnemyBullets();
    moveEnemies();
    movePerks();
    moveBoss();
    moveBossProjectiles();
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
    if (shooting && shootCooldown <= 0 && exhaustCooldown <= 0 && !gameOver) {
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
        shootCooldown = shootRate;
        exhaust++;
        if (exhaust >= exhaustLimit) {
            exhaustCooldown = 60;
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
    const nextLevelBtn = document.getElementById('nextLevelBtn');
    if (nextLevelBtn) {
        nextLevelBtn.addEventListener('click', nextLevel);
    }
    const restartBtnDashboard = document.getElementById('dashboardRestartBtn');
    if (restartBtnDashboard) restartBtnDashboard.addEventListener('click', restartGameFromDashboard);
    const homeBtn = document.getElementById('dashboardHomeBtn');
    if (homeBtn) homeBtn.addEventListener('click', goToDashboard);
});

gameLoop();

function restartGameFromDashboard() {
    hideDashboardOverlay();
    // Fully reset game state
    level = 1;
    score = 0;
    kills = 0;
    player.health = player.maxHealth;
    bullets.length = 0;
    enemies.length = 0;
    perks.length = 0;
    fireLevel = 1;
    exhaust = 0;
    exhaustCooldown = 0;
    bossActive = false;
    boss = null;
    bossProjectiles = [];
    currentBossNum = 0;
    bossesPerLevel = 2;
    usedBossPatterns = [];
    bossPhase = false;
    bossScoreTargets = [800, 1500];
    gameOver = false;
    shooting = false;
    shootCooldown = 0;
    levelComplete = false;
    // Start with enemy waves, not boss
    gameLoop();
}
