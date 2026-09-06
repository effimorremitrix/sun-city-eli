/**
 * דחיסת סרטון בדפדפן, לפני ההעלאה ל-site-media — בלי שרת ובלי ffmpeg.
 *
 * הרעיון: מנגנים את הקובץ ב-<video> נסתר, מציירים כל פריים לקנבס בגובה של עד
 * 720p, ומקליטים את זרם הקנבס (+ פס הקול של הסרטון דרך AudioContext) עם
 * MediaRecorder בקצב סיביות נמוך. התוצאה היא WebM (VP9/VP8) או MP4 (H.264)
 * לפי מה שהדפדפן יודע לקודד — שניהם מותרים ב-bucket.
 *
 * זה איטי (הדחיסה אורכת כאורך הסרטון — הנגן חייב לרוץ בזמן אמת), ולכן מופעל
 * רק על קבצים גדולים (ראו upload-media.ts). הקוד מיובא רק מקומפוננטות ניהול:
 * הוא נוגע ב-DOM וב-Web APIs שאינם קיימים ב-SSR.
 */

export type CompressOptions = {
  /** גובה מרבי של הפלט (ברירת מחדל 720 — רוחב נגזר לפי יחס התמונה) */
  maxHeight?: number | undefined;
  /** קצב סיביות לווידאו (ברירת מחדל 2.5Mbps — מספיק ל-720p של המלצה) */
  videoBitsPerSecond?: number | undefined;
  /** התקדמות 0–100 לפי זמן הנגינה */
  onProgress?: ((percent: number) => void) | undefined;
  /** ביטול (למשל כשהמשתמש סוגר את הטופס) */
  signal?: AbortSignal | undefined;
};

/** סוגי פלט לפי סדר עדיפות — WebM/VP9 הכי יעיל; MP4/H.264 בסאפארי */
const OUTPUT_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp8",
  "video/webm",
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=avc1",
  "video/mp4",
];

/** סוג ההקלטה הראשון שהדפדפן תומך בו; null כשאין */
const supportedOutputType = (): string | null => {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return null;
  }
  for (const type of OUTPUT_TYPES) {
    try {
      if (MediaRecorder.isTypeSupported(type)) return type;
    } catch {
      /* דפדפן שזורק על סוג לא מוכר — ממשיכים לבא בתור */
    }
  }
  return null;
};

/** האם הדפדפן הזה יודע לדחוס סרטון (MediaRecorder + captureStream של קנבס) */
export function canCompressVideo(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (typeof HTMLCanvasElement === "undefined") return false;
  const canvasProto = HTMLCanvasElement.prototype as HTMLCanvasElement & {
    captureStream?: unknown;
  };
  if (typeof canvasProto.captureStream !== "function") return false;
  return supportedOutputType() !== null;
}

/** ממתין לאירוע יחיד או דוחה בטיימאאוט — כדי שקובץ פגום לא יתקע את ההעלאה */
const waitForEvent = (
  target: EventTarget,
  ok: string,
  fail: string,
  timeoutMs: number,
  message: string,
) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(message));
    }, timeoutMs);
    const onOk = () => {
      cleanup();
      resolve();
    };
    const onFail = () => {
      cleanup();
      reject(new Error(message));
    };
    const cleanup = () => {
      clearTimeout(timer);
      target.removeEventListener(ok, onOk);
      target.removeEventListener(fail, onFail);
    };
    target.addEventListener(ok, onOk, { once: true });
    target.addEventListener(fail, onFail, { once: true });
  });

/** סיומת קובץ לפי סוג הפלט של המקליט */
export const compressedExt = (mime: string): "webm" | "mp4" => (mime.includes("mp4") ? "mp4" : "webm");

/**
 * דוחס קובץ סרטון ומחזיר Blob (type = סוג הפלט של המקליט).
 * מחזיר את הקובץ המקורי כשהתוצאה לא קטנה יותר — הדחיסה לא אמורה להרע.
 * זורק כשהדפדפן לא תומך, כשהקובץ לא ניתן לניגון או כשבוטל.
 */
export async function compressVideo(file: File, opts: CompressOptions = {}): Promise<Blob> {
  const maxHeight = opts.maxHeight ?? 720;
  const videoBitsPerSecond = opts.videoBitsPerSecond ?? 2_500_000;
  const mimeType = supportedOutputType();
  if (!mimeType || !canCompressVideo()) throw new Error("הדפדפן אינו תומך בדחיסת סרטונים");
  if (opts.signal?.aborted) throw new Error("ההעלאה בוטלה");

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.preload = "auto";
  // מחוץ למסך אבל בתוך ה-DOM — חלק מהדפדפנים לא מרנדרים פריימים לאלמנט מנותק
  video.style.cssText = "position:fixed;left:-99999px;top:0;width:1px;height:1px;opacity:0;";
  document.body.appendChild(video);

  let audioCtx: AudioContext | null = null;
  let recorder: MediaRecorder | null = null;
  let raf = 0;

  const cleanup = () => {
    cancelAnimationFrame(raf);
    try {
      video.pause();
    } catch {
      /* לא קריטי */
    }
    video.removeAttribute("src");
    video.load();
    video.remove();
    URL.revokeObjectURL(objectUrl);
    if (audioCtx) void audioCtx.close().catch(() => undefined);
  };

  try {
    video.src = objectUrl;
    await waitForEvent(video, "loadedmetadata", "error", 20_000, "לא ניתן לקרוא את קובץ הסרטון");
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    if (!srcW || !srcH) throw new Error("לא ניתן לקרוא את ממדי הסרטון");

    const scale = Math.min(1, maxHeight / srcH);
    // ממדים זוגיים — מקודדי H.264 דורשים זאת
    const width = Math.max(2, Math.round((srcW * scale) / 2) * 2);
    const height = Math.max(2, Math.round((srcH * scale) / 2) * 2);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("הדפדפן אינו תומך בציור לקנבס");

    const stream = canvas.captureStream(30);

    // פס הקול: הסרטון מנוגן מושתק (muted) אבל ה-AudioContext עדיין מקבל את
    // האודיו דרך createMediaElementSource — כך המשתמש לא שומע את הסרטון
    // בזמן הדחיסה, והקול נשמר בהקלטה.
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        audioCtx = new Ctx();
        const source = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        for (const track of dest.stream.getAudioTracks()) stream.addTrack(track);
        if (audioCtx.state === "suspended") await audioCtx.resume().catch(() => undefined);
      }
    } catch {
      /* בלי אודיו עדיף מבלי דחיסה — ממשיכים עם וידאו בלבד */
    }

    const chunks: BlobPart[] = [];
    recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond,
      audioBitsPerSecond: 96_000,
    });
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const result = await new Promise<Blob>((resolve, reject) => {
      const rec = recorder!;
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };
      // תקרה: אורך הסרטון + מרווח בטחון; בלי משך ידוע — עשר דקות
      const hardTimeout = setTimeout(
        () => finish(() => reject(new Error("דחיסת הסרטון ארכה יותר מדי"))),
        (duration ? duration * 1000 * 1.5 : 10 * 60 * 1000) + 30_000,
      );
      const onAbort = () => finish(() => reject(new Error("ההעלאה בוטלה")));
      opts.signal?.addEventListener("abort", onAbort, { once: true });

      rec.onerror = () => finish(() => reject(new Error("הקלטת הסרטון הדחוס נכשלה")));
      rec.onstop = () => {
        clearTimeout(hardTimeout);
        opts.signal?.removeEventListener("abort", onAbort);
        finish(() => resolve(new Blob(chunks, { type: mimeType.split(";")[0] ?? mimeType })));
      };
      video.onerror = () => {
        if (rec.state !== "inactive") rec.stop();
        finish(() => reject(new Error("ניגון הסרטון נכשל במהלך הדחיסה")));
      };
      video.onended = () => {
        cancelAnimationFrame(raf);
        // פריים אחרון + סגירה מסודרת של המקליט
        ctx.drawImage(video, 0, 0, width, height);
        opts.onProgress?.(100);
        if (rec.state !== "inactive") rec.stop();
      };

      const draw = () => {
        if (settled) return;
        if (opts.signal?.aborted) {
          if (rec.state !== "inactive") rec.stop();
          return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        if (duration) {
          opts.onProgress?.(Math.min(99, Math.round((video.currentTime / duration) * 100)));
        }
        raf = requestAnimationFrame(draw);
      };

      rec.start(1000);
      video
        .play()
        .then(() => {
          raf = requestAnimationFrame(draw);
        })
        .catch(() => {
          if (rec.state !== "inactive") rec.stop();
          finish(() => reject(new Error("הדפדפן לא אישר ניגון של הסרטון לצורך דחיסה")));
        });
    });

    if (opts.signal?.aborted) throw new Error("ההעלאה בוטלה");
    // הדחיסה לא אמורה להרע — קובץ שיצא גדול יותר (או ריק) נשאר כפי שהוא
    if (!result.size || result.size >= file.size) return file;
    return result;
  } finally {
    cleanup();
  }
}
