import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendAnalysisPanel } from "@/components/artist/TrendAnalysisPanel";
import { toast } from "sonner";
import {
  ArrowLeft, Download, Share2, Printer, User, Calendar, Building2,
  Instagram, Youtube, Globe, TrendingUp, FileText, ImageIcon, Loader2
} from "lucide-react";

interface Artist {
  id: string;
  name: string;
  stage_name: string | null;
  birth_date: string | null;
  gender: string | null;
  bio: string | null;
  agency: string | null;
  debut_date: string | null;
  profile_image_url: string | null;
  social_links: any;
  is_active: boolean | null;
}

const ArtistPortfolio = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchArtist = async () => {
      if (!id) return;
      setLoading(true);
      
      const { data, error } = await supabase
        .from("artists")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) {
        toast.error("아티스트 정보를 불러올 수 없습니다.");
        navigate("/profiles");
        return;
      }
      
      setArtist(data);
      setLoading(false);
    };

    fetchArtist();
  }, [id, navigate]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!artist) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="pt-24 pb-16 px-6 max-w-7xl mx-auto">
        {/* 상단 네비게이션 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/profiles")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-black text-slate-900">
                {artist.stage_name || artist.name}
              </h1>
              <p className="text-slate-500 text-sm">마케팅 포트폴리오</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" /> 인쇄
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" /> PDF
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" /> 공유
            </Button>
          </div>
        </div>

        <div ref={printRef}>
          {/* 프로필 헤더 */}
          <Card className="mb-6 border-none shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 p-8">
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                {/* 프로필 이미지 */}
                <div className="w-48 h-64 bg-white/10 rounded-xl overflow-hidden shadow-2xl border-4 border-white/30">
                  {artist.profile_image_url ? (
                    <img 
                      src={artist.profile_image_url} 
                      alt={artist.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-16 h-16 text-white/40" />
                    </div>
                  )}
                </div>

                {/* 기본 정보 */}
                <div className="flex-1 text-white text-center md:text-left">
                  <Badge className="mb-3 bg-white/20 border-white/30 text-white">
                    {artist.is_active ? "ACTIVE" : "INACTIVE"}
                  </Badge>
                  <h2 className="text-4xl font-black mb-2">{artist.name}</h2>
                  {artist.stage_name && (
                    <p className="text-xl text-white/80 mb-4">{artist.stage_name}</p>
                  )}
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    {artist.birth_date && (
                      <div className="bg-white/10 rounded-lg p-3">
                        <Calendar className="w-4 h-4 text-white/60 mb-1" />
                        <p className="text-xs text-white/60">생년월일</p>
                        <p className="font-bold">{artist.birth_date}</p>
                      </div>
                    )}
                    {artist.agency && (
                      <div className="bg-white/10 rounded-lg p-3">
                        <Building2 className="w-4 h-4 text-white/60 mb-1" />
                        <p className="text-xs text-white/60">소속사</p>
                        <p className="font-bold">{artist.agency}</p>
                      </div>
                    )}
                    {artist.debut_date && (
                      <div className="bg-white/10 rounded-lg p-3">
                        <TrendingUp className="w-4 h-4 text-white/60 mb-1" />
                        <p className="text-xs text-white/60">데뷔일</p>
                        <p className="font-bold">{artist.debut_date}</p>
                      </div>
                    )}
                    <div className="bg-white/10 rounded-lg p-3">
                      <User className="w-4 h-4 text-white/60 mb-1" />
                      <p className="text-xs text-white/60">성별</p>
                      <p className="font-bold">{artist.gender === 'male' ? '남성' : '여성'}</p>
                    </div>
                  </div>

                  {/* 소셜 링크 */}
                  <div className="flex gap-3 mt-6 justify-center md:justify-start">
                    <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 border-none">
                      <Instagram className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 border-none">
                      <Youtube className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 border-none">
                      <Globe className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* 탭 콘텐츠 */}
          <Tabs defaultValue="insight" className="space-y-6">
            <TabsList className="bg-white shadow-sm border">
              <TabsTrigger value="insight" className="gap-2">
                <TrendingUp className="w-4 h-4" /> 마켓 인사이트
              </TabsTrigger>
              <TabsTrigger value="bio" className="gap-2">
                <FileText className="w-4 h-4" /> 프로필 상세
              </TabsTrigger>
              <TabsTrigger value="gallery" className="gap-2">
                <ImageIcon className="w-4 h-4" /> 갤러리
              </TabsTrigger>
            </TabsList>

            <TabsContent value="insight">
              <TrendAnalysisPanel 
                artistName={artist.name} 
                stageName={artist.stage_name} 
              />
            </TabsContent>

            <TabsContent value="bio">
              <Card className="border-none shadow-lg">
                <CardContent className="p-8">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    아티스트 소개
                  </h3>
                  <div className="prose prose-slate max-w-none">
                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {artist.bio || "등록된 소개가 없습니다."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="gallery">
              <Card className="border-none shadow-lg">
                <CardContent className="p-8 text-center">
                  <div className="inline-flex p-6 rounded-full bg-slate-100 mb-4">
                    <ImageIcon className="w-12 h-12 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">갤러리 준비 중</h3>
                  <p className="text-slate-500">화보, 포스터 등 비주얼 자료가 곧 추가됩니다.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default ArtistPortfolio;
