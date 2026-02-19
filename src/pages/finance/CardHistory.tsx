import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  CreditCard, ArrowLeft, RefreshCw, FileCheck2, 
  Receipt, ShoppingBag, Utensils, Car, MoreHorizontal 
} from "lucide-react";
import { toast } from "sonner";

const CardHistory = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);

  const mockCards = [
    { id: 1, date: "2024-02-17 12:30", merchant: "쿠팡(Coupang)", category: "소모품", amount: 45000, card: "신한 1234", status: "pending" },
    { id: 2, date: "2024-02-17 13:00", merchant: "본가정육식당", category: "식대", amount: 88000, card: "신한 1234", status: "approved" },
    { id: 3, date: "2024-02-16 18:45", merchant: "카카오택시", category: "교통비", amount: 12400, card: "국민 5678", status: "pending" },
  ];

  useEffect(() => {
    setTimeout(() => {
      setHistory(mockCards);
      setLoading(false);
    }, 800);
  }, []);

  const getStatusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-emerald-500">정산완료</Badge>;
    return <Badge variant="outline" className="text-rose-500 border-rose-200 bg-rose-50">미정산</Badge>;
  };

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">법인카드 사용내역</h1>
            <p className="text-sm text-slate-500 font-medium">실시간 카드 승인 내역을 확인하고 지출 결의를 진행합니다.</p>
          </div>
        </div>
        <Button onClick={() => setLoading(true)} variant="outline" className="gap-2">
          <RefreshCw className={loading ? "animate-spin w-4 h-4" : "w-4 h-4"} /> 내역 가져오기
        </Button>
      </div>

      {/* 대시보드 위젯 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-blue-600 text-white">
          <CardContent className="p-6">
            <p className="text-xs font-bold opacity-70 uppercase">이번 달 총 사용액</p>
            <p className="text-2xl font-black mt-1">4,250,000원</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-slate-400 uppercase">미정산 내역</p>
            <p className="text-2xl font-black text-rose-500 mt-1">12건</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-slate-400 uppercase">가장 많이 쓴 카테고리</p>
            <p className="text-xl font-black text-slate-800 mt-1 flex items-center gap-2"><Utensils size={18}/> 식대</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-slate-400 uppercase">사용 인원</p>
            <p className="text-2xl font-black text-slate-800 mt-1">8명</p>
          </CardContent>
        </Card>
      </div>

      {/* 내역 리스트 */}
      <Card className="border-none shadow-lg bg-white rounded-2xl overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>승인일시</TableHead>
              <TableHead>가맹점명</TableHead>
              <TableHead>사용카드</TableHead>
              <TableHead>금액</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="h-40 text-center">데이터 로딩 중...</TableCell></TableRow>
            ) : (
              history.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="text-xs font-mono text-slate-500">{h.date}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">{h.merchant}</span>
                      <span className="text-[10px] text-blue-500 font-bold uppercase">{h.category}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{h.card}</TableCell>
                  <TableCell className="font-black text-slate-900">{h.amount.toLocaleString()}원</TableCell>
                  <TableCell>{getStatusBadge(h.status)}</TableCell>
                  <TableCell className="text-right">
                    {h.status === "pending" ? (
                      <Button size="sm" className="bg-blue-600 gap-1.5 h-8 text-xs font-bold">
                        <FileCheck2 size={14} /> 결의서 작성
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-400">
                        상세보기
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default CardHistory;