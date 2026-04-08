import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";

const DEFAULT_START_AGE = 0;
const DEFAULT_END_AGE = 30;
const GRAPH_PADDING = { top: 60, right: 40, bottom: 100, left: 70 };
const POINT_RADIUS = 7;
const HOVER_RADIUS = 10;
const MIN_SEGMENT_WIDTH = 32;
const EVENT_COLOR = "#27AE60";
const DEEP_COLOR = "#F2994A";

interface Point {
  id: string;
  age: number;
  month: number;
  motivation: number;
  event: string;
  deepDive: string;
}

type ViewMode = "year" | "month";
type LineStyle = "curve" | "straight";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default function MotivationGraph() {
  const [points, setPoints] = useState<Point[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const [startAge, setStartAge] = useState<number>(DEFAULT_START_AGE);
  const [endAge, setEndAge] = useState<number>(DEFAULT_END_AGE);
  const [title, setTitle] = useState<string>("モチベーショングラフ");
  const [upperLabel, setUpperLabel] = useState<string>("上：モチベーションが高かった時");
  const [lowerLabel, setLowerLabel] = useState<string>("下：モチベーションが低かった時");
  const [lineStyle, setLineStyle] = useState<LineStyle>("curve");
  const [viewMode, setViewMode] = useState<ViewMode>("year");
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const [showDeepDive, setShowDeepDive] = useState<boolean>(true);

  const svgRef = useRef<SVGSVGElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);

  const xSegments = useMemo(() => {
    const segs = [];
    if (viewMode === "month") {
      for (let age = startAge; age <= endAge; age++) {
        for (let m = 0; m < 12; m++) {
          segs.push({ age, month: m, key: `${age}-${m}`, expanded: true });
        }
      }
    } else {
      for (let age = startAge; age <= endAge; age++) {
        if (expandedYears.has(age) && age < endAge) {
          for (let m = 0; m < 12; m++) {
            segs.push({ age, month: m, key: `${age}-${m}`, expanded: true });
          }
        } else {
          segs.push({ age, month: null, key: `${age}`, expanded: false });
        }
      }
    }
    return segs;
  }, [startAge, endAge, viewMode, expandedYears]);

  const SVG_HEIGHT = 540;
  const svgWidth = useMemo(() => {
    const minWidth = 900;
    const neededWidth = GRAPH_PADDING.left + GRAPH_PADDING.right + xSegments.length * MIN_SEGMENT_WIDTH;
    return Math.max(minWidth, neededWidth);
  }, [xSegments]);

  const plotLeft = GRAPH_PADDING.left;
  const plotRight = svgWidth - GRAPH_PADDING.right;
  const plotWidth = plotRight - plotLeft;
  const plotTop = GRAPH_PADDING.top;
  const plotBottom = SVG_HEIGHT - GRAPH_PADDING.bottom;
  const plotHeight = plotBottom - plotTop;

  const segX = useCallback((idx: number) => {
    const total = xSegments.length - 1;
    if (total <= 0) return plotLeft;
    return plotLeft + (idx / total) * plotWidth;
  }, [xSegments, plotLeft, plotWidth]);

  const ageMonthToX = useCallback((age: number, month: number = 0) => {
    for (let i = 0; i < xSegments.length; i++) {
      const s = xSegments[i];
      if (s.month === null && s.age === Math.floor(age)) {
        const frac = month / 12;
        const total = xSegments.length - 1;
        if (total <= 0) return plotLeft;
        return plotLeft + ((i + frac) / total) * plotWidth;
      }
      if (s.age === Math.floor(age) && s.month === month) {
        return segX(i);
      }
    }
    return plotLeft;
  }, [xSegments, segX, plotLeft, plotWidth]);

  const motivationToY = useCallback((motivation: number) => {
    const centerY = plotTop + plotHeight / 2;
    return centerY - (motivation / 100) * (plotHeight / 2);
  }, [plotTop, plotHeight]);

  const xyToAgeMotivation = useCallback((clientX: number, clientY: number) => {
    const el = svgRef.current;
    if (!el) return { age: 0, month: 0, motivation: 0 };
    const rect = el.getBoundingClientRect();
    const scaleX = svgWidth / rect.width;
    const scaleY = SVG_HEIGHT / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const xRatio = Math.max(0, Math.min(1, (x - plotLeft) / plotWidth));
    const totalSegments = xSegments.length - 1;
    const segIdx = Math.round(xRatio * totalSegments);
    const seg = xSegments[Math.min(segIdx, xSegments.length - 1)];

    const age = seg.age;
    const month = seg.month ?? 0;

    const centerY = plotTop + plotHeight / 2;
    let motivation = -((y - centerY) / (plotHeight / 2)) * 100;
    motivation = Math.max(-100, Math.min(100, Math.round(motivation)));

    return { age, month, motivation };
  }, [xSegments, plotLeft, plotWidth, plotTop, plotHeight, svgWidth]);

  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging.current) { isDragging.current = false; return; }
    if ((e.target as Element).closest(".point-circle")) return;
    if ((e.target as Element).closest(".expand-btn")) return;

    const { age, month } = xyToAgeMotivation(e.clientX, e.clientY);
    const newPoint: Point = {
      id: generateId(),
      age,
      month,
      motivation: 0,
      event: "",
      deepDive: "",
    };
    setPoints(prev => [...prev, newPoint].sort((a, b) => (a.age + a.month / 12) - (b.age + b.month / 12)));
    setSelectedPointId(newPoint.id);
  }, [xyToAgeMotivation]);

  const handlePointMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent, pointId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingPointId(pointId);
    setSelectedPointId(pointId);
    isDragging.current = false;
  }, []);

  useEffect(() => {
    if (!draggingPointId) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      isDragging.current = true;
      let clientX, clientY;
      
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      const { age, month, motivation } = xyToAgeMotivation(clientX, clientY);
      setPoints(prev =>
        prev.map(p => p.id === draggingPointId ? { ...p, age, month, motivation } : p)
          .sort((a, b) => (a.age + a.month / 12) - (b.age + b.month / 12))
      );
    };
    const handleUp = () => {
      setDraggingPointId(null);
      setTimeout(() => { isDragging.current = false; }, 50);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [draggingPointId, xyToAgeMotivation]);

  const toggleYearExpand = useCallback((age: number) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(age)) next.delete(age);
      else next.add(age);
      return next;
    });
  }, []);

  const selectedPoint = points.find(p => p.id === selectedPointId);

  const updatePoint = (field: keyof Point, value: string | number) => {
    setPoints(prev => prev.map(p => p.id === selectedPointId ? { ...p, [field]: value } : p));
  };

  const deletePoint = (id: string) => {
    setPoints(prev => prev.filter(p => p.id !== id));
    if (selectedPointId === id) setSelectedPointId(null);
  };

  const sortedPoints = [...points].sort((a, b) => (a.age + a.month / 12) - (b.age + b.month / 12));

  const pathD = useMemo(() => {
    if (sortedPoints.length < 2) return "";
    const pts = sortedPoints.map(p => ({
      x: ageMonthToX(p.age, p.month),
      y: motivationToY(p.motivation),
    }));
    if (lineStyle === "straight") {
      return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    }
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];
      d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`;
    }
    return d;
  }, [sortedPoints, ageMonthToX, motivationToY, lineStyle]);

  const exportPNG = useCallback(async () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", svgWidth.toString());
    clone.setAttribute("height", SVG_HEIGHT.toString());
    const svgData = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 2;
      canvas.width = svgWidth * scale;
      canvas.height = SVG_HEIGHT * scale;
      const ctx = canvas.getContext("2d");
      if(ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.download = `${title || "motivation-graph"}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = url;
  }, [title, svgWidth]);

  const displayMonth = (m: number) => ((m + 4 - 1) % 12) + 1;

  const xTicks = useMemo(() => {
    const ticks = [];
    for (let i = 0; i < xSegments.length; i++) {
      const s = xSegments[i];
      const x = segX(i);
      if (s.month !== null && s.month !== undefined) {
        if (s.month === 0) {
          ticks.push({ x, label: `${s.age}歳`, major: true, age: s.age, isExpanded: true, expandable: false });
        } else {
          ticks.push({ x, label: `${displayMonth(s.month)}月`, major: false, age: s.age, isExpanded: false, expandable: false });
        }
      } else {
        ticks.push({ x, label: `${s.age}`, major: true, age: s.age, expandable: viewMode === "year", isExpanded: false });
      }
    }
    return ticks;
  }, [xSegments, segX, viewMode]);

  const calculateTextWidth = (str: string, fontSize = 10) => {
    let width = 0;
    for (let i = 0; i < str.length; i++) {
      width += str.charCodeAt(i) > 255 ? fontSize : fontSize * 0.6;
    }
    return width + 20;
  };

  const getBalloonDimensions = (text: string) => {
    if (!text) return { w: 0, h: 0, lines: [], lineHeight: 0, paddingY: 0 };
    const lines = text.split("\n");
    const maxLineWidth = Math.max(...lines.map(line => calculateTextWidth(line)));
    const w = Math.max(maxLineWidth, 40);
    const lineHeight = 14;
    const paddingY = 12;
    const h = lines.length * lineHeight + paddingY;
    return { w, h, lines, lineHeight, paddingY };
  };

  const renderBalloon = (text: string, cx: number, cy: number, color: string, above: boolean, offsetY = 0) => {
    if (!text) return null;
    const { w, h, lines, lineHeight, paddingY } = getBalloonDimensions(text);
    
    const baseY = above ? cy - POINT_RADIUS - 8 - offsetY : cy + POINT_RADIUS + 8 + offsetY;
    const boxY = above ? baseY - h : baseY;
    const boxX = Math.max(plotLeft + 2, Math.min(cx - w / 2, plotRight - w - 2));
    const textX = boxX + w / 2;
    const lineEndY = above ? boxY + h : boxY;
    
    return (
      <g style={{ pointerEvents: "none" }}>
        <line x1={cx} y1={cy + (above ? -POINT_RADIUS : POINT_RADIUS)}
          x2={cx} y2={lineEndY}
          stroke={color} strokeWidth={1} strokeDasharray="3 2" opacity={0.4} />
        <rect x={boxX} y={boxY} width={w} height={h}
          rx={4} fill="#fff" stroke={color} strokeWidth={1.8} />
        <text x={textX} y={boxY + paddingY / 2 + lineHeight - 3} textAnchor="middle"
          fontSize={10} fill="#1e293b" fontWeight={500}>
          {lines.map((line, i) => (
            <tspan key={i} x={textX} dy={i === 0 ? 0 : lineHeight}>{line}</tspan>
          ))}
        </text>
      </g>
    );
  };

  return (
    <div style={{
      display: "flex", height: "100vh",
      fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif",
      background: "#f8f9fb", color: "#1e293b", overflow: "hidden",
    }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
          borderBottom: "1px solid #e2e8f0", background: "#fff", flexWrap: "wrap", flexShrink: 0,
        }}>
          <input value={title} onChange={e => setTitle(e.target.value)}
            style={{ fontSize: 17, fontWeight: 700, border: "none", background: "transparent", outline: "none", minWidth: 160, color: "#1e293b" }}
            placeholder="タイトルを入力" />
          <div style={{ flex: 1 }} />

          <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 3 }}>
            <input type="number" value={startAge}
              onChange={e => setStartAge(Math.max(0, parseInt(e.target.value) || 0))}
              style={{ width: 42, padding: "3px 5px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }} />
            <span>〜</span>
            <input type="number" value={endAge}
              onChange={e => setEndAge(Math.max(startAge + 1, parseInt(e.target.value) || 30))}
              style={{ width: 42, padding: "3px 5px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }} />
            <span>歳</span>
          </label>

          <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: "1px solid #cbd5e1", fontSize: 11 }}>
            {(Object.entries({ year: "年", month: "月" }) as [ViewMode, string][]).map(([v, l]) => (
              <button key={v} onClick={() => { setViewMode(v); if (v === "month") setExpandedYears(new Set()); }}
                style={{ padding: "4px 12px", border: "none", cursor: "pointer",
                  background: viewMode === v ? "#3b82f6" : "#fff",
                  color: viewMode === v ? "#fff" : "#475569",
                  fontWeight: viewMode === v ? 600 : 400 }}>{l}表示</button>
            ))}
          </div>

          <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: "1px solid #cbd5e1", fontSize: 11 }}>
             {(Object.entries({ curve: "曲線", straight: "直線" }) as [LineStyle, string][]).map(([v, l]) => (
              <button key={v} onClick={() => setLineStyle(v)}
                style={{ padding: "4px 12px", border: "none", cursor: "pointer",
                  background: lineStyle === v ? "#3b82f6" : "#fff",
                  color: lineStyle === v ? "#fff" : "#475569",
                  fontWeight: lineStyle === v ? 600 : 400 }}>{l}</button>
            ))}
          </div>

          <button onClick={() => setShowDeepDive(v => !v)}
            style={{
              padding: "4px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600,
              border: `1.5px solid ${DEEP_COLOR}`,
              background: showDeepDive ? `${DEEP_COLOR}18` : "#fff",
              color: DEEP_COLOR,
            }}>
            {showDeepDive ? "深掘り 表示中" : "深掘り 非表示"}
          </button>

          <button onClick={exportPNG} style={{
            padding: "5px 14px", borderRadius: 6, border: "none",
            background: "#3b82f6", color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600,
          }}>PNG保存</button>
        </div>

        <div style={{ padding: "5px 16px 0", display: "flex", gap: 20, fontSize: 11, flexShrink: 0 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#16a34a" }}>
            ▲
            <input value={upperLabel} onChange={e => setUpperLabel(e.target.value)}
              style={{ border: "none", background: "transparent", fontSize: 11, outline: "none", color: "#16a34a", width: 240 }}
              placeholder="上側の説明" />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#dc2626" }}>
            ▼
            <input value={lowerLabel} onChange={e => setLowerLabel(e.target.value)}
              style={{ border: "none", background: "transparent", fontSize: 11, outline: "none", color: "#dc2626", width: 240 }}
              placeholder="下側の説明" />
          </label>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center", fontSize: 11 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ display: "inline-block", width: 14, height: 10, border: `2px solid ${EVENT_COLOR}`, borderRadius: 3, background: "#fff" }} />
              出来事
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ display: "inline-block", width: 14, height: 10, border: `2px solid ${DEEP_COLOR}`, borderRadius: 3, background: "#fff" }} />
              深掘り
            </span>
          </div>
        </div>

        <div ref={scrollContainerRef} style={{
          flex: 1, padding: "6px 16px 12px", minHeight: 0, overflowX: "auto", overflowY: "hidden",
        }}>
          <svg ref={svgRef}
            viewBox={`0 0 ${svgWidth} ${SVG_HEIGHT}`}
            preserveAspectRatio="xMinYMid meet"
            style={{
              width: Math.max(svgWidth, 900), minWidth: "100%", height: "100%", maxHeight: "100%",
              cursor: draggingPointId ? "grabbing" : "crosshair",
              background: "#fff", borderRadius: 10,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "block",
            }}
            onClick={handleSvgClick}>

            <defs>
              <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#dcfce7" stopOpacity="0.18" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="100%" stopColor="#fee2e2" stopOpacity="0.18" />
              </linearGradient>
            </defs>
            <rect x={plotLeft} y={plotTop} width={plotWidth} height={plotHeight} fill="url(#bgGrad)" />

            {[-100, -80, -60, -40, -20, 0, 20, 40, 60, 80, 100].map(v => {
              const y = motivationToY(v);
              return (
                <g key={v}>
                  <line x1={plotLeft} y1={y} x2={plotRight} y2={y}
                    stroke={v === 0 ? "#94a3b8" : "#e2e8f0"} strokeWidth={v === 0 ? 1.5 : 0.5}
                    strokeDasharray={v === 0 ? "none" : "4 4"} />
                  <text x={plotLeft - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">{v}%</text>
                </g>
              );
            })}

            <text x={14} y={(plotTop + plotBottom) / 2} textAnchor="middle" fontSize={11} fill="#64748b"
              transform={`rotate(-90, 14, ${(plotTop + plotBottom) / 2})`}>モチベーション</text>

            <text x={(plotLeft + plotRight) / 2} y={plotTop - 8} textAnchor="middle"
              fontSize={10} fill="#16a34a" fontWeight={500} opacity={0.7}>{upperLabel}</text>

            {xTicks.map((t, i) => (
              <g key={i}>
                <line x1={t.x} y1={plotBottom} x2={t.x} y2={plotBottom + (t.major ? 6 : 4)}
                  stroke={t.major ? "#94a3b8" : "#cbd5e1"} strokeWidth={1} />
                {t.major && <line x1={t.x} y1={plotTop} x2={t.x} y2={plotBottom} stroke="#f1f5f9" strokeWidth={0.5} />}
                <text x={t.x} y={plotBottom + (t.major ? 22 : 18)}
                  textAnchor="middle" fontSize={t.major ? 10 : 8}
                  fill={t.major ? "#475569" : "#94a3b8"} fontWeight={t.major ? 600 : 400}>
                  {t.label}
                </text>
                {t.expandable && (
                  <g className="expand-btn" style={{ cursor: "pointer" }}
                    onClick={(e) => { e.stopPropagation(); toggleYearExpand(t.age); }}>
                    <rect x={t.x - 10} y={plotBottom + 26} width={20} height={16} fill="transparent" />
                    <text x={t.x} y={plotBottom + 38} textAnchor="middle" fontSize={8}
                      fill={expandedYears.has(t.age) ? "#3b82f6" : "#b0b8c4"} fontWeight={600}>
                      {expandedYears.has(t.age) ? "▲" : "▼"}</text>
                  </g>
                )}
                {t.isExpanded && (
                  <g className="expand-btn" style={{ cursor: "pointer" }}
                    onClick={(e) => { e.stopPropagation(); toggleYearExpand(t.age); }}>
                    <rect x={t.x - 10} y={plotBottom + 26} width={20} height={16} fill="transparent" />
                    <text x={t.x} y={plotBottom + 38} textAnchor="middle" fontSize={8}
                      fill="#3b82f6" fontWeight={600}>▲</text>
                  </g>
                )}
              </g>
            ))}

            <text x={(plotLeft + plotRight) / 2} y={plotBottom + 58} textAnchor="middle" fontSize={11} fill="#64748b">年齢</text>

            <text x={(plotLeft + plotRight) / 2} y={plotBottom + 74} textAnchor="middle"
              fontSize={10} fill="#dc2626" fontWeight={500} opacity={0.7}>{lowerLabel}</text>

            {pathD && (
              <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth={2.5}
                strokeLinecap="round" strokeLinejoin="round" />
            )}

            {sortedPoints.map((p) => {
              const cx = ageMonthToX(p.age, p.month);
              const cy = motivationToY(p.motivation);
              const isSelected = p.id === selectedPointId;
              const isHovered = p.id === hoveredPointId;
              const above = p.motivation >= 0;

              const eventBalloon = renderBalloon(p.event, cx, cy, EVENT_COLOR, above, 0);
              const eventDimensions = getBalloonDimensions(p.event);
              const eventH = p.event ? eventDimensions.h + 8 : 0;
              const deepBalloon = showDeepDive ? renderBalloon(p.deepDive, cx, cy, DEEP_COLOR, above, eventH) : null;

              return (
                <g key={p.id}>
                  {eventBalloon}
                  {deepBalloon}

                  <circle className="point-circle" cx={cx} cy={cy}
                    r={isSelected ? HOVER_RADIUS : (isHovered ? HOVER_RADIUS - 1 : POINT_RADIUS)}
                    fill="#3b82f6" stroke="#fff" strokeWidth={2.5}
                    style={{ cursor: "grab", transition: "r 0.15s ease" }}
                    onMouseDown={e => handlePointMouseDown(e, p.id)}
                    onTouchStart={e => { e.stopPropagation(); handlePointMouseDown(e, p.id); }}
                    onMouseEnter={() => setHoveredPointId(p.id)}
                    onMouseLeave={() => setHoveredPointId(null)}
                    onClick={e => { e.stopPropagation(); setSelectedPointId(p.id); }}
                  />
                  {isSelected && (
                    <circle cx={cx} cy={cy} r={HOVER_RADIUS + 4}
                      fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 3" opacity={0.4}
                      style={{ pointerEvents: "none" }} />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div style={{
        width: 300, borderLeft: "1px solid #e2e8f0", background: "#fff",
        display: "flex", flexDirection: "column", overflowY: "auto", fontSize: 13, flexShrink: 0,
      }}>
        {selectedPoint ? (
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>ポイント編集</h3>
              <button onClick={() => setSelectedPointId(null)}
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#94a3b8", padding: 4 }}>✕</button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 4, color: "#64748b", fontSize: 11 }}>年齢</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="number" value={selectedPoint.age}
                  onChange={e => updatePoint("age", Math.max(startAge, Math.min(endAge, parseInt(e.target.value) || 0)))}
                  style={{ width: 56, padding: "5px 7px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }} />
                <span>歳</span>
                <input type="number" value={displayMonth(selectedPoint.month)} min={1} max={12}
                  onChange={e => {
                    const dm = Math.max(1, Math.min(12, parseInt(e.target.value) || 4));
                    updatePoint("month", (dm - 4 + 12) % 12);
                  }}
                  style={{ width: 48, padding: "5px 7px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }} />
                <span>月</span>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 4, color: "#64748b", fontSize: 11 }}>
                モチベーション: {selectedPoint.motivation}%
              </label>
              <input type="range" min={-100} max={100} value={selectedPoint.motivation}
                onChange={e => updatePoint("motivation", parseInt(e.target.value))}
                style={{ width: "100%", accentColor: "#3b82f6" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#94a3b8" }}>
                <span>-100%</span><span>0%</span><span>100%</span>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{
                display: "flex", alignItems: "center", gap: 6,
                fontWeight: 600, marginBottom: 5, color: EVENT_COLOR, fontSize: 11,
              }}>
                <span style={{ display: "inline-block", width: 12, height: 8, border: `2px solid ${EVENT_COLOR}`, borderRadius: 2, background: "#fff" }} />
                出来事
              </label>
              <textarea value={selectedPoint.event || ""} onChange={e => updatePoint("event", e.target.value)}
                placeholder="その時の出来事を入力..."
                rows={2}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: `1.5px solid ${EVENT_COLOR}40`, fontSize: 13, resize: "vertical", boxSizing: "border-box", outline: "none" }}
                onFocus={e => e.target.style.borderColor = EVENT_COLOR}
                onBlur={e => e.target.style.borderColor = `${EVENT_COLOR}40`} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{
                display: "flex", alignItems: "center", gap: 6,
                fontWeight: 600, marginBottom: 5, color: DEEP_COLOR, fontSize: 11,
              }}>
                <span style={{ display: "inline-block", width: 12, height: 8, border: `2px solid ${DEEP_COLOR}`, borderRadius: 2, background: "#fff" }} />
                深掘り（理由）
              </label>
              <textarea value={selectedPoint.deepDive || ""} onChange={e => updatePoint("deepDive", e.target.value)}
                placeholder="なぜそう感じたか，理由を深掘り..."
                rows={3}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: `1.5px solid ${DEEP_COLOR}40`, fontSize: 13, resize: "vertical", boxSizing: "border-box", outline: "none" }}
                onFocus={e => e.target.style.borderColor = DEEP_COLOR}
                onBlur={e => e.target.style.borderColor = `${DEEP_COLOR}40`} />
            </div>

            <button onClick={() => deletePoint(selectedPoint.id)}
              style={{
                width: "100%", padding: "8px 0", borderRadius: 8,
                border: "1px solid #fca5a5", background: "#fef2f2",
                color: "#dc2626", fontSize: 13, cursor: "pointer", fontWeight: 600, marginTop: 4,
              }}>このポイントを削除</button>
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>使い方</h3>
            <div style={{ color: "#64748b", lineHeight: 1.9, fontSize: 12 }}>
              <p style={{ margin: "0 0 8px" }}><strong style={{ color: "#3b82f6" }}>クリック</strong>でポイント追加（モチベーション0%）</p>
              <p style={{ margin: "0 0 8px" }}><strong style={{ color: "#3b82f6" }}>ドラッグ</strong>で位置調整</p>
              <p style={{ margin: "0 0 8px" }}>右パネルで<span style={{ color: EVENT_COLOR, fontWeight: 600 }}>出来事</span>と<span style={{ color: DEEP_COLOR, fontWeight: 600 }}>深掘り</span>を入力</p>
              <p style={{ margin: "0 0 8px" }}>年齢下の <strong style={{ color: "#3b82f6" }}>▼</strong> で月展開</p>
              <p style={{ margin: 0 }}>ツールバーの<span style={{ color: DEEP_COLOR, fontWeight: 600 }}>深掘りボタン</span>で表示切替</p>
            </div>

            {points.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#475569" }}>
                  ポイント一覧 ({points.length})
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {sortedPoints.map(p => (
                    <div key={p.id} onClick={() => setSelectedPointId(p.id)}
                      style={{
                        padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                        background: p.id === selectedPointId ? "#eff6ff" : "#f8fafc",
                        border: "1px solid #e2e8f0",
                        display: "flex", alignItems: "flex-start", gap: 8, transition: "background 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                      onMouseLeave={e => { if (p.id !== selectedPointId) e.currentTarget.style.background = "#f8fafc"; }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#3b82f6", flexShrink: 0, marginTop: 3 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>
                          {p.age}歳{p.month > 0 ? ` ${displayMonth(p.month)}月` : ""} — {p.motivation}%
                        </div>
                        {p.event && (
                          <div style={{ fontSize: 11, color: EVENT_COLOR, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                            {p.event}
                          </div>
                        )}
                        {p.deepDive && (
                          <div style={{ fontSize: 10, color: DEEP_COLOR, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                            {p.deepDive}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}