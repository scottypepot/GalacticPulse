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
            if (perk.type === FIRE_PERK) {
                fireLevel = Math.min(maxFireLevel, fireLevel + 1);
            } else if (perk.type === HEALTH_PERK) {
                player.health = Math.min(player.maxHealth, player.health + 40);
            }
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
    drawEnemies();
    drawPerks();
    drawBoss();
    drawBossProjectiles();
    drawScore();
    drawLevel();
    updateHealthBar();
    movePlayer();
    moveBullets();
    moveEnemies();
    movePerks();
    moveBoss();
    moveBossProjectiles();
    detectCollisions();
    detectBossCollisions();
    // Boss fight trigger
    if (!bossActive && kills >= killsToNextLevel[level-1]) {
        spawnBoss();
    }
    // Boss defeat
    if (bossActive && boss && boss.health <= 0) {
        bossActive = false;
        boss = null;
        bossProjectiles = [];
        bossPhase = false;
        currentBossNum++;
        // If level 1 and 2 bosses defeated, show final screen
        if (level === 1 && currentBossNum >= 2) {
            showDashboardOverlay();
            return;
        }
        // Immediately resume enemy waves
        gameLoop();
        return;
    }
    // Boss spawn logic
    if (!bossActive && !bossPhase && currentBossNum < bossesPerLevel && score >= bossScoreTargets[currentBossNum]) {
        bossPhase = true;
        spawnBoss();
        return;
    }
    // Only spawn enemies/perks if not in boss phase
    if (!bossActive && !bossPhase) {
        if (Math.random() < 0.02 + level * 0.005) spawnEnemy();
        if (Math.random() < 0.0015) spawnPerk(FIRE_PERK);
        if (Math.random() < 0.0007) spawnPerk(HEALTH_PERK);
    }
    // Firing logic fix (always allow firing if not game over)
    let shootRate = Math.max(8, 28 - level * 2);
    if (playerPowerUp > 0) {
        shootRate = Math.max(4, shootRate - 6);
        playerPowerUp--;
    }
    if (shooting && shootCooldown <= 0 && exhaustCooldown <= 0 && !gameOver) {
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
