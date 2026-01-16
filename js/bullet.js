// 弾丸クラス

class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 15;
        this.speed = 8;
        this.active = true;
        this.isEnemyBullet = false;
    }

    update() {
        this.y -= this.speed;

        // 画面外に出たら非アクティブ化
        if (this.y + this.height < 0) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#00ff00';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ff00';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
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

// 敵弾クラス
class EnemyBullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 6;
        this.height = 6;
        this.speed = 4;
        this.active = true;
        this.isEnemyBullet = true;
    }

    update() {
        this.y += this.speed;

        // 画面外に出たら非アクティブ化
        if (this.y > window.innerHeight) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#ff4444';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff4444';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }
}

// 弾丸管理クラス
class BulletManager {
    constructor() {
        this.bullets = [];
        this.enemyBullets = [];
    }

    add(x, y) {
        this.bullets.push(new Bullet(x, y));
    }

    addEnemyBullet(x, y) {
        this.enemyBullets.push(new EnemyBullet(x, y));
    }

    update() {
        this.bullets.forEach(bullet => bullet.update());
        this.enemyBullets.forEach(bullet => bullet.update());
        // 非アクティブな弾丸を削除
        this.bullets = this.bullets.filter(bullet => bullet.active);
        this.enemyBullets = this.enemyBullets.filter(bullet => bullet.active);
    }

    draw(ctx) {
        this.bullets.forEach(bullet => bullet.draw(ctx));
        this.enemyBullets.forEach(bullet => bullet.draw(ctx));
    }

    clear() {
        this.bullets = [];
        this.enemyBullets = [];
    }

    getActiveBullets() {
        return this.bullets.filter(bullet => bullet.active);
    }

    getActiveEnemyBullets() {
        return this.enemyBullets.filter(bullet => bullet.active);
    }
}
