// MediaPipe Pose 処理

class PoseDetector {
    constructor() {
        this.pose = null;
        this.camera = null;
        this.results = null;
        this.callbacks = {
            onPoseDetected: null,
            onMove: null,
            onFire: null,
            onBomb: null
        };

        // 閾値
        this.FIRE_THRESHOLD = -0.1; // 手のZ座標（前に出す）
        this.BOMB_THRESHOLD = 0.5; // 両手の距離（正規化）
        this.DEADZONE = 0.03; // デッドゾーン

        // デバッグ表示
        this.debugMode = false;
    }

    async init(videoElement, debugCanvas) {
        this.videoElement = videoElement;
        this.debugCanvas = debugCanvas;
        this.debugCtx = debugCanvas.getContext('2d');

        // MediaPipe Pose 初期化
        this.pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            }
        });

        this.pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.pose.onResults((results) => this.onResults(results));

        // カメラ初期化
        this.camera = new Camera(videoElement, {
            onFrame: async () => {
                await this.pose.send({ image: videoElement });
            },
            width: 640,
            height: 480
        });

        await this.camera.start();
    }

    onResults(results) {
        this.results = results;

        // デバッグ表示
        if (this.debugMode && this.debugCanvas) {
            this.drawDebug(results);
        }

        // ランドマークが検出されていない場合は終了
        if (!results.poseLandmarks) {
            return;
        }

        const landmarks = results.poseLandmarks;

        // コールバック実行
        if (this.callbacks.onPoseDetected) {
            this.callbacks.onPoseDetected(landmarks);
        }

        // 左右移動の検出
        this.detectMovement(landmarks);

        // 発射の検出
        this.detectFire(landmarks);

        // ボムの検出
        this.detectBomb(landmarks);
    }

    detectMovement(landmarks) {
        // 腰の中心位置を取得
        const leftHip = landmarks[23]; // LEFT_HIP
        const rightHip = landmarks[24]; // RIGHT_HIP

        if (!leftHip || !rightHip) return;

        const centerX = (leftHip.x + rightHip.x) / 2;

        // 0.3 ~ 0.7 の範囲を 0.0 ~ 1.0 にマッピング
        // （カメラの中央付近でプレイすることを想定）
        const normalizedX = map(centerX, 0.3, 0.7, 0, 1);
        const clampedX = clamp(normalizedX, 0, 1);

        if (this.callbacks.onMove) {
            this.callbacks.onMove(clampedX);
        }
    }

    detectFire(landmarks) {
        // 両手首のZ座標（奥行き）
        const leftWrist = landmarks[15]; // LEFT_WRIST
        const rightWrist = landmarks[16]; // RIGHT_WRIST

        if (!leftWrist || !rightWrist) return;

        // 両手の平均Z座標
        const avgZ = (leftWrist.z + rightWrist.z) / 2;

        // Z座標が閾値より小さい（前に出している）場合
        if (avgZ < this.FIRE_THRESHOLD) {
            if (this.callbacks.onFire) {
                this.callbacks.onFire();
            }
        }
    }

    detectBomb(landmarks) {
        // 両手首の距離
        const leftWrist = landmarks[15];
        const rightWrist = landmarks[16];

        if (!leftWrist || !rightWrist) return;

        // 正規化された距離を計算
        const dist = distance(leftWrist, rightWrist);

        // 距離が閾値より大きい（両手を広げている）場合
        if (dist > this.BOMB_THRESHOLD) {
            if (this.callbacks.onBomb) {
                this.callbacks.onBomb();
            }
        }
    }

    drawDebug(results) {
        const canvas = this.debugCanvas;
        const ctx = this.debugCtx;

        // キャンバスをクリア
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // カメラ映像を描画（反転）
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(results.image, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();

        // ポーズランドマークを描画
        if (results.poseLandmarks) {
            drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
                color: '#00FF00',
                lineWidth: 2
            });
            drawLandmarks(ctx, results.poseLandmarks, {
                color: '#FF0000',
                lineWidth: 1,
                radius: 3
            });

            // 重要なポイントを強調
            const importantIndices = [15, 16, 23, 24]; // 手首、腰
            const importantLandmarks = importantIndices
                .map(i => results.poseLandmarks[i])
                .filter(lm => lm);

            drawLandmarks(ctx, importantLandmarks, {
                color: '#FFFF00',
                lineWidth: 2,
                radius: 5
            });
        }
    }

    setDebugMode(enabled) {
        this.debugMode = enabled;
        if (this.debugCanvas) {
            this.debugCanvas.classList.toggle('active', enabled);
        }
    }

    on(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = callback;
        }
    }
}
