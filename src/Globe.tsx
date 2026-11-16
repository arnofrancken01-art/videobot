import { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { geoArea, geoCentroid, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import countries from "i18n-iso-countries";
import world from "world-atlas/countries-110m.json";
import { theme } from "./theme";

/**
 * Wereldbol als horizon onderaan het beeld. Hij draait traag en vliegt naar het land waar het nu over gaat;
 * dat land licht op. Puur decor in de zone waar YouTube zijn knoppen legt, dus er staat nooit iets belangrijks op.
 * keys: { from (frame), code (ISO-2) } in volgorde.
 */
export type GlobeKey = { from: number; code: string };

const FLY = 22, SPIN = 0.35;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const geo = feature(world as any, (world as any).objects.countries) as unknown as GeoJSON.FeatureCollection;
const numeric = (code: string) => countries.alpha2ToNumeric(code.toUpperCase()) ?? "";
const byId = new Map(geo.features.map((g) => [String(g.id).padStart(3, "0"), g]));

/** Middelpunt van het grootste stuk van een land (dus niet Alaska of Frans-Guyana). */
const center = (code: string): [number, number] | null => {
  const g = byId.get(numeric(code));
  if (!g) return null;
  if (g.geometry.type !== "MultiPolygon") return geoCentroid(g);
  const polys = g.geometry.coordinates.map((c) => ({ type: "Polygon", coordinates: c }) as GeoJSON.Polygon);
  return geoCentroid(polys.sort((a, b) => geoArea(b) - geoArea(a))[0]);
};
const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

export const Globe: React.FC<{ keys: GlobeKey[]; cx?: number; cy?: number; r?: number; tilt?: number; w?: number; h?: number }> = ({ keys, cx: CX = 540, cy: CY = 2060, r: R = 780, tilt: TILT = 40, w = 1080, h = 1920 }) => {
  const f = useCurrentFrame();
  const stops = useMemo(
    () => keys.map((k) => ({ from: k.from, code: k.code, c: center(k.code) })).filter((k) => k.c) as { from: number; code: string; c: [number, number] }[],
    [keys],
  );
  // Zolang er geen land is, draait de bol vanzelf; daarna vliegt hij van land naar land.
  let lon = -20 + f * SPIN, lat = 25;
  let cur: (typeof stops)[number] | null = null;
  let arrive = 0;
  for (const s of stops) {
    if (f < s.from) break;
    const p = interpolate(f, [s.from, s.from + FLY], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
    lon = lon + wrap(s.c[0] - lon) * p;
    lat = lat + (s.c[1] - lat) * p;
    cur = s;
    arrive = p;
  }
  const projection = geoOrthographic().scale(R).translate([CX, CY]).clipAngle(90).rotate([-lon, -(lat - TILT)]);
  const path = geoPath(projection);
  const curId = cur ? numeric(cur.code) : "";
  const seen = new Set(stops.filter((s) => s.from <= f && s !== cur).map((s) => numeric(s.code)));
  const pin = cur ? projection(cur.c) : null;
  const pulse = (f % 30) / 30;
  return (
    <AbsoluteFill>
      <svg width={w} height={h} style={{ position: "absolute" }}>
        <defs>
          <radialGradient id="ocean" cx="50%" cy="18%" r="75%">
            <stop offset="0" stopColor="#1B4F9C" />
            <stop offset="0.55" stopColor="#0E2A5C" />
            <stop offset="1" stopColor="#050B1C" />
          </radialGradient>
          <radialGradient id="halo" cx="50%" cy="50%" r="50%">
            <stop offset="0.86" stopColor="#3FA2FF" stopOpacity="0.55" />
            <stop offset="1" stopColor="#3FA2FF" stopOpacity="0" />
          </radialGradient>
          <filter id="pinGlow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="14" /></filter>
        </defs>
        <circle cx={CX} cy={CY} r={R * 1.14} fill="url(#halo)" />
        <circle cx={CX} cy={CY} r={R} fill="url(#ocean)" />
        {geo.features.map((g) => {
          const id = String(g.id).padStart(3, "0");
          const isCur = id === curId;
          const d = path(g);
          if (!d) return null;
          return (
            <path key={id} d={d}
              fill={isCur ? theme.warm : seen.has(id) ? "#2BD47D" : "#4F86D9"}
              fillOpacity={isCur ? 0.35 + 0.65 * arrive : seen.has(id) ? 0.75 : 0.9}
              stroke={isCur ? "#FFFFFF" : "#0A1E44"} strokeWidth={isCur ? 3 : 1.2} />
          );
        })}
        {pin && arrive > 0.5 && (
          <>
            <circle cx={pin[0]} cy={pin[1]} r={46} fill={theme.warm} opacity={0.5} filter="url(#pinGlow)" />
            <circle cx={pin[0]} cy={pin[1]} r={18 + 70 * pulse} fill="none" stroke="#FFFFFF" strokeWidth={5} opacity={1 - pulse} />
            <circle cx={pin[0]} cy={pin[1]} r={13} fill="#FFFFFF" stroke={theme.warm} strokeWidth={5} />
          </>
        )}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(120,190,255,0.55)" strokeWidth={3} />
      </svg>
    </AbsoluteFill>
  );
};
