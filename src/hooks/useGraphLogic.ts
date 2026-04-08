import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Point, ViewMode, LineStyle } from "../types";
import {
  DEFAULT_START_AGE, DEFAULT_END_AGE, GRAPH_PADDING,
  MIN_SEGMENT_WIDTH, SVG_HEIGHT
} from "../constants/config";

const STORAGE_KEY = "motivation_graph_data";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ローカルストレージからのデータ読み込みとパース処理を統合
function loadSavedData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // SetオブジェクトはJSON化で失われるため，配列から復元する
      return {
        ...parsed,
        expandedYears: new Set(parsed.expandedYears || [])
      };
    }
  } catch (e) {
    console.error("データの復元に失敗しました", e);
  }
  return null;
}

export function useGraphLogic() {
  // 初回レンダリング時のみデータを読み込む（遅延初期化）
  const [initialData] = useState(() => loadSavedData());

  // 取得した初期データがあればそれを利用し，なければデフォルト値を適用する
  const [points, setPoints] = useState<Point[]>(initialData?.points || []);
  const [startAge, setStartAge] = useState<number>(initialData?.startAge ?? DEFAULT_START_AGE);
  const [endAge, setEndAge] = useState<number>(initialData?.endAge ?? DEFAULT_END_AGE);
  const [title, setTitle] = useState<string>(initialData?.title ?? "モチベーショングラフ");
  const [upperLabel, setUpperLabel] = useState<string>(initialData?.upperLabel ?? "上：モチベーションが高かった時");
  const [lowerLabel, setLowerLabel] = useState<string>(initialData?.lowerLabel ?? "下：モチベーションが低かった時");
  const [lineStyle, setLineStyle] = useState<LineStyle>(initialData?.lineStyle ?? "curve");
  const [viewMode, setViewMode] = useState<ViewMode>(initialData?.viewMode ?? "year");
  const [expandedYears, setExpandedYears] = useState<Set<number>>(initialData?.expandedYears || new Set());
  const [showDeepDive, setShowDeepDive] = useState<boolean>(initialData?.showDeepDive ?? true);

  // 一時的なUI状態（これらは保存の対象外とする）
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);

  // 状態の変更を監視し，ローカルストレージへの保存処理を一つに統合
  useEffect(() => {
    try {
      const dataToSave = {
        points,
        startAge,
        endAge,
        title,
        upperLabel,
        lowerLabel,
        lineStyle,
        viewMode,
        expandedYears: Array.from(expandedYears), // Setは直接JSON化できないため配列に変換
        showDeepDive
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.error("データの保存に失敗しました", e);
    }
  }, [points, startAge, endAge, title, upperLabel, lowerLabel, lineStyle, viewMode, expandedYears, showDeepDive]);

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
    const newPoint: Point = { id: generateId(), age, month, motivation: 0, event: "", deepDive: "" };
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
    const pts = sortedPoints.map(p => ({ x: ageMonthToX(p.age, p.month), y: motivationToY(p.motivation) }));
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

  const exportData = useCallback(() => {
    const dataToSave = {
      points, startAge, endAge, title, upperLabel, lowerLabel, lineStyle, viewMode,
      expandedYears: Array.from(expandedYears), showDeepDive
    };
    const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "motivation-graph"}_data.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [points, startAge, endAge, title, upperLabel, lowerLabel, lineStyle, viewMode, expandedYears, showDeepDive]);

  const importData = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.points) setPoints(parsed.points);
        if (parsed.startAge !== undefined) setStartAge(parsed.startAge);
        if (parsed.endAge !== undefined) setEndAge(parsed.endAge);
        if (parsed.title !== undefined) setTitle(parsed.title);
        if (parsed.upperLabel !== undefined) setUpperLabel(parsed.upperLabel);
        if (parsed.lowerLabel !== undefined) setLowerLabel(parsed.lowerLabel);
        if (parsed.lineStyle !== undefined) setLineStyle(parsed.lineStyle);
        if (parsed.viewMode !== undefined) setViewMode(parsed.viewMode);
        if (parsed.expandedYears) setExpandedYears(new Set(parsed.expandedYears));
        if (parsed.showDeepDive !== undefined) setShowDeepDive(parsed.showDeepDive);
      } catch (err) {
        console.error("ファイルの読み込みに失敗しました", err);
        alert("無効なデータファイルです．");
      }
    };
    reader.readAsText(file);
    // 同じファイルを再度選択できるよう，inputの値をリセット
    event.target.value = '';
  }, []);

  return {
    points, selectedPoint, selectedPointId, hoveredPointId, draggingPointId,
    startAge, endAge, title, upperLabel, lowerLabel, lineStyle, viewMode, expandedYears, showDeepDive,
    svgRef, scrollContainerRef, svgWidth, plotLeft, plotRight, plotWidth, plotTop, plotBottom, plotHeight,
    xTicks, pathD, sortedPoints,
    setStartAge, setEndAge, setTitle, setUpperLabel, setLowerLabel, setLineStyle, setViewMode, setExpandedYears, setShowDeepDive,
    setHoveredPointId, setSelectedPointId,
    handleSvgClick, handlePointMouseDown, toggleYearExpand, updatePoint, deletePoint, exportPNG, displayMonth, ageMonthToX, motivationToY,
    exportData, importData
  };
}

export type GraphLogic = ReturnType<typeof useGraphLogic>;