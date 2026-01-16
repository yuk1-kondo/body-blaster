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
            onBomb: null,
            onBombCharge: null
        };

        // 閾値
        this.HEAD_TILT_THRESHOLD = 0.05; // 首の傾き
        this.FLAP_THRESHOLD = 0.08; // 羽ばたき（手の上下動）
        this.ROTATION_SPEED_THRESHOLD = 0.15; // 手の回転速度
        this.DEADZONE = 0.03; // デッドゾーン

        // 前フレームのデータ
        this.previousLeftWrist = null;
        this.previousRightWrist = null;
        this.previousTime = Date.now();

        // 羽ばたき検出
        this.flapDirection = 0; // -1: 下がっている, 0: なし, 1: 上がっている
        this.lastFlapTime = 0;

        // ボムチャージ
        this.bombCharging = false;
        this.bombChargeAmount = 0;
        this.chargeStartTime = 0;

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
        // 首の傾きで左右移動
        const nose = landmarks[0]; // NOSE
        const leftShoulder = landmarks[11]; // LEFT_SHOULDER
        const rightShoulder = landmarks[12]; // RIGHT_SHOULDER

        if (!nose || !leftShoulder || !rightShoulder) return;

        // 肩の中心を計算
        const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;

        // 鼻が肩の中心からどれだけ離れているか（傾き）
        const tilt = nose.x - shoulderCenterX;

        // 傾きを 0.0 ~ 1.0 にマッピング
        // 左に傾ける（tilt < 0）→ 0に近づく
        // 右に傾ける（tilt > 0）→ 1に近づく
        const normalizedX = map(tilt, -0.15, 0.15, 0, 1);
        const clampedX = clamp(normalizedX, 0, 1);

        if (this.callbacks.onMove) {
            this.callbacks.onMove(clampedX);
        }
    }

    detectFire(landmarks) {
        // 両手を羽ばたかせる → 発射
        const leftWrist = landmarks[15]; // LEFT_WRIST
        const rightWrist = landmarks[16]; // RIGHT_WRIST

        if (!leftWrist || !rightWrist) return;

        // 前フレームの手の位置を保存
        if (this.previousLeftWrist && this.previousRightWrist) {
            // 手の上下動を計算
            const leftDeltaY = leftWrist.y - this.previousLeftWrist.y;
            const rightDeltaY = rightWrist.y - this.previousRightWrist.y;
            const avgDeltaY = (leftDeltaY + rightDeltaY) / 2;

            const now = Date.now();

            // 羽ばたき検出：両手が同時に上下に動いているか
            if (Math.abs(avgDeltaY) > this.FLAP_THRESHOLD) {
                const newDirection = avgDeltaY < 0 ? 1 : -1; // 上に動く=1, 下に動く=-1

                // 方向が切り替わった時（上→下、または下→上）に発射
                if (this.flapDirection !== 0 && this.flapDirection !== newDirection) {
                    // 連射制限（100ms）
                    if (now - this.lastFlapTime > 100) {
                        if (this.callbacks.onFire) {
                            this.callbacks.onFire();
                        }
                        this.lastFlapTime = now;
                    }
                }

                this.flapDirection = newDirection;
            }
        }

        // 現在のフレームを保存
        this.previousLeftWrist = { x: leftWrist.x, y: leftWrist.y, z: leftWrist.z };
        this.previousRightWrist = { x: rightWrist.x, y: rightWrist.y, z: rightWrist.z };
    }

    detectBomb(landmarks) {
        // 両手を胸の前で合わせる → チャージ、両手を上げる → ボム発動
        const leftWrist = landmarks[15];
        const rightWrist = landmarks[16];
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];

        if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) return;

        const now = Date.now();

        // 両手首の距離
        const handDistance = distance(leftWrist, rightWrist);

        // 肩の中心X座標
        const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;

        // 両手の中心X座標
        const handCenterX = (leftWrist.x + rightWrist.x) / 2;

        // 両手が体の中心付近にあり、近くにある = 胸の前で合わせている
        const handsClose = handDistance < 0.15; // 手が近い
        const handsInCenter = Math.abs(handCenterX - shoulderCenterX) < 0.2; // 体の中心付近

        if (handsClose && handsInCenter) {
            // チャージ中
            if (!this.bombCharging) {
                this.bombCharging = true;
                this.chargeStartTime = now;
            }

            // チャージ量を増やす（最大100）
            const chargeTime = (now - this.chargeStartTime) / 1000;
            this.bombChargeAmount = Math.min(100, chargeTime * 50); // 2秒で100%

            // チャージ中のコールバック
            if (this.callbacks.onBombCharge) {
                this.callbacks.onBombCharge(this.bombChargeAmount);
            }
        } else {
            // 手を離したらチャージ継続（リセットしない）
            // ただし、チャージが完了していない場合は少しずつ減少
            if (this.bombCharging && this.bombChargeAmount < 100) {
                this.bombChargeAmount = Math.max(0, this.bombChargeAmount - 1);
                if (this.bombChargeAmount === 0) {
                    this.bombCharging = false;
                }
                if (this.callbacks.onBombCharge) {
                    this.callbacks.onBombCharge(this.bombChargeAmount);
                }
            }
        }

        // 両手を上げている = ボム発動
        const leftHandRaised = leftWrist.y < leftShoulder.y - 0.1;
        const rightHandRaised = rightWrist.y < rightShoulder.y - 0.1;

        if (leftHandRaised && rightHandRaised && this.bombChargeAmount >= 50) {
            // チャージが50%以上でボム発動
            if (this.callbacks.onBomb) {
                this.callbacks.onBomb(this.bombChargeAmount);
            }

            // チャージをリセット
            this.bombCharging = false;
            this.bombChargeAmount = 0;

            if (this.callbacks.onBombCharge) {
                this.callbacks.onBombCharge(0);
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

    reset() {
        // 前フレームのデータをリセット
        this.previousLeftWrist = null;
        this.previousRightWrist = null;
        this.previousTime = Date.now();

        // 羽ばたき検出をリセット
        this.flapDirection = 0;
        this.lastFlapTime = 0;

        // ボムチャージをリセット
        this.bombCharging = false;
        this.bombChargeAmount = 0;
        this.chargeStartTime = 0;
    }
}
