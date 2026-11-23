import { useMemo } from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import { geoAzimuthalEqualArea, geoCentroid, geoContains, geoDistance, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import countries from "i18n-iso-countries";
import world from "world-atlas/countries-50m.json";
import { theme } from "../theme";
import { P, Title, wordFrame, type SceneProps } from "./common";

/**
 * Twee kaartscenes, nagebootst van de best scorende Shorts in de niche (3 tot 40 miljoen views bij kleine kanalen):
 * - truesize: landen op ware grootte, gevuld met hun vlag, die een voor een op een groot land vallen ("Brazil is bigger than ...").
 * - worldsplit: de hele wereld in twee kleuren rond één land ("Countries richer and poorer than India").
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const geo = feature(world as any, (world as any).objects.countries) as unknown as GeoJSON.FeatureCollection;
const features = geo.features.filter((g) => String(g.id).padStart(3, "0") !== "010");
const numeric = (code: string) => countries.alpha2ToNumeric(code.toUpperCase()) ?? "";
const byId = new Map(features.map((g) => [String(g.id).padStart(3, "0"), g]));

/** Het vasteland van een land: het grootste stuk, zodat Frankrijk niet met Frans-Guyana komt. */
const mainland = (code: string): GeoJSON.Feature | null => {
  const g = byId.get(numeric(code));
  if (!g) return null;
  if (g.geometry.type !== "MultiPolygon") return g;
  const probe = geoPath(geoAzimuthalEqualArea());
  const polys = g.geometry.coordinates.map((c) => ({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: c } }) as GeoJSON.Feature);
  const big = polys.sort((a, b) => probe.area(b) - probe.area(a));
  // Neem alle stukken die minstens 15% van het grootste zijn (Japan, Indonesië, Filipijnen blijven heel).
  const c0 = geoCentroid(big[0]);
  const keep = big.filter((p) => probe.area(p) >= 0.15 * probe.area(big[0]) && geoDistance(geoCentroid(p), c0) < 0.35);
  return { type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: keep.map((p) => (p.geometry as GeoJSON.Polygon).coordinates) } };
};

const BOX = 900;

/** Land op ware grootte: elk land met zijn eigen vlakketrouwe projectie, allemaal op dezelfde schaal. */
const shapeAt = (f: GeoJSON.Feature, scale: number) => {
  const c = geoCentroid(f);
  const proj = geoAzimuthalEqualArea().rotate([-c[0], -c[1]]).scale(scale).translate([0, 0]);
  const path = geoPath(proj);
  const [[x0, y0], [x1, y1]] = path.bounds(f);
  const local = geoAzimuthalEqualArea().rotate([-c[0], -c[1]]).scale(scale).translate([-x0, -y0]);
  return { d: geoPath(local)(f) ?? "", w: x1 - x0, h: y1 - y0, cx: -x0, cy: -y0, proj };
};

const FlagShape: React.FC<{ code: string; d: string; w: number; h: number; dim?: number; stroke: string; sw: number }> = ({ code, d, w, h, dim = 0, stroke, sw }) => (
  <div style={{ position: "absolute", inset: 0 }}>
    <div style={{ position: "absolute", inset: 0, clipPath: `path('${d}')` }}>
      <Img src={staticFile(`flags/${code}.svg`)} style={{ width: w, height: h, objectFit: "cover" }} />
      {dim > 0 && <div style={{ position: "absolute", inset: 0, background: `rgba(6,9,15,${dim})` }} />}
    </div>
    <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <path d={d} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
    </svg>
  </div>
);

