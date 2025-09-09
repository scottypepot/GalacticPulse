// Bullet properties
const bullets = [];
const bulletWidth = 6;
const bulletHeight = 16;
const bulletColor = '#fff';
const bulletSpeed = 7;

let score = 0;

function shootBullet() {
    bullets.push({
        x: player.x + player.width / 2 - bulletWidth / 2,
        y: player.y - bulletHeight,
        width: bulletWidth,
        height: bulletHeight,
        color: bulletColor
    });
}

function drawBullets() {
    bullets.forEach(bullet => {
        ctx.save();
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        ctx.restore();
    });
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= bulletSpeed;
        // Remove bullets that move off screen
        if (bullets[i].y + bullets[i].height < 0) {
            bullets.splice(i, 1);
        }
    }
}
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Player spaceship properties
const player = {
    x: canvas.width / 2 - 20,
    y: canvas.height - 60,
    width: 40,
    height: 40,
    speed: 5,
    color: '#0ff',
    dx: 0
};
// Enemy properties
const enemies = [];
const enemyTypes = [
    {
        type: 'scout',
        color: '#f33',
        width: 32,
        height: 32,
        maxHealth: 1,
        speed: 2,
        score: 50,
        damage: 10
    },
    {
        type: 'fighter',
        color: '#3f3',
        width: 40,
        height: 40,
        maxHealth: 3,
        speed: 1.5,
        score: 150,
        damage: 20
    },
    {
        type: 'tank',
        color: '#39f',
        width: 48,
        height: 48,
        maxHealth: 6,
        speed: 1,
        score: 300,
        damage: 40
    }
];
const enemySpawnInterval = 1200; // ms

function spawnEnemy() {
    const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    const x = Math.random() * (canvas.width - type.width);
    enemies.push({
        x,
        y: -type.height,
        width: type.width,
        height: type.height,
        color: type.color,
        type: type.type,
        maxHealth: type.maxHealth,
        health: type.maxHealth,
        speed: type.speed,
        score: type.score,
        damage: type.damage
    });
}

function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.save();
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // Healthbar is now invisible
    });
}
// Bullet-enemy collision detection
function checkBulletEnemyCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            // Simple AABB collision
            if (
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y
            ) {
                enemy.health--;
                bullets.splice(i, 1);
                if (enemy.health <= 0) {
                    score += enemy.score;
                    enemies.splice(j, 1);
                }
                break;
            }
        }
    }
}

function checkPlayerEnemyCollisions() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y
        ) {
            player.health -= enemy.damage;
            enemies.splice(i, 1);
        }
    }
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].y += enemies[i].speed;
        // Remove enemies that move off screen
        if (enemies[i].y > canvas.height) {
            enemies.splice(i, 1);
        }
    }
}

function drawPlayer() {
    ctx.save();
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y); // nose
    ctx.lineTo(player.x, player.y + player.height); // left wing
    ctx.lineTo(player.x + player.width, player.y + player.height); // right wing
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawPlayerHealthBar() {
    // Draw player health bar at top left
    const barWidth = 200;
    const barHeight = 18;
    const x = 20;
    const y = 20;
    ctx.save();
    ctx.fillStyle = '#222';
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = '#0ff';
    ctx.fillRect(x, y, barWidth * (player.health / 100), barHeight);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(x, y, barWidth, barHeight);
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText(`HP: ${player.health} / 100`, x + 10, y + 14);
    ctx.restore();
}

function drawScore() {
    ctx.save();
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.fillText(`Score: ${score}`, canvas.width - 20, 38);
    ctx.restore();
}

function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function update() {
    player.x += player.dx;
    // Prevent going out of bounds
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    updateEnemies();
    updateBullets();
    checkBulletEnemyCollisions();
    checkPlayerEnemyCollisions();
}


// --- Main menu and game over logic ---
let gameOver = false;
let gameStarted = false;
let enemySpawnTimer = null;

