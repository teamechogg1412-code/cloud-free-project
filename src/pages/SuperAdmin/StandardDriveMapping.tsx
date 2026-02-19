import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderTree, Layers } from "lucide-react";

const StandardDriveMapping = () => {
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("system_drive_templates").select("*").order("sort_order")
      .then(({ data }) => setTemplates(data || []));
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-black mb-8 flex items-center gap-3">
        <FolderTree className="text-primary" /> 전사 표준 드라이브 구조 설계
      </h1>
      
      <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>카테고리 (대분류)</TableHead>
              <TableHead>메뉴명 (폴더명)</TableHead>
              <TableHead>시스템 키 (고유값)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell><Badge variant="secondary">{t.category}</Badge></TableCell>
                <TableCell className="font-bold text-slate-700">{t.menu_name}</TableCell>
                <TableCell className="font-mono text-xs text-slate-400">{t.folder_key}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default StandardDriveMapping;