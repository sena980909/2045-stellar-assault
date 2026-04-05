// ===== COLLISION SYSTEM (AABB) =====

interface HasRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function checkCollision(a: HasRect, b: HasRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function checkCollisionWithHitbox(a: HasRect, hitbox: HasRect): boolean {
  return (
    a.x < hitbox.x + hitbox.width &&
    a.x + a.width > hitbox.x &&
    a.y < hitbox.y + hitbox.height &&
    a.y + a.height > hitbox.y
  );
}

export function isOutOfBounds(entity: HasRect, canvasWidth: number, canvasHeight: number, margin: number = 50): boolean {
  return (
    entity.x + entity.width < -margin ||
    entity.x > canvasWidth + margin ||
    entity.y + entity.height < -margin ||
    entity.y > canvasHeight + margin
  );
}
