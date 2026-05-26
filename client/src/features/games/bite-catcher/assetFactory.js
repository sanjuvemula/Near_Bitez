const ITEM_SIZE = 64;

const encodeCanvas = (canvas) => {
  const webp = canvas.toDataURL("image/webp", 0.82);
  return webp.startsWith("data:image/webp")
    ? webp
    : canvas.toDataURL("image/png");
};

const drawRoundRect = (context, x, y, width, height, radius) => {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
};

const withShadow = (context, draw) => {
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.26)";
  context.shadowBlur = 10;
  context.shadowOffsetY = 4;
  draw();
  context.restore();
};

const drawBurger = (context, offsetX) => {
  withShadow(context, () => {
    context.fillStyle = "#f59e0b";
    drawRoundRect(context, offsetX + 10, 16, 44, 18, 12);
    context.fill();
    context.fillStyle = "#7c2d12";
    drawRoundRect(context, offsetX + 13, 31, 38, 8, 4);
    context.fill();
    context.fillStyle = "#22c55e";
    drawRoundRect(context, offsetX + 12, 39, 40, 7, 4);
    context.fill();
    context.fillStyle = "#fbbf24";
    drawRoundRect(context, offsetX + 13, 45, 38, 8, 6);
    context.fill();
  });

  context.fillStyle = "#fff7ed";
  [20, 31, 43].forEach((x) => {
    context.beginPath();
    context.arc(offsetX + x, 23, 1.6, 0, Math.PI * 2);
    context.fill();
  });
};

const drawBowl = (context, offsetX) => {
  withShadow(context, () => {
    context.fillStyle = "#fef3c7";
    context.beginPath();
    context.ellipse(offsetX + 32, 32, 24, 14, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#ef4444";
    context.beginPath();
    context.ellipse(offsetX + 32, 31, 19, 9, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#2563eb";
    drawRoundRect(context, offsetX + 13, 32, 38, 18, 8);
    context.fill();
  });

  context.strokeStyle = "#fef08a";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(offsetX + 18, 25);
  context.quadraticCurveTo(offsetX + 26, 16, offsetX + 34, 25);
  context.quadraticCurveTo(offsetX + 41, 16, offsetX + 48, 25);
  context.stroke();
};

const drawDrink = (context, offsetX) => {
  withShadow(context, () => {
    context.fillStyle = "#ecfeff";
    drawRoundRect(context, offsetX + 19, 14, 27, 40, 7);
    context.fill();
    context.fillStyle = "#06b6d4";
    drawRoundRect(context, offsetX + 22, 27, 21, 22, 6);
    context.fill();
    context.fillStyle = "#f97316";
    context.beginPath();
    context.arc(offsetX + 34, 26, 8, 0, Math.PI * 2);
    context.fill();
  });

  context.strokeStyle = "#0f172a";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(offsetX + 36, 14);
  context.lineTo(offsetX + 47, 7);
  context.stroke();
};

const drawDanger = (context, offsetX) => {
  withShadow(context, () => {
    context.fillStyle = "#dc2626";
    context.beginPath();
    context.moveTo(offsetX + 32, 9);
    context.lineTo(offsetX + 56, 51);
    context.lineTo(offsetX + 8, 51);
    context.closePath();
    context.fill();
    context.fillStyle = "#fee2e2";
    context.fillRect(offsetX + 29, 24, 6, 15);
    context.beginPath();
    context.arc(offsetX + 32, 45, 3, 0, Math.PI * 2);
    context.fill();
  });
};

export const createItemSheetUrl = () => {
  const canvas = document.createElement("canvas");
  canvas.width = ITEM_SIZE * 4;
  canvas.height = ITEM_SIZE;

  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);

  drawBurger(context, 0);
  drawBowl(context, ITEM_SIZE);
  drawDrink(context, ITEM_SIZE * 2);
  drawDanger(context, ITEM_SIZE * 3);

  return encodeCanvas(canvas);
};

export const createBasketUrl = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 96;

  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);

  withShadow(context, () => {
    context.fillStyle = "#111827";
    drawRoundRect(context, 16, 32, 96, 40, 18);
    context.fill();
    context.fillStyle = "#f97316";
    drawRoundRect(context, 22, 38, 84, 26, 14);
    context.fill();
    context.fillStyle = "#fed7aa";
    drawRoundRect(context, 31, 44, 66, 12, 8);
    context.fill();
  });

  context.strokeStyle = "#fde68a";
  context.lineWidth = 7;
  context.beginPath();
  context.arc(64, 40, 30, Math.PI, Math.PI * 2);
  context.stroke();

  return encodeCanvas(canvas);
};
