import React, { useState, useRef, useEffect, useCallback } from "react";

/**
 * ImageCropper
 * ---------------------------------------------------------------------------
 * A zero-dependency crop / reposition / zoom editor for spot photos.
 *
 * It never modifies the original image. It reports back:
 *   - crop:  { x, y, zoom }  normalised numbers you save to the database, so
 *            the same photo can be re-opened and re-framed later
 *   - blob:  a JPEG of the visible frame, sized for display, which you upload
 *            as the version customers actually download
 *
 * Props
 *   src        string   URL of the ORIGINAL image (object URL or Supabase URL)
 *   aspect     number   width / height of the output frame. Default 4/3.
 *   initial    object   { x, y, zoom } to reopen a previous crop. Optional.
 *   outputWidth number  pixel width of the exported JPEG. Default 1400.
 *   quality    number   JPEG quality of the export, 0-1. Default 0.85.
 *   title      string   heading shown at the top of the editor
 *   onCancel   fn()
 *   onSave     fn({ crop, blob, width, height })  may return a promise
 *
 * Crop format
 *   x, y : 0–1, the point of the ORIGINAL image sitting at the centre of the
 *          frame. 0.5 / 0.5 is dead centre.
 *   zoom : 1 = image exactly covers the frame. 2 = twice that size.
 *   These are resolution independent, so they stay correct even if you change
 *   the frame ratio or the export size later.
 */

const C = {
  scrim: "rgba(8,8,16,0.88)",
  panel: "#1A1A2E",
  card: "#1F1F35",
  border: "rgba(255,255,255,0.08)",
  text: "#FFFFFF",
  dim: "#8A8AA3",
  amber: "#F5A623",
  ink: "#1A1A2E",
};

