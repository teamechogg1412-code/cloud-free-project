import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KakaoAddressSearch } from "@/components/schedule/KakaoAddressSearch";
import { MapPin, Plus, Trash2, Home, Scissors, Star, Building2 } from "lucide-react";
import { toast } from "sonner";

interface SavedLocation {
  id: string;
  artist_id: string;
  tenant_id: string;
  label: string;
  category: string;
  location_name: string;
  address: string;
  lat: number;
  lng: number;
  notes: string | null;
}

const CATEGORY_OPTIONS = [
  { value: "home", label: "자택", icon: Home },
  { value: "shop", label: "샵 (헤어/메이크업)", icon: Scissors },
  { value: "studio", label: "스튜디오", icon: Building2 },
  { value: "favorite", label: "자주 가는 곳", icon: Star },
  { value: "other", label: "기타", icon: MapPin },
];

const getCategoryIcon = (category: string) => {
  const opt = CATEGORY_OPTIONS.find(o => o.value === category);
  const Icon = opt?.icon || MapPin;
  return <Icon className="w-3.5 h-3.5" />;
};

const getCategoryLabel = (category: string) =>
  CATEGORY_OPTIONS.find(o => o.value === category)?.label || category;

interface Props {
  artistId: string;
  tenantId: string;
}

export const SavedLocationsManager = ({ artistId, tenantId }: Props) => {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newForm, setNewForm] = useState({
    label: "",
    category: "home",
    location_name: "",
    address: "",
    lat: 0,
    lng: 0,
    notes: "",
  });

  const fetchLocations = async () => {
    const { data } = await supabase
      .from("artist_saved_locations")
      .select("*")
      .eq("artist_id", artistId)
      .eq("tenant_id", tenantId)
      .order("category");
    setLocations((data || []) as SavedLocation[]);
    setLoading(false);
  };

  useEffect(() => {
    if (artistId) fetchLocations();
  }, [artistId]);

  const handleAdd = async () => {
    if (!newForm.label || !newForm.address) {
      toast.error("라벨과 주소를 입력해주세요.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("artist_saved_locations").insert({
      artist_id: artistId,
      tenant_id: tenantId,
      label: newForm.label,
      category: newForm.category,
      location_name: newForm.location_name,
      address: newForm.address,
      lat: newForm.lat,
      lng: newForm.lng,
      notes: newForm.notes || null,
    } as any);

    if (error) {
      toast.error("저장 실패: " + error.message);
    } else {
      toast.success("장소가 등록되었습니다.");
      setNewForm({ label: "", category: "home", location_name: "", address: "", lat: 0, lng: 0, notes: "" });
      setAdding(false);
      fetchLocations();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("artist_saved_locations").delete().eq("id", id);
    toast.success("삭제되었습니다.");
    fetchLocations();
  };

  if (loading) return <p className="text-xs text-muted-foreground">로딩 중...</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" /> 저장 장소 (샵·자택 등)
        </Label>
        {!adding && (
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAdding(true)}>
            <Plus className="w-3 h-3" /> 추가
          </Button>
        )}
      </div>

      {/* Existing locations */}
      {locations.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground py-2">등록된 장소가 없습니다.</p>
      )}

      <div className="space-y-1.5">
        {locations.map(loc => (
          <div
            key={loc.id}
            className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background text-sm group"
          >
            <div className="text-muted-foreground">{getCategoryIcon(loc.category)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-xs truncate">{loc.label}</span>
                <Badge variant="outline" className="text-[9px] shrink-0">{getCategoryLabel(loc.category)}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">
                {loc.location_name ? `${loc.location_name} · ` : ""}{loc.address}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive"
              onClick={() => handleDelete(loc.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add form */}
      {adding && (
        <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/30">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]">라벨 *</Label>
              <Input
                value={newForm.label}
                onChange={e => setNewForm(f => ({ ...f, label: e.target.value }))}
                placeholder="예: 자택, 헤어샵"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">카테고리</Label>
              <Select value={newForm.category} onValueChange={v => setNewForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">주소 검색 *</Label>
            <KakaoAddressSearch
              value={newForm.location_name}
              onSelect={result => setNewForm(f => ({
                ...f,
                location_name: result.location,
                address: result.location_address,
                lat: result.location_lat,
                lng: result.location_lng,
              }))}
              placeholder="장소 또는 주소 검색"
            />
            {newForm.address && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {newForm.address}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">메모</Label>
            <Input
              value={newForm.notes}
              onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="비고 (선택)"
              className="h-8 text-xs"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(false)}>
              취소
            </Button>
            <Button type="button" size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={saving}>
              저장
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
