// 敵クラス

class Enemy {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 1.5;
        this.type = type;
        this.active = true;

        // HPの設定
        switch (type) {
            case 'strong':
                this.hp = 3;
                break;
            case 'shooter':
                this.hp = 2;
                break;
            case 'zigzag':
                this.hp = 1;
                break;
            default:
                this.hp = 1;
        }
        this.maxHp = this.hp;

        // ジグザグ動作用
        this.zigzagAmplitude = 100;
        this.zigzagFrequency = 0.02;
        this.initialX = x;
        this.time = 0;

        // 発射用
        this.fireTimer = 0;
        this.fireInterval = 90; // 1.5秒ごとに発射
        this.bulletManager = null; // 外から設定する
    }

    setBulletManager(bulletManager) {
        this.bulletManager = bulletManager;
    }

    update() {
        this.time++;

        // タイプ別の挙動
        switch (this.type) {
            case 'zigzag':
                // ジグザグに動く
                this.y += this.speed;
                this.x = this.initialX + Math.sin(this.time * this.zigzagFrequency) * this.zigzagAmplitude;
                break;

            case 'shooter':
                // ゆっくり降下しながら弾を発射
                this.y += this.speed * 0.7;
                this.fireTimer++;
                if (this.fireTimer >= this.fireInterval && this.bulletManager) {
                    this.fire();
                    this.fireTimer = 0;
                }
                break;

            case 'strong':
                // ゆっくり降下
                this.y += this.speed * 0.8;
                break;

            default:
                // 通常は直進
                this.y += this.speed;
                break;
        }

        // 画面下に出たら非アクティブ化
        if (this.y > window.innerHeight) {
            this.active = false;
        }

        // 画面外（左右）にも出たら非アクティブ化
        if (this.x < -50 || this.x > window.innerWidth + 50) {
            this.active = false;
        }
    }

    fire() {
        if (this.bulletManager) {
            // 敵弾として追加（下方向に発射）
            this.bulletManager.addEnemyBullet(
                this.x + this.width / 2,
                this.y + this.height
            );
        }
    }

    draw(ctx) {
        // HPによって色を変える
        const hpRatio = this.hp / this.maxHp;

        // タイプ別の色と形状
        switch (this.type) {
            case 'strong':
                ctx.fillStyle = `rgb(${155 + 100 * (1 - hpRatio)}, ${155 + 100 * hpRatio}, 255)`;
                ctx.shadowColor = ctx.fillStyle;
                break;
            case 'shooter':
                ctx.fillStyle = `rgb(255, ${150 * hpRatio}, 50)`;
                ctx.shadowColor = '#ff8800';
                break;
            case 'zigzag':
                ctx.fillStyle = `rgb(50, 255, ${150 * hpRatio + 100})`;
                ctx.shadowColor = '#00ff88';
                break;
            default:
                ctx.fillStyle = '#ff4444';
                ctx.shadowColor = '#ff4444';
        }

        ctx.shadowBlur = 10;

        // タイプ別の形状
        if (this.type === 'shooter') {
            // 射撃手は四角形
            ctx.fillRect(this.x, this.y, this.width, this.height);
        } else if (this.type === 'zigzag') {
            // ジグザグは菱形
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, this.y);
            ctx.lineTo(this.x + this.width, this.y + this.height / 2);
            ctx.lineTo(this.x + this.width / 2, this.y + this.height);
            ctx.lineTo(this.x, this.y + this.height / 2);
            ctx.closePath();
            ctx.fill();
        } else {
            // それ以外は円形
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.shadowBlur = 0;

        // HP複数の場合、HPバーを表示
        if (this.maxHp > 1) {
            const barWidth = this.width;
            const barHeight = 3;
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x, this.y - 8, barWidth, barHeight);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(this.x, this.y - 8, barWidth * hpRatio, barHeight);
        }
    }

    hit() {
        this.hp--;
        if (this.hp <= 0) {
            this.active = false;
            return true; // 撃破
        }
        return false; // まだ生存
    }

    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    getCenter() {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2
        };
    }
}

// 敵管理クラス
class EnemyManager {
    constructor() {
        this.enemies = [];
        this.spawnTimer = 0;
        this.spawnInterval = 120; // フレーム数
        this.bulletManager = null; // 敵弾用のマネージャー
    }

    setBulletManager(bulletManager) {
        this.bulletManager = bulletManager;
    }

    update() {
        this.spawnTimer++;

        // 一定間隔で敵を生成
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawn();
            this.spawnTimer = 0;
        }

        // 敵の更新
        this.enemies.forEach(enemy => enemy.update());

        // 非アクティブな敵を削除
        this.enemies = this.enemies.filter(enemy => enemy.active);
    }

    spawn() {
        const x = randomInt(50, window.innerWidth - 80);
        const y = -30;

        // 敵タイプをランダムに決定
        const rand = Math.random();
        let type;

        if (rand < 0.1) {
            type = 'strong'; // 10%
        } else if (rand < 0.25) {
            type = 'shooter'; // 15%
        } else if (rand < 0.45) {
            type = 'zigzag'; // 20%
        } else {
            type = 'normal'; // 55%
        }

        const enemy = new Enemy(x, y, type);

        // 射撃手には弾丸マネージャーを設定
        if (type === 'shooter' && this.bulletManager) {
            enemy.setBulletManager(this.bulletManager);
        }

        this.enemies.push(enemy);
    }

    draw(ctx) {
        this.enemies.forEach(enemy => enemy.draw(ctx));
    }

    clear() {
        this.enemies = [];
        this.spawnTimer = 0;
    }

    getActiveEnemies() {
        return this.enemies.filter(enemy => enemy.active);
    }

    // 難易度調整（スポーン間隔を短くする）
    increaseDifficulty() {
        this.spawnInterval = Math.max(30, this.spawnInterval - 5);
    }
}
