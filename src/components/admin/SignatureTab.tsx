import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Upload, Trash2, Loader2 } from "lucide-react";

interface Props {
  signatureUrl: string | null;
  memberId: string;
  canEdit: boolean;
  onRefresh: () => void;
}

export const SignatureTab = ({ signatureUrl, memberId, canEdit, onRefresh }: Props) => {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `signatures/${memberId}_${Date.now()}.${file.name.split(".").pop()}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: profErr } = await supabase.from("profiles").update({ signature_url: urlData.publicUrl }).eq("id", memberId);
      if (profErr) throw profErr;
      toast.success("서명이 업로드되었습니다.");
      onRefresh();
    } catch (e: any) {
      toast.error("업로드 실패: " + e.message);
    } finally { setUploading(false); }
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("profiles").update({ signature_url: null }).eq("id", memberId);
    if (error) toast.error("삭제 실패");
    else { toast.success("서명이 삭제되었습니다."); onRefresh(); }
  };

  return (
    <Card className="border-none shadow-md rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-black">직원 전자 서명</CardTitle>
        {canEdit && (
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <Button size="sm" variant="outline" className="gap-1.5 text-xs font-bold" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />} 업로드
            </Button>
            {signatureUrl && (
              <Button size="sm" variant="destructive" className="gap-1.5 text-xs font-bold" onClick={handleDelete}>
                <Trash2 className="w-3.5 h-3.5" /> 삭제
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex justify-center p-12 bg-white rounded-[2rem] m-4 border-2 border-dashed border-slate-100">
        {signatureUrl ? (
          <img src={signatureUrl} alt="Signature" className="max-h-40 object-contain contrast-125" />
        ) : <p className="text-slate-300 font-bold italic">등록된 서명 정보가 없습니다.</p>}
      </CardContent>
    </Card>
  );
};
