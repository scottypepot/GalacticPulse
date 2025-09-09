// Game State Management
let currentScreen = 'home';
let gameState = 'menu'; // menu, playing, paused, gameOver
let isPaused = false;

// Game Settings
const gameSettings = {
    masterVolume: 70,
    musicVolume: 50,
    sfxVolume: 80,
    masterMuted: false,
    musicMuted: false,
    sfxMuted: false,
    difficulty: 'medium',
    controlScheme: 'arrows',
    displayMode: 'windowed',
    resolution: '480x640',
    gameMode: 'story'
};

// Audio Context
let audioContext;
let backgroundMusicGain;
let sfxGain;
let masterGain;

// Audio Elements
let backgroundMusic;
let playerLossSound;
let playerWinSound;
let roundFinishSound;
let currentMusicState = 'menu'; // 'menu', 'gameplay', 'victory', 'defeat', 'roundFinish'
let musicFadeInterval = null;

// Game Variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Screen shake system
let screenShake = {
    x: 0,
    y: 0,
    intensity: 0,
    duration: 0
};

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
let exhaustLimit = 40;
let exhaustCooldown = 0;
const perks = [];

// Round System Variables
let currentRound = 1;
let roundDuration = 30000; // 30 seconds per round in milliseconds
let scoreThresholdPerRound = 500; // Score needed to advance to next round
let enemiesSpawnedThisRound = 0;
let enemiesKilledThisRound = 0;
let roundInProgress = false;
let betweenRounds = false;
let roundStartTime = 0;
let lastRoundAdvanceScore = 0; // Track score when last round advanced

// Difficulty Settings
const difficultySettings = {
    easy: {
        enemySpeed: 1.5,
        enemySpawnRate: 0.015,
        playerSpeed: 6,
        enemyDamage: 20
    },
    medium: {
        enemySpeed: 2,
        enemySpawnRate: 0.02,
        playerSpeed: 5,
        enemyDamage: 34
    },
    hard: {
        enemySpeed: 3,
        enemySpawnRate: 0.03,
        playerSpeed: 4,
        enemyDamage: 50
    }
};

// Screen Shake Functions
function addScreenShake(intensity, duration) {
    screenShake.intensity = Math.max(screenShake.intensity, intensity);
    screenShake.duration = Math.max(screenShake.duration, duration);
}

function updateScreenShake() {
    if (screenShake.duration > 0) {
        screenShake.x = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.y = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.duration--;
        
        if (screenShake.duration <= 0) {
            screenShake.x = 0;
            screenShake.y = 0;
            screenShake.intensity = 0;
        }
    }
}

function applyScreenShake(ctx) {
    if (screenShake.intensity > 0) {
        ctx.translate(screenShake.x, screenShake.y);
    }
}

function resetScreenShake(ctx) {
    if (screenShake.intensity > 0) {
        ctx.translate(-screenShake.x, -screenShake.y);
    }
}

// Screen Management
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    const targetScreen = document.getElementById(screenName + 'Screen');
    if (targetScreen) {
        targetScreen.classList.add('active');
        currentScreen = screenName;
    }
}

// Audio Management
function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create gain nodes for volume control
        masterGain = audioContext.createGain();
        backgroundMusicGain = audioContext.createGain();
        sfxGain = audioContext.createGain();
        
        // Connect the audio graph
        masterGain.connect(audioContext.destination);
        backgroundMusicGain.connect(masterGain);
        sfxGain.connect(masterGain);
        
        // Get audio elements
        backgroundMusic = document.getElementById('backgroundMusic');
        playerLossSound = document.getElementById('playerLossSound');
        playerWinSound = document.getElementById('playerWinSound');
        roundFinishSound = document.getElementById('roundFinishSound');
        
        // Add error handling for audio loading
        [backgroundMusic, playerLossSound, playerWinSound, roundFinishSound].forEach(audio => {
            if (audio) {
                audio.addEventListener('error', (e) => {
                    console.log(`Audio file failed to load: ${audio.src}`, e);
                });
                
                audio.addEventListener('canplaythrough', () => {
                    console.log(`Audio file loaded successfully: ${audio.src}`);
                });
            }
        });
        
        updateAudioSettings();
    } catch (e) {
        console.log('Audio not supported');
    }
}

function updateAudioSettings() {
    if (!audioContext) return;
    
    const masterVol = gameSettings.masterMuted ? 0 : gameSettings.masterVolume / 100;
    const musicVol = gameSettings.musicMuted ? 0 : gameSettings.musicVolume / 100;
    const sfxVol = gameSettings.sfxMuted ? 0 : gameSettings.sfxVolume / 100;
    
    if (masterGain) masterGain.gain.value = masterVol;
    if (backgroundMusicGain) backgroundMusicGain.gain.value = musicVol;
    if (sfxGain) sfxGain.gain.value = sfxVol;
    
    // Update HTML5 audio elements volume
    updateMusicVolume();
}

