import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PatchInstanceGeneralSettings, BackupRetentionPolicy } from "@paperclipai/shared";
import {
  DAILY_RETENTION_PRESETS,
  WEEKLY_RETENTION_PRESETS,
  MONTHLY_RETENTION_PRESETS,
  DEFAULT_BACKUP_RETENTION,
} from "@paperclipai/shared";
import { LogOut, SlidersHorizontal } from "lucide-react";
import { healthApi } from "@/api/health";
import { instanceSettingsApi } from "@/api/instanceSettings";
import { ModeBadge } from "@/components/access/ModeBadge";
import { Button } from "../components/ui/button";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { cn } from "../lib/utils";
import { useSignOut } from "@/hooks/useSignOut";
import { useTranslation } from "@/i18n";

const FEEDBACK_TERMS_URL = import.meta.env.VITE_FEEDBACK_TERMS_URL?.trim() || "https://paperclip.ing/tos";

export function InstanceGeneralSettings({ embedded = false }: { embedded?: boolean }) {
  const { t, i18n } = useTranslation();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const signOutMutation = useSignOut();

  useEffect(() => {
    if (embedded) return;
    setBreadcrumbs([
      { label: t("app.breadcrumbs.settings", { defaultValue: "Settings" }), href: "/company/settings" },
      { label: t("settings.instanceGeneral.title", { defaultValue: "General" }) },
    ]);
  }, [embedded, setBreadcrumbs, t]);

  const generalQuery = useQuery({
    queryKey: queryKeys.instance.generalSettings,
    queryFn: () => instanceSettingsApi.getGeneral(),
  });
  const healthQuery = useQuery({
    queryKey: queryKeys.health,
    queryFn: () => healthApi.get(),
    retry: false,
  });

  const updateGeneralMutation = useMutation({
    mutationFn: instanceSettingsApi.updateGeneral,
    onMutate: () => {
      setActionError(null);
      signOutMutation.reset();
    },
    onSuccess: async () => {
      setActionError(null);
      signOutMutation.reset();
      await queryClient.invalidateQueries({ queryKey: queryKeys.instance.generalSettings });
    },
    onError: (error) => {
      setActionError(
        error instanceof Error
          ? error.message
          : t("settings.instanceGeneral.updateError", { defaultValue: "Failed to update general settings." }),
      );
    },
  });

  if (generalQuery.isLoading || healthQuery.isLoading) {
    return (
      <div className="text-sm text-muted-foreground">
        {t("settings.instanceGeneral.loading", { defaultValue: "Loading general settings..." })}
      </div>
    );
  }

  if (generalQuery.error) {
    return (
      <div className="text-sm text-destructive">
        {generalQuery.error instanceof Error
          ? generalQuery.error.message
          : t("settings.instanceGeneral.loadError", { defaultValue: "Failed to load general settings." })}
      </div>
    );
  }

  const censorUsernameInLogs = generalQuery.data?.censorUsernameInLogs === true;
  const keyboardShortcuts = generalQuery.data?.keyboardShortcuts === true;
  const feedbackDataSharingPreference = generalQuery.data?.feedbackDataSharingPreference ?? "prompt";
  const backupRetention: BackupRetentionPolicy = generalQuery.data?.backupRetention ?? DEFAULT_BACKUP_RETENTION;
  const hiddenSettings = new Set(healthQuery.data?.hiddenSettings ?? []);
  const showDeploymentStatus = !hiddenSettings.has("instance.general.deploymentStatus");
  const showCensorUsernameInLogs = !hiddenSettings.has("instance.general.censorUsernameInLogs");
  const showKeyboardShortcuts = !hiddenSettings.has("instance.general.keyboardShortcuts");
  const showBackupRetention = !hiddenSettings.has("instance.general.backupRetention");
  const showFeedbackDataSharing = !hiddenSettings.has("instance.general.feedbackDataSharingPreference");
  const showSignOut = !hiddenSettings.has("instance.general.signOut");
  const visibleTopics = [
    ...(showCensorUsernameInLogs
      ? [t("settings.instanceGeneral.topics.logDisplay", { defaultValue: "log display" })]
      : []),
    ...(showKeyboardShortcuts
      ? [t("settings.instanceGeneral.topics.keyboardShortcuts", { defaultValue: "keyboard shortcuts" })]
      : []),
    ...(showBackupRetention
      ? [t("settings.instanceGeneral.topics.backupRetention", { defaultValue: "backup retention" })]
      : []),
    ...(showFeedbackDataSharing
      ? [t("settings.instanceGeneral.topics.dataSharing", { defaultValue: "data sharing" })]
      : []),
  ];
  const topicSummary = visibleTopics.length > 0
    ? new Intl.ListFormat(i18n.language, { style: "long", type: "conjunction" }).format(visibleTopics)
    : "";
  const visibleActionError = signOutMutation.error instanceof Error
    ? signOutMutation.error.message
    : signOutMutation.error
      ? t("settings.instanceGeneral.signOutError", { defaultValue: "Failed to sign out." })
      : actionError;

  return (
    <div className={embedded ? "space-y-8" : "max-w-4xl space-y-8"}>
      {!embedded ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold">{t("settings.instanceGeneral.title", { defaultValue: "General" })}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {visibleTopics.length > 0
              ? t("settings.instanceGeneral.description", {
                  topics: topicSummary,
                  defaultValue: `Configure instance-wide preferences including ${topicSummary}.`,
                })
              : t("settings.instanceGeneral.descriptionNoTopics", {
                  defaultValue: "Configure instance-wide preferences.",
                })}
          </p>
        </div>
      ) : null}

      {visibleActionError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {visibleActionError}
        </div>
      )}

      {showDeploymentStatus && (
      <section>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">
              {t("settings.instanceGeneral.deployment.title", { defaultValue: "Deployment and auth" })}
            </h2>
            <ModeBadge
              deploymentMode={healthQuery.data?.deploymentMode}
              deploymentExposure={healthQuery.data?.deploymentExposure}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {healthQuery.data?.deploymentMode === "local_trusted"
              ? t("settings.instanceGeneral.deployment.localTrusted", {
                  defaultValue: "Local trusted mode is optimized for a local operator. Browser requests run as local board context and no sign-in is required.",
                })
              : healthQuery.data?.deploymentExposure === "public"
                ? t("settings.instanceGeneral.deployment.authenticatedPublic", {
                    defaultValue: "Authenticated public mode requires sign-in for board access and is intended for public URLs.",
                  })
                : t("settings.instanceGeneral.deployment.authenticatedPrivate", {
                    defaultValue: "Authenticated private mode requires sign-in and is intended for LAN, VPN, or other private-network deployments.",
                  })}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <StatusBox
              label={t("settings.instanceGeneral.deployment.authReadinessLabel", { defaultValue: "Auth readiness" })}
              value={
                healthQuery.data?.authReady
                  ? t("settings.instanceGeneral.deployment.ready", { defaultValue: "Ready" })
                  : t("settings.instanceGeneral.deployment.notReady", { defaultValue: "Not ready" })
              }
            />
            <StatusBox
              label={t("settings.instanceGeneral.deployment.bootstrapStatusLabel", { defaultValue: "Bootstrap status" })}
              value={
                healthQuery.data?.bootstrapStatus === "bootstrap_pending"
                  ? t("settings.instanceGeneral.deployment.setupRequired", { defaultValue: "Setup required" })
                  : t("settings.instanceGeneral.deployment.ready", { defaultValue: "Ready" })
              }
            />
            <StatusBox
              label={t("settings.instanceGeneral.deployment.bootstrapInviteLabel", { defaultValue: "Bootstrap invite" })}
              value={
                healthQuery.data?.bootstrapInviteActive
                  ? t("settings.instanceGeneral.deployment.active", { defaultValue: "Active" })
                  : t("settings.instanceGeneral.deployment.none", { defaultValue: "None" })
              }
            />
          </div>
        </div>
      </section>
      )}

      {showCensorUsernameInLogs && (
      <section>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">
              {t("settings.instanceGeneral.censorUsername.title", { defaultValue: "Censor username in logs" })}
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("settings.instanceGeneral.censorUsername.description", {
                defaultValue: "Hide the username segment in home-directory paths and similar operator-visible log output. Standalone username mentions outside of paths are not yet masked in the live transcript view. This is off by default.",
              })}
            </p>
          </div>
          <ToggleSwitch
            checked={censorUsernameInLogs}
            onCheckedChange={() => updateGeneralMutation.mutate({ censorUsernameInLogs: !censorUsernameInLogs })}
            disabled={updateGeneralMutation.isPending || signOutMutation.isPending}
            aria-label="Toggle username log censoring"
          />
        </div>
      </section>
      )}

      {showKeyboardShortcuts && (
      <section>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">
              {t("settings.instanceGeneral.keyboardShortcuts.title", { defaultValue: "Keyboard shortcuts" })}
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("settings.instanceGeneral.keyboardShortcuts.description", {
                defaultValue: "Enable app keyboard shortcuts, including inbox navigation and global shortcuts like creating tasks or toggling panels. This is off by default.",
              })}
            </p>
          </div>
          <ToggleSwitch
            checked={keyboardShortcuts}
            onCheckedChange={() => updateGeneralMutation.mutate({ keyboardShortcuts: !keyboardShortcuts })}
            disabled={updateGeneralMutation.isPending || signOutMutation.isPending}
            aria-label="Toggle keyboard shortcuts"
          />
        </div>
      </section>
      )}

      {showBackupRetention && (
      <section>
        <div className="space-y-5">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">
              {t("settings.instanceGeneral.backupRetention.title", { defaultValue: "Backup retention" })}
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("settings.instanceGeneral.backupRetention.description", {
                defaultValue: "Configure how long automatic database backups are retained. Backups run roughly every hour and are compressed with gzip. Within the daily window all backups are kept; beyond that, one backup per week and one per month are preserved.",
              })}
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("settings.instanceGeneral.backupRetention.daily", { defaultValue: "Daily" })}
            </h3>
            <div className="flex flex-wrap gap-2">
              {DAILY_RETENTION_PRESETS.map((days) => {
                const active = backupRetention.dailyDays === days;
                return (
                  <button
                    key={days}
                    type="button"
                    disabled={updateGeneralMutation.isPending || signOutMutation.isPending}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      active
                        ? "border-foreground bg-accent text-foreground"
                        : "border-border bg-background hover:bg-accent/50",
                    )}
                    onClick={() =>
                      updateGeneralMutation.mutate({
                        backupRetention: { ...backupRetention, dailyDays: days },
                      })
                    }
                  >
                    <div className="text-sm font-medium">
                      {t("settings.instanceGeneral.backupRetention.daysCount", { count: days, defaultValue: "{{count}} days" })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("settings.instanceGeneral.backupRetention.weekly", { defaultValue: "Weekly" })}
            </h3>
            <div className="flex flex-wrap gap-2">
              {WEEKLY_RETENTION_PRESETS.map((weeks) => {
                const active = backupRetention.weeklyWeeks === weeks;
                const label = t("settings.instanceGeneral.backupRetention.weeksCount", { count: weeks, defaultValue: "{{count}} weeks" });
                return (
                  <button
                    key={weeks}
                    type="button"
                    disabled={updateGeneralMutation.isPending || signOutMutation.isPending}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      active
                        ? "border-foreground bg-accent text-foreground"
                        : "border-border bg-background hover:bg-accent/50",
                    )}
                    onClick={() =>
                      updateGeneralMutation.mutate({
                        backupRetention: { ...backupRetention, weeklyWeeks: weeks },
                      })
                    }
                  >
                    <div className="text-sm font-medium">{label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("settings.instanceGeneral.backupRetention.monthly", { defaultValue: "Monthly" })}
            </h3>
            <div className="flex flex-wrap gap-2">
              {MONTHLY_RETENTION_PRESETS.map((months) => {
                const active = backupRetention.monthlyMonths === months;
                const label = t("settings.instanceGeneral.backupRetention.monthsCount", { count: months, defaultValue: "{{count}} months" });
                return (
                  <button
                    key={months}
                    type="button"
                    disabled={updateGeneralMutation.isPending || signOutMutation.isPending}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      active
                        ? "border-foreground bg-accent text-foreground"
                        : "border-border bg-background hover:bg-accent/50",
                    )}
                    onClick={() =>
                      updateGeneralMutation.mutate({
                        backupRetention: { ...backupRetention, monthlyMonths: months },
                      })
                    }
                  >
                    <div className="text-sm font-medium">{label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      )}

      {showFeedbackDataSharing && (
      <section>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">
              {t("settings.instanceGeneral.feedbackSharing.title", { defaultValue: "AI feedback sharing" })}
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("settings.instanceGeneral.feedbackSharing.description", {
                defaultValue: "Control whether thumbs up and thumbs down votes can send the voted AI output to Paperclip Labs. Votes are always saved locally.",
              })}
            </p>
            {FEEDBACK_TERMS_URL ? (
              <a
                href={FEEDBACK_TERMS_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                {t("settings.instanceGeneral.feedbackSharing.termsLink", { defaultValue: "Read our terms of service" })}
              </a>
            ) : null}
          </div>
          {feedbackDataSharingPreference === "prompt" ? (
            <div className="rounded-lg bg-accent/20 px-3 py-2 text-sm text-muted-foreground">
              {t("settings.instanceGeneral.feedbackSharing.noDefaultYet", {
                defaultValue: "No default is saved yet. The next thumbs up or thumbs down choice will ask once and then save the answer here.",
              })}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {[
              {
                value: "allowed",
                label: t("settings.instanceGeneral.feedbackSharing.allowLabel", { defaultValue: "Always allow" }),
                description: t("settings.instanceGeneral.feedbackSharing.allowDescription", { defaultValue: "Share voted AI outputs automatically." }),
              },
              {
                value: "not_allowed",
                label: t("settings.instanceGeneral.feedbackSharing.disallowLabel", { defaultValue: "Don't allow" }),
                description: t("settings.instanceGeneral.feedbackSharing.disallowDescription", { defaultValue: "Keep voted AI outputs local only." }),
              },
            ].map((option) => {
              const active = feedbackDataSharingPreference === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={updateGeneralMutation.isPending || signOutMutation.isPending}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    active
                      ? "border-foreground bg-accent text-foreground"
                      : "border-border bg-background hover:bg-accent/50",
                  )}
                  onClick={() =>
                    updateGeneralMutation.mutate({
                      feedbackDataSharingPreference: option.value as
                        | "allowed"
                        | "not_allowed",
                    })
                  }
                >
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {option.description}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("settings.instanceGeneral.feedbackSharing.devHintPrefix", { defaultValue: "To retest the first-use prompt in local dev, remove the" })}{" "}
            <code>feedbackDataSharingPreference</code>{" "}
            {t("settings.instanceGeneral.feedbackSharing.devHintMiddle", { defaultValue: "key from the" })}{" "}
            <code>instance_settings.general</code>{" "}
            {t("settings.instanceGeneral.feedbackSharing.devHintSuffix", { defaultValue: "JSON row for this instance, or set it back to" })}{" "}
            <code>"prompt"</code>
            {t("settings.instanceGeneral.feedbackSharing.devHintEnd", { defaultValue: ". Unset and \"prompt\" both mean no default has been chosen yet." })}
          </p>
        </div>
      </section>

      )}

      {showSignOut && (
      <section>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">{t("settings.instanceGeneral.signOut.title", { defaultValue: "Sign out" })}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("settings.instanceGeneral.signOut.description", {
                defaultValue: "Sign out of this Paperclip instance. You will be redirected to the login page.",
              })}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={signOutMutation.isPending || updateGeneralMutation.isPending}
            onClick={() => {
              setActionError(null);
              signOutMutation.mutate();
            }}
          >
            <LogOut className="size-4" />
            {signOutMutation.isPending
              ? t("settings.instanceGeneral.signOut.pending", { defaultValue: "Signing out..." })
              : t("settings.instanceGeneral.signOut.action", { defaultValue: "Sign out" })}
          </Button>
        </div>
      </section>
      )}
    </div>
  );
}

function StatusBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
