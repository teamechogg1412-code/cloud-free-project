import React, { useRef, useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Users, Minus, ChevronDown, Phone, Mail, Crown, User } from "lucide-react";

interface Department {
  id: string;
  name: string;
  parent_id: string | null;
  description: string | null;
}

interface DeptNode extends Department {
  children: DeptNode[];
  memberCount: number;
  directMemberCount: number;
}

interface Member {
  user_id: string;
  department: string | null;
  job_title: string | null;
  role: string;
  profile?: {
    full_name: string | null;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  };
}

interface JobTitleDef {
  id: string;
  name: string;
  level: number;
}

interface OrgTreeChartProps {
  departments: Department[];
  members: Member[];
  companyName: string;
  repName?: string;
  jobTitleDefs: JobTitleDef[];
}

// Only include departments that have members (directly or in children)
const buildTree = (depts: Department[], members: Member[], parentId: string | null = null): DeptNode[] => {
  return depts
    .filter(d => d.parent_id === parentId)
    .map(d => {
      const children = buildTree(depts, members, d.id);
      const directCount = members.filter(m => m.department === d.name).length;
      const childMembers = children.reduce((sum, c) => sum + c.memberCount, 0);
      return {
        ...d,
        children,
        memberCount: directCount + childMembers,
        directMemberCount: directCount,
      };
    })
    .filter(d => d.memberCount > 0); // Only show departments with members
};

const DEPTH_COLORS = [
  { bg: "bg-blue-600", text: "text-white", border: "border-blue-700" },
  { bg: "bg-emerald-600", text: "text-white", border: "border-emerald-700" },
  { bg: "bg-indigo-500", text: "text-white", border: "border-indigo-600" },
  { bg: "bg-amber-500", text: "text-white", border: "border-amber-600" },
  { bg: "bg-rose-500", text: "text-white", border: "border-rose-600" },
  { bg: "bg-violet-500", text: "text-white", border: "border-violet-600" },
];