function updateMusicVolume() {
    if (backgroundMusic) {
        const finalVolume = (gameSettings.masterVolume / 100) * (gameSettings.musicVolume / 100);
        backgroundMusic.volume = gameSettings.musicMuted || gameSettings.masterMuted ? 0 : finalVolume;
    }
    if (playerLossSound) {
        const finalVolume = (gameSettings.masterVolume / 100) * (gameSettings.sfxVolume / 100);
        playerLossSound.volume = gameSettings.sfxMuted || gameSettings.masterMuted ? 0 : finalVolume;
    }
    if (playerWinSound) {
        const finalVolume = (gameSettings.masterVolume / 100) * (gameSettings.sfxVolume / 100);
        playerWinSound.volume = gameSettings.sfxMuted || gameSettings.masterMuted ? 0 : finalVolume;
    }
    if (roundFinishSound) {
        const finalVolume = (gameSettings.masterVolume / 100) * (gameSettings.sfxVolume / 100);
        roundFinishSound.volume = gameSettings.sfxMuted || gameSettings.masterMuted ? 0 : finalVolume;
    }
}

function playBackgroundMusic() {
    if (backgroundMusic && !gameSettings.musicMuted && !gameSettings.masterMuted) {
        updateMusicVolume();
        
        // Only play if not already playing
        if (backgroundMusic.paused) {
            backgroundMusic.play().catch(e => {
                console.log('Music play failed:', e);
                // Try to enable audio after user interaction
                document.addEventListener('click', enableAudioAfterInteraction, { once: true });
            });
        }
    }
}

function enableAudioAfterInteraction() {
    if (backgroundMusic && backgroundMusic.paused) {
        playBackgroundMusic();
    }
}

function stopBackgroundMusic() {
    if (backgroundMusic && !backgroundMusic.paused) {
        fadeOutMusic(() => {
            backgroundMusic.pause();
            backgroundMusic.currentTime = 0;
        });
    }
}

function pauseBackgroundMusic() {
    if (backgroundMusic && !backgroundMusic.paused) {
        fadeOutMusic(() => {
            backgroundMusic.pause();
        });
    }
}

function resumeBackgroundMusic() {
    if (backgroundMusic && backgroundMusic.paused) {
        fadeInMusic(() => {
            playBackgroundMusic();
        });
    }
}

function fadeOutMusic(callback, duration = 1000) {
    if (!backgroundMusic || gameSettings.musicMuted || gameSettings.masterMuted) {
        if (callback) callback();
        return;
    }
    
    const startVolume = backgroundMusic.volume;
    const fadeStep = startVolume / (duration / 50); // 50ms intervals
    
    if (musicFadeInterval) clearInterval(musicFadeInterval);
    
    musicFadeInterval = setInterval(() => {
        if (backgroundMusic.volume > fadeStep) {
            backgroundMusic.volume -= fadeStep;
        } else {
            backgroundMusic.volume = 0;
            clearInterval(musicFadeInterval);
            musicFadeInterval = null;
            if (callback) callback();
        }
    }, 50);
}

function fadeInMusic(callback, duration = 1000) {
    if (!backgroundMusic || gameSettings.musicMuted || gameSettings.masterMuted) {
        if (callback) callback();
        return;
    }
    
    const targetVolume = (gameSettings.masterVolume / 100) * (gameSettings.musicVolume / 100);
    const fadeStep = targetVolume / (duration / 50); // 50ms intervals
    
    backgroundMusic.volume = 0;
    if (callback) callback();
    
    if (musicFadeInterval) clearInterval(musicFadeInterval);
    
    musicFadeInterval = setInterval(() => {
        if (backgroundMusic.volume < targetVolume - fadeStep) {
            backgroundMusic.volume += fadeStep;
        } else {
            backgroundMusic.volume = targetVolume;
            clearInterval(musicFadeInterval);
            musicFadeInterval = null;
        }
    }, 50);
}

function transitionToVictoryMusic() {
    currentMusicState = 'victory';
    fadeOutMusic(() => {
        if (backgroundMusic) {
            backgroundMusic.pause();
            backgroundMusic.currentTime = 0;
        }
        playPlayerWinSound();
        
        // After victory sound, fade back to menu music
        setTimeout(() => {
            currentMusicState = 'menu';
            fadeInMusic(() => {
                playBackgroundMusic();
            });
        }, playerWinSound ? (playerWinSound.duration * 1000) || 3000 : 3000);
    });
}

