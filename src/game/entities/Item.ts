// ===== ITEM ENTITIES =====

import { ItemData, ItemType } from '../types';

const ITEM_COLORS: Record<ItemType, string> = {
  power: '#00ffff',
  bomb: '#ff4444',
  speed: '#44ff44',
};

const ITEM_LABELS: Record<ItemType, string> = {
  power: 'P',
  bomb: 'B',
  speed: 'S',
};

export function createItem(x: number, y: number, type: ItemType): ItemData {
  return {
    x: x - 10,
    y,
    width: 20,
    height: 20,
    type,
    vy: 80,
    active: true,
  };
}

export function randomItemType(): ItemType {
  const roll = Math.random();
  if (roll < 0.50) return 'power';
  if (roll < 0.75) return 'bomb';
  return 'speed';
}

export function updateItem(item: ItemData, dt: number) {
  item.y += item.vy * dt;
}

export function drawItem(ctx: CanvasRenderingContext2D, item: ItemData, time: number) {
  const cx = item.x + item.width / 2;
  const cy = item.y + item.height / 2;
  const color = ITEM_COLORS[item.type];

  ctx.save();

  // Glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;

  // Outer ring
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.stroke();

  // Inner fill
  ctx.fillStyle = `${color}33`;
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fill();

  // Rotating ring
  ctx.strokeStyle = `${color}88`;
  ctx.lineWidth = 1;
  const angle = time * 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 12, angle, angle + Math.PI * 1.2);
  ctx.stroke();

  // Label
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ITEM_LABELS[item.type], cx, cy);

  ctx.restore();
}
