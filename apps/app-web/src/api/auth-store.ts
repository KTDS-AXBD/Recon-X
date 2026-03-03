export interface DemoUser {
  userId: string;
  userName: string;
  userRole: string;
  label: string;
}

export const DEMO_USERS: DemoUser[] = [
  { userId: "analyst-001", userName: "김민준", userRole: "Analyst", label: "분석 엔지니어" },
  { userId: "reviewer-001", userName: "박서연", userRole: "Reviewer", label: "정책 검토자" },
  { userId: "developer-001", userName: "이준호", userRole: "Developer", label: "스킬 개발자" },
  { userId: "exec-001", userName: "최지은", userRole: "Executive", label: "경영진" },
  { userId: "client-001", userName: "정현우", userRole: "Client", label: "고객" },
];

let currentUser: DemoUser | null = null;

export function getAuthUser(): DemoUser | null {
  return currentUser;
}

export function setAuthUser(user: DemoUser | null): void {
  currentUser = user;
}
