// ユーティリティ関数

/**
 * 値をある範囲から別の範囲にマッピング
 */
function map(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * 値を範囲内に制限
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * 線形補間（平滑化用）
 */
function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

/**
 * 2点間の距離を計算
 */
function distance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 2つの矩形が重なっているかチェック（当たり判定）
 */
function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

/**
 * ランダムな整数を生成
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * デッドゾーン適用（小さい変化を無視）
 */
function applyDeadzone(value, threshold) {
    return Math.abs(value) < threshold ? 0 : value;
}
