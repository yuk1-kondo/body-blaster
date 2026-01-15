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
        this.hp = type === 'strong' ? 3 : 1;
        this.maxHp = this.hp;
    }

    update() {
        this.y += this.speed;

        // 画面下に出たら非アクティブ化
        if (this.y > window.innerHeight) {
            this.active = false;
        }
    }

    draw(ctx) {
        // HPによって色を変える
        const hpRatio = this.hp / this.maxHp;
        if (this.type === 'strong') {
            ctx.fillStyle = `rgb(${255 * (1 - hpRatio)}, ${100 * hpRatio}, ${255 * hpRatio})`;
        } else {
            ctx.fillStyle = '#ff4444';
        }

        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;

        // 敵を円形で描画
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

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
}

// 敵管理クラス
class EnemyManager {
    constructor() {
        this.enemies = [];
        this.spawnTimer = 0;
        this.spawnInterval = 120; // フレーム数
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
        const x = randomInt(20, window.innerWidth - 50);
        const y = -30;

        // 10%の確率で強い敵
        const type = Math.random() < 0.1 ? 'strong' : 'normal';

        this.enemies.push(new Enemy(x, y, type));
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
