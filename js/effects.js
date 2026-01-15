// エフェクト管理

class Particle {
    constructor(x, y, vx, vy, size, color, life) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.rotation = Math.random() * Math.PI * 2;
        this.spin = (Math.random() - 0.5) * 6;
    }

    update(dt) {
        this.life -= dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.rotation += this.spin * dt;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(-this.size / 2, -this.size / 2, this.size, this.size, this.size / 3);
        } else {
            ctx.rect(-this.size / 2, -this.size / 2, this.size, this.size);
        }
        ctx.fill();
        ctx.restore();
    }
}

class Shockwave {
    constructor(x, y, maxRadius, life, color) {
        this.x = x;
        this.y = y;
        this.maxRadius = maxRadius;
        this.life = life;
        this.maxLife = life;
        this.color = color;
    }

    update(dt) {
        this.life -= dt;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        const progress = 1 - this.life / this.maxLife;
        const radius = this.maxRadius * (1 - Math.pow(1 - progress, 3));
        const alpha = Math.max(0, 1 - progress);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

class EffectManager {
    constructor() {
        this.particles = [];
        this.shockwaves = [];
        this.flashAlpha = 0;
        this.shakeTime = 0;
        this.shakeDuration = 0;
        this.shakeIntensity = 0;
    }

    update(dt) {
        this.particles.forEach(particle => particle.update(dt));
        this.particles = this.particles.filter(particle => particle.life > 0);

        this.shockwaves.forEach(wave => wave.update(dt));
        this.shockwaves = this.shockwaves.filter(wave => wave.life > 0);

        if (this.flashAlpha > 0) {
            this.flashAlpha = Math.max(0, this.flashAlpha - dt * 2.5);
        }

        if (this.shakeTime > 0) {
            this.shakeTime = Math.max(0, this.shakeTime - dt);
        }
    }

    draw(ctx) {
        this.shockwaves.forEach(wave => wave.draw(ctx));
        this.particles.forEach(particle => particle.draw(ctx));
    }

    drawOverlay(ctx, width, height) {
        if (this.flashAlpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.flashAlpha;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }

    getShakeOffset() {
        if (this.shakeTime <= 0) return { x: 0, y: 0 };
        const intensity = this.shakeIntensity * (this.shakeTime / this.shakeDuration);
        return {
            x: (Math.random() - 0.5) * intensity,
            y: (Math.random() - 0.5) * intensity
        };
    }

    spawnExplosion(x, y, baseColor, strength = 1) {
        const count = Math.floor(18 * strength);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (Math.random() * 160 + 80) * strength;
            const size = Math.random() * 6 + 4;
            const life = Math.random() * 0.4 + 0.35;
            this.particles.push(new Particle(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                size,
                baseColor,
                life
            ));
        }
        this.shockwaves.push(new Shockwave(x, y, 60 * strength, 0.5, baseColor));
    }

    spawnHitSpark(x, y, color) {
        const count = 6;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 120 + 60;
            const size = Math.random() * 4 + 2;
            const life = Math.random() * 0.25 + 0.2;
            this.particles.push(new Particle(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                size,
                color,
                life
            ));
        }
    }

    spawnBombWave(x, y, width, height) {
        this.flashAlpha = Math.min(0.8, this.flashAlpha + 0.6);
        this.shockwaves.push(new Shockwave(x, y, Math.max(width, height) * 0.8, 0.8, '#9afcff'));
        for (let i = 0; i < 60; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 220 + 120;
            const size = Math.random() * 8 + 4;
            const life = Math.random() * 0.6 + 0.4;
            this.particles.push(new Particle(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                size,
                Math.random() > 0.5 ? '#9afcff' : '#ffffff',
                life
            ));
        }
        this.startShake(14, 0.35);
    }

    startShake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeTime = duration;
    }
}
