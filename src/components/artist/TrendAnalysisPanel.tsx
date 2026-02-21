import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, TrendingDown, Minus, Sparkles, Loader2, 
  Users, Search, BarChart3, Target, RefreshCw 
} from "lucide-react";
import { toast } from "sonner";

interface TrendAnalysis {
  searchVolume: {
    monthly: number;
    trend: "up" | "stable" | "down";
    changePercent: number;
  };
  contentSaturation: {
    percentage: number;
    level: string;
  };
  audienceInterest: {
    grade: string;
    description: string;
  };
  demographics: {
    femaleRatio: number;
    topAgeGroups: { age: string; percentage: number }[];
  };
  keywords: string[];
  trendData: { year: string; value: number }[];
  summary: string;
}

interface TrendAnalysisPanelProps {
  artistName: string;
  stageName?: string | null;
}

export const TrendAnalysisPanel = ({ artistName, stageName }: TrendAnalysisPanelProps) => {
  const [analysis, setAnalysis] = useState<TrendAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-artist-trends", {
        body: { artistName, stageName }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setAnalysis(data.analysis);
      setLastUpdated(new Date().toLocaleString("ko-KR"));
      toast.success("트렌드 분석이 완료되었습니다!");
    } catch (e: any) {
      console.error("Analysis error:", e);
      toast.error(e.message || "분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case "down": return <TrendingDown className="w-4 h-4 text-rose-500" />;
      default: return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A": return "bg-emerald-500";
      case "B": return "bg-blue-500";
      case "C": return "bg-amber-500";
      default: return "bg-slate-400";
    }
  };

  if (!analysis) {
    return (
      <Card className="border-2 border-dashed border-slate-200 bg-slate-50/50">
        <CardContent className="p-8 text-center">
          <div className="inline-flex p-4 rounded-full bg-indigo-50 mb-4">
            <Sparkles className="w-8 h-8 text-indigo-500" />
          </div>
          <h3 className="font-bold text-slate-700 mb-2">AI 트렌드 분석</h3>
          <p className="text-sm text-slate-500 mb-4">
            Google Trends, 블랙키위 기반의 마켓 인사이트를 AI가 자동 분석합니다.
          </p>
          <Button onClick={runAnalysis} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 분석 중...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> 분석 시작</>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-800">Market Insight Dashboard</h3>
          <Badge variant="outline" className="text-[9px] bg-indigo-50 border-indigo-200 text-indigo-600">
            AI POWERED
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[10px] text-slate-400">업데이트: {lastUpdated}</span>
          )}
          <Button variant="ghost" size="sm" onClick={runAnalysis} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 메인 통계 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* 월간 검색량 */}
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Monthly Search</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-600">
                {analysis.searchVolume.monthly.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                {getTrendIcon(analysis.searchVolume.trend)}
                <span className={`text-xs font-bold ${
                  analysis.searchVolume.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}>
                  {analysis.searchVolume.changePercent >= 0 ? '+' : ''}{analysis.searchVolume.changePercent}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 콘텐츠 포화도 */}
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Content Saturation</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-600">
                {analysis.contentSaturation.percentage.toFixed(1)}%
              </span>
              <Badge variant="outline" className="text-[9px]">
                {analysis.contentSaturation.level}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 관심도 등급 */}
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Interest Grade</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-black text-white w-10 h-10 rounded-lg flex items-center justify-center ${getGradeColor(analysis.audienceInterest.grade)}`}>
                {analysis.audienceInterest.grade}
              </span>
              <span className="text-xs text-slate-500">{analysis.audienceInterest.description}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 트렌드 차트 + 인구통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 연도별 트렌드 */}
        <Card className="border-slate-200 bg-indigo-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-white/70" />
              <span className="text-[10px] font-bold text-white/70 uppercase">Yearly Trend</span>
            </div>
            <div className="flex items-end justify-between h-32 gap-2">
              {analysis.trendData.map((item, idx) => {
                const isMax = item.value === Math.max(...analysis.trendData.map(d => d.value));
                return (
                  <div key={idx} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-full rounded-t transition-all ${isMax ? 'bg-white' : 'bg-white/30'}`}
                      style={{ height: `${item.value}%` }}
                    />
                    <span className="text-[10px] mt-2 text-white/60">{item.year}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 성별/연령 분포 */}
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Demographics</span>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-16 h-16">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15" fill="none" stroke="#6366f1" strokeWidth="3"
                    strokeDasharray={`${analysis.demographics.femaleRatio} 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-black">{analysis.demographics.femaleRatio}%</span>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                <p className="font-bold text-indigo-600">여성 {analysis.demographics.femaleRatio}%</p>
                <p>남성 {100 - analysis.demographics.femaleRatio}%</p>
              </div>
            </div>
            <div className="space-y-2">
              {analysis.demographics.topAgeGroups.map((group, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 w-8">{group.age}</span>
                  <Progress value={group.percentage} className="h-2 flex-1" />
                  <span className="text-[10px] font-bold text-slate-600 w-8">{group.percentage}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 키워드 클라우드 */}
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">Related Keywords</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.keywords.map((keyword, idx) => (
              <Badge 
                key={idx} 
                variant="outline" 
                className={`text-xs ${idx < 3 ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'text-slate-600'}`}
              >
                {keyword}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI 요약 */}
      <Card className="border-indigo-200 bg-indigo-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-600">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-indigo-900 text-sm mb-1">AI 마케팅 전략 요약</h4>
              <p className="text-sm text-indigo-800 leading-relaxed">{analysis.summary}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
