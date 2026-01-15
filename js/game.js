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

        // 発射状態管理（連続発射を防ぐ）
        this.isFiring = false;
        this.isBombing = false;

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
                    }
                    this.isBombing = true;
                }
            });

            // ゲーム開始
            this.gameScreen.style.display = 'block';
            this.initGame();
            this.state = 'playing';
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
        this.updateUI();
    }

    restartGame() {
        this.gameoverScreen.style.display = 'none';
        this.gameScreen.style.display = 'block';
        this.initGame();
        this.state = 'playing';
    }

    toggleCamera() {
        this.cameraVisible = !this.cameraVisible;
        this.cameraPreview.style.display = this.cameraVisible ? 'block' : 'none';
        this.toggleCameraButton.textContent = `カメラ: ${this.cameraVisible ? 'ON' : 'OFF'}`;
    }

    gameLoop() {
        if (this.state === 'playing') {
            this.update();
            this.draw();
            requestAnimationFrame(() => this.gameLoop());
        }
    }

    update() {
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
    }

    draw() {
        const ctx = this.gameCtx;

        // 背景をクリア（宇宙風の背景）
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);

        // 星を描画（簡易版）
        this.drawStars(ctx);

        // ゲームオブジェクト描画
        this.bulletManager.draw(ctx);
        this.enemyManager.draw(ctx);
        this.player.draw(ctx);
    }

    drawStars(ctx) {
        // 簡易的な星の描画
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 50; i++) {
            const x = (i * 123) % this.gameCanvas.width;
            const y = (i * 456 + Date.now() * 0.01) % this.gameCanvas.height;
            const size = (i % 3) + 1;
            ctx.fillRect(x, y, size, size);
        }
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
