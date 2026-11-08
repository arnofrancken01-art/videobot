import { useMemo } from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import countries from "i18n-iso-countries";
import world from "world-atlas/countries-50m.json";
import { theme } from "../theme";

/**
 * Wereldkaart die van land naar land vliegt.
 * keys: momenten (frame) waarop de camera naar een land (code) of terug naar de hele wereld (code null) gaat.
 * done: landen die al onthuld zijn (blijven licht gekleurd). current: het land dat nu oplicht.
 */
type Cam = { x: number; y: number; k: number };
export type MapKey = { at: number; code: string | null };

const W = 940, H = 400, FLY = 20;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const geo = feature(world as any, (world as any).objects.countries) as unknown as GeoJSON.FeatureCollection;
const projection = geoNaturalEarth1().fitExtent([[10, 10], [W - 10, H - 10]], { type: "Sphere" } as unknown as GeoJSON.Geometry);
const path = geoPath(projection);
const shapes = geo.features
  .filter((g) => g.id !== "010") // Antarctica weg
  .map((g) => ({ id: String(g.id).padStart(3, "0"), d: path(g) ?? "" }));
const WORLD: Cam = { x: W / 2, y: H / 2, k: 1 };

const numeric = (code: string) => countries.alpha2ToNumeric(code.toUpperCase()) ?? "";

function camFor(code: string | null): Cam {
  if (!code) return WORLD;
  const g = geo.features.find((x) => String(x.id).padStart(3, "0") === numeric(code));
  if (!g) return WORLD;
  // Grootste deel van het land (bv. zonder overzeese gebieden) als middelpunt
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let main: any = g;
  if (g.geometry.type === "MultiPolygon") {
    const polys = g.geometry.coordinates.map((c) => ({ type: "Polygon", coordinates: c }) as GeoJSON.Polygon);
    main = polys.sort((a, b) => path.area(b) - path.area(a))[0];
  }
  const [[x0, y0], [x1, y1]] = path.bounds(main);
  const k = Math.max(1.6, Math.min(7, 0.4 * Math.min(W / Math.max(1, x1 - x0), H / Math.max(1, y1 - y0))));
  const [cx, cy] = path.centroid(main);
  return { x: cx, y: cy, k };
}

const mix = (a: Cam, b: Cam, t: number): Cam => {
  // Zoom loopt logaritmisch, zodat in- en uitzoomen even vloeiend voelt.
  const k = Math.exp(Math.log(a.k) + (Math.log(b.k) - Math.log(a.k)) * t);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, k };
};

export const WorldMap: React.FC<{ keys: MapKey[]; done: string[]; current: string | null; color: string }> = ({ keys, done, current, color }) => {
  const f = useCurrentFrame();
  const targets = useMemo(() => keys.map((k) => ({ at: k.at, cam: camFor(k.code) })), [keys]);
  let cam = WORLD;
  for (const t of targets) {
    if (f < t.at) break;
    const p = interpolate(f, [t.at, t.at + FLY], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
    cam = mix(cam, t.cam, p);
  }
  const doneIds = new Set(done.map(numeric));
  const curId = current ? numeric(current) : "";
  const pulse = 0.5 + 0.5 * Math.sin(f / 5);
  const curCam = current ? camFor(current) : null;
  return (
    <div style={{ width: W, height: H, borderRadius: 28, overflow: "hidden", background: "rgba(11,15,23,0.75)", border: `2px solid ${theme.border}`, position: "relative" }}>
      <svg width={W} height={H}>
        <g transform={`translate(${W / 2} ${H / 2}) scale(${cam.k}) translate(${-cam.x} ${-cam.y})`}>
          {shapes.map((s) => {
            const isCur = s.id === curId;
            const isDone = doneIds.has(s.id);
            return (
              <path key={s.id} d={s.d}
                fill={isCur ? color : isDone ? "rgba(43,212,125,0.35)" : "#2A3550"}
                stroke={isCur ? "#FFFFFF" : "#0B0F17"} strokeWidth={(isCur ? 2.2 : 0.8) / cam.k} />
            );
          })}
          {curCam && (
            <>
              <circle cx={curCam.x} cy={curCam.y} r={(14 + 16 * pulse) / cam.k} fill="none" stroke={color} strokeWidth={4 / cam.k} opacity={1 - pulse * 0.7} />
              <circle cx={curCam.x} cy={curCam.y} r={7 / cam.k} fill="#FFFFFF" stroke={color} strokeWidth={3 / cam.k} />
            </>
          )}
        </g>
      </svg>
    </div>
  );
};
