import { buildHeaders } from "./headers";

export async function downloadSkillZip(
  orgId: string,
  skillId: string,
): Promise<void> {
  const headers = buildHeaders(orgId);
  // Remove Content-Type for blob download
  delete headers["Content-Type"];
  const res = await fetch(`/api/skills/${skillId}/export-cc`, { headers });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${skillId}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
