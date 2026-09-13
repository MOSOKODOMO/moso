/**
 * HeroPreview — draws the hero (body + armor + weapon layers) onto a 2D
 * canvas for the character panel, using the SAME procedural textures and
 * layout constants as the in-world sprite. Equipment keeps the same size,
 * attachment points and idle pose in both views.
 */
import type { Texture } from 'three';
import {
  HERO_HAND_POSITION,
  HERO_LAYOUT,
  SWORD_CENTER,
  SWORD_ENHANCEMENT_LAYOUT,
  SWORD_IDLE_ANGLE,
  enhancementStrength,
  makeArmorEnhancementTexture,
  makeEnhancementSparkleTexture,
  makeHelmetTexture,
  makePlayerBodyTexture,
  makeSwordEnhancementTexture,
  makeWeaponTexture,
} from '../rendering/SpriteFactory';

const iconCache = new Map<string, string>();

/** Rasterize a canvas texture to a data URL once, then reuse it (item icons). */
export function iconURL(key: string, make: () => Texture): string {
  let url = iconCache.get(key);
  if (!url) {
    const tex = make();
    url = (tex.image as HTMLCanvasElement).toDataURL();
    tex.dispose();
    iconCache.set(key, url);
  }
  return url;
}

/**
 * Paint the hero onto `canvas` (recommended 144x200). Includes a shadow and
 * a small stone platform so the preview feels staged, not floating.
 */
export function drawHeroPreview(
  canvas: HTMLCanvasElement,
  weaponTier: number,
  armorTier: number,
  weaponEnhance = 0,
  armorEnhance = 0,
  bootsTier = 0,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);

  const { body, helmet, weapon } = HERO_LAYOUT;
  const hand = HERO_HAND_POSITION;
  const cos = Math.cos(SWORD_IDLE_ANGLE);
  const sin = Math.sin(SWORD_IDLE_ANGLE);
  // Fit the complete equipped pose, including the sword tip and helmet.
  // Bounds use the same planes and up-positive coordinates as the world renderer.
  const xs = [-body.width / 2, body.width / 2, helmet.x - helmet.width / 2, helmet.x + helmet.width / 2];
  const ys = [0, body.height, helmet.y - helmet.height / 2, helmet.y + helmet.height / 2];
  // Keep the same fit at every enhancement level, including the tight gold edge.
  for (const x of [SWORD_CENTER.x - SWORD_ENHANCEMENT_LAYOUT.width / 2, SWORD_CENTER.x + SWORD_ENHANCEMENT_LAYOUT.width / 2]) {
    for (const y of [SWORD_CENTER.y - SWORD_ENHANCEMENT_LAYOUT.height / 2, SWORD_CENTER.y + SWORD_ENHANCEMENT_LAYOUT.height / 2]) {
      xs.push(hand.x + x * cos - y * sin);
      ys.push(hand.y + x * sin + y * cos);
    }
  }
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = Math.min((W - 16) / (maxX - minX), (H - 36) / (maxY - minY));
  const originX = (W - (maxX - minX) * scale) / 2 - minX * scale;
  const feetY = H - 22 + minY * scale;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(originX, feetY + 8, body.width * scale * 0.32, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Mini stone platform with grass lip
  const pw = body.width * scale * 0.72;
  ctx.fillStyle = '#8d88a3';
  ctx.fillRect(originX - pw / 2, feetY + 2, pw, 10);
  ctx.fillStyle = '#5d5878';
  ctx.fillRect(originX - pw / 2, feetY + 9, pw, 3);
  ctx.fillStyle = '#62c370';
  ctx.fillRect(originX - pw / 2, feetY, pw, 3);
  ctx.strokeStyle = '#262633';
  ctx.lineWidth = 2;
  ctx.strokeRect(originX - pw / 2, feetY, pw, 12);

  const bodyTex = makePlayerBodyTexture(armorTier, {}, bootsTier);
  const helmTex = makeHelmetTexture(armorTier);
  const swordTex = makeWeaponTexture(weaponTier);
  const armorGlow = makeArmorEnhancementTexture(armorTier);
  const swordGlow = makeSwordEnhancementTexture();
  const sparkle = makeEnhancementSparkleTexture();
  const weaponStrength = enhancementStrength(weaponEnhance);
  const armorStrength = enhancementStrength(armorEnhance);
  try {
    ctx.drawImage(
      bodyTex.image as HTMLCanvasElement,
      originX - body.width * scale / 2,
      feetY - body.height * scale,
      body.width * scale,
      body.height * scale,
    );
    if (armorStrength > 0 && armorTier > 0) {
      ctx.globalAlpha = 0.025 + 0.18 * armorStrength ** 2;
      ctx.drawImage(armorGlow.image as HTMLCanvasElement, originX - body.width * scale / 2,
        feetY - body.height * scale, body.width * scale, body.height * scale);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(
      helmTex.image as HTMLCanvasElement,
      originX + (helmet.x - helmet.width / 2) * scale,
      feetY - (helmet.y + helmet.height / 2) * scale,
      helmet.width * scale,
      helmet.height * scale,
    );
    ctx.save();
    ctx.translate(originX + hand.x * scale, feetY - hand.y * scale);
    // Canvas Y points down, so its angle is the negative of the world angle.
    ctx.rotate(-SWORD_IDLE_ANGLE);
    if (weaponStrength > 0) {
      ctx.globalAlpha = 0.07 + 0.5 * weaponStrength ** 2;
      ctx.drawImage(swordGlow.image as HTMLCanvasElement,
        (SWORD_CENTER.x - SWORD_ENHANCEMENT_LAYOUT.width / 2) * scale,
        -(SWORD_CENTER.y + SWORD_ENHANCEMENT_LAYOUT.height / 2) * scale,
        SWORD_ENHANCEMENT_LAYOUT.width * scale, SWORD_ENHANCEMENT_LAYOUT.height * scale);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(
      swordTex.image as HTMLCanvasElement,
      (SWORD_CENTER.x - weapon.width / 2) * scale,
      -(SWORD_CENTER.y + weapon.height / 2) * scale,
      weapon.width * scale,
      weapon.height * scale,
    );
    if (weaponStrength > 0.5) {
      ctx.globalAlpha = (weaponStrength - 0.5) * 1.2;
      ctx.drawImage(sparkle.image as HTMLCanvasElement, (0.43 - 0.0375) * scale,
        (-0.06 - 0.0375) * scale, 0.075 * scale, 0.075 * scale);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  } finally {
    bodyTex.dispose();
    helmTex.dispose();
    swordTex.dispose();
    armorGlow.dispose();
    swordGlow.dispose();
    sparkle.dispose();
  }
}