const TreeNode: React.FC<{
  node: DeptNode;
  depth: number;
  members: Member[];
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
  onDeptClick: (deptName: string) => void;
}> = ({ node, depth, members, expandedNodes, toggleNode, onDeptClick }) => {
  const colors = DEPTH_COLORS[depth % DEPTH_COLORS.length];
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);

  return (
    <div className="flex flex-col items-center">
      {/* Node card */}
      <div className="flex flex-col items-center gap-0">
        <button
          onClick={() => onDeptClick(node.name)}
          className={`
            relative px-5 py-3 rounded-xl shadow-lg border-2 transition-all duration-200
            ${colors.bg} ${colors.text} ${colors.border}
            cursor-pointer hover:scale-105 hover:shadow-xl
            min-w-[140px] max-w-[220px]
          `}
        >
          <div className="flex items-center justify-center gap-2">
            <Building2 className="w-4 h-4 shrink-0 opacity-80" />
            <span className="font-bold text-sm whitespace-nowrap truncate">{node.name}</span>
          </div>
          <div className="flex items-center justify-center gap-1 mt-1 opacity-80">
            <Users className="w-3 h-3" />
            <span className="text-xs">{node.directMemberCount}명</span>
          </div>
        </button>

        {/* Expand/collapse toggle for children */}
        {hasChildren && (
          <button
            onClick={() => toggleNode(node.id)}
            className="relative -mt-2 z-10 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center border border-border hover:bg-muted transition-colors"
          >
            {isExpanded ? (
              <Minus className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col items-center mt-4">
          <div className="w-px h-6 bg-border" />

          {node.children.length === 1 ? (
            <TreeNode
              node={node.children[0]}
              depth={depth + 1}
              members={members}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
              onDeptClick={onDeptClick}
            />
          ) : (
            <div className="relative flex items-start gap-4 md:gap-8">
              {node.children.map(child => (
                <div key={child.id} className="flex flex-col items-center">
                  <div className="w-px h-6 bg-border" />
                  <TreeNode
                    node={child}
                    depth={depth + 1}
                    members={members}
                    expandedNodes={expandedNodes}
                    toggleNode={toggleNode}
                    onDeptClick={onDeptClick}
                  />
                </div>
              ))}
              {node.children.length > 1 && (
                <div
                  className="absolute top-0 h-px bg-border"
                  style={{
                    left: `${100 / (2 * node.children.length)}%`,
                    right: `${100 / (2 * node.children.length)}%`,
                  }}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const OrgTreeChart: React.FC<OrgTreeChartProps> = ({ departments, members, companyName, repName, jobTitleDefs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [showCeoPopup, setShowCeoPopup] = useState(false);

  // Find CEO/representative member (company_admin with highest rank)
  const ceoMember = members.find(m => m.role === "company_admin") || null;

  useEffect(() => {
    const allIds = new Set(departments.map(d => d.id));
    setExpandedNodes(allIds);
  }, [departments]);

  const toggleNode = useCallback((id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const getJobLevel = (titleName: string | null) => {
    if (!titleName) return 999;
    const found = jobTitleDefs.find(j => j.name === titleName);
    return found ? found.level : 999;
  };

  const tree = buildTree(departments, members);

  const deptNames = new Set(departments.map(d => d.name));
  const unassigned = members.filter(m => !m.department || !deptNames.has(m.department));

  // Members for popup
  const selectedMembers = selectedDept
    ? members.filter(m => m.department === selectedDept).sort((a, b) => getJobLevel(a.job_title) - getJobLevel(b.job_title))
    : [];

  if (tree.length === 0 && members.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">등록된 부서가 없습니다.</p>
        <p className="text-sm mt-1">관리시스템에서 부서를 먼저 등록해주세요.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div ref={scrollRef} className="overflow-x-auto pb-8 pt-4">
        <div className="flex flex-col items-center min-w-fit px-8">
          {/* Company root node */}
          <div className="px-6 py-3 rounded-2xl bg-slate-800 text-white shadow-xl border-2 border-slate-700">
            <span className="font-black text-base tracking-tight">{companyName}</span>
          </div>
          <div className="w-px h-5 bg-border" />

          {/* CEO / Representative */}
          <button
            onClick={() => setShowCeoPopup(true)}
            className="px-5 py-3 rounded-xl shadow-lg border-2 bg-amber-500 text-white border-amber-600 cursor-pointer hover:scale-105 hover:shadow-xl transition-all duration-200 min-w-[140px]"
          >
            <div className="flex items-center justify-center gap-2">
              <Crown className="w-4 h-4 shrink-0" />
              <span className="font-bold text-sm">대표이사</span>
            </div>
            <div className="text-center mt-1">
              <span className="text-xs opacity-90">{repName || ceoMember?.profile?.full_name || "미등록"}</span>
            </div>
          </button>
          <div className="w-px h-5 bg-border" />

          {/* Tree roots */}
          {tree.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">부서에 배정된 직원이 없습니다.</div>
          ) : tree.length === 1 ? (
            <TreeNode
              node={tree[0]}
              depth={0}
              members={members}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
              onDeptClick={setSelectedDept}
            />
          ) : (
            <div className="relative flex items-start gap-4 md:gap-8">
              {tree.map(root => (
                <div key={root.id} className="flex flex-col items-center">
                  <div className="w-px h-6 bg-border" />
                  <TreeNode
                    node={root}
                    depth={0}
                    members={members}
                    expandedNodes={expandedNodes}
                    toggleNode={toggleNode}
                    onDeptClick={setSelectedDept}
                  />
                </div>
              ))}
              {tree.length > 1 && (
                <div
                  className="absolute top-0 h-px bg-border"
                  style={{
                    left: `${100 / (2 * tree.length)}%`,
                    right: `${100 / (2 * tree.length)}%`,
                  }}
                />
              )}
            </div>
          )}

          {/* Unassigned */}
          {unassigned.length > 0 && (
            <button
              onClick={() => setSelectedDept("미배정")}
              className="mt-8 px-4 py-2 rounded-lg bg-muted border border-border hover:bg-muted/80 transition-colors cursor-pointer"
            >
              <span className="text-sm text-muted-foreground">
                미배정 인원: <span className="font-semibold text-foreground">{unassigned.length}명</span>
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Department member popup */}
      <Dialog open={!!selectedDept} onOpenChange={() => setSelectedDept(null)}>
        <DialogContent className="max-w-md" aria-describedby="dept-member-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-500" />
              {selectedDept}
              <Badge variant="secondary">{selectedMembers.length}명</Badge>
            </DialogTitle>
          </DialogHeader>
          <p id="dept-member-desc" className="sr-only">부서 소속 직원 목록</p>
          <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
            {selectedMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">소속 직원이 없습니다.</p>
            ) : (
              selectedMembers.map(member => (
                <div key={member.user_id} className="flex items-center gap-3 py-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={member.profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-sm">
                      {(member.profile?.full_name || "?").substring(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{member.profile?.full_name || "이름 없음"}</span>
                      {member.job_title && <Badge variant="outline" className="text-xs">{member.job_title}</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {member.profile?.phone && (
                        <a href={`tel:${member.profile.phone}`} className="flex items-center gap-1 hover:text-primary">
                          <Phone className="w-3 h-3" /> {member.profile.phone}
                        </a>
                      )}
                      {member.profile?.email && (
                        <a href={`mailto:${member.profile.email}`} className="flex items-center gap-1 hover:text-primary">
                          <Mail className="w-3 h-3" /> {member.profile.email}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* CEO popup */}
      <Dialog open={showCeoPopup} onOpenChange={setShowCeoPopup}>
        <DialogContent className="max-w-sm" aria-describedby="ceo-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" /> 대표이사
            </DialogTitle>
          </DialogHeader>
          <p id="ceo-desc" className="sr-only">대표이사 정보</p>
          {ceoMember ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={ceoMember.profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-amber-100 text-amber-700 font-bold text-xl">
                  {(ceoMember.profile?.full_name || repName || "?").substring(0, 1)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="text-lg font-bold">{ceoMember.profile?.full_name || repName || "이름 없음"}</p>
                <Badge className="mt-1">대표이사</Badge>
              </div>
              <div className="w-full space-y-2 mt-2">
                {ceoMember.profile?.phone && (
                  <a href={`tel:${ceoMember.profile.phone}`} className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                    <Phone className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">{ceoMember.profile.phone}</span>
                  </a>
                )}
                {ceoMember.profile?.email && (
                  <a href={`mailto:${ceoMember.profile.email}`} className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">{ceoMember.profile.email}</span>
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="font-medium">{repName || "미등록"}</p>
              <p className="text-sm text-muted-foreground mt-1">상세 연락처 정보가 등록되지 않았습니다.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrgTreeChart;