function showMenu() {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GALACTIC PULSE', canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = 'bold 28px Arial';
    ctx.fillText('Alien Spaceship Shooter', canvas.width / 2, canvas.height / 2);
    ctx.font = '20px Arial';
    ctx.fillText('Use Arrow Keys to Move, Space to Shoot', canvas.width / 2, canvas.height / 2 + 40);
    ctx.restore();
    // Show start button
    let btn = document.getElementById('startBtn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'startBtn';
        btn.textContent = 'Start Game';
        btn.style.position = 'absolute';
        btn.style.left = (canvas.offsetLeft + canvas.width / 2 - 60) + 'px';
        btn.style.top = (canvas.offsetTop + canvas.height / 2 + 60) + 'px';
        btn.style.fontSize = '24px';
        btn.style.padding = '10px 24px';
        btn.style.background = '#0ff';
        btn.style.color = '#000';
        btn.style.border = 'none';
        btn.style.borderRadius = '8px';
        btn.style.cursor = 'pointer';
        btn.style.zIndex = 10;
        btn.onclick = () => {
            btn.style.display = 'none';
            startGame();
        };
        document.body.appendChild(btn);
    } else {
        btn.style.display = 'block';
    }
    // Hide restart button if present
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) restartBtn.style.display = 'none';
}

function showGameOver() {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 30);
    ctx.font = 'bold 28px Arial';
    ctx.fillText('Press Start Again', canvas.width / 2, canvas.height / 2 + 20);
    ctx.restore();
    // Show restart button
    let btn = document.getElementById('restartBtn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'restartBtn';
        btn.textContent = 'Start Again';
        btn.style.position = 'absolute';
        btn.style.left = (canvas.offsetLeft + canvas.width / 2 - 60) + 'px';
        btn.style.top = (canvas.offsetTop + canvas.height / 2 + 40) + 'px';
        btn.style.fontSize = '24px';
        btn.style.padding = '10px 24px';
        btn.style.background = '#0ff';
        btn.style.color = '#000';
        btn.style.border = 'none';
        btn.style.borderRadius = '8px';
        btn.style.cursor = 'pointer';
        btn.style.zIndex = 10;
        btn.onclick = () => {
            btn.style.display = 'none';
            startGame();
        };
        document.body.appendChild(btn);
    } else {
        btn.style.display = 'block';
    }
    // Hide start button if present
    const startBtn = document.getElementById('startBtn');
    if (startBtn) startBtn.style.display = 'none';
}

function startGame() {
    // Reset all game state
    player.x = canvas.width / 2 - 20;
    player.y = canvas.height - 60;
    player.health = 100;
    enemies.length = 0;
    bullets.length = 0;
    gameOver = false;
    gameStarted = true;
    if (!enemySpawnTimer) {
        enemySpawnTimer = setInterval(spawnEnemy, enemySpawnInterval);
    }
    mainGameLoop();
}

function mainGameLoop() {
    const now = Date.now();
    if (!gameStarted) {
        showMenu();
        return;
    }
    if (gameOver) {
        showGameOver();
        if (enemySpawnTimer) {
            clearInterval(enemySpawnTimer);
            enemySpawnTimer = null;
        }
        return;
    }
    clear();
    update();
    drawPlayer();
    drawEnemies();
    drawBullets();
    drawPlayerHealthBar();
    drawScore();
    tryShoot(now);
    if (player.health <= 0) {
        gameOver = true;
        showGameOver();
        if (enemySpawnTimer) {
            clearInterval(enemySpawnTimer);
            enemySpawnTimer = null;
        }
        return;
    }
    requestAnimationFrame(mainGameLoop);
}

mainGameLoop();

let spacePressed = false;
let lastShotTime = 0;
const fireRate = 250; // ms cooldown between shots

function tryShoot(now) {
    if (gameStarted && spacePressed && now - lastShotTime > fireRate) {
        shootBullet();
        lastShotTime = now;
    }
}

document.addEventListener('keydown', (e) => {
    if (!gameStarted) return;
    if (e.key === 'ArrowLeft') player.dx = -player.speed;
    if (e.key === 'ArrowRight') player.dx = player.speed;
    if (e.code === 'Space') spacePressed = true;
});
document.addEventListener('keyup', (e) => {
    if (!gameStarted) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') player.dx = 0;
    if (e.code === 'Space') spacePressed = false;
});
