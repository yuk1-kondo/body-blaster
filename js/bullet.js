// 弾丸クラス

class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 15;
        this.speed = 8;
        this.active = true;
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

// 弾丸管理クラス
class BulletManager {
    constructor() {
        this.bullets = [];
    }

    add(x, y) {
        this.bullets.push(new Bullet(x, y));
    }

    update() {
        this.bullets.forEach(bullet => bullet.update());
        // 非アクティブな弾丸を削除
        this.bullets = this.bullets.filter(bullet => bullet.active);
    }

    draw(ctx) {
        this.bullets.forEach(bullet => bullet.draw(ctx));
    }

    clear() {
        this.bullets = [];
    }

    getActiveBullets() {
        return this.bullets.filter(bullet => bullet.active);
    }
}