function transitionToDefeatMusic() {
    currentMusicState = 'defeat';
    fadeOutMusic(() => {
        if (backgroundMusic) {
            backgroundMusic.pause();
            backgroundMusic.currentTime = 0;
        }
        playPlayerLossSound();
        
        // After defeat sound, stop music completely
        setTimeout(() => {
            currentMusicState = 'menu';
        }, playerLossSound ? (playerLossSound.duration * 1000) || 3000 : 3000);
    });
}

function transitionToRoundFinishMusic() {
    currentMusicState = 'roundFinish';
    
    // Immediately play round finish sound while temporarily reducing music volume
    fadeOutMusic(() => {
        playRoundFinishSound();
        // Don't automatically fade music back in - let completeRound() handle timing
    }, 500); // Faster fade out for round finish
}

function playPlayerLossSound() {
    if (playerLossSound && !gameSettings.sfxMuted && !gameSettings.masterMuted) {
        updateMusicVolume(); // This updates all audio volumes including SFX
        playerLossSound.currentTime = 0; // Reset to beginning
        playerLossSound.play().catch(e => console.log('Player loss sound failed:', e));
    }
}

function playPlayerWinSound() {
    if (playerWinSound && !gameSettings.sfxMuted && !gameSettings.masterMuted) {
        updateMusicVolume(); // This updates all audio volumes including SFX
        playerWinSound.currentTime = 0; // Reset to beginning
        playerWinSound.play().catch(e => console.log('Player win sound failed:', e));
    }
}

function playRoundFinishSound() {
    if (roundFinishSound && !gameSettings.sfxMuted && !gameSettings.masterMuted) {
        updateMusicVolume(); // This updates all audio volumes including SFX
        roundFinishSound.currentTime = 0; // Reset to beginning
        roundFinishSound.play().catch(e => console.log('Round finish sound failed:', e));
    }
}

function playSFX(frequency = 440, duration = 0.1, type = 'sine') {
    if (!audioContext || gameSettings.sfxMuted) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(sfxGain);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.log('SFX play failed:', e);
    }
}

// Settings Management
function saveSettings() {
    localStorage.setItem('galacticPulseSettings', JSON.stringify(gameSettings));
    updateAudioSettings();
    applyDisplaySettings();
    showScreen('home');
}

function loadSettings() {
    const saved = localStorage.getItem('galacticPulseSettings');
    if (saved) {
        Object.assign(gameSettings, JSON.parse(saved));
        updateSettingsUI();
    }
}

function updateSettingsUI() {
    document.getElementById('masterVolume').value = gameSettings.masterVolume;
    document.getElementById('masterVolumeValue').textContent = gameSettings.masterVolume + '%';
    document.getElementById('musicVolume').value = gameSettings.musicVolume;
    document.getElementById('musicVolumeValue').textContent = gameSettings.musicVolume + '%';
    document.getElementById('sfxVolume').value = gameSettings.sfxVolume;
    document.getElementById('sfxVolumeValue').textContent = gameSettings.sfxVolume + '%';
    
    document.getElementById('masterMute').textContent = gameSettings.masterMuted ? '🔇' : '🔊';
    document.getElementById('musicMute').textContent = gameSettings.musicMuted ? '🔇' : '🔊';
    document.getElementById('sfxMute').textContent = gameSettings.sfxMuted ? '🔇' : '🔊';
    
    document.getElementById('difficulty').value = gameSettings.difficulty;
    document.getElementById('controlScheme').value = gameSettings.controlScheme;
    document.getElementById('displayMode').value = gameSettings.displayMode;
    document.getElementById('resolution').value = gameSettings.resolution;
    document.getElementById('gameModeSelect').value = gameSettings.gameMode;
}

function applyDisplaySettings() {
    const [width, height] = gameSettings.resolution.split('x').map(Number);
    canvas.width = width;
    canvas.height = height;
    
    // Reset player position for new canvas size
    player.x = canvas.width / 2 - 20;
    player.y = canvas.height - 60;
    
    if (gameSettings.displayMode === 'fullscreen' && document.body.requestFullscreen) {
        document.body.requestFullscreen().catch(e => console.log('Fullscreen failed:', e));
    } else if (document.exitFullscreen) {
        document.exitFullscreen().catch(e => console.log('Exit fullscreen failed:', e));
    }
}

// Control Schemes
function getControls() {
    return {
        arrows: {
            left: 'ArrowLeft',
            right: 'ArrowRight',
            shoot: 'Space'
        },
        wasd: {
            left: 'KeyA',
            right: 'KeyD',
            shoot: 'KeyF'
        }
    }[gameSettings.controlScheme] || {
        left: 'ArrowLeft',
        right: 'ArrowRight',
        shoot: 'Space'
    };
}