const MAX_ZOOM = 4;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export default function ImageCropper({
  src,
  aspect = 4 / 3,
  initial,
  outputWidth = 1400,
  quality = 0.85,
  title = "Adjust photo",
  onCancel,
  onSave,
}) {
  const frameRef = useRef(null);
  const imgRef = useRef(null);          // the loaded HTMLImageElement
  const pointersRef = useRef(new Map()); // active pointers, for drag + pinch
  const pinchRef = useRef(null);         // { dist, zoom } at pinch start

  const [frame, setFrame] = useState({ w: 0, h: 0 });
  const [nat, setNat] = useState(null);  // { w, h } natural image size
  const [crop, setCrop] = useState({
    x: initial?.x ?? 0.5,
    y: initial?.y ?? 0.5,
    zoom: initial?.zoom ?? 1,
  });
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Load the image ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    setStatus("loading");
    setError("");

    const img = new Image();
    // Needed so the canvas stays clean when re-editing a photo already stored
    // in Supabase. Supabase Storage sends permissive CORS headers, so this is
    // safe for both object URLs and remote URLs.
    img.crossOrigin = "anonymous";
    img.decoding = "async";

    img.onload = () => {
      if (cancelled) return;
      imgRef.current = img;
      setNat({ w: img.naturalWidth, h: img.naturalHeight });
      setStatus("ready");
    };
    img.onerror = () => {
      if (cancelled) return;
      setStatus("error");
      setError("That image could not be loaded. Try a different file.");
    };
    img.src = src;

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  // ── Measure the frame ─────────────────────────────────────────────────────
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setFrame({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [status]);

  // ── Geometry ──────────────────────────────────────────────────────────────
  // Scale at which the image exactly covers the frame.
  const baseScale =
    nat && frame.w && frame.h ? Math.max(frame.w / nat.w, frame.h / nat.h) : 1;
  const scale = baseScale * crop.zoom;
  const dispW = nat ? nat.w * scale : 0;
  const dispH = nat ? nat.h * scale : 0;

  // Keep the frame fully covered: the centre point can only travel so far.
  const clampCrop = useCallback(
    (next) => {
      if (!nat || !frame.w || !frame.h) return next;
      const s = baseScale * next.zoom;
      const w = nat.w * s;
      const h = nat.h * s;
      // Half the frame, expressed as a fraction of the displayed image.
      const marginX = w > frame.w ? frame.w / 2 / w : 0.5;
      const marginY = h > frame.h ? frame.h / 2 / h : 0.5;
      return {
        zoom: next.zoom,
        x: clamp(next.x, marginX, 1 - marginX),
        y: clamp(next.y, marginY, 1 - marginY),
      };
    },
    [nat, frame.w, frame.h, baseScale]
  );

  // Re-clamp whenever the frame is measured or the image changes.
  useEffect(() => {
    setCrop((c) => clampCrop(c));
  }, [clampCrop]);

  const left = frame.w / 2 - crop.x * dispW;
  const top = frame.h / 2 - crop.y * dispH;

  // ── Drag and pinch ────────────────────────────────────────────────────────
  const pointerDist = () => {
    const pts = [...pointersRef.current.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };

  const onPointerDown = (e) => {
    if (status !== "ready") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      pinchRef.current = { dist: pointerDist(), zoom: crop.zoom };
    }
  };

  const onPointerMove = (e) => {
    const prev = pointersRef.current.get(e.pointerId);
    if (!prev) return;
    e.preventDefault();
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const d = pointerDist();
      if (d > 0 && pinchRef.current.dist > 0) {
        const z = clamp(
          (pinchRef.current.zoom * d) / pinchRef.current.dist,
          1,
          MAX_ZOOM
        );
        setCrop((c) => clampCrop({ ...c, zoom: z }));
      }
      return;
    }

    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    setCrop((c) =>
      clampCrop({
        ...c,
        x: c.x - dx / (nat.w * baseScale * c.zoom),
        y: c.y - dy / (nat.h * baseScale * c.zoom),
      })
    );
  };

  const endPointer = (e) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
  };

  const onWheel = (e) => {
    if (status !== "ready") return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    setCrop((c) => clampCrop({ ...c, zoom: clamp(c.zoom * factor, 1, MAX_ZOOM) }));
  };

  // Arrow keys nudge, +/- zoom. Keeps the editor usable without a mouse.
  const onKeyDown = (e) => {
    if (status !== "ready" || !nat) return;
    const stepPx = e.shiftKey ? 24 : 6;
    const sx = stepPx / (nat.w * scale);
    const sy = stepPx / (nat.h * scale);
    const moves = {
      ArrowLeft: { x: sx },
      ArrowRight: { x: -sx },
      ArrowUp: { y: sy },
      ArrowDown: { y: -sy },
    };
    if (moves[e.key]) {
      e.preventDefault();
      const m = moves[e.key];
      setCrop((c) => clampCrop({ ...c, x: c.x - (m.x || 0), y: c.y - (m.y || 0) }));
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      setCrop((c) => clampCrop({ ...c, zoom: clamp(c.zoom * 1.12, 1, MAX_ZOOM) }));
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      setCrop((c) => clampCrop({ ...c, zoom: clamp(c.zoom / 1.12, 1, MAX_ZOOM) }));
    }
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const buildBlob = () =>
    new Promise((resolve, reject) => {
      const img = imgRef.current;
      if (!img || !nat) return reject(new Error("Image not ready"));

      // How much of the ORIGINAL image is visible inside the frame.
      const srcW = frame.w / scale;
      const srcH = frame.h / scale;
      const srcX = clamp(crop.x * nat.w - srcW / 2, 0, Math.max(0, nat.w - srcW));
      const srcY = clamp(crop.y * nat.h - srcH / 2, 0, Math.max(0, nat.h - srcH));

      // Never upscale past the original resolution.
      const outW = Math.round(Math.min(outputWidth, srcW));
      const outH = Math.round(outW / aspect);

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, outW, outH);
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve({ blob, width: outW, height: outH });
          else reject(new Error("Could not export the image"));
        },
        "image/jpeg",
        quality
      );
    });

  const handleSave = async () => {
    if (saving || status !== "ready") return;
    setSaving(true);
    setError("");
    try {
      const { blob, width, height } = await buildBlob();
      await onSave({
        crop: {
          x: Number(crop.x.toFixed(4)),
          y: Number(crop.y.toFixed(4)),
          zoom: Number(crop.zoom.toFixed(4)),
        },
        blob,
        width,
        height,
      });
    } catch (err) {
      console.error("[ImageCropper] save failed", err);
      setError(err?.message || "Could not save the photo. Try again.");
      setSaving(false);
    }
  };

  const reset = () => setCrop(clampCrop({ x: 0.5, y: 0.5, zoom: 1 }));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: C.scrim,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onCancel?.();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 20px 12px" }}>
          <div
            style={{
              fontFamily: "Fraunces, Georgia, serif",
              fontSize: 20,
              fontWeight: 700,
              color: C.text,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 12.5,
              color: C.dim,
              marginTop: 4,
            }}
          >
            Drag to reposition. Pinch or use the slider to zoom.
          </div>
        </div>

        {/* Frame */}
        <div style={{ padding: "0 20px" }}>
          <div
            ref={frameRef}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onWheel={onWheel}
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: String(aspect),
              background: "#0E0E18",
              borderRadius: 14,
              overflow: "hidden",
              cursor: status === "ready" ? "grab" : "default",
              touchAction: "none",
              outline: "none",
              userSelect: "none",
            }}
          >
            {status === "ready" && nat && (
              <img
                src={src}
                alt=""
                draggable={false}
                style={{
                  position: "absolute",
                  left: `${left}px`,
                  top: `${top}px`,
                  width: `${dispW}px`,
                  height: `${dispH}px`,
                  maxWidth: "none",
                  pointerEvents: "none",
                }}
              />
            )}

            {status === "loading" && (
              <div style={centeredNote}>Loading photo…</div>
            )}
            {status === "error" && (
              <div style={{ ...centeredNote, color: "#FF8A8A" }}>{error}</div>
            )}

            {/* Framing guides — thirds, drawn over the image */}
            {status === "ready" && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  backgroundImage:
                    "linear-gradient(to right, rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.16) 1px, transparent 1px)",
                  backgroundSize: "33.333% 33.333%",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)",
                  borderRadius: 14,
                }}
              />
            )}
          </div>
        </div>

        {/* Zoom */}
        <div
          style={{
            padding: "14px 20px 4px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ ...labelStyle, width: 38 }}>Zoom</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={crop.zoom}
            disabled={status !== "ready"}
            onChange={(e) =>
              setCrop((c) => clampCrop({ ...c, zoom: Number(e.target.value) }))
            }
            aria-label="Zoom"
            style={{ flex: 1, accentColor: C.amber }}
          />
          <button onClick={reset} style={linkBtn} disabled={saving}>
            Reset
          </button>
        </div>

        {error && status === "ready" && (
          <div
            style={{
              padding: "6px 20px 0",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 12.5,
              color: "#FF8A8A",
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ padding: "14px 20px 20px", display: "flex", gap: 10 }}>
          <button
            onClick={() => !saving && onCancel?.()}
            disabled={saving}
            style={{
              flex: 1,
              padding: "13px",
              borderRadius: 13,
              border: `1px solid ${C.border}`,
              background: C.card,
              color: C.dim,
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 14.5,
              fontWeight: 600,
              cursor: saving ? "default" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || status !== "ready"}
            style={{
              flex: 2,
              padding: "13px",
              borderRadius: 13,
              border: "none",
              background: status === "ready" ? C.amber : "#33334D",
              color: status === "ready" ? C.ink : "#666",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 14.5,
              fontWeight: 700,
              cursor: saving || status !== "ready" ? "default" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Use this photo"}
          </button>
        </div>
      </div>
    </div>
  );
}

const centeredNote = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 13,
  color: C.dim,
  textAlign: "center",
  padding: 20,
};

const labelStyle = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 12,
  fontWeight: 600,
  color: C.dim,
};

const linkBtn = {
  background: "none",
  border: "none",
  color: C.amber,
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  padding: "4px 2px",
};
