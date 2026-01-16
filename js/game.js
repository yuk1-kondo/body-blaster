// メインゲーム制御

class Game {
    constructor() {
        // DOM要素
        this.titleScreen = document.getElementById('title-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.gameoverScreen = document.getElementById('gameover-screen');
        this.startButton = document.getElementById('start-button');
        this.restartButton = document.getElementById('restart-button');
        this.toggleCameraButton = document.getElementById('toggle-camera');

        // キャンバス
        this.gameCanvas = document.getElementById('game-canvas');
        this.gameCtx = this.gameCanvas.getContext('2d');
        this.cameraOverlayCanvas = document.getElementById('camera-overlay-canvas');

        // カメラ
        this.video = document.getElementById('camera-video');
        this.cameraPreview = document.getElementById('camera-preview');
        this.cameraVisible = true;

        // ゲーム状態
        this.state = 'title'; // title, playing, gameover
        this.score = 0;
        this.difficultyTimer = 0;
        this.difficultyInterval = 1800; // 30秒ごとに難易度上昇（60fps想定）

        // ゲームオブジェクト
        this.player = null;
        this.bulletManager = new BulletManager();
        this.enemyManager = new EnemyManager();
        this.poseDetector = new PoseDetector();
        this.effectManager = new EffectManager();

        // 発射状態管理（連続発射を防ぐ）
        this.isFiring = false;
        this.isBombing = false;

        // 背景演出
        this.starField = this.createStarField(140);
        this.starOffset = 0;
        this.lastFrameTime = performance.now();

        // イベントリスナー設定
        this.setupEventListeners();

        // キャンバスサイズ設定
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    setupEventListeners() {
        this.startButton.addEventListener('click', () => this.startGame());
        this.restartButton.addEventListener('click', () => this.restartGame());
        this.toggleCameraButton.addEventListener('click', () => this.toggleCamera());
    }

    resizeCanvas() {
        this.gameCanvas.width = window.innerWidth;
        this.gameCanvas.height = window.innerHeight;
        this.starField = this.createStarField(140);
    }

    async startGame() {
        // タイトル画面を非表示
        this.titleScreen.style.display = 'none';

        // カメラとポーズ検出を初期化
        try {
            await this.poseDetector.init(this.video, this.cameraOverlayCanvas);

            // ポーズ検出コールバック設定
            this.poseDetector.on('onMove', (normalizedX) => {
                if (this.state === 'playing' && this.player) {
                    this.player.setTargetX(normalizedX);
                }
            });

            this.poseDetector.on('onFire', () => {
                if (this.state === 'playing' && this.player && !this.isFiring) {
                    this.player.fire(this.bulletManager);
                    this.isFiring = true;
                }
            });

            this.poseDetector.on('onBombCharge', (chargeAmount) => {
                if (this.state === 'playing' && this.player) {
                    this.player.setBombCharge(chargeAmount);
                }
            });

            this.poseDetector.on('onBomb', (chargeAmount) => {
                if (this.state === 'playing' && this.player && !this.isBombing) {
                    const activated = this.player.activateBomb(chargeAmount);
                    if (activated) {
                        // ボム発動時、画面上の敵をすべて破壊
                        this.enemyManager.getActiveEnemies().forEach(enemy => {
                            enemy.active = false;
                            this.score += 100;
                        });
                        const center = this.player.getCenter();
                        this.effectManager.spawnBombWave(
                            center.x,
                            center.y,
                            this.gameCanvas.width,
                            this.gameCanvas.height
                        );
                    }
                    this.isBombing = true;
                }
            });

            // ゲーム開始
            this.gameScreen.style.display = 'block';
            this.initGame();
            this.state = 'playing';
            this.lastFrameTime = performance.now();
            this.gameLoop();

        } catch (error) {
            console.error('カメラの初期化に失敗:', error);
            alert('カメラへのアクセスが必要です。ブラウザの設定を確認してください。');
            this.titleScreen.style.display = 'block';
        }
    }

    initGame() {
        this.score = 0;
        this.difficultyTimer = 0;
        this.player = new Player(this.gameCanvas.width, this.gameCanvas.height);
        this.bulletManager.clear();
        this.enemyManager.clear();
        this.enemyManager.setBulletManager(this.bulletManager);
        this.effectManager = new EffectManager();
        this.starOffset = 0;
        this.isFiring = false;
        this.isBombing = false;
        this.updateUI();
    }

    restartGame() {
        this.gameoverScreen.style.display = 'none';
        this.gameScreen.style.display = 'block';

        // ポーズ検出器の状態をリセット
        this.poseDetector.reset();

        this.initGame();
        this.state = 'playing';
        this.lastFrameTime = performance.now();
        this.gameLoop();
    }

    toggleCamera() {
        this.cameraVisible = !this.cameraVisible;
        this.cameraPreview.style.display = this.cameraVisible ? 'block' : 'none';
        this.toggleCameraButton.textContent = `カメラ: ${this.cameraVisible ? 'ON' : 'OFF'}`;
    }

    gameLoop() {
        if (this.state === 'playing') {
            const now = performance.now();
            const delta = Math.min(0.05, (now - this.lastFrameTime) / 1000);
            this.lastFrameTime = now;
            this.update(delta);
            this.draw();
            requestAnimationFrame(() => this.gameLoop());
        }
    }

    update(delta) {
        // プレイヤー更新
        this.player.update();

        // 弾丸更新
        this.bulletManager.update();

        // 敵更新
        this.enemyManager.update();

        // 当たり判定：弾vs敵
        this.bulletManager.getActiveBullets().forEach(bullet => {
            this.enemyManager.getActiveEnemies().forEach(enemy => {
                if (checkCollision(bullet.getBounds(), enemy.getBounds())) {
                    bullet.active = false;
                    const destroyed = enemy.hit();
                    const enemyCenter = enemy.getCenter();
                    if (destroyed) {
                        const color = enemy.type === 'strong' ? '#b99bff' : '#ff7a85';
                        this.effectManager.spawnExplosion(enemyCenter.x, enemyCenter.y, color, enemy.type === 'strong' ? 1.3 : 1);
                    } else {
                        this.effectManager.spawnHitSpark(enemyCenter.x, enemyCenter.y, '#ffd479');
                    }
                    if (destroyed) {
                        this.score += enemy.type === 'strong' ? 50 : 10;
                        this.updateUI();
                    }
                }
            });
        });

        // 当たり判定：敵vsプレイヤー
        if (!this.player.bombActive) {
            this.enemyManager.getActiveEnemies().forEach(enemy => {
                if (checkCollision(enemy.getBounds(), this.player.getBounds())) {
                    enemy.active = false;
                    this.player.takeDamage();
                    this.updateUI();
                    const center = this.player.getCenter();
                    this.effectManager.spawnHitSpark(center.x, center.y, '#9afcff');
                    this.effectManager.startShake(8, 0.15);

                    // ゲームオーバーチェック
                    if (!this.player.active) {
                        this.gameOver();
                    }
                }
            });
        }

        // 当たり判定：敵弾vsプレイヤー
        if (!this.player.bombActive && !this.player.invincible) {
            this.bulletManager.getActiveEnemyBullets().forEach(bullet => {
                if (checkCollision(bullet.getBounds(), this.player.getBounds())) {
                    bullet.active = false;
                    this.player.takeDamage();
                    this.updateUI();
                    const center = this.player.getCenter();
                    this.effectManager.spawnHitSpark(center.x, center.y, '#ff6b6b');
                    this.effectManager.startShake(8, 0.15);

                    // ゲームオーバーチェック
                    if (!this.player.active) {
                        this.gameOver();
                    }
                }
            });
        }

        // 難易度上昇
        this.difficultyTimer++;
        if (this.difficultyTimer >= this.difficultyInterval) {
            this.enemyManager.increaseDifficulty();
            this.difficultyTimer = 0;
        }

        // 発射状態のリセット（手を離したら再度発射可能に）
        // この判定は pose.js の onFire が呼ばれない時に false にする必要がある
        // 簡易的に、毎フレームリセットして連射を実現
        if (this.isFiring) {
            setTimeout(() => { this.isFiring = false; }, 100);
        }
        if (this.isBombing) {
            setTimeout(() => { this.isBombing = false; }, 500);
        }

        // 背景演出
        this.starOffset += delta * 18;
        this.effectManager.update(delta);
    }

    draw() {
        const ctx = this.gameCtx;

        const offset = this.effectManager.getShakeOffset();
        ctx.save();
        ctx.translate(offset.x, offset.y);

        // 背景を描画
        this.drawBackground(ctx);
        this.drawStars(ctx);

        // ゲームオブジェクト描画
        this.bulletManager.draw(ctx);
        this.enemyManager.draw(ctx);
        this.player.draw(ctx);
        this.effectManager.draw(ctx);
        ctx.restore();

        // フラッシュ等のオーバーレイ
        this.effectManager.drawOverlay(ctx, this.gameCanvas.width, this.gameCanvas.height);
    }

    drawBackground(ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, this.gameCanvas.height);
        gradient.addColorStop(0, '#070b1f');
        gradient.addColorStop(0.5, '#0c1440');
        gradient.addColorStop(1, '#05080f');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);

        const glow = ctx.createRadialGradient(
            this.gameCanvas.width * 0.8,
            this.gameCanvas.height * 0.2,
            0,
            this.gameCanvas.width * 0.8,
            this.gameCanvas.height * 0.2,
            this.gameCanvas.width * 0.6
        );
        glow.addColorStop(0, 'rgba(90, 170, 255, 0.25)');
        glow.addColorStop(1, 'rgba(10, 12, 20, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
    }

    drawStars(ctx) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        this.starField.forEach(star => {
            const y = (star.y + this.starOffset * star.speed) % this.gameCanvas.height;
            ctx.globalAlpha = star.alpha + Math.sin((this.starOffset + star.seed) * 0.02) * 0.2;
            ctx.fillRect(star.x, y, star.size, star.size);
        });
        ctx.restore();
    }

    createStarField(count) {
        const stars = [];
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * this.gameCanvas.width,
                y: Math.random() * this.gameCanvas.height,
                size: Math.random() * 2 + 0.5,
                alpha: Math.random() * 0.8 + 0.2,
                speed: Math.random() * 0.6 + 0.2,
                seed: Math.random() * 1000
            });
        }
        return stars;
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        const hearts = '♥'.repeat(this.player.hp) + '♡'.repeat(this.player.maxHp - this.player.hp);
        document.getElementById('hp').textContent = hearts;
    }

    gameOver() {
        this.state = 'gameover';
        this.gameScreen.style.display = 'none';
        this.gameoverScreen.style.display = 'block';
        document.getElementById('final-score').textContent = this.score;
    }
}

// ゲーム起動
let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new Game();
});