export const TrueSize: React.FC<SceneProps> = ({ segs, fps, offset }) => {
  const f = useCurrentFrame();
  const base = P(segs[0]);
  const items = segs.filter((s) => P(s).item).map((s) => ({
    ...P(s).item,
    at: Math.min(wordFrame(s, P(s).at, fps, offset), Math.round((s.start - offset) * fps) + Math.round(fps * 1.2)),
  }));
  const layout = useMemo(() => {
    const bf = mainland(base.base.flag);
    if (!bf) return null;
    // Schaal zo dat het grote land het kader vult; daarna tekenen we alles op die schaal.
    const unit = shapeAt(bf, 100);
    const scale = 100 * Math.min(BOX / unit.w, (BOX * 0.95) / unit.h);
    const b = shapeAt(bf, scale);
    const ox = (BOX - b.w) / 2, oy = (BOX - b.h) / 2;
    // Plaatsen binnen het grote land, op een raster van cellen: zoveel mogelijk binnen de grens, zo weinig mogelijk overlap.
    const C = 15, nx = Math.ceil(b.w / C), ny = Math.ceil(b.h / C);
    const inBase: boolean[] = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const ll = b.proj.invert?.([(i + 0.5) * C - b.cx, (j + 0.5) * C - b.cy]);
      inBase.push(!!ll && geoContains(bf, ll));
    }
    const used = new Array(nx * ny).fill(false);
    const shapes = items.map((it) => {
      const g = mainland(it.flag);
      if (!g) return null;
      const s = shapeAt(g, scale);
      const cells: [number, number][] = [];
      for (let j = 0; j < Math.ceil(s.h / C); j++) for (let i = 0; i < Math.ceil(s.w / C); i++) {
        const ll = s.proj.invert?.([(i + 0.5) * C - s.cx, (j + 0.5) * C - s.cy]);
        if (ll && geoContains(g, ll)) cells.push([i, j]);
      }
      let best = [Math.round((nx - s.w / C) / 2), Math.round((ny - s.h / C) / 2)], bestS = -Infinity;
      for (let oj = -2; oj <= ny - 2; oj++) for (let oi = -2; oi <= nx - 2; oi++) {
        let sc = 0;
        for (const [i, j] of cells) {
          const x = i + oi, y = j + oj;
          if (x < 0 || y < 0 || x >= nx || y >= ny || !inBase[y * nx + x]) sc -= 3;
          else if (used[y * nx + x]) sc -= 2;
          else sc += 1;
        }
        if (sc > bestS) { bestS = sc; best = [oi, oj]; }
      }
      for (const [i, j] of cells) { const x = i + best[0], y = j + best[1]; if (x >= 0 && y >= 0 && x < nx && y < ny) used[y * nx + x] = true; }
      return { ...it, ...s, x: ox + best[0] * C, y: oy + best[1] * C };
    });
    return { b, ox, oy, shapes };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base.base.flag, JSON.stringify(items)]);
  if (!layout) return <Title>{base.title}</Title>;
  const { b, ox, oy, shapes } = layout;
  const shown = shapes.filter((s) => s && f >= s.at);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: 1000 }}>
      <Title size={60}>{base.title}</Title>
      <div style={{ position: "relative", width: BOX, height: BOX }}>
        <div style={{ position: "absolute", left: ox, top: oy, width: b.w, height: b.h, filter: "drop-shadow(0 0 40px rgba(63,162,255,0.45))" }}>
          <FlagShape code={base.base.flag} d={b.d} w={b.w} h={b.h} dim={0.25 + 0.3 * Math.min(1, shown.length / 2)} stroke="#FFFFFF" sw={5} />
        </div>
        {shapes.map((s, i) => {
          if (!s || f < s.at) return null;
          const p = spring({ frame: f - s.at, fps, config: { damping: 11, stiffness: 160, mass: 0.7 } });
          const drop = interpolate(p, [0, 1], [-260, 0]);
          return (
            <div key={i} style={{ position: "absolute", left: s.x, top: s.y, width: s.w, height: s.h, transform: `translateY(${drop}px) scale(${interpolate(p, [0, 1], [1.25, 1])})`, opacity: Math.min(1, p * 2), filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.6))" }}>
              <FlagShape code={s.flag} d={s.d} w={s.w} h={s.h} stroke="#FFFFFF" sw={3} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, maxWidth: 1000, minHeight: 70 }}>
        <span style={{ color: theme.text, fontSize: 46, fontWeight: 900 }}>{base.base.label}</span>
        {shown.length > 0 && <span style={{ color: theme.warm, fontSize: 46, fontWeight: 900 }}>{">"}</span>}
        {shown.map((s, i) => (
          <span key={i} style={{ color: i === shown.length - 1 ? theme.warm : theme.text, fontSize: 46, fontWeight: 900 }}>{(i ? "+ " : "") + s!.label}</span>
        ))}
      </div>
    </div>
  );
};

const MW = 1000, MH = 560;
const world2 = geoNaturalEarth1().fitExtent([[6, 6], [MW - 6, MH - 6]], { type: "Sphere" } as unknown as GeoJSON.Geometry);
const wpath = geoPath(world2);
const wshapes = features.map((g) => ({ id: String(g.id).padStart(3, "0"), d: wpath(g) ?? "", c: wpath.centroid(g) }));

export const WorldSplit: React.FC<SceneProps> = ({ segs, fps, offset }) => {
  const f = useCurrentFrame();
  const p = P(segs[0]);
  const at = Math.min(wordFrame(segs[0], p.at, fps, offset), Math.round((segs[0].start - offset) * fps) + Math.round(fps * 0.6));
  const ref = numeric(p.ref.flag);
  const above = new Set((p.above as string[]).map(numeric));
  const below = new Set((p.below as string[]).map(numeric));
  const rc = wshapes.find((s) => s.id === ref)?.c ?? [MW / 2, MH / 2];
  const maxD = Math.hypot(MW, MH);
  const pulse = 0.5 + 0.5 * Math.sin(f / 5);
  const nA = above.size, nB = below.size;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, width: 1000 }}>
      <Title size={58}>{p.title}</Title>
      <div style={{ width: MW, height: MH, borderRadius: 26, overflow: "hidden", background: "#0B1A33", border: `2px solid ${theme.border}` }}>
        <svg width={MW} height={MH}>
          {wshapes.map((s, i) => {
            // De kleur loopt als een golf vanaf het land zelf over de wereld.
            const t = at + 4 + 26 * (Math.hypot(s.c[0] - rc[0], s.c[1] - rc[1]) / maxD);
            const on = f >= t;
            const isRef = s.id === ref;
            const fill = isRef ? theme.warm : !on ? "#2A3550" : above.has(s.id) ? "#2BD47D" : below.has(s.id) ? "#FF4D5E" : "#2A3550";
            return <path key={i} d={s.d} fill={fill} stroke="#0B1A33" strokeWidth={isRef ? 0 : 0.7} />;
          })}
          {wshapes.filter((s) => s.id === ref).map((s, i) => (
            <g key={i}>
              <path d={s.d} fill={theme.warm} stroke="#FFFFFF" strokeWidth={2.5} />
              <circle cx={s.c[0]} cy={s.c[1]} r={16 + 22 * pulse} fill="none" stroke="#FFFFFF" strokeWidth={4} opacity={1 - pulse} />
            </g>
          ))}
        </svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 940, opacity: interpolate(f, [at + 20, at + 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        {[[theme.warm, p.ref.label, ""], ["#2BD47D", p.legend.above, String(nA)], ["#FF4D5E", p.legend.below, String(nB)]].map(([c, label, n], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 46, height: 46, borderRadius: 10, background: c }} />
            <div style={{ color: theme.text, fontSize: 46, fontWeight: 900, flex: 1 }}>{label}</div>
            <div style={{ color: c, fontSize: 52, fontWeight: 900 }}>{n}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
