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

    async init(videoElement, cameraOverlayCanvas) {
        this.videoElement = videoElement;
        this.cameraOverlayCanvas = cameraOverlayCanvas;
        this.cameraOverlayCtx = cameraOverlayCanvas.getContext('2d');

        // キャンバスサイズを設定
        this.cameraOverlayCanvas.width = 640;
        this.cameraOverlayCanvas.height = 480;

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

        // カメラオーバーレイに常に骨格を描画
        this.drawCameraOverlay(results);

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
        // 片手を上げる → 発射
        const leftWrist = landmarks[15]; // LEFT_WRIST
        const rightWrist = landmarks[16]; // RIGHT_WRIST
        const leftShoulder = landmarks[11]; // LEFT_SHOULDER
        const rightShoulder = landmarks[12]; // RIGHT_SHOULDER

        if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) return;

        // 手首が肩より上にあるかチェック（Y座標は上が小さい）
        const leftHandRaised = leftWrist.y < leftShoulder.y - 0.1; // 余裕を持たせる
        const rightHandRaised = rightWrist.y < rightShoulder.y - 0.1;

        // 片手でも上がっていれば発射（両手上げはボムなので除外）
        if ((leftHandRaised || rightHandRaised) && !(leftHandRaised && rightHandRaised)) {
            if (this.callbacks.onFire) {
                this.callbacks.onFire();
            }
        }
    }

    detectBomb(landmarks) {
        // 両手を上げる → ボム
        const leftWrist = landmarks[15];
        const rightWrist = landmarks[16];
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];

        if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) return;

        // 両手が肩より上にあるかチェック
        const leftHandRaised = leftWrist.y < leftShoulder.y - 0.1;
        const rightHandRaised = rightWrist.y < rightShoulder.y - 0.1;

        // 両手を上げている場合はボム（バンザイ！）
        if (leftHandRaised && rightHandRaised) {
            if (this.callbacks.onBomb) {
                this.callbacks.onBomb();
            }
        }
    }

    drawCameraOverlay(results) {
        const canvas = this.cameraOverlayCanvas;
        const ctx = this.cameraOverlayCtx;

        // キャンバスをクリア
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // ポーズランドマークを描画
        if (results.poseLandmarks) {
            // 骨格の線を描画
            drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
                color: '#00FF00',
                lineWidth: 4
            });

            // 関節点を描画
            drawLandmarks(ctx, results.poseLandmarks, {
                color: '#FF0000',
                lineWidth: 2,
                radius: 6
            });

            // 重要なポイントを強調（手首、腰）
            const importantIndices = [15, 16, 23, 24];
            const importantLandmarks = importantIndices
                .map(i => results.poseLandmarks[i])
                .filter(lm => lm);

            drawLandmarks(ctx, importantLandmarks, {
                color: '#FFFF00',
                lineWidth: 3,
                radius: 10
            });
        }
    }

    setCameraPreviewVisible(visible) {
        if (this.cameraOverlayCanvas) {
            const preview = this.cameraOverlayCanvas.parentElement;
            if (preview) {
                preview.style.display = visible ? 'block' : 'none';
            }
        }
    }

    on(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = callback;
        }
    }
}
