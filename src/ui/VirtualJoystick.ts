import Phaser from 'phaser';

/** A simple touch joystick. Emits a normalized (x, y) vector in [-1, 1] based
 *  on the inner stick's offset from the outer ring's center. Active only while
 *  a pointer is being held inside (or started inside) the outer ring. */
export class VirtualJoystick {
  readonly scene: Phaser.Scene;
  readonly outer: Phaser.GameObjects.Graphics;
  readonly inner: Phaser.GameObjects.Graphics;
  readonly hitZone: Phaser.GameObjects.Zone;
  private cx: number;
  private cy: number;
  private outerRadius: number;
  private innerRadius: number;
  private activePointerId: number | null = null;
  private _x = 0;
  private _y = 0;

  /**
   * @param scene     Scene that owns this joystick
   * @param cx        Center x (native pixels)
   * @param cy        Center y (native pixels)
   * @param outerR    Outer ring radius (native pixels)
   * @param innerR    Inner stick radius (native pixels)
   * @param touchR    Extra hit radius beyond outer ring so the stick is easier
   *                  to grab with a thumb (can equal outerR for a tight zone)
   */
  constructor(
    scene: Phaser.Scene,
    cx: number,
    cy: number,
    outerR: number,
    innerR: number,
    touchR: number,
  ) {
    this.scene = scene;
    this.cx = cx;
    this.cy = cy;
    this.outerRadius = outerR;
    this.innerRadius = innerR;

    // Outer ring — translucent so it reads as a thumb target without dominating
    this.outer = scene.add.graphics();
    this.outer.fillStyle(0x000000, 0.35);
    this.outer.fillCircle(cx, cy, outerR);
    this.outer.lineStyle(Math.max(2, outerR * 0.05), 0xffffff, 0.45);
    this.outer.strokeCircle(cx, cy, outerR);
    this.outer.setDepth(1000).setScrollFactor(0);

    // Inner stick — brighter disc that moves under the finger
    this.inner = scene.add.graphics();
    this.inner.setDepth(1001).setScrollFactor(0);
    this.redrawInner(cx, cy);

    // Invisible, square hit zone slightly larger than the outer ring so it's
    // easy to grab. Using a circle would be more accurate but rectangles are
    // cheaper for Phaser's hit testing.
    const hitSize = touchR * 2;
    this.hitZone = scene.add.zone(cx, cy, hitSize, hitSize).setScrollFactor(0);
    this.hitZone.setInteractive({ useHandCursor: false });
    this.hitZone.setDepth(1000);

    this.hitZone.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p));
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
    scene.input.on('pointercancel', (p: Phaser.Input.Pointer) => this.onUp(p));
    scene.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.onUp(p));
  }

  /** Normalized x in [-1, 1]. Zero when the stick is released. */
  get x() { return this._x; }
  /** Normalized y in [-1, 1]. Zero when the stick is released. */
  get y() { return this._y; }

  private onDown(p: Phaser.Input.Pointer) {
    if (this.activePointerId !== null) return;
    this.activePointerId = p.id;
    this.updateFromPointer(p);
  }

  private onMove(p: Phaser.Input.Pointer) {
    if (this.activePointerId !== p.id) return;
    this.updateFromPointer(p);
  }

  private onUp(p: Phaser.Input.Pointer) {
    if (this.activePointerId !== p.id) return;
    this.activePointerId = null;
    this._x = 0;
    this._y = 0;
    this.redrawInner(this.cx, this.cy);
  }

  private updateFromPointer(p: Phaser.Input.Pointer) {
    const dx = p.x - this.cx;
    const dy = p.y - this.cy;
    const dist = Math.hypot(dx, dy);
    const max = this.outerRadius;
    let nx: number;
    let ny: number;
    if (dist <= max || dist === 0) {
      nx = dx;
      ny = dy;
    } else {
      // Clamp the inner stick to the outer ring
      nx = (dx / dist) * max;
      ny = (dy / dist) * max;
    }
    this._x = nx / max;
    this._y = ny / max;
    this.redrawInner(this.cx + nx, this.cy + ny);
  }

  private redrawInner(ix: number, iy: number) {
    this.inner.clear();
    this.inner.fillStyle(0xffffff, 0.7);
    this.inner.fillCircle(ix, iy, this.innerRadius);
    this.inner.lineStyle(Math.max(1, this.innerRadius * 0.08), 0x000000, 0.5);
    this.inner.strokeCircle(ix, iy, this.innerRadius);
  }

  /** Move the joystick to a new center (e.g. on orientation change). */
  reposition(cx: number, cy: number, outerR: number, innerR: number, touchR: number) {
    this.cx = cx;
    this.cy = cy;
    this.outerRadius = outerR;
    this.innerRadius = innerR;

    this.outer.clear();
    this.outer.fillStyle(0x000000, 0.35);
    this.outer.fillCircle(cx, cy, outerR);
    this.outer.lineStyle(Math.max(2, outerR * 0.05), 0xffffff, 0.45);
    this.outer.strokeCircle(cx, cy, outerR);

    this.hitZone.setPosition(cx, cy);
    this.hitZone.setSize(touchR * 2, touchR * 2);
    (this.hitZone.input as any).hitArea.setSize(touchR * 2, touchR * 2);

    this._x = 0;
    this._y = 0;
    this.redrawInner(cx, cy);
  }

  destroy() {
    this.outer.destroy();
    this.inner.destroy();
    this.hitZone.destroy();
  }
}