// Game Functions
function drawPlayer() {
    // Use player sprite image
    if (!player.sprite) {
        player.sprite = new Image();
        player.sprite.src = 'assets/images/player/spaceShips_005.png';
    }
    if (player.sprite.complete) {
        ctx.drawImage(player.sprite, player.x, player.y, player.width, player.height);
    } else {
        player.sprite.onload = () => {
            ctx.drawImage(player.sprite, player.x, player.y, player.width, player.height);
        };
        // Fallback: draw rectangle until image loads
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
}

function drawBullets() {
    ctx.fillStyle = '#fff';
    bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

function drawEnemies() {
    enemies.forEach(enemy => {
        if (enemy.sprite && enemy.sprite.complete) {
            ctx.drawImage(enemy.sprite, enemy.x, enemy.y, enemy.width, enemy.height);
        } else {
            // Fallback: draw rectangle until image loads
            ctx.fillStyle = '#ff0044';
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        }
    });
}

function drawScore() {
    ctx.font = '20px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText('Score: ' + score, 10, 30);
    
    // Draw round information
    ctx.font = '16px Arial';
    ctx.fillText('Round: ' + currentRound, 10, 55);
    
    if (roundInProgress) {
        const currentTime = Date.now();
        const timeElapsed = currentTime - roundStartTime;
        const timeRemaining = Math.max(0, roundDuration - timeElapsed);
        const scoreGainedThisRound = score - lastRoundAdvanceScore;
        const scoreNeeded = Math.max(0, scoreThresholdPerRound - scoreGainedThisRound);
        
        // Show time remaining
        const secondsRemaining = Math.ceil(timeRemaining / 1000);
        ctx.fillText('Time: ' + secondsRemaining + 's', 10, 75);
        
        // Show score progress
        ctx.fillText('Score to next: ' + scoreNeeded, 10, 95);
        
        // Progress bar for score
        const barWidth = 150;
        const barHeight = 8;
        const progress = Math.min(1, scoreGainedThisRound / scoreThresholdPerRound);
        
        ctx.fillStyle = '#333';
        ctx.fillRect(10, 100, barWidth, barHeight);
        ctx.fillStyle = '#00ffea';
        ctx.fillRect(10, 100, barWidth * progress, barHeight);
        ctx.fillStyle = '#fff';
    }
    
    ctx.fillText('Enemies: ' + enemies.length, 10, 120);
    
    // Draw difficulty indicator
    ctx.fillText('Difficulty: ' + gameSettings.difficulty.toUpperCase(), 10, 140);
    
    // Draw game mode
    ctx.fillText('Mode: ' + gameSettings.gameMode.toUpperCase(), 10, 160);
    
    // Draw round status
    if (betweenRounds) {
        ctx.save();
        ctx.font = '24px Arial';
        ctx.fillStyle = '#00ffea';
        ctx.textAlign = 'center';
        ctx.fillText('ROUND COMPLETE!', canvas.width / 2, canvas.height / 2 - 40);
        ctx.fillText('Preparing Round ' + (currentRound + 1) + '...', canvas.width / 2, canvas.height / 2);
        ctx.restore();
    }
}

function updateHealthBar() {
    const healthBar = document.getElementById('healthBar');
        if (healthBar) {
            let percent;
            if (gameOver || player.health <= 0) {
                percent = 0; // Health bar is empty when dead
                // Show game over modal if not already visible
                const overlay = document.getElementById('gameOverOverlay');
                if (overlay && overlay.style.display !== 'flex') {
                    overlay.style.display = 'flex';
                    setTimeout(() => overlay.classList.add('visible'), 50);
                }
            } else {
                percent = Math.max(0, player.health) / player.maxHealth * 100;
            }
            // Add Try Again button event if not already set
            const restartBtn = document.getElementById('restartBtn');
            if (restartBtn && !restartBtn._bound) {
                restartBtn.addEventListener('click', () => {
                    // Hide modal and restart game
                    const overlay = document.getElementById('gameOverOverlay');
                    if (overlay) {
                        overlay.classList.remove('visible');
                        setTimeout(() => overlay.style.display = 'none', 500);
                    }
                    player.health = player.maxHealth;
                    gameOver = false;
                    resetGame();
                });
                restartBtn._bound = true;
            }
        
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
    const difficulty = difficultySettings[gameSettings.difficulty];
    player.speed = difficulty.playerSpeed;
    
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
    const difficulty = difficultySettings[gameSettings.difficulty];
    enemies.forEach((enemy, i) => {
        enemy.speed = difficulty.enemySpeed;
        enemy.y += enemy.speed;
        if (enemy.y > canvas.height) {
            enemies.splice(i, 1);
            // Don't count enemies that leave the screen as "killed" for round completion
            // Just remove them and let new ones spawn if needed
        }
    });
}

function movePerks() {
    perks.forEach((perk, i) => {
        perk.y += perk.speed;
        if (perk.y > canvas.height) perks.splice(i, 1);
    });
}

function detectCollisions() {
    const difficulty = difficultySettings[gameSettings.difficulty];
    
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
                enemiesKilledThisRound++;
                playSFX(800, 0.1, 'square'); // Enemy hit sound
                addScreenShake(2, 5); // Small shake for enemy destruction
                
                // Check for victory conditions (milestone achievements)
                checkVictoryConditions();
            }
        });
        
        // Player collision
        if (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y
        ) {
            player.health -= difficulty.enemyDamage;
            if (player.health < 0) player.health = 0; // Clamp health to zero
            enemies.splice(ei, 1);
            fireLevel = 1;
            playSFX(200, 0.3, 'sawtooth'); // Player hit sound
            addScreenShake(5, 10); // Small shake for hit
            if (player.health <= 0 && !gameOver) {
                gameOver = true;
                gameState = 'gameOver';
                addScreenShake(15, 30); // Intense shake for death
                playSFX(100, 0.5, 'square'); // Death sound
            }
        }
    });
    detectPerkCollisions();
}

function checkVictoryConditions() {
    // Victory conditions based on game mode and achievements
    let victoryTriggered = false;
    
    switch (gameSettings.gameMode) {
        case 'story':
            // Story mode: Victory every 50 kills
            if (kills > 0 && kills % 50 === 0) {
                victoryTriggered = true;
            }
            break;
        case 'survival':
            // Survival mode: Victory every 100 kills
            if (kills > 0 && kills % 100 === 0) {
                victoryTriggered = true;
            }
            break;
        case 'endless':
            // Endless mode: Victory every 25 kills (more frequent rewards)
            if (kills > 0 && kills % 25 === 0) {
                victoryTriggered = true;
            }
            break;
    }
    
    // Additional victory conditions
    if (score > 0 && score % 1000 === 0) { // Every 1000 points
        victoryTriggered = true;
    }
    
    if (victoryTriggered) {
        triggerVictoryMoment();
    }
}

function triggerVictoryMoment() {
    // Brief victory music transition
    const originalState = currentMusicState;
    transitionToVictoryMusic();
    
    // Show brief victory message
    showVictoryMessage();
    
    // Restore gameplay music after victory sequence
    setTimeout(() => {
        if (gameState === 'playing' && !gameOver) {
            currentMusicState = 'gameplay';
            playBackgroundMusic();
        }
    }, 3000);
}

function showVictoryMessage() {
    // Create temporary victory overlay
    const victoryOverlay = document.createElement('div');
    victoryOverlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(45deg, rgba(0, 255, 68, 0.9), rgba(0, 255, 234, 0.9));
        color: #000;
        padding: 20px 40px;
        border-radius: 15px;
        font-size: 1.5rem;
        font-weight: bold;
        text-align: center;
        z-index: 1000;
        animation: victoryPulse 0.5s ease-in-out;
        box-shadow: 0 0 30px rgba(0, 255, 68, 0.8);
    `;
    
    // Add CSS animation
    if (!document.getElementById('victoryAnimation')) {
        const style = document.createElement('style');
        style.id = 'victoryAnimation';
        style.textContent = `
            @keyframes victoryPulse {
                0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    victoryOverlay.innerHTML = `
        <div>🏆 MILESTONE ACHIEVED! 🏆</div>
        <div style="font-size: 1rem; margin-top: 10px;">
            ${kills} Enemies Destroyed<br>
            Score: ${score}
        </div>
    `;
    
    document.body.appendChild(victoryOverlay);
    
    // Remove after 2.5 seconds
    setTimeout(() => {
        if (victoryOverlay.parentNode) {
            victoryOverlay.parentNode.removeChild(victoryOverlay);
        }
    }, 2500);
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
            playSFX(1000, 0.2, 'sine'); // Perk pickup sound
        }
    });
}

function startNewRound() {
    roundInProgress = true;
    betweenRounds = false;
    enemiesSpawnedThisRound = 0;
    enemiesKilledThisRound = 0;
    roundStartTime = Date.now();
    lastRoundAdvanceScore = score; // Track score when round started
    
    // Increase round duration and score threshold slightly each round for progressive difficulty
    roundDuration = Math.min(30000 + (currentRound - 1) * 2000, 60000); // Max 60 seconds
    scoreThresholdPerRound = 500 + (currentRound - 1) * 100; // Increase score requirement
    
    console.log(`Starting Round ${currentRound} - Duration: ${roundDuration/1000}s, Score needed: ${scoreThresholdPerRound}`);
}

function checkRoundCompletion() {
    if (!roundInProgress) return;
    
    const currentTime = Date.now();
    const timeElapsed = currentTime - roundStartTime;
    const scoreGainedThisRound = score - lastRoundAdvanceScore;
    
    // Complete round based on either time elapsed OR score threshold reached
    if (timeElapsed >= roundDuration || scoreGainedThisRound >= scoreThresholdPerRound) {
        completeRound();
    }
}

