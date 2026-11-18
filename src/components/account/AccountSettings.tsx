/**
 * Account settings (shared by /app/settings and /teacher/settings):
 * profile name, change password, download my data, delete my account.
 * Server Component; the forms are small Client Components using server actions.
 */
import "server-only";
import { Download, FileJson } from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  KeyValue,
  PageHeader,
  buttonStyles,
  formatDate,
} from "@/components/ui";
import {
  blockerMessage,
  deletionBlockers,
  DELETE_CONFIRMATION_WORD,
  purgeGraceDays,
} from "@/modules/accounts/deletion";
import { PASSWORD_MIN_LENGTH } from "@/modules/auth/password";
import type { SessionUser } from "@/modules/auth/service";
import type { UserRole } from "@/db/schema";
import { memberSince } from "@/modules/accounts/profile";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { DeleteAccountForm } from "./DeleteAccountForm";
import { ProfileForm } from "./ProfileForm";

const ROLE_LABEL: Record<UserRole, string> = {
  student: "Student",
  teacher: "Teacher",
  school_admin: "School admin",
  platform_admin: "Platform admin",
};

export async function AccountSettings({ user }: { user: SessionUser }) {
  const createdAt = await memberSince(user.id);
  const blocked = blockerMessage(await deletionBlockers(user.id));
  const graceDays = purgeGraceDays();
  const isStudent = user.role === "student";

  return (
    <>
      <PageHeader title="Account settings" description="Your profile, password and data." />

      <div className="grid max-w-3xl gap-5">
        <Card as="section" aria-labelledby="profile-title">
          <CardHeader titleAs="h2" titleId="profile-title" title="Profile" />
          <KeyValue
            className="mb-5"
            items={[
              {
                label: "Role",
                value: (
                  <span className="inline-flex items-center gap-2">
                    {ROLE_LABEL[user.role]}
                    {user.isDemo ? <Badge tone="warn">Demo account</Badge> : null}
                  </span>
                ),
              },
              { label: "Member since", value: formatDate(createdAt) },
            ]}
          />
          <ProfileForm name={user.name} email={user.email} />
        </Card>

        <Card as="section" aria-labelledby="password-title">
          <CardHeader
            titleAs="h2"
            titleId="password-title"
            title="Change password"
            description="You'll stay signed in here; every other device is signed out."
          />
          <ChangePasswordForm minPasswordLength={PASSWORD_MIN_LENGTH} />
        </Card>

        <Card as="section" aria-labelledby="data-title">
          <CardHeader
            titleAs="h2"
            titleId="data-title"
            title="Download my data"
            description="Copies are generated fresh each time and aren't stored."
          />
          <ul className="space-y-3">
            {isStudent ? (
              <li className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">Notes and learning record</p>
                  <p className="text-sm text-muted">
                    Your vault notes, mastery levels, evidence summary and history (JSON or
                    Markdown).
                  </p>
                </div>
                <a
                  href="/app/vault/export"
                  className={buttonStyles({ variant: "secondary", size: "sm" })}
                >
                  <Download aria-hidden="true" className="size-4" />
                  Open vault export
                </a>
              </li>
            ) : null}
            <li className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">Account basics</p>
                <p className="text-sm text-muted">
                  Name, email, role, organisations, classes and record counts (JSON).
                </p>
              </div>
              <a
                href="/api/account/export"
                download
                className={buttonStyles({ variant: "secondary", size: "sm" })}
              >
                <FileJson aria-hidden="true" className="size-4" />
                Download account JSON
              </a>
            </li>
          </ul>
        </Card>

        <Card as="section" aria-labelledby="delete-title" className="border-bad/30">
          <CardHeader titleAs="h2" titleId="delete-title" title="Delete my account" />
          <div className="mb-4 space-y-2 text-sm leading-relaxed text-ink-2">
            <p>
              You&apos;ll be signed out everywhere and won&apos;t be able to sign in again.
              {isStudent
                ? " You'll be removed from your classes, and your teachers will no longer see your work."
                : ""}{" "}
              Any links to a school LMS (Canvas) are removed.
            </p>
            <p>
              After {graceDays} day{graceDays === 1 ? "" : "s"} your account and everything in it —{" "}
              {isStudent
                ? "notes, answers, mastery evidence and history"
                : "your profile and activity"}{" "}
              — is permanently deleted. If you change your mind before then, contact AceAP support.{" "}
              {isStudent ? "Download your data first if you want to keep it." : null}
            </p>
          </div>
          {blocked ? (
            <p
              role="note"
              className="rounded-lg border border-warn/25 bg-warn-soft px-3.5 py-3 text-sm text-warn"
            >
              {blocked}
            </p>
          ) : (
            <DeleteAccountForm confirmationWord={DELETE_CONFIRMATION_WORD} />
          )}
        </Card>
      </div>
    </>
  );
}
