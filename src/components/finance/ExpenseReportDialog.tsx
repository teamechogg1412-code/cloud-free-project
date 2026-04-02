import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Download } from "lucide-react";
import { format } from "date-fns";

interface Transaction {
  id: string;
  transaction_date: string;
  merchant_name: string | null;
  amount: number;
  category: string | null;
  memo: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: Transaction[];
  cardNumber: string;
  cardCompany: string;
  holderName: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" }).format(amount);

export const ExpenseReportDialog = ({ open, onOpenChange, transactions, cardNumber, cardCompany, holderName }: Props) => {
  const printRef = useRef<HTMLDivElement>(null);
  const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>법인카드 청구서</title>
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; padding: 40px; color: #1a1a1a; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #d1d5db; padding: 8px 12px; font-size: 13px; }
        th { background: #f1f5f9; font-weight: 700; }
        .text-right { text-align: right; }
        .header { margin-bottom: 24px; }
        .header h1 { font-size: 22px; margin-bottom: 8px; }
        .meta { font-size: 13px; color: #64748b; }
        .total-row td { font-weight: 700; background: #f8fafc; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; }
        .sign-area { margin-top: 60px; display: flex; justify-content: flex-end; gap: 60px; }
        .sign-box { text-align: center; }
        .sign-line { width: 120px; border-bottom: 1px solid #333; margin-bottom: 8px; height: 40px; }
        .sign-label { font-size: 12px; color: #64748b; }
      </style></head><body>
      ${content.innerHTML}
      <div class="sign-area">
        <div class="sign-box"><div class="sign-line"></div><div class="sign-label">신청자</div></div>
        <div class="sign-box"><div class="sign-line"></div><div class="sign-label">승인자</div></div>
      </div>
      <div class="footer">본 청구서는 전자적으로 생성되었습니다.</div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const maskCardNumber = (num: string) => {
    if (num.length < 8) return num;
    return num.slice(0, 4) + "-****-****-" + num.slice(-4);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>법인카드 청구서 미리보기</DialogTitle>
        </DialogHeader>

        <div ref={printRef}>
          <div className="header">
            <h1>법인카드 사용 청구서</h1>
            <div className="meta">
              <p>작성일: {format(new Date(), "yyyy년 MM월 dd일")}</p>
              <p>카드: {cardCompany} {maskCardNumber(cardNumber)}</p>
              <p>사용자: {holderName}</p>
              <p>대상 건수: {transactions.length}건</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style={{ width: "40px" }}>No.</th>
                <th style={{ width: "110px" }}>승인일시</th>
                <th>사용처</th>
                <th>카테고리</th>
                <th>용도</th>
                <th className="text-right" style={{ width: "120px" }}>금액</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, i) => (
                <tr key={tx.id}>
                  <td style={{ textAlign: "center" }}>{i + 1}</td>
                  <td>{format(new Date(tx.transaction_date), "MM.dd HH:mm")}</td>
                  <td>{tx.merchant_name || "-"}</td>
                  <td>{tx.category || "일반"}</td>
                  <td>{tx.memo || "-"}</td>
                  <td className="text-right">{formatCurrency(tx.amount)}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td colSpan={5} style={{ textAlign: "right" }}>합계</td>
                <td className="text-right">{formatCurrency(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>닫기</Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" /> 인쇄 / PDF 저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
