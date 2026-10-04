import React, { type JSX } from "react";

export const holdDuration = 5000;
const spawnDuration = 4000;
const pieceCount = 260;

const emojis = ["💍", "💍", "🤵", "🤵", "🌸", "🌹", "🌷", "💐", "🌼"];
const confettiColours = [
   "oklch(0.78 0.14 15)",
   "oklch(0.85 0.12 85)",
   "oklch(0.75 0.13 240)",
   "oklch(0.8 0.12 150)",
   "oklch(0.72 0.15 320)",
   "oklch(0.95 0.02 90)",
];

/**
 * Calls `onHold` once the Alt/Option key has been held down on its own for
 * `duration` ms. Pressing any other key, releasing Alt or leaving the window
 * resets the timer.
 */
export function useAltHold(onHold: () => void, duration = holdDuration): void {
   const onHoldRef = React.useRef(onHold);
   React.useEffect(() => {
      onHoldRef.current = onHold;
   }, [onHold]);

   React.useEffect(() => {
      let timer: number | undefined;

      function reset(): void {
         window.clearTimeout(timer);
         timer = undefined;
      }

      function onKeyDown(event: KeyboardEvent): void {
         if (event.key !== "Alt") {
            reset();
            return;
         }
         // Holding a key fires repeated keydowns; only the first one starts the timer.
         if (event.repeat || timer != null) return;
         timer = window.setTimeout(() => {
            timer = undefined;
            onHoldRef.current();
         }, duration);
      }

      function onKeyUp(event: KeyboardEvent): void {
         if (event.key === "Alt") reset();
      }

      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      window.addEventListener("blur", reset);
      return () => {
         reset();
         window.removeEventListener("keydown", onKeyDown);
         window.removeEventListener("keyup", onKeyUp);
         window.removeEventListener("blur", reset);
      };
   }, [duration]);
}

type Piece = {
   x: number;
   y: number;
   vx: number;
   vy: number;
   angle: number;
   spin: number;
   sway: number;
   swaySpeed: number;
   size: number;
   delay: number;
   sprite: HTMLCanvasElement | null;
   colour: string;
};

function random(min: number, max: number): number {
   return min + Math.random() * (max - min);
}

function pick<T>(items: Array<T>): T {
   return items[Math.floor(Math.random() * items.length)] as T;
}

function emojiSprite(emoji: string, size: number): HTMLCanvasElement {
   const canvas = document.createElement("canvas");
   const scale = window.devicePixelRatio || 1;
   canvas.width = canvas.height = Math.ceil(size * 1.3 * scale);
   const context = canvas.getContext("2d");
   if (context) {
      context.scale(scale, scale);
      context.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(emoji, (size * 1.3) / 2, (size * 1.3) / 2);
   }
   return canvas;
}

function makePieces(width: number, height: number): Array<Piece> {
   const spriteSize = 64;
   const sprites = new Map(
      emojis.map((emoji) => [emoji, emojiSprite(emoji, spriteSize)]),
   );
   return Array.from({ length: pieceCount }, () => {
      const isEmoji = Math.random() < 0.45;
      return {
         x: random(0, width),
         y: random(-height * 0.2, -40),
         vx: random(-0.04, 0.04),
         vy: isEmoji ? random(0.18, 0.32) : random(0.15, 0.28),
         angle: random(0, Math.PI * 2),
         spin: random(-0.004, 0.004),
         sway: random(10, 40),
         swaySpeed: random(0.001, 0.003),
         size: isEmoji ? random(22, 40) : random(8, 14),
         delay: random(0, spawnDuration),
         sprite: isEmoji ? (sprites.get(pick(emojis)) ?? null) : null,
         colour: pick(confettiColours),
      };
   });
}

/**
 * Hold Alt/Option for five seconds and rings, suits, flowers and confetti
 * rain over the whole viewport. Does nothing for visitors who prefer reduced
 * motion.
 */
export function WeddingRain(): JSX.Element | null {
   const [runId, setRunId] = React.useState(0);
   const canvasRef = React.useRef<HTMLCanvasElement>(null);

   useAltHold(
      React.useCallback(() => {
         if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
         setRunId((id) => id + 1);
      }, []),
   );

   React.useEffect(() => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (runId === 0 || !canvas || !context) return;

      const scale = window.devicePixelRatio || 1;
      let width = 0;
      let height = 0;
      function resize(): void {
         if (!canvas || !context) return;
         width = window.innerWidth;
         height = window.innerHeight;
         canvas.width = width * scale;
         canvas.height = height * scale;
         context.setTransform(scale, 0, 0, scale, 0, 0);
      }
      resize();
      window.addEventListener("resize", resize);

      const pieces = makePieces(width, height);
      const start = performance.now();
      let last = start;
      let frame = requestAnimationFrame(draw);

      function draw(now: number): void {
         if (!context) return;
         const elapsed = now - start;
         const dt = Math.min(now - last, 50);
         last = now;
         context.clearRect(0, 0, width, height);

         let visible = 0;
         for (const piece of pieces) {
            if (elapsed < piece.delay) {
               visible++;
               continue;
            }
            piece.y += piece.vy * dt;
            piece.x += piece.vx * dt;
            piece.angle += piece.spin * dt;
            if (piece.y - piece.size > height) continue;
            visible++;

            const x = piece.x + Math.sin(elapsed * piece.swaySpeed) * piece.sway;
            context.save();
            context.translate(x, piece.y);
            context.rotate(piece.sprite ? Math.sin(piece.angle) * 0.5 : piece.angle);
            if (piece.sprite) {
               const size = piece.size * 1.3;
               context.drawImage(piece.sprite, -size / 2, -size / 2, size, size);
            } else {
               // Squash the rectangle as it turns so it reads as a flipping paper strip.
               context.scale(1, Math.cos(piece.angle * 3));
               context.fillStyle = piece.colour;
               context.fillRect(
                  -piece.size / 2,
                  -piece.size / 4,
                  piece.size,
                  piece.size / 2,
               );
            }
            context.restore();
         }

         if (visible > 0) frame = requestAnimationFrame(draw);
         else context.clearRect(0, 0, width, height);
      }

      return () => {
         cancelAnimationFrame(frame);
         window.removeEventListener("resize", resize);
         context.clearRect(0, 0, width, height);
      };
   }, [runId]);

   if (runId === 0) return null;
   return (
      <canvas
         ref={canvasRef}
         aria-hidden="true"
         className="pointer-events-none fixed inset-0 z-50 size-full"
      />
   );
}
