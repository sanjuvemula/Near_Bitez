import { createBasketUrl, createItemSheetUrl } from "../assetFactory.js";

export const createPreloadScene = (Phaser, { onProgress }) =>
  class PreloadScene extends Phaser.Scene {
    constructor() {
      super("PreloadScene");
    }

    preload() {
      const { width, height } = this.scale;
      const barWidth = Math.min(360, width - 56);
      const x = width / 2 - barWidth / 2;
      const y = height / 2 + 42;

      this.cameras.main.setBackgroundColor("#07111f");

      this.add
        .text(width / 2, height / 2 - 24, "Bite Catcher", {
          color: "#f8fafc",
          fontFamily: "Arial, sans-serif",
          fontSize: "28px",
          fontStyle: "700",
        })
        .setOrigin(0.5);

      const track = this.add
        .rectangle(x, y, barWidth, 10, 0xffffff, 0.14)
        .setOrigin(0, 0.5);
      const fill = this.add
        .rectangle(x, y, 1, 10, 0x22d3ee, 1)
        .setOrigin(0, 0.5);
      const progressText = this.add
        .text(width / 2, y + 28, "Loading 0%", {
          color: "#bae6fd",
          fontFamily: "Arial, sans-serif",
          fontSize: "13px",
          fontStyle: "700",
        })
        .setOrigin(0.5);

      track.setStrokeStyle(1, 0x67e8f9, 0.18);

      this.load.on("progress", (value) => {
        fill.width = Math.max(1, barWidth * value);
        progressText.setText(`Loading ${Math.round(value * 100)}%`);
        onProgress?.(value);
      });

      this.load.on("complete", () => {
        fill.width = barWidth;
        progressText.setText("Loading 100%");
        onProgress?.(1);
      });

      this.load.spritesheet("bite-items", createItemSheetUrl(), {
        frameWidth: 64,
        frameHeight: 64,
      });
      this.load.image("bite-basket", createBasketUrl());
    }

    create() {
      this.scene.start("GameScene");
    }
  };
