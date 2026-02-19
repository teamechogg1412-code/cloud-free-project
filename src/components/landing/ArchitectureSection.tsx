import React, { useMemo, useRef, useLayoutEffect, useState } from "react";
import {
  Building2,
  Zap,
  Palette,
  Film,
  Tv,
  Target,
  Megaphone,
  ArrowDown,
  CreditCard,
  MessageSquare,
  RefreshCw,
} from "lucide-react";

/**
 * ✅ 전체 코드 (화살표 "보이게" 확실히 수정한 버전)
 * 핵심 수정:
 * 1) SVG를 flex 내부가 아니라, PR 영역을 감싸는 "relative overlay 래퍼"에 absolute로 올림 (z-index 정리)
 * 2) 자동 좌표 계산을 SVG 높이(overlayHeight) 기준으로 제대로 환산
 * 3) SVG viewBox 높이를 180으로 키워서 여유 확보 + stroke/opacity 조금 올려 가시성 강화
 */

export const ArchitectureSection = () => {
  const masterHubModules = [
    { title: "비주얼", icon: <Palette size={20} /> },
    { title: "작품", icon: <Film size={20} /> },
    { title: "광고", icon: <Tv size={20} /> },
    { title: "기획", icon: <Target size={20} /> },
    { title: "디지털", icon: <Megaphone size={20} /> },
  ];

  // refs
  const prWrapRef = useRef<HTMLDivElement | null>(null); // PR 영역(overlay 기준)
  const alphaRef = useRef<HTMLDivElement | null>(null);
  const betaRef = useRef<HTMLDivElement | null>(null);
  const agencyRef = useRef<HTMLDivElement | null>(null);
  const masterRef = useRef<HTMLDivElement | null>(null);

  // SVG overlay 설정
  const overlayTopPx = 92; // PR 카드 아래로 SVG를 얼마나 내릴지 (필요하면 80~110 사이로 미세조정)
  const overlayHeightPx = 180; // SVG overlay 실제 높이(px)
  const vbW = 1000;
  const vbH = 180;

  const [autoPoints, setAutoPoints] = useState<null | {
    a: { x: number; y: number };
    b: { x: number; y: number };
    c: { x: number; y: number };
    d: { x: number; y: number };
  }>(null);

  useLayoutEffect(() => {
    const wrapEl = prWrapRef.current;
    const aEl = alphaRef.current;
    const bEl = betaRef.current;
    const agencyEl = agencyRef.current;
    const masterEl = masterRef.current;

    if (!wrapEl || !aEl || !bEl || !agencyEl || !masterEl) return;

    const compute = () => {
      const wrap = wrapEl.getBoundingClientRect();
      const alpha = aEl.getBoundingClientRect();
      const beta = bEl.getBoundingClientRect();
      const agency = agencyEl.getBoundingClientRect();
      const master = masterEl.getBoundingClientRect();

      const svgW = wrap.width || 1;
      const svgH = overlayHeightPx;

      // 화면 좌표 -> overlay(SVG) 로컬 좌표(px)
      const toLocal = (x: number, y: number) => ({
        x: x - wrap.left,
        y: y - (wrap.top + overlayTopPx),
      });

      // 로컬(px) -> viewBox 좌표
      const toVB = (x: number, y: number) => ({
        x: (x / svgW) * vbW,
        y: (y / svgH) * vbH,
      });

      // 시작점: PR 카드 "하단 중앙"에서 살짝 아래
      const aLocal = toLocal(alpha.left + alpha.width / 2, alpha.bottom + 8);
      const bLocal = toLocal(beta.left + beta.width / 2, beta.bottom + 8);

      // 도착점: 아래 박스(배우기획사 / MasterHub) "상단 중앙"에서 살짝 위/아래
      const cLocal = toLocal(agency.left + agency.width / 2, agency.top - 6);
      const dLocal = toLocal(master.left + master.width / 2, master.top - 6);

      const A = toVB(aLocal.x, Math.max(6, aLocal.y));
      const B = toVB(bLocal.x, Math.max(6, bLocal.y));

      // 도착점 y를 overlay 하단 가까이로 클램프(화살표가 overlay 영역 밖으로 빠지지 않게)
      const C = toVB(cLocal.x, Math.min(vbH - 10, Math.max(40, cLocal.y)));
      const D = toVB(dLocal.x, Math.min(vbH - 10, Math.max(40, dLocal.y)));

      setAutoPoints({
        a: { x: A.x, y: A.y },
        b: { x: B.x, y: B.y },
        c: { x: C.x, y: C.y },
        d: { x: D.x, y: D.y },
      });
    };

    compute();
    const ro = new ResizeObserver(() => compute());
    ro.observe(wrapEl);

    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [overlayTopPx, overlayHeightPx]);

  // 고정 좌표(자동이 없을 때 fallback)
  const points = useMemo(() => {
    if (autoPoints) return autoPoints;
    return {
      a: { x: 360, y: 20 },
      b: { x: 640, y: 20 },
      c: { x: 500, y: 165 },
      d: { x: 760, y: 165 },
    };
  }, [autoPoints]);

  return (
    <section className="py-24 bg-[#F8FAFC] relative overflow-hidden font-sans">
      <div className="container px-4 mx-auto max-w-7xl relative">
        {/* 1) 상단: PR & 바이럴 */}
        <div className="flex flex-col items-center mb-10" ref={prWrapRef}>
          {/* ✅ overlay 기준이 되는 relative wrapper */}
          <div className="relative w-full flex justify-center">
            {/* ✅ PR 카드들 (z-10) */}
            <div className="flex justify-center gap-10 relative z-10">
              {[
                { type: "Alpha", ref: alphaRef },
                { type: "Beta", ref: betaRef },
              ].map(({ type, ref }) => (
                <div key={type} className="relative" ref={ref}>
                  <div className="bg-[#004d71] text-white px-12 py-6 rounded-[2.5rem] shadow-2xl text-center relative border-2 border-white/20 transition-transform hover:-translate-y-1">
                    <div className="text-[11px] font-black italic tracking-widest mb-1.5 opacity-60 uppercase">
                      COMMUNICATION HUB
                    </div>
                    <div className="text-xl font-bold italic tracking-tight">PR &amp; 바이럴 {type}</div>
                    <div className="absolute -top-3 -right-2 bg-emerald-500 rounded-full p-2 border-2 border-white shadow-lg">
                      <CreditCard size={14} className="text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ✅ 화살표 SVG: flex 밖 / overlay로 absolute (z-0) */}
            <svg
              className="hidden lg:block absolute left-0 top-[92px] w-full h-[180px] pointer-events-none z-0"
              viewBox={`0 0 ${vbW} ${vbH}`}
              preserveAspectRatio="none"
            >
              <defs>
                <marker id="arrowHead" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6" fill="#64748b" opacity="0.95" />
                </marker>
              </defs>

              {/* Alpha -> 배우 기획사 */}
              <path
                d={`M${points.a.x} ${points.a.y} C${points.a.x} 70, ${Math.round(
                  (points.a.x + points.c.x) / 2,
                )} 90, ${points.c.x} ${points.c.y}`}
                fill="none"
                stroke="#64748b"
                strokeWidth="2.5"
                strokeDasharray="6 8"
                opacity="0.75"
                markerEnd="url(#arrowHead)"
              />

              {/* Beta -> Master Hub */}
              <path
                d={`M${points.b.x} ${points.b.y} C${points.b.x} 70, ${Math.round(
                  (points.b.x + points.d.x) / 2,
                )} 90, ${points.d.x} ${points.d.y}`}
                fill="none"
                stroke="#64748b"
                strokeWidth="2.5"
                strokeDasharray="6 8"
                opacity="0.75"
                markerEnd="url(#arrowHead)"
              />

              {/* (선택) 양쪽 끝 은은한 점선 */}
              <path
                d="M140 20 L140 160"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="2"
                strokeDasharray="6 10"
                opacity="0.25"
                markerEnd="url(#arrowHead)"
              />
              <path
                d="M900 20 L900 160"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="2"
                strokeDasharray="6 10"
                opacity="0.25"
                markerEnd="url(#arrowHead)"
              />
            </svg>
          </div>

          <div className="mt-14 text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
            Collaborative Interface
          </div>
        </div>

        {/* 2) 메인 수평 레이어: ArkPort - 배우 기획사 - 마스터 허브 */}
        <div className="flex flex-col lg:flex-row items-stretch justify-center gap-8 relative">
          {/* ArkPort OS */}
          <div className="lg:w-1/4 bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-lg flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-xl shadow-blue-100 font-bold text-white italic text-2xl">
              B
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4 italic uppercase leading-none">ArkPort OS</h3>
            <div className="space-y-3 w-full mt-4">
              {["정산/결제 자동화", "세무 리스크 방어", "법무 계약 검토"].map((t) => (
                <div
                  key={t}
                  className="py-3 bg-slate-50 rounded-2xl text-[12px] font-bold text-slate-500 border border-slate-100 uppercase tracking-tighter"
                >
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* 중앙: 배우 기획사 */}
          <div className="lg:w-2/5 flex flex-col items-center justify-center px-4" ref={agencyRef}>
            <div className="relative group w-full text-center">
              <div className="bg-white border-[10px] border-slate-900 rounded-[5rem] p-16 shadow-[30px_30px_0px_0px_rgba(15,23,42,0.05)] transition-all">
                <div className="w-24 h-24 bg-slate-900 rounded-[3rem] flex items-center justify-center mx-auto mb-8 shadow-2xl">
                  <Building2 className="text-white" size={48} />
                </div>
                <h3 className="text-5xl font-black text-slate-900 tracking-tighter uppercase mb-6 leading-none italic">
                  배우 기획사
                </h3>
                <div className="flex flex-col gap-3 max-w-xs mx-auto">
                  <div className="inline-flex items-center justify-center gap-3 px-6 py-3 bg-blue-50 rounded-2xl text-[13px] font-bold text-blue-600 border border-blue-100 uppercase tracking-tight">
                    <CreditCard size={14} /> 예산 집행 및 직접 결제
                  </div>
                  <div className="inline-flex items-center justify-center gap-3 px-6 py-3 bg-slate-50 rounded-2xl text-[13px] font-bold text-slate-400 uppercase tracking-tight">
                    <MessageSquare size={14} /> 최종 전략 의사결정
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 우측: 마스터 허브 */}
          <div className="lg:w-2/5 flex flex-col gap-4" ref={masterRef}>
            <div className="bg-white border-[6px] border-slate-900 rounded-[3.5rem] p-10 shadow-2xl relative flex-1 flex flex-col justify-center transition-all">
              <div className="absolute -top-5 left-12 bg-slate-900 text-white px-8 py-2 rounded-full font-black text-[12px] uppercase tracking-[0.2em] italic shadow-lg">
                Master Hub
              </div>

              <div className="mb-8 text-center">
                <h4 className="text-2xl font-bold text-slate-900 italic tracking-tighter leading-none mb-2 uppercase">
                  Casting Agency X
                </h4>
                <p className="text-[12px] font-bold text-orange-600 uppercase tracking-[0.3em]">
                  Creative Business Engine
                </p>
              </div>

              <div className="grid grid-cols-5 gap-3 mb-8 border-b-2 border-slate-100 pb-8">
                {masterHubModules.map((m) => (
                  <div key={m.title} className="flex flex-col items-center gap-2 group cursor-pointer">
                    <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-[1.25rem] flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                      {m.icon}
                    </div>
                    <span className="text-[11px] font-bold text-slate-800 leading-none uppercase tracking-tighter">
                      {m.title}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2 px-2">
                  <ArrowDown className="text-orange-400 animate-bounce" size={16} />
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] italic">
                    Direct Managed Partners
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 text-white p-5 rounded-[1.75rem] flex items-center justify-between group cursor-pointer hover:bg-orange-600 transition-colors shadow-lg border border-slate-800">
                    <span className="text-[13px] font-bold italic tracking-tighter">트랜드 이슈폴리시</span>
                    <Zap size={12} className="text-orange-400 fill-orange-400" />
                  </div>

                  <div className="bg-white border-2 border-slate-200 p-5 rounded-[1.75rem] text-center shadow-md hover:border-orange-500 transition-colors cursor-pointer">
                    <span className="text-[13px] font-bold text-slate-600 italic tracking-tighter">콜리플라워</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3) 하단 데이터 싱크 라인 */}
        <div className="mt-12 flex justify-center w-full">
          <div className="flex items-center gap-4 bg-white/95 px-8 py-3 rounded-full border-2 border-slate-100 shadow-xl pointer-events-auto backdrop-blur-sm">
            <RefreshCw size={14} className="text-blue-500 animate-spin" style={{ animationDuration: "8s" }} />
            <span className="text-[12px] font-bold text-slate-500 uppercase italic tracking-[0.1em]">
              Data Sync &amp; Contract Review
            </span>
            <div className="w-48 h-1.5 bg-gradient-to-r from-blue-500 to-orange-500 mx-2 opacity-20 rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
};
