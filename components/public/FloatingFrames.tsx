"use client";

import { useEffect, useRef } from "react";

// Three picture frames that float in 3D behind the hero text, showing Everframe's own photographs.
//
// This is decoration only, so it is strict about when it runs:
//  - only on large screens with a mouse (no phones or tablets),
//  - never for visitors who prefer reduced motion or have Data Saver on,
//  - never if the browser cannot do WebGL (the hero is complete without it),
//  - the 3D library is downloaded only after the intro has finished, so it never delays the first paint,
//  - it pauses when the hero is scrolled out of view or the tab is hidden,
//  - everything is disposed when the visitor leaves.
// The canvas is aria-hidden and ignores the pointer, so it cannot affect keyboard or screen-reader use.

type FrameSpec = {
  src: string;
  // Position as a fraction of half the visible width/height (-1 to 1), plus depth.
  x: number;
  y: number;
  z: number;
  // Height of the picture in world units.
  height: number;
  rotY: number;
  rotZ: number;
  // How far it drifts while floating, and how fast.
  float: number;
  speed: number;
  phase: number;
  // How strongly scrolling moves it (deeper frames move less).
  scroll: number;
};

const FRAMES: FrameSpec[] = [
  {
    src: "/photographer/portrait-bw.webp",
    x: 0.84,
    y: -0.62,
    z: -0.5,
    height: 1.5,
    rotY: -0.32,
    rotZ: 0.07,
    float: 0.16,
    speed: 0.55,
    phase: 0,
    scroll: 1.1,
  },
  {
    src: "/photographer/camera-bw.webp",
    x: 0.1,
    y: -0.55,
    z: 0.9,
    height: 1.35,
    rotY: 0.3,
    rotZ: -0.09,
    float: 0.2,
    speed: 0.42,
    phase: 2.1,
    scroll: 1.5,
  },
  {
    src: "/photographer/studio-brown.webp",
    x: -0.1,
    y: 0.7,
    z: -2.4,
    height: 1.1,
    rotY: 0.22,
    rotZ: 0.1,
    float: 0.12,
    speed: 0.7,
    phase: 4.2,
    scroll: 0.6,
  },
];

const FOV = 35;
const CAMERA_Z = 10;
const FRAME_COLOR = 0xc9a24b; // the site's brass

export default function FloatingFrames() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const query = window.matchMedia(
      "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean };
    };

    let disposeScene: (() => void) | null = null;
    let booting = 0; // incremented to cancel an in-flight start
    let readyTimer = 0;

    const stop = () => {
      booting++;
      window.clearTimeout(readyTimer);
      window.removeEventListener("ef:ready", onReady);
      disposeScene?.();
      disposeScene = null;
    };

    const mount = async (token: number) => {
      let THREE: typeof import("three");
      try {
        THREE = await import("three");
      } catch {
        return; // the library failed to load: the hero stays as it is
      }
      if (token !== booting || !host.current) return;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        });
      } catch {
        return; // no WebGL
      }
      const container = host.current;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const canvas = renderer.domElement;
      canvas.setAttribute("aria-hidden", "true");
      canvas.style.cssText =
        "display:block;width:100%;height:100%;pointer-events:none;";
      container.appendChild(canvas);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
      camera.position.z = CAMERA_Z;

      scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const key = new THREE.DirectionalLight(0xfff1d6, 2.2);
      key.position.set(-3, 4, 6);
      scene.add(key);

      type Item = {
        spec: FrameSpec;
        group: import("three").Group;
        baseX: number;
        baseY: number;
      };
      const items: Item[] = [];
      const loader = new THREE.TextureLoader();
      const disposables: { dispose: () => void }[] = [];

      // Half the visible width/height at depth 0, used to place frames as fractions of the screen.
      let halfW = 1;
      let halfH = 1;
      const measure = () => {
        const w = container.clientWidth || 1;
        const h = container.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        halfH = Math.tan((FOV * Math.PI) / 360) * CAMERA_Z;
        halfW = halfH * camera.aspect;
        for (const it of items) {
          it.baseX = it.spec.x * halfW;
          it.baseY = it.spec.y * halfH;
        }
      };

      const buildFrame = (spec: FrameSpec, tex: import("three").Texture) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        const img = tex.image as { width: number; height: number };
        const aspect = img.width / img.height;
        const h = spec.height;
        const w = h * aspect;
        const rim = 0.06; // frame thickness
        const depth = 0.08;

        const group = new THREE.Group();

        const photoGeo = new THREE.PlaneGeometry(w, h);
        // Slightly dimmed so the pictures sit behind the headline instead of competing with it.
        const photoMat = new THREE.MeshBasicMaterial({
          map: tex,
          color: 0xb8b8b8,
        });
        const photo = new THREE.Mesh(photoGeo, photoMat);
        photo.position.z = 0.001;
        group.add(photo);

        const frameMat = new THREE.MeshStandardMaterial({
          color: FRAME_COLOR,
          metalness: 0.7,
          roughness: 0.35,
        });
        const bars: [number, number, number, number][] = [
          [w + rim * 2, rim, 0, h / 2 + rim / 2], // top
          [w + rim * 2, rim, 0, -h / 2 - rim / 2], // bottom
          [rim, h, -w / 2 - rim / 2, 0], // left
          [rim, h, w / 2 + rim / 2, 0], // right
        ];
        for (const [bw, bh, bx, by] of bars) {
          const geo = new THREE.BoxGeometry(bw, bh, depth);
          const bar = new THREE.Mesh(geo, frameMat);
          bar.position.set(bx, by, 0);
          group.add(bar);
          disposables.push(geo);
        }

        group.rotation.set(0, spec.rotY, spec.rotZ);
        group.position.z = spec.z;
        scene.add(group);
        items.push({
          spec,
          group,
          baseX: spec.x * halfW,
          baseY: spec.y * halfH,
        });
        disposables.push(photoGeo, photoMat, frameMat, tex);
      };

      for (const spec of FRAMES) {
        loader.load(
          spec.src,
          (tex) => {
            if (token !== booting) {
              tex.dispose();
              return;
            }
            buildFrame(spec, tex);
          },
          undefined,
          () => {
            /* a picture that fails to load is simply left out */
          },
        );
      }

      // Pointer and scroll state, smoothed in the render loop.
      const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
      const onPointer = (e: PointerEvent) => {
        const r = container.getBoundingClientRect();
        pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
        pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      };
      window.addEventListener("pointermove", onPointer, { passive: true });

      let visible = true;
      let tabVisible = !document.hidden;
      const io = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
        },
        { threshold: 0 },
      );
      io.observe(container);
      const onVis = () => {
        tabVisible = !document.hidden;
      };
      document.addEventListener("visibilitychange", onVis);

      const ro = new ResizeObserver(measure);
      ro.observe(container);
      measure();

      const clock = new THREE.Clock();
      const born = performance.now();
      renderer.setAnimationLoop(() => {
        if (!visible || !tabVisible) return;
        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;
        pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 2.5);
        pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 2.5);
        const scrolled = Math.min(
          window.scrollY / (container.clientHeight || 1),
          1.5,
        );

        for (const it of items) {
          const s = it.spec;
          const depthFactor = 1 + s.z * 0.12; // deeper frames respond less to the pointer
          it.group.position.x = it.baseX - pointer.sx * 0.35 * depthFactor;
          it.group.position.y =
            it.baseY +
            Math.sin(t * s.speed + s.phase) * s.float +
            scrolled * s.scroll * halfH * 0.5 -
            pointer.sy * 0.2 * depthFactor;
          it.group.rotation.y =
            s.rotY +
            Math.sin(t * s.speed * 0.6 + s.phase) * 0.08 +
            pointer.sx * 0.12;
          it.group.rotation.x =
            pointer.sy * 0.08 + Math.cos(t * s.speed * 0.5 + s.phase) * 0.03;
          it.group.rotation.z =
            s.rotZ + Math.sin(t * s.speed * 0.4 + s.phase) * 0.02;
        }
        // Fade the whole canvas in once, so the frames do not pop into view.
        const fade = Math.min(1, (performance.now() - born) / 1400);
        if (fade < 1 || canvas.style.opacity !== "1") {
          canvas.style.opacity = String(fade);
        }
        renderer.render(scene, camera);
      });
      canvas.style.opacity = "0";

      disposeScene = () => {
        renderer.setAnimationLoop(null);
        io.disconnect();
        ro.disconnect();
        document.removeEventListener("visibilitychange", onVis);
        window.removeEventListener("pointermove", onPointer);
        for (const d of disposables) d.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        canvas.remove();
      };
    };

    const begin = () => {
      const token = ++booting;
      void mount(token);
    };

    function onReady() {
      // Let the intro animation finish first, then load the 3D library.
      window.clearTimeout(readyTimer);
      readyTimer = window.setTimeout(begin, 1200);
    }

    const evaluate = () => {
      stop();
      if (!query.matches || nav.connection?.saveData) return;
      if (document.documentElement.dataset.efReady === "1") onReady();
      else {
        window.addEventListener("ef:ready", onReady, { once: true });
        readyTimer = window.setTimeout(onReady, 5000); // safety net if the loader never reports
      }
    };

    evaluate();
    query.addEventListener("change", evaluate);
    return () => {
      query.removeEventListener("change", evaluate);
      stop();
    };
  }, []);

  return (
    <div
      ref={host}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5] hidden lg:block"
    />
  );
}