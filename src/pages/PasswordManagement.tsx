import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KeyRound, Eye, EyeOff, Search, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface SharedCredential {
  id: string;
  service_name: string;
  login_id: string;
  login_password: string;
  domain_url: string | null;
  category: string;
  notes: string | null;
}

const PasswordManagement = () => {
  const { user, currentTenant } = useAuth();
  const [credentials, setCredentials] = useState<SharedCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const tenantId = currentTenant?.tenant_id;

  useEffect(() => {
    if (!tenantId || !user) return;
    fetchCredentials();
  }, [tenantId, user]);

  const fetchCredentials = async () => {
    if (!tenantId) return;
    setLoading(true);
    // The RLS policy will automatically filter to only credentials the user has access to
    const { data, error } = await (supabase as any)
      .from("shared_credentials")
      .select("id, service_name, login_id, login_password, domain_url, category, notes")
      .eq("tenant_id", tenantId)
      .order("category")
      .order("service_name");

    if (error) {
      toast.error("데이터를 불러오지 못했습니다.");
    } else {
      setCredentials(data || []);
    }
    setLoading(false);
  };

  const togglePassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label}이(가) 복사되었습니다.`);
  };

  const categories = ["all", ...Array.from(new Set(credentials.map(c => c.category)))];

  const filtered = credentials.filter(c => {
    const matchCategory = selectedCategory === "all" || c.category === selectedCategory;
    const matchSearch = !search || c.service_name.toLowerCase().includes(search.toLowerCase()) || c.login_id.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="pb-16 px-6 max-w-5xl mx-auto py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-primary font-bold mb-1">
          <KeyRound className="w-5 h-5" /> 공용
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">비밀번호 관리</h1>
        <p className="text-slate-500 mt-1">팀에서 공유하는 계정 정보를 확인할 수 있습니다.</p>
      </div>

      {/* 필터 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="서비스명 또는 아이디 검색..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === "all" ? "전체" : cat}
            </Badge>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-center text-slate-400 py-12">로딩 중...</p>
      ) : filtered.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-12 text-center text-slate-400">
            {credentials.length === 0 ? "접근 가능한 공유 계정이 없습니다." : "검색 결과가 없습니다."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map(cred => (
            <Card key={cred.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">{cred.category}</Badge>
                      <h3 className="font-bold text-lg text-slate-800">{cred.service_name}</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <div>
                        <span className="text-xs text-slate-400 block mb-1">아이디</span>
                        <div className="flex items-center gap-2">
                          <code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono">{cred.login_id}</code>
                          <button onClick={() => copyToClipboard(cred.login_id, "아이디")} className="text-slate-400 hover:text-primary">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block mb-1">비밀번호</span>
                        <div className="flex items-center gap-2">
                          <code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono">
                            {showPasswords[cred.id] ? cred.login_password : "••••••••"}
                          </code>
                          <button onClick={() => togglePassword(cred.id)} className="text-slate-400 hover:text-slate-600">
                            {showPasswords[cred.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => copyToClipboard(cred.login_password, "비밀번호")} className="text-slate-400 hover:text-primary">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {cred.domain_url && (
                      <div className="mt-3">
                        <span className="text-xs text-slate-400 block mb-1">도메인</span>
                        <a href={cred.domain_url} target="_blank" rel="noreferrer" className="text-primary text-sm underline flex items-center gap-1">
                          {cred.domain_url} <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {cred.notes && (
                      <p className="text-sm text-slate-500 mt-3 bg-slate-50 p-2 rounded">{cred.notes}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PasswordManagement;
