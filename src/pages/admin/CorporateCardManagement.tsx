import { useState, useEffect } from "react";
import { Header } from "@/components/landing/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Search,
  Plane,
  ImagePlus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

interface CorporateCard {
  id: string;
  card_number: string;
  card_name: string | null;
  card_company: string | null;
  card_type: string | null;
  card_holder_name: string | null;
  holder_user_id: string | null;
  monthly_limit: number | null;
  is_active: boolean;
  is_skypass: boolean | null;
  cvc: string | null;
  card_image_url: string | null;
  expiry_date: string | null;
  created_at: string;
}

interface TenantMember {
  user_id: string;
  profile: { full_name: string | null; email: string } | null;
}

const CARD_TYPES = ["일반", "하이패스", "클린카드"] as const;

const CorporateCardManagement = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();

  const [cards, setCards] = useState<CorporateCard[]>([]);
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CorporateCard | null>(null);
  const [form, setForm] = useState({
    card_number: "",
    card_name: "",
    card_company: "",
    card_type: "일반",
    card_holder_name: "",
    holder_user_id: "",
    monthly_limit: "",
    expiry_date: "",
    is_active: true,
    is_skypass: false,
    cvc: "",
    card_image_url: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CorporateCard | null>(null);

  useEffect(() => {
    if (currentTenant) {
      fetchData();
      fetchMembers();
    }
  }, [currentTenant]);

  const fetchData = async () => {
    if (!currentTenant) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("corporate_cards")
      .select("*")
      .eq("tenant_id", currentTenant.tenant_id)
      .order("created_at", { ascending: false });
    if (error) toast.error("데이터 로드 실패");
    else setCards((data as CorporateCard[]) || []);
    setLoading(false);
  };

  const fetchMembers = async () => {
    if (!currentTenant) return;
    const { data } = await supabase
      .from("tenant_memberships")
      .select("user_id, profiles:user_id(full_name, email)")
      .eq("tenant_id", currentTenant.tenant_id);
    if (data) {
      setMembers(
        data.map((d: any) => ({
          user_id: d.user_id,
          profile: d.profiles,
        }))
      );
    }
  };

  const openDialog = (card?: CorporateCard) => {
    if (card) {
      setEditing(card);
      setForm({
        card_number: card.card_number,
        card_name: card.card_name || "",
        card_company: card.card_company || "",
        card_type: card.card_type || "일반",
        card_holder_name: card.card_holder_name || "",
        holder_user_id: card.holder_user_id || "",
        monthly_limit: card.monthly_limit?.toString() || "",
        expiry_date: card.expiry_date || "",
        is_active: card.is_active,
        is_skypass: card.is_skypass || false,
        cvc: card.cvc || "",
        card_image_url: card.card_image_url || "",
      });
    } else {
      setEditing(null);
      setForm({
        card_number: "",
        card_name: "",
        card_company: "",
        card_type: "일반",
        card_holder_name: "",
        holder_user_id: "",
        monthly_limit: "",
        expiry_date: "",
        is_active: true,
        is_skypass: false,
        cvc: "",
        card_image_url: "",
      });
    }
    setImageFile(null);
    setDialogOpen(true);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !currentTenant) return form.card_image_url || null;
    setUploading(true);
    const ext = imageFile.name.split(".").pop();
    const path = `${currentTenant.tenant_id}/cards/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("artist-assets")
      .upload(path, imageFile, { upsert: true });
    setUploading(false);
    if (error) {
      toast.error("이미지 업로드 실패");
      return form.card_image_url || null;
    }
    const { data: signedData, error: signedError } = await supabase.storage
      .from("artist-assets")
      .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year for card images
    if (signedError) {
      toast.error("URL 생성 실패");
      return form.card_image_url || null;
    }
    return signedData.signedUrl;
  };

  const saveCard = async () => {
    if (!currentTenant || !form.card_number.trim()) return;

    const imageUrl = await uploadImage();

    const payload: any = {
      tenant_id: currentTenant.tenant_id,
      card_number: form.card_number.trim(),
      card_name: form.card_name.trim() || null,
      card_company: form.card_company.trim() || null,
      card_type: form.card_type,
      card_holder_name: form.card_holder_name.trim() || null,
      holder_user_id: form.holder_user_id || null,
      monthly_limit: form.monthly_limit ? parseFloat(form.monthly_limit) : null,
      expiry_date: form.expiry_date || null,
      is_active: form.is_active,
      is_skypass: form.is_skypass,
      cvc: form.cvc.trim() || null,
      card_image_url: imageUrl,
    };

    if (editing) {
      const { error } = await supabase
        .from("corporate_cards")
        .update(payload)
        .eq("id", editing.id);
      if (error) toast.error("수정 실패: " + error.message);
      else toast.success("카드 정보가 수정되었습니다");
    } else {
      const { error } = await supabase.from("corporate_cards").insert(payload);
      if (error) toast.error("등록 실패: " + error.message);
      else toast.success("카드가 등록되었습니다");
    }

    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("corporate_cards")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) toast.error("삭제 실패: " + error.message);
    else toast.success("카드가 삭제되었습니다");
    setDeleteTarget(null);
    fetchData();
  };

  const maskCardNumber = (num: string) => {
    if (num.length < 8) return num;
    return num.slice(0, 4) + "-****-****-" + num.slice(-4);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("ko-KR").format(amount) + "원";

  const getMemberName = (userId: string | null) => {
    if (!userId) return null;
    const m = members.find((m) => m.user_id === userId);
    return m?.profile?.full_name || m?.profile?.email || null;
  };

  const getCardTypeColor = (type: string | null) => {
    switch (type) {
      case "하이패스":
        return "bg-gradient-to-br from-blue-500 to-indigo-600";
      case "클린카드":
        return "bg-gradient-to-br from-emerald-500 to-teal-600";
      default:
        return "bg-gradient-to-br from-orange-500 to-amber-600";
    }
  };

  const filteredCards = cards.filter(
    (c) =>
      c.card_number.includes(searchQuery) ||
      c.card_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.card_company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.card_holder_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="pt-28 pb-16 px-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-orange-600" /> 법인카드 관리
            </h1>
            <p className="text-slate-500 mt-1">
              {currentTenant?.tenant.name || "회사"} 법인카드 마스터 데이터 관리
            </p>
          </div>
          <Button onClick={() => openDialog()} className="gap-2">
            <Plus className="w-4 h-4" /> 카드 추가
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="카드번호, 카드명, 카드사, 명의자 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Card Grid */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">로딩 중...</div>
        ) : filteredCards.length === 0 ? (
          <Card className="border-none shadow-xl bg-white rounded-3xl">
            <CardContent className="py-12 text-center text-slate-400">
              {searchQuery ? "검색 결과가 없습니다" : "등록된 카드가 없습니다"}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCards.map((card) => (
              <Card
                key={card.id}
                className={`border-none shadow-lg rounded-2xl overflow-hidden group relative ${
                  card.is_active
                    ? getCardTypeColor(card.card_type)
                    : "bg-gradient-to-br from-slate-400 to-slate-500"
                }`}
              >
                <CardContent className="p-6 text-white">
                  {/* Actions */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                      onClick={() => openDialog(card)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                      onClick={() => setDeleteTarget(card)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Top: Company + Badges */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-white/80 text-sm font-medium">
                      {card.card_company || "카드사 미지정"}
                    </span>
                    <div className="flex gap-1.5">
                      {card.card_type && card.card_type !== "일반" && (
                        <Badge
                          variant="secondary"
                          className="bg-white/20 text-white text-xs"
                        >
                          {card.card_type}
                        </Badge>
                      )}
                      {card.is_skypass && (
                        <Badge
                          variant="secondary"
                          className="bg-white/20 text-white text-xs gap-1"
                        >
                          <Plane className="w-3 h-3" /> SKY
                        </Badge>
                      )}
                      {!card.is_active && (
                        <Badge
                          variant="secondary"
                          className="bg-white/20 text-white text-xs"
                        >
                          비활성
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Card Image (if exists) */}
                  {card.card_image_url && (
                    <div className="mb-4 rounded-lg overflow-hidden bg-white/10">
                      <img
                        src={card.card_image_url}
                        alt="카드 이미지"
                        className="w-full h-24 object-contain"
                      />
                    </div>
                  )}

                  {/* Card Number */}
                  <div className="mb-4">
                    <p className="font-mono text-xl tracking-widest">
                      {maskCardNumber(card.card_number)}
                    </p>
                  </div>

                  {/* Card Info */}
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <p className="text-white/60 text-xs mb-1">카드명</p>
                      <p className="font-medium text-sm">
                        {card.card_name || "-"}
                      </p>
                    </div>
                    {card.expiry_date && (
                      <div className="text-right">
                        <p className="text-white/60 text-xs mb-1">유효기간</p>
                        <p className="font-medium text-sm">
                          {format(new Date(card.expiry_date), "MM/yy")}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Holder Info */}
                  <div className="flex items-end justify-between">
                    {card.card_holder_name && (
                      <div>
                        <p className="text-white/60 text-xs mb-1">명의자</p>
                        <p className="font-medium text-sm">
                          {card.card_holder_name}
                        </p>
                      </div>
                    )}
                    {card.holder_user_id && (
                      <div className="text-right">
                        <p className="text-white/60 text-xs mb-1">사용자</p>
                        <p className="font-medium text-sm">
                          {getMemberName(card.holder_user_id) || "-"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Monthly Limit */}
                  {card.monthly_limit && (
                    <div className="mt-4 pt-3 border-t border-white/20">
                      <p className="text-white/60 text-xs">월 한도</p>
                      <p className="font-bold text-lg">
                        {formatCurrency(card.monthly_limit)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "카드 정보 수정" : "법인카드 추가"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Card Number + CVC */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>카드번호 *</Label>
                <Input
                  value={form.card_number}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      card_number: e.target.value.replace(/\D/g, ""),
                    }))
                  }
                  placeholder="숫자만 입력 (16자리)"
                  maxLength={16}
                />
              </div>
              <div className="space-y-2">
                <Label>CVC</Label>
                <Input
                  value={form.cvc}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      cvc: e.target.value.replace(/\D/g, ""),
                    }))
                  }
                  placeholder="3자리"
                  maxLength={4}
                  type="password"
                />
              </div>
            </div>

            {/* Card Name + Company */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>카드명</Label>
                <Input
                  value={form.card_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, card_name: e.target.value }))
                  }
                  placeholder="예: 대표이사 법인카드"
                />
              </div>
              <div className="space-y-2">
                <Label>카드사</Label>
                <Input
                  value={form.card_company}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, card_company: e.target.value }))
                  }
                  placeholder="예: 삼성카드"
                />
              </div>
            </div>

            {/* Card Type + Holder Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>카드 종류</Label>
                <Select
                  value={form.card_type}
                  onValueChange={(v) => setForm((f) => ({ ...f, card_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARD_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>실제 명의자</Label>
                <Input
                  value={form.card_holder_name}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      card_holder_name: e.target.value,
                    }))
                  }
                  placeholder="카드 명의자 이름"
                />
              </div>
            </div>

            {/* User + Limit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>사용자 (직원)</Label>
                <Select
                  value={form.holder_user_id}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      holder_user_id: v === "none" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="사용자 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">미지정</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.profile?.full_name || m.profile?.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>월 한도 (원)</Label>
                <Input
                  type="number"
                  value={form.monthly_limit}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, monthly_limit: e.target.value }))
                  }
                  placeholder="예: 5000000"
                />
              </div>
            </div>

            {/* Expiry Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>유효기간</Label>
                <Input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expiry_date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 flex flex-col justify-end">
                <div className="flex items-center justify-between h-10">
                  <Label>스카이패스 적립</Label>
                  <Switch
                    checked={form.is_skypass}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, is_skypass: v }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Card Image */}
            <div className="space-y-2">
              <Label>카드 이미지</Label>
              {(form.card_image_url || imageFile) && (
                <div className="rounded-lg overflow-hidden border bg-slate-50 mb-2">
                  <img
                    src={
                      imageFile
                        ? URL.createObjectURL(imageFile)
                        : form.card_image_url
                    }
                    alt="카드 이미지 미리보기"
                    className="w-full h-32 object-contain"
                  />
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer border rounded-lg p-3 hover:bg-slate-50 transition-colors">
                <ImagePlus className="w-5 h-5 text-slate-400" />
                <span className="text-sm text-slate-500">
                  {imageFile
                    ? imageFile.name
                    : "카드 이미지를 업로드하세요"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setImageFile(file);
                  }}
                />
              </label>
            </div>

            {/* Active */}
            <div className="flex items-center justify-between">
              <Label>카드 활성화</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, is_active: v }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={saveCard}
              disabled={!form.card_number.trim() || uploading}
            >
              {uploading ? "업로드 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>카드 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "
              {deleteTarget?.card_name ||
                maskCardNumber(deleteTarget?.card_number || "")}
              " 카드를 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CorporateCardManagement;