function completeRound() {
    if (!roundInProgress) return;
    
    roundInProgress = false;
    betweenRounds = true;
    
    console.log(`Round ${currentRound} completed!`);
    
    // Immediately play round finish sound
    transitionToRoundFinishMusic();
    
    // Wait exactly 3 seconds before starting next round
    setTimeout(() => {
        // Fade music back in before starting next round
        if (gameState === 'playing' && !gameOver) {
            currentMusicState = 'gameplay';
            fadeInMusic(() => {
                // Music is ready, start next round
                currentRound++;
                startNewRound();
            }, 500);
        }
    }, 3000); // Exactly 3 seconds after round completion
}

function spawnEnemy() {
    // Don't spawn if not in a round or if we already have too many enemies on screen
    if (!roundInProgress || enemies.length >= 12) { // Increased limit for more dynamic gameplay
        return;
    }
    // Make enemy sprites bigger
    const width = 120;
    const height = 120;
    const x = Math.random() * (canvas.width - width);
    const difficulty = difficultySettings[gameSettings.difficulty];
    // Choose a random enemy sprite
    const enemySprites = [
        "assets/images/enemy sprites/Kla'ed - Bomber - Base.png",
        "assets/images/enemy sprites/Kla'ed - Fighter - Base.png",
        "assets/images/enemy sprites/Kla'ed - Scout - Base.png"
    ];
    const spriteSrc = enemySprites[Math.floor(Math.random() * enemySprites.length)];
    const spriteImg = new Image();
    spriteImg.src = spriteSrc;
    enemies.push({ 
        x, 
        y: -height, 
        width, 
        height, 
        speed: difficulty.enemySpeed + (currentRound - 1) * 0.2, // Increase speed with rounds
        sprite: spriteImg
    });
    enemiesSpawnedThisRound++;
}

function spawnPerk() {
    const size = 20;
    const x = Math.random() * (canvas.width - size);
    perks.push({ x, y: -size, size, speed: 2 });
}

function showGameOverUI() {
    const overlay = document.getElementById('gameOverOverlay');
    const scoreEl = document.getElementById('finalScore');
    const killsEl = document.getElementById('finalKills');
    const roundEl = document.getElementById('finalRound');
    
    if (overlay && scoreEl && killsEl && roundEl) {
        scoreEl.textContent = score.toLocaleString();
        killsEl.textContent = kills.toLocaleString();
        roundEl.textContent = currentRound.toLocaleString();
        overlay.style.display = 'flex';
        // Always show modal and enable restart button, regardless of game mode
        setTimeout(() => {
            overlay.classList.add('visible');
            const restartBtn = document.getElementById('restartBtn');
            if (restartBtn && !restartBtn._bound) {
                restartBtn.addEventListener('click', () => {
                    overlay.classList.remove('visible');
                    setTimeout(() => overlay.style.display = 'none', 500);
                    player.health = player.maxHealth;
                    gameOver = false;
                    resetGame();
                });
                restartBtn._bound = true;
            }
        }, 50);
    }
    // Transition to defeat music with smooth fade
    transitionToDefeatMusic();
}

function hideGameOverUI() {
    const overlay = document.getElementById('gameOverOverlay');
    if (overlay) {
        overlay.classList.remove('visible');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 500); // Wait for fade-out animation
    }
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
    gameState = 'playing';
    currentMusicState = 'gameplay';
    
    // Reset screen shake
    screenShake.x = 0;
    screenShake.y = 0;
    screenShake.intensity = 0;
    screenShake.duration = 0;
    
    // Reset round system
    currentRound = 1;
    roundDuration = 30000;
    scoreThresholdPerRound = 500;
    enemiesSpawnedThisRound = 0;
    enemiesKilledThisRound = 0;
    roundInProgress = false;
    betweenRounds = false;
    roundStartTime = 0;
    lastRoundAdvanceScore = 0;
    
    hideGameOverUI();
    
    // Reset player position for current canvas size
    player.x = canvas.width / 2 - 20;
    player.y = canvas.height - 60;
    
    // Continue or start background music for gameplay
    playBackgroundMusic();
    
    // Start the first round
    startNewRound();
    
    gameLoop();
}

function startGame() {
    showScreen('game');
    gameState = 'playing';
    currentMusicState = 'gameplay';
    resetGame();
}

function pauseGame() {
    if (gameState === 'playing') {
        isPaused = true;
        gameState = 'paused';
        showScreen('pause');
        pauseBackgroundMusic();
    }
}

function resumeGame() {
    if (gameState === 'paused') {
        isPaused = false;
        gameState = 'playing';
        currentMusicState = 'gameplay';
        showScreen('game');
        resumeBackgroundMusic();
        gameLoop();
    }
}

function quitToMenu() {
    gameState = 'menu';
    currentMusicState = 'menu';
    isPaused = false;
    gameOver = false;
    hideGameOverUI();
    
    // Smooth transition back to menu music
    if (backgroundMusic && backgroundMusic.paused) {
        fadeInMusic(() => {
            playBackgroundMusic();
        });
    } else {
        playBackgroundMusic();
    }
    
    showScreen('home');
}

function gameLoop() {
    if (gameState !== 'playing' || isPaused) {
        if (gameState === 'playing' && gameOver) {
            // Handle game over state but keep the loop running
            updateScreenShake();
            updateHealthBar();
            showGameOverUI();
            
            // Still draw the final game state
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            applyScreenShake(ctx);
            drawPlayer();
            drawBullets();
            drawEnemies();
            drawPerks();
            drawScore();
            ctx.restore();
            
            // Continue the loop for UI responsiveness
            requestAnimationFrame(gameLoop);
        }
        return;
    }
    
    if (gameOver) {
        // Game is over, transition to game over state
        gameState = 'gameOver';
        updateScreenShake();
        updateHealthBar();
        showGameOverUI();
        
        // Draw final frame
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        applyScreenShake(ctx);
        drawPlayer();
        drawBullets();
        drawEnemies();
        drawPerks();
        drawScore();
        ctx.restore();
        
        // Continue loop for UI responsiveness
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // Update screen shake
    updateScreenShake();
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply screen shake before drawing
    ctx.save();
    applyScreenShake(ctx);
    
    drawPlayer();
    drawBullets();
    drawEnemies();
    drawPerks();
    drawScore();
    updateHealthBar();
    
    // Reset screen shake transformation
    ctx.restore();
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
        shootCooldown = 28;
        exhaust++;
        playSFX(600, 0.05, 'square'); // Shoot sound
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
    
    const difficulty = difficultySettings[gameSettings.difficulty];
    
    // Round-based enemy spawning - continuously spawn until round ends
    if (roundInProgress) {
        // Spawn enemies more frequently in later rounds
        const spawnRate = Math.min(difficulty.enemySpawnRate + (currentRound - 1) * 0.005, 0.08);
        if (Math.random() < spawnRate) {
            spawnEnemy();
        }
        
        // Check if round should complete (time-based or score-based)
        checkRoundCompletion();
    }
    
    // Still spawn perks randomly
    if (Math.random() < 0.005) spawnPerk();
    
    requestAnimationFrame(gameLoop);
}

// Event Listeners
document.addEventListener('keydown', e => {
    if (gameState !== 'playing') return;
    
    const controls = getControls();
    
    if (e.code === controls.left) {
        player.dx = -player.speed;
        e.preventDefault();
    }
    if (e.code === controls.right) {
        player.dx = player.speed;
        e.preventDefault();
    }
    if (e.code === controls.shoot) {
        shooting = true;
        e.preventDefault();
    }
    if (e.code === 'Escape') {
        pauseGame();
        e.preventDefault();
    }
});

document.addEventListener('keyup', e => {
    if (gameState !== 'playing') return;
    
    const controls = getControls();
    
    if (e.code === controls.left || e.code === controls.right) {
        player.dx = 0;
    }
    if (e.code === controls.shoot) {
        shooting = false;
    }
});

// Mouse controls for mouse control scheme
canvas.addEventListener('mousemove', e => {
    if (gameState === 'playing' && gameSettings.controlScheme === 'mouse') {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        player.x = mouseX - player.width / 2;
        if (player.x < 0) player.x = 0;
        if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    }
});

canvas.addEventListener('mousedown', e => {
    if (gameState === 'playing' && gameSettings.controlScheme === 'mouse') {
        shooting = true;
        e.preventDefault();
    }
});

canvas.addEventListener('mouseup', e => {
    if (gameState === 'playing' && gameSettings.controlScheme === 'mouse') {
        shooting = false;
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize audio
    initAudio();
    
    // Load saved settings
    loadSettings();
    
    // Home screen buttons
    document.getElementById('playBtn').addEventListener('click', () => {
        playSFX(440, 0.1);
        startGame();
    });
    
    document.getElementById('settingsBtn').addEventListener('click', () => {
        playSFX(440, 0.1);
        showScreen('settings');
    });
    
    // Settings screen elements
    const volumeSliders = ['masterVolume', 'musicVolume', 'sfxVolume'];
    volumeSliders.forEach(sliderId => {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(sliderId + 'Value');
        
        slider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            
            // Update the correct setting property
            if (sliderId === 'masterVolume') {
                gameSettings.masterVolume = value;
            } else if (sliderId === 'musicVolume') {
                gameSettings.musicVolume = value;
            } else if (sliderId === 'sfxVolume') {
                gameSettings.sfxVolume = value;
            }
            
            valueDisplay.textContent = value + '%';
            updateAudioSettings();
            
            // Provide real-time audio feedback
            if (sliderId === 'musicVolume' && backgroundMusic && !backgroundMusic.paused) {
                // Music volume changed - update immediately
                updateMusicVolume();
            } else if (sliderId === 'sfxVolume' || sliderId === 'masterVolume') {
                // Play a test SFX to demonstrate volume change
                playSFX(440, 0.1);
            }
        });
    });
    
    // Mute buttons
    document.getElementById('masterMute').addEventListener('click', () => {
        gameSettings.masterMuted = !gameSettings.masterMuted;
        document.getElementById('masterMute').textContent = gameSettings.masterMuted ? '🔇' : '🔊';
        updateAudioSettings();
        if (!gameSettings.masterMuted) playSFX(440, 0.1);
    });
    
    document.getElementById('musicMute').addEventListener('click', () => {
        gameSettings.musicMuted = !gameSettings.musicMuted;
        document.getElementById('musicMute').textContent = gameSettings.musicMuted ? '🔇' : '🔊';
        updateAudioSettings();
        
        // Immediate music feedback
        if (gameSettings.musicMuted) {
            if (backgroundMusic && !backgroundMusic.paused) {
                backgroundMusic.volume = 0;
            }
        } else {
            updateMusicVolume();
        }
        
        if (!gameSettings.sfxMuted && !gameSettings.masterMuted) playSFX(440, 0.1);
    });
    
    document.getElementById('sfxMute').addEventListener('click', () => {
        gameSettings.sfxMuted = !gameSettings.sfxMuted;
        document.getElementById('sfxMute').textContent = gameSettings.sfxMuted ? '🔇' : '🔊';
        updateAudioSettings();
        if (!gameSettings.sfxMuted && !gameSettings.masterMuted) playSFX(440, 0.1);
    });
    
    // Settings dropdowns
    document.getElementById('difficulty').addEventListener('change', (e) => {
        gameSettings.difficulty = e.target.value;
        playSFX(440, 0.1);
    });
    
    document.getElementById('controlScheme').addEventListener('change', (e) => {
        gameSettings.controlScheme = e.target.value;
        playSFX(440, 0.1);
    });
    
    document.getElementById('displayMode').addEventListener('change', (e) => {
        gameSettings.displayMode = e.target.value;
        playSFX(440, 0.1);
    });
    
    document.getElementById('resolution').addEventListener('change', (e) => {
        gameSettings.resolution = e.target.value;
        playSFX(440, 0.1);
    });
    
    document.getElementById('gameModeSelect').addEventListener('change', (e) => {
        gameSettings.gameMode = e.target.value;
        playSFX(440, 0.1);
    });
    
    // Settings action buttons
    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
        playSFX(660, 0.1);
        saveSettings();
    });
    
    document.getElementById('backToHomeBtn').addEventListener('click', () => {
        playSFX(440, 0.1);
        showScreen('home');
    });
    
    // Game screen buttons
    document.getElementById('pauseBtn').addEventListener('click', () => {
        playSFX(440, 0.1);
        pauseGame();
    });
    
    // Pause screen buttons
    document.getElementById('resumeBtn').addEventListener('click', () => {
        playSFX(440, 0.1);
        resumeGame();
    });
    
    document.getElementById('pauseSettingsBtn').addEventListener('click', () => {
        playSFX(440, 0.1);
        showScreen('settings');
    });
    
    document.getElementById('quitToMenuBtn').addEventListener('click', () => {
        playSFX(440, 0.1);
        quitToMenu();
    });
    
    // Game over buttons
    document.getElementById('restartBtn').addEventListener('click', () => {
        playSFX(440, 0.1);
        resetGame();
    });
    
    document.getElementById('backToMenuBtn').addEventListener('click', () => {
        playSFX(440, 0.1);
        quitToMenu();
    });
    
    // Start with home screen
    showScreen('home');
    gameState = 'menu';
    currentMusicState = 'menu';
    
    // Attempt to play ambient music on home screen immediately
    // Note: Most browsers require user interaction before audio can play
    playBackgroundMusic();
    
    // Ensure music starts after any user interaction if blocked initially
    const startMusicOnInteraction = () => {
        if (currentMusicState === 'menu' && backgroundMusic && backgroundMusic.paused) {
            playBackgroundMusic();
        }
        // Remove this listener after first successful interaction
        document.removeEventListener('click', startMusicOnInteraction);
        document.removeEventListener('keydown', startMusicOnInteraction);
        document.removeEventListener('touchstart', startMusicOnInteraction);
    };
    
    document.addEventListener('click', startMusicOnInteraction, { once: true });
    document.addEventListener('keydown', startMusicOnInteraction, { once: true });
    document.addEventListener('touchstart', startMusicOnInteraction, { once: true });
});
