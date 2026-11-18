/** Fictional demo accounts created by `npm run db:seed`. */
export const DEMO_PASSWORD = "demo-password-2026";

export interface DemoAccount {
  email: string;
  name: string;
  role: string;
  note: string;
}

export const FEATURED_DEMO_ACCOUNTS: DemoAccount[] = [
  { email: "student@demo.aceap.test", name: "Alex Morgan", role: "Student", note: "Guided demo — start here" },
  { email: "teacher@demo.aceap.test", name: "Jordan Rivera", role: "Teacher", note: "Northfield High School (demo)" },
  { email: "admin@demo.aceap.test", name: "Morgan Admin", role: "Platform admin", note: "Content review, licensing, audit" },
];

export const MORE_DEMO_ACCOUNTS: DemoAccount[] = [
  { email: "avery@demo.aceap.test", name: "Avery Brooks", role: "Student", note: "Has learning history" },
  { email: "sam@demo.aceap.test", name: "Sam Patel", role: "Student", note: "Has learning history" },
  { email: "riley@demo.aceap.test", name: "Riley Nguyen", role: "Student", note: "Has learning history" },
  { email: "jamie@demo.aceap.test", name: "Jamie Ortiz", role: "Student", note: "Has learning history" },
  { email: "taylor@demo.aceap.test", name: "Taylor Kim", role: "Student", note: "Has learning history" },
  { email: "indie@demo.aceap.test", name: "Casey Fox", role: "Independent learner", note: "Not in a class" },
  { email: "teacher2@demo.aceap.test", name: "Dana Whitfield", role: "Teacher", note: "Lakeview Academy (demo)" },
];
