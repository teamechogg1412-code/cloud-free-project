import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Download, Upload, Users } from "lucide-react";

interface Actor {
  id: string;
  name: string;
  info: string;
  created_at: string;
}

const ScenarioActorManagement: React.FC = () => {
  const { currentTenant } = useAuth();
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Actor | null>(null);
  const [form, setForm] = useState({ name: "", info: "" });

  useEffect(() => {
    if (currentTenant) fetchActors();
  }, [currentTenant]);

  const fetchActors = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("scenario_actors")
      .select("*")
      .eq("tenant_id", currentTenant!.tenant_id)
      .order("name");
    if (data) setActors(data);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", info: "" });
    setDialogOpen(true);
  };

  const openEdit = (actor: Actor) => {
    setEditing(actor);
    setForm({ name: actor.name, info: actor.info || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("배우 이름을 입력해주세요.");
      return;
    }

    if (editing) {
      const { error } = await supabase
        .from("scenario_actors")
        .update({ name: form.name, info: form.info, updated_at: new Date().toISOString() })
        .eq("id", editing.id);
      if (error) { toast.error("수정 실패"); return; }
      toast.success("배우 정보가 수정되었습니다.");
    } else {
      const { error } = await supabase
        .from("scenario_actors")
        .insert({ name: form.name, info: form.info, tenant_id: currentTenant!.tenant_id });
      if (error) { toast.error("등록 실패"); return; }
      toast.success("배우가 등록되었습니다.");
    }
    setDialogOpen(false);
    fetchActors();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await supabase.from("scenario_actors").delete().eq("id", id);
    toast.success("삭제되었습니다.");
    fetchActors();
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(actors, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scenario_actors_backup.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON 백업 파일이 다운로드되었습니다.");
  };

  const importJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as Array<{ name: string; info: string }>;
      for (const item of data) {
        await supabase.from("scenario_actors").insert({
          name: item.name,
          info: item.info || "",
          tenant_id: currentTenant!.tenant_id,
        });
      }
      toast.success(`${data.length}명의 배우가 복원되었습니다.`);
      fetchActors();
    } catch {
      toast.error("JSON 파일 형식이 올바르지 않습니다.");
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-indigo-600" />
          <h1 className="text-2xl font-bold">배우 관리</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportJson}>
            <Download className="w-4 h-4 mr-1" /> JSON 백업
          </Button>
          <label>
            <Button variant="outline" size="sm" asChild>
              <span><Upload className="w-4 h-4 mr-1" /> JSON 복원</span>
            </Button>
            <input type="file" accept=".json" className="hidden" onChange={importJson} />
          </label>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> 배우 추가
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>프로필 정보</TableHead>
                <TableHead className="w-24">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actors.map((actor) => (
                <TableRow key={actor.id}>
                  <TableCell className="font-medium">{actor.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                    {actor.info?.substring(0, 100) || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(actor)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(actor.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {actors.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    등록된 배우가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "배우 정보 수정" : "배우 등록"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>이름</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="배우 이름" />
            </div>
            <div>
              <Label>프로필 / 필모그래피</Label>
              <Textarea
                value={form.info}
                onChange={(e) => setForm({ ...form, info: e.target.value })}
                placeholder="상세 프로필, 주요 출연작, 연기 특성 등을 자유롭게 입력하세요."
                rows={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave}>{editing ? "수정" : "등록"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScenarioActorManagement;
