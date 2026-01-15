// プレイヤークラス

class Player {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.width = 40;
        this.height = 40;
        this.x = canvasWidth / 2 - this.width / 2;
        this.y = canvasHeight - 100;
        this.targetX = this.x;
        this.smoothFactor = 0.2; // 平滑化係数
        this.hp = 3;
        this.maxHp = 3;
        this.active = true;

        // 発射制御
        this.fireTimer = 0;
        this.fireInterval = 10; // フレーム数

        // ボム制御
        this.bombCooldown = 0;
        this.bombCooldownMax = 180; // 3秒（60fps想定）
        this.bombActive = false;
        this.bombDuration = 0;
        this.bombDurationMax = 60; // 1秒

        // 無敵時間
        this.invincible = false;
        this.invincibleTimer = 0;
        this.invincibleDuration = 120; // 2秒
    }

    // 姿勢入力から目標位置を設定
    setTargetX(normalizedX) {
        // normalizedX は 0.0 ~ 1.0 の範囲
        const targetX = map(normalizedX, 0, 1, 0, this.canvasWidth - this.width);
        this.targetX = clamp(targetX, 0, this.canvasWidth - this.width);
    }

    update() {
        // 平滑化して移動
        this.x = lerp(this.x, this.targetX, this.smoothFactor);

        // タイマー更新
        this.fireTimer++;

        if (this.bombCooldown > 0) {
            this.bombCooldown--;
        }

        if (this.bombActive) {
            this.bombDuration++;
            if (this.bombDuration >= this.bombDurationMax) {
                this.bombActive = false;
                this.bombDuration = 0;
            }
        }

        if (this.invincible) {
            this.invincibleTimer++;
            if (this.invincibleTimer >= this.invincibleDuration) {
                this.invincible = false;
                this.invincibleTimer = 0;
            }
        }
    }

    // 発射可能かチェック
    canFire() {
        return this.fireTimer >= this.fireInterval;
    }

    // 発射
    fire(bulletManager) {
        if (this.canFire()) {
            const centerX = this.x + this.width / 2 - 2;
            bulletManager.add(centerX, this.y);
            this.fireTimer = 0;
        }
    }

    // ボム発動
    activateBomb() {
        if (this.bombCooldown === 0 && !this.bombActive) {
            this.bombActive = true;
            this.bombDuration = 0;
            this.bombCooldown = this.bombCooldownMax;
            return true;
        }
        return false;
    }

    // ダメージを受ける
    takeDamage() {
        if (!this.invincible && !this.bombActive) {
            this.hp--;
            if (this.hp <= 0) {
                this.active = false;
            } else {
                this.invincible = true;
                this.invincibleTimer = 0;
            }
        }
    }

    draw(ctx) {
        // 無敵時間中は点滅
        if (this.invincible && Math.floor(this.invincibleTimer / 5) % 2 === 0) {
            return;
        }

        // ボム中は大きく光る
        if (this.bombActive) {
            ctx.fillStyle = '#ffff00';
            ctx.shadowBlur = 50;
            ctx.shadowColor = '#ffff00';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width * 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // プレイヤー本体
        ctx.fillStyle = '#00ffff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ffff';

        // 三角形で描画（宇宙船風）
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;

        // ボムクールダウンバー
        if (this.bombCooldown > 0) {
            const barWidth = this.width;
            const barHeight = 3;
            const ratio = 1 - (this.bombCooldown / this.bombCooldownMax);
            ctx.fillStyle = '#444';
            ctx.fillRect(this.x, this.y - 10, barWidth, barHeight);
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(this.x, this.y - 10, barWidth * ratio, barHeight);
        }
    }

    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    reset(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.x = canvasWidth / 2 - this.width / 2;
        this.y = canvasHeight - 100;
        this.targetX = this.x;
        this.hp = this.maxHp;
        this.active = true;
        this.fireTimer = 0;
        this.bombCooldown = 0;
        this.bombActive = false;
        this.bombDuration = 0;
        this.invincible = false;
        this.invincibleTimer = 0;
    }
}
