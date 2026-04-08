import React from "react";
import { GraphLogic } from "../hooks/useGraphLogic";
import { POINT_RADIUS, HOVER_RADIUS, EVENT_COLOR, DEEP_COLOR, SVG_HEIGHT } from "../constants/config";

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

export default function GraphBoard({ logic }: { logic: GraphLogic }) {
  const {
    upperLabel, lowerLabel, svgRef, scrollContainerRef, svgWidth, plotLeft, plotRight, plotWidth, plotTop, plotBottom, plotHeight,
    xTicks, pathD, sortedPoints, selectedPointId, hoveredPointId, draggingPointId, showDeepDive,
    handleSvgClick, handlePointMouseDown, toggleYearExpand, setHoveredPointId, setSelectedPointId, ageMonthToX, motivationToY
  } = logic;

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
        <line x1={cx} y1={cy + (above ? -POINT_RADIUS : POINT_RADIUS)} x2={cx} y2={lineEndY}
          stroke={color} strokeWidth={1} strokeDasharray="3 2" opacity={0.4} />
        <rect x={boxX} y={boxY} width={w} height={h} rx={4} fill="#fff" stroke={color} strokeWidth={1.8} />
        <text x={textX} y={boxY + paddingY / 2 + lineHeight - 3} textAnchor="middle" fontSize={10} fill="#1e293b" fontWeight={500}>
          {lines.map((line, i) => <tspan key={i} x={textX} dy={i === 0 ? 0 : lineHeight}>{line}</tspan>)}
        </text>
      </g>
    );
  };

  return (
    <>
      <div style={{ padding: "5px 16px 0", display: "flex", gap: 20, fontSize: 11, flexShrink: 0 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#16a34a" }}>
          ▲ <input value={upperLabel} onChange={e => logic.setUpperLabel(e.target.value)} style={{ border: "none", background: "transparent", fontSize: 11, outline: "none", color: "#16a34a", width: 240 }} placeholder="上側の説明" />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#dc2626" }}>
          ▼ <input value={lowerLabel} onChange={e => logic.setLowerLabel(e.target.value)} style={{ border: "none", background: "transparent", fontSize: 11, outline: "none", color: "#dc2626", width: 240 }} placeholder="下側の説明" />
        </label>
        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center", fontSize: 11 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ display: "inline-block", width: 14, height: 10, border: `2px solid ${EVENT_COLOR}`, borderRadius: 3, background: "#fff" }} />出来事</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ display: "inline-block", width: 14, height: 10, border: `2px solid ${DEEP_COLOR}`, borderRadius: 3, background: "#fff" }} />深掘り</span>
        </div>
      </div>

      <div ref={scrollContainerRef} style={{ flex: 1, padding: "6px 16px 12px", minHeight: 0, overflowX: "auto", overflowY: "hidden" }}>
        <svg ref={svgRef} viewBox={`0 0 ${svgWidth} ${SVG_HEIGHT}`} preserveAspectRatio="xMinYMid meet"
          style={{ width: Math.max(svgWidth, 900), minWidth: "100%", height: "100%", maxHeight: "100%", cursor: draggingPointId ? "grabbing" : "crosshair", background: "#fff", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "block" }}
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
                <line x1={plotLeft} y1={y} x2={plotRight} y2={y} stroke={v === 0 ? "#94a3b8" : "#e2e8f0"} strokeWidth={v === 0 ? 1.5 : 0.5} strokeDasharray={v === 0 ? "none" : "4 4"} />
                <text x={plotLeft - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">{v}%</text>
              </g>
            );
          })}

          <text x={14} y={(plotTop + plotBottom) / 2} textAnchor="middle" fontSize={11} fill="#64748b" transform={`rotate(-90, 14, ${(plotTop + plotBottom) / 2})`}>モチベーション</text>
          <text x={(plotLeft + plotRight) / 2} y={plotTop - 8} textAnchor="middle" fontSize={10} fill="#16a34a" fontWeight={500} opacity={0.7}>{upperLabel}</text>

          {xTicks.map((t, i) => (
            <g key={i}>
              <line x1={t.x} y1={plotBottom} x2={t.x} y2={plotBottom + (t.major ? 6 : 4)} stroke={t.major ? "#94a3b8" : "#cbd5e1"} strokeWidth={1} />
              {t.major && <line x1={t.x} y1={plotTop} x2={t.x} y2={plotBottom} stroke="#f1f5f9" strokeWidth={0.5} />}
              <text x={t.x} y={plotBottom + (t.major ? 22 : 18)} textAnchor="middle" fontSize={t.major ? 10 : 8} fill={t.major ? "#475569" : "#94a3b8"} fontWeight={t.major ? 600 : 400}>{t.label}</text>
              {(t.expandable || t.isExpanded) && (
                <g className="expand-btn" style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); toggleYearExpand(t.age); }}>
                  <rect x={t.x - 10} y={plotBottom + 26} width={20} height={16} fill="transparent" />
                  <text x={t.x} y={plotBottom + 38} textAnchor="middle" fontSize={8} fill={t.isExpanded ? "#3b82f6" : "#b0b8c4"} fontWeight={600}>{t.isExpanded ? "▲" : "▼"}</text>
                </g>
              )}
            </g>
          ))}

          <text x={(plotLeft + plotRight) / 2} y={plotBottom + 58} textAnchor="middle" fontSize={11} fill="#64748b">年齢</text>
          <text x={(plotLeft + plotRight) / 2} y={plotBottom + 74} textAnchor="middle" fontSize={10} fill="#dc2626" fontWeight={500} opacity={0.7}>{lowerLabel}</text>

          {pathD && <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}

          {sortedPoints.map((p) => {
            const cx = ageMonthToX(p.age, p.month);
            const cy = motivationToY(p.motivation);
            const isSelected = p.id === selectedPointId;
            const isHovered = p.id === hoveredPointId;
            const above = p.motivation >= 0;

            const eventBalloon = renderBalloon(p.event, cx, cy, EVENT_COLOR, above, 0);
            const eventH = p.event ? getBalloonDimensions(p.event).h + 8 : 0;
            const deepBalloon = showDeepDive ? renderBalloon(p.deepDive, cx, cy, DEEP_COLOR, above, eventH) : null;

            return (
              <g key={p.id}>
                {eventBalloon}
                {deepBalloon}
                <circle className="point-circle" cx={cx} cy={cy} r={isSelected ? HOVER_RADIUS : (isHovered ? HOVER_RADIUS - 1 : POINT_RADIUS)}
                  fill="#3b82f6" stroke="#fff" strokeWidth={2.5} style={{ cursor: "grab", transition: "r 0.15s ease" }}
                  onMouseDown={e => handlePointMouseDown(e, p.id)} onTouchStart={e => { e.stopPropagation(); handlePointMouseDown(e, p.id); }}
                  onMouseEnter={() => setHoveredPointId(p.id)} onMouseLeave={() => setHoveredPointId(null)}
                  onClick={e => { e.stopPropagation(); setSelectedPointId(p.id); }} />
                {isSelected && <circle cx={cx} cy={cy} r={HOVER_RADIUS + 4} fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 3" opacity={0.4} style={{ pointerEvents: "none" }} />}
              </g>
            );
          })}
        </svg>
      </div>
    </>
  );
}