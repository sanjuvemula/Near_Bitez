import { createTonePlayer } from "../sounds.js";

const ROUND_SECONDS = 35;
const PLAYER_SPEED = 620;

export const createGameScene = (
  Phaser,
  { getSoundEnabled, onComplete, onReady }
) =>
  class GameScene extends Phaser.Scene {
    constructor() {
      super("GameScene");
      this.score = 0;
      this.combo = 0;
      this.targetX = 0;
      this.completed = false;
      this.lastSecond = ROUND_SECONDS;
    }

    create() {
      const { width, height } = this.scale;

      this.score = 0;
      this.combo = 0;
      this.completed = false;
      this.targetX = width / 2;
      this.roundEndsAt = this.time.now + ROUND_SECONDS * 1000;
      this.playTone = createTonePlayer();

      this.background = this.add.graphics();
      this.drawBackground(width, height);

      this.items = this.physics.add.group({
        allowGravity: false,
        maxSize: 42,
      });

      this.catcher = this.physics.add
        .sprite(width / 2, height - 82, "bite-basket")
        .setDepth(20)
        .setScale(0.78)
        .setImmovable(true);
      this.catcher.body.setSize(94, 30).setOffset(17, 38);

      this.scoreText = this.add
        .text(24, 22, "0", {
          color: "#f8fafc",
          fontFamily: "Arial, sans-serif",
          fontSize: "38px",
          fontStyle: "900",
        })
        .setDepth(25);

      this.timeText = this.add
        .text(width - 24, 28, `${ROUND_SECONDS}s`, {
          color: "#fef3c7",
          fontFamily: "Arial, sans-serif",
          fontSize: "24px",
          fontStyle: "900",
        })
        .setOrigin(1, 0)
        .setDepth(25);

      this.comboText = this.add
        .text(24, 70, "combo x0", {
          color: "#67e8f9",
          fontFamily: "Arial, sans-serif",
          fontSize: "13px",
          fontStyle: "700",
        })
        .setDepth(25)
        .setAlpha(0.82);

      this.spawnTimer = this.time.addEvent({
        delay: 620,
        loop: true,
        callback: this.spawnItem,
        callbackScope: this,
      });

      this.physics.add.overlap(
        this.catcher,
        this.items,
        this.handleCatch,
        undefined,
        this
      );

      this.cursors = this.input.keyboard?.createCursorKeys();
      this.input.on("pointermove", this.handlePointer, this);
      this.input.on("pointerdown", this.handlePointer, this);
      this.scale.on("resize", this.handleResize, this);
      this.events.once("shutdown", this.shutdown, this);

      this.spawnItem();
      onReady?.();
    }

    update(_time, delta) {
      if (this.completed) return;

      const { width } = this.scale;
      const secondsLeft = Math.max(
        0,
        Math.ceil((this.roundEndsAt - this.time.now) / 1000)
      );

      if (secondsLeft !== this.lastSecond) {
        this.lastSecond = secondsLeft;
        this.timeText.setText(`${secondsLeft}s`);
      }

      if (secondsLeft <= 0) {
        this.finishRound();
        return;
      }

      const step = PLAYER_SPEED * (delta / 1000);
      if (this.cursors?.left?.isDown) this.targetX -= step;
      if (this.cursors?.right?.isDown) this.targetX += step;

      this.targetX = Phaser.Math.Clamp(this.targetX, 62, width - 62);
      this.catcher.x = Phaser.Math.Linear(this.catcher.x, this.targetX, 0.24);
      this.catcher.y = this.scale.height - 82;

      this.items.children.each((item) => {
        if (item?.active && item.y > this.scale.height + 80) {
          item.destroy();
          if (!item.getData("hazard")) {
            this.combo = 0;
            this.updateHud();
          }
        }
      });
    }

    drawBackground(width, height) {
      this.background.clear();
      this.background.fillStyle(0x07111f, 1);
      this.background.fillRect(0, 0, width, height);
      this.background.fillStyle(0x0f766e, 0.08);

      for (let y = 86; y < height; y += 86) {
        this.background.fillRect(0, y, width, 1);
      }

      for (let x = 72; x < width; x += 96) {
        this.background.fillRect(x, 0, 1, height);
      }

      this.background.fillStyle(0xf97316, 0.18);
      this.background.fillRect(0, height - 8, width, 8);
      this.background.fillStyle(0x22d3ee, 0.22);
      this.background.fillRect(0, 0, width, 4);
    }

    handlePointer(pointer) {
      this.targetX = pointer.x;
      this.play("click");
    }

    spawnItem() {
      if (this.completed) return;

      const { width } = this.scale;
      const isHazard = Math.random() < 0.18;
      const frame = isHazard ? 3 : Phaser.Math.Between(0, 2);
      const x = Phaser.Math.Between(48, Math.max(52, width - 48));
      const item = this.items.create(x, -48, "bite-items", frame);

      if (!item) return;

      const speed =
        Phaser.Math.Between(195, 330) + Math.min(150, this.score * 0.42);

      item
        .setDepth(10)
        .setData("hazard", isHazard)
        .setData("value", isHazard ? -20 : 10 + Math.min(20, this.combo * 2))
        .setScale(isHazard ? 0.9 : Phaser.Math.FloatBetween(0.82, 1.04))
        .setVelocityY(speed)
        .setAngularVelocity(Phaser.Math.Between(-120, 120));

      item.body.setCircle(22, 10, 10);
    }

    handleCatch(_catcher, item) {
      if (!item?.active || this.completed) return;

      const isHazard = item.getData("hazard");
      const value = item.getData("value");
      const x = item.x;
      const y = item.y;

      item.disableBody(true, true);

      if (isHazard) {
        this.combo = 0;
        this.score = Math.max(0, this.score + value);
        this.roundEndsAt -= 1600;
        this.play("lose");
        this.cameras.main.shake(130, 0.006);
        this.popText(x, y, `${value}`, "#fecaca", "#7f1d1d");
      } else {
        this.combo += 1;
        this.score += value;
        this.play("score");
        this.popText(x, y, `+${value}`, "#ecfeff", "#0e7490");
        this.spark(x, y);
        this.tweens.add({
          targets: this.catcher,
          scale: 0.86,
          duration: 80,
          yoyo: true,
          ease: "Sine.easeOut",
        });
      }

      this.updateHud();
    }

    updateHud() {
      this.scoreText.setText(String(this.score));
      this.comboText.setText(`combo x${this.combo}`);
    }

    popText(x, y, label, color, backgroundColor) {
      const text = this.add
        .text(x, y, label, {
          backgroundColor,
          color,
          fontFamily: "Arial, sans-serif",
          fontSize: "26px",
          fontStyle: "900",
          padding: { x: 10, y: 5 },
        })
        .setOrigin(0.5)
        .setDepth(30);

      this.tweens.add({
        targets: text,
        y: y - 60,
        alpha: 0,
        scale: 1.12,
        duration: 680,
        ease: "Cubic.easeOut",
        onComplete: () => text.destroy(),
      });
    }

    spark(x, y) {
      const particles = this.add.particles(x, y, "bite-items", {
        frame: Phaser.Math.Between(0, 2),
        lifespan: 380,
        quantity: 8,
        scale: { start: 0.26, end: 0 },
        speed: { min: 80, max: 220 },
        rotate: { min: -180, max: 180 },
        emitting: false,
      });

      particles.explode(8, x, y);
      this.time.delayedCall(480, () => particles.destroy());
    }

    play(type) {
      if (getSoundEnabled?.()) {
        this.playTone?.(type);
      }
    }

    finishRound() {
      if (this.completed) return;

      this.completed = true;
      this.spawnTimer?.remove(false);
      this.physics.pause();
      this.items.children.each((item) => item?.setVelocity?.(0, 0));
      this.play("win");

      const { width, height } = this.scale;
      this.add
        .rectangle(width / 2, height / 2, Math.min(460, width - 36), 156, 0x020617, 0.74)
        .setStrokeStyle(1, 0x67e8f9, 0.28)
        .setDepth(35);
      this.add
        .text(width / 2, height / 2 - 28, "Round complete", {
          color: "#bae6fd",
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          fontStyle: "900",
        })
        .setOrigin(0.5)
        .setDepth(36);
      this.add
        .text(width / 2, height / 2 + 20, `${this.score}`, {
          color: "#f8fafc",
          fontFamily: "Arial, sans-serif",
          fontSize: "54px",
          fontStyle: "900",
        })
        .setOrigin(0.5)
        .setDepth(36);

      onComplete?.({
        score: this.score,
        title: "Bite Catcher finished",
        meta: {
          combo: this.combo,
          durationSeconds: ROUND_SECONDS,
          engine: "phaser",
        },
      });
    }

    handleResize(gameSize) {
      const width = gameSize.width;
      const height = gameSize.height;

      this.drawBackground(width, height);
      this.timeText?.setPosition(width - 24, 28);
      if (this.catcher) {
        this.catcher.y = height - 82;
        this.targetX = Phaser.Math.Clamp(this.targetX, 62, width - 62);
      }
    }

    shutdown() {
      this.input?.off("pointermove", this.handlePointer, this);
      this.input?.off("pointerdown", this.handlePointer, this);
      this.scale?.off("resize", this.handleResize, this);
      this.spawnTimer?.remove(false);
    }
  };
