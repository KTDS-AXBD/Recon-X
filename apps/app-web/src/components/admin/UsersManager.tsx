import { useState, useEffect } from "react";
import { AxisButton } from "@/components/axis-ds";
import { AxisBadge } from "@/components/axis-ds";
import { AxisSelect } from "@/components/axis-ds";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { buildHeaders } from "@/api/headers";
import { useOrganization } from "@/contexts/OrganizationContext";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  roles: string;
  last_login_at: string | null;
  created_at: string;
}

const ROLE_OPTIONS = [
  { value: "analyst", label: "Analyst" },
  { value: "reviewer", label: "Reviewer" },
  { value: "developer", label: "Developer" },
  { value: "client", label: "Client" },
  { value: "executive", label: "Executive" },
  { value: "admin", label: "Admin" },
];

function roleBadgeVariant(role: string) {
  if (role === "admin") return "destructive" as const;
  if (role === "reviewer") return "secondary" as const;
  return "outline" as const;
}

export function UsersManager() {
  const { organizationId } = useOrganization();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    setLoading(true);
    void fetch("/api/admin/users", {
      headers: buildHeaders({ organizationId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data as UserRow[]);
      })
      .catch(() => toast.error("사용자 목록 로드 실패"))
      .finally(() => setLoading(false));
  };

  useEffect(fetchUsers, [organizationId]);

  const updateRole = (userId: string, newRole: string) => {
    void fetch(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: buildHeaders({ organizationId, contentType: "application/json" }),
      body: JSON.stringify({ role: newRole }),
    })
      .then(() => {
        toast.success("역할이 변경됐어요");
        fetchUsers();
      })
      .catch(() => toast.error("역할 변경 실패"));
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-4">로딩 중...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{users.length}명의 사용자</p>
        <AxisButton variant="outline" onClick={fetchUsers}>새로고침</AxisButton>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이메일</TableHead>
            <TableHead>이름</TableHead>
            <TableHead>역할</TableHead>
            <TableHead>마지막 로그인</TableHead>
            <TableHead>역할 변경</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-mono text-xs">{u.email}</TableCell>
              <TableCell>{u.name ?? "—"}</TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {u.roles.split(",").filter(Boolean).map((r) => (
                    <AxisBadge key={r} variant={roleBadgeVariant(r.trim())}>
                      {r.trim()}
                    </AxisBadge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString("ko-KR") : "—"}
              </TableCell>
              <TableCell>
                <AxisSelect
                  className="h-7 text-xs w-32"
                  options={ROLE_OPTIONS}
                  placeholder="변경..."
                  onValueChange={(v) => updateRole(u.id, v)}
                />
              </TableCell>
            </TableRow>
          ))}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                사용자 없음
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
