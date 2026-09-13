import { Fragment } from "react";
import {
  ISSUE_THREAD_INTERACTION_KINDS,
  normalizeIssueThreadInteractionResolverPolicy,
  type InteractionResolverGovernance,
  type IssueThreadInteractionCanonicalResolverPolicy,
  type IssueThreadInteractionKind,
  type IssueThreadInteractionResolverPolicy,
} from "@paperclipai/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { t, useTranslation } from "../i18n";
import { resolverPolicyLabel } from "../lib/interaction-audience";

// Read lazily (function, not a module-level constant) so a locale switch is
// picked up on the next render instead of freezing at the language active
// when this module first loaded.
function interactionKindLabels(): Record<IssueThreadInteractionKind, string> {
  return {
    suggest_tasks: t("settings.company.governance.kindLabels.suggestTasks", {
      defaultValue: "Suggested tasks",
    }),
    ask_user_questions: t("settings.company.governance.kindLabels.askUserQuestions", {
      defaultValue: "Ask user questions",
    }),
    request_confirmation: t("settings.company.governance.kindLabels.requestConfirmation", {
      defaultValue: "Confirmations",
    }),
    request_checkbox_confirmation: t(
      "settings.company.governance.kindLabels.requestCheckboxConfirmation",
      { defaultValue: "Checkbox confirmations" },
    ),
    request_item_verdicts: t("settings.company.governance.kindLabels.requestItemVerdicts", {
      defaultValue: "Item verdicts",
    }),
    connection_intent: t("settings.company.governance.kindLabels.connectionIntent", {
      defaultValue: "Connection requests",
    }),
  };
}

/**
 * Sentinel for "no override" — Radix Select disallows empty-string item values.
 * Under the open-default contract (PAP-17280) an absent override *is* the open
 * audience, so this sentinel is what a company sees selected until it
 * deliberately narrows a kind.
 */
export const GOVERNANCE_UNSET = "default";
export type GovernanceSelectValue = typeof GOVERNANCE_UNSET | IssueThreadInteractionResolverPolicy;

export type GovernanceField = "defaultPolicy" | "cap";

/**
 * Only *narrowing* policies are offered. `anyone` is the product default, so
 * requesting it as a default override is a no-op, and capping at `anyone` cannot
 * narrow anything — both collapse into the unset sentinel, which is presented as
 * the visible default.
 */
const NARROWING_POLICIES: readonly IssueThreadInteractionCanonicalResolverPolicy[] = [
  "not_creator",
  "human_only",
];

function unsetLabels(): Record<GovernanceField, string> {
  return {
    defaultPolicy: t("settings.company.governance.unsetDefaultPolicyLabel", {
      defaultValue: "Anyone (default)",
    }),
    cap: t("settings.company.governance.unsetCapLabel", { defaultValue: "No cap" }),
  };
}

function unsetEffects(): Record<GovernanceField, string> {
  return {
    defaultPolicy: t("settings.company.governance.unsetDefaultPolicyEffect", {
      defaultValue:
        "New cards are open — the board or any agent can respond, including the one that asked.",
    }),
    cap: t("settings.company.governance.unsetCapEffect", {
      defaultValue: "A request keeps whatever audience it asks for.",
    }),
  };
}

function defaultPolicyEffects(): Record<IssueThreadInteractionCanonicalResolverPolicy, string> {
  return {
    anyone: unsetEffects().defaultPolicy,
    not_creator: t("settings.company.governance.defaultPolicyEffect.notCreator", {
      defaultValue: "New cards exclude the agent that created them, so the answer comes from someone else.",
    }),
    human_only: t("settings.company.governance.defaultPolicyEffect.humanOnly", {
      defaultValue: "New cards wait for a person on the board. Agents are turned away.",
    }),
  };
}

function capEffects(): Record<IssueThreadInteractionCanonicalResolverPolicy, string> {
  return {
    anyone: unsetEffects().cap,
    not_creator: t("settings.company.governance.capEffect.notCreator", {
      defaultValue: "Even a card that asks for Anyone is narrowed to exclude its creator.",
    }),
    human_only: t("settings.company.governance.capEffect.humanOnly", {
      defaultValue: "Every card of this kind waits for a person, whatever it asked for.",
    }),
  };
}

function governanceOptions(field: GovernanceField): {
  value: GovernanceSelectValue;
  label: string;
  effect: string;
}[] {
  const effects = field === "cap" ? capEffects() : defaultPolicyEffects();
  const labels = unsetLabels();
  const effectsUnset = unsetEffects();
  return [
    { value: GOVERNANCE_UNSET, label: labels[field], effect: effectsUnset[field] },
    ...NARROWING_POLICIES.map((policy) => ({
      value: policy as GovernanceSelectValue,
      label: resolverPolicyLabel(policy),
      effect: effects[policy],
    })),
  ];
}

/**
 * The label a *closed* trigger must show. Derived from the value rather than
 * looked up in the option list so an out-of-list value (a raw `anyone`, say)
 * still renders a complete, truthful label instead of falling back to a lie.
 */
export function governanceValueLabel(field: GovernanceField, value: GovernanceSelectValue): string {
  return value === GOVERNANCE_UNSET ? unsetLabels()[field] : resolverPolicyLabel(value);
}

/**
 * Map a persisted override onto a select value. A stored `anyone` — including
 * the deprecated `board_or_agents` alias — is the open default, so it shows as
 * the unset sentinel rather than as a narrowing override.
 */
export function toGovernanceSelectValue(
  policy: IssueThreadInteractionResolverPolicy | undefined,
): GovernanceSelectValue {
  if (!policy) return GOVERNANCE_UNSET;
  const canonical = normalizeIssueThreadInteractionResolverPolicy(policy);
  return canonical === "anyone" ? GOVERNANCE_UNSET : canonical;
}

/**
 * Apply a single (kind, field) change to a governance map immutably, pruning
 * empty entries so the persisted object stays sparse (only real overrides).
 */
export function applyGovernanceChange(
  current: InteractionResolverGovernance,
  kind: IssueThreadInteractionKind,
  field: GovernanceField,
  value: GovernanceSelectValue,
): InteractionResolverGovernance {
  const next: InteractionResolverGovernance = { ...current };
  const entry = { ...(next[kind] ?? {}) };
  if (value === GOVERNANCE_UNSET) {
    delete entry[field];
  } else {
    entry[field] = value;
  }
  if (entry.defaultPolicy === undefined && entry.cap === undefined) {
    delete next[kind];
  } else {
    next[kind] = entry;
  }
  return next;
}

function GovernanceSelect({
  field,
  value,
  onChange,
  disabled,
  testId,
  ariaLabel,
  mobileLabel,
}: {
  field: GovernanceField;
  value: GovernanceSelectValue;
  onChange: (value: GovernanceSelectValue) => void;
  disabled?: boolean;
  testId?: string;
  ariaLabel: string;
  mobileLabel: string;
}) {
  const options = governanceOptions(field);
  return (
    <div className="min-w-0">
      {/*
       * Below `sm` the governance grid collapses to a single column (see the
       * grid classes on the panel), detaching each select from its column
       * header. Surface a mobile-only inline label so the control stays
       * self-describing for sighted users, and always carry `aria-label` for
       * screen-reader pairing. WCAG 2.1 SC 1.4.10 (Reflow) — design review R2.
       */}
      <span className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wide sm:hidden">
        {mobileLabel}
      </span>
      <Select value={value} onValueChange={(v) => onChange(v as GovernanceSelectValue)} disabled={disabled}>
        <SelectTrigger
          size="sm"
          aria-label={ariaLabel}
          // 208px is sized for the longest label the control can hold —
          // `Anyone except creator` needs ~150px of text room, and 170px only
          // left 122px after padding, gap and chevron, so it clipped even once
          // the effect sentence was gone (PAP-17297).
          className="w-full min-w-0 text-xs sm:w-(--sz-208px)"
          data-testid={testId}
        >
          {/*
           * Explicit children, not the default `<SelectValue />`. Radix portals
           * the selected item's *whole* subtree into an empty value node, which
           * dragged each option's effect sentence into the closed trigger and
           * clipped the selected label (desktop truncated the prose, mobile cut
           * `Anyone (default)` mid-label — PAP-17293/PAP-17297). Passing children
           * sets `valueNodeHasChildren`, which suppresses that portal, so the
           * trigger shows exactly the label and nothing else.
           */}
          <SelectValue>{governanceValueLabel(field, value)}</SelectValue>
        </SelectTrigger>
        {/*
         * Cap the option list so the effect sentences wrap instead of stretching
         * the popover past a ~390px viewport (WCAG 2.1 SC 1.4.10 Reflow).
         */}
        <SelectContent className="max-w-(--sz-280px) sm:max-w-(--sz-360px)">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              // Keyboard typeahead matches on `textValue` when given; without it
              // Radix would match against the effect prose too.
              textValue={option.label}
              className="text-xs"
            >
              {/*
               * Effect preview lives inside the option so the consequence of a
               * narrowing choice is legible at the moment of choosing, not only
               * after saving (PAP-17280).
               */}
              <span className="flex min-w-0 flex-col gap-0.5">
                <span>{option.label}</span>
                <span className="text-(length:--text-micro) text-muted-foreground">
                  {option.effect}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Company-level interaction governance: the per-kind default audience and cap.
 *
 * The open default is the headline — interactions are resolvable by anyone in
 * the company unless a row here narrows them — so the panel only offers
 * narrowing choices and never presents an unrestricted card as board-required
 * (PAP-17280, contract in `doc/SPEC-implementation.md` §9.8.1).
 */
export function InteractionGovernancePanel({
  governance,
  onChange,
  isPending,
  errorMessage,
}: {
  governance: InteractionResolverGovernance;
  onChange: (kind: IssueThreadInteractionKind, field: GovernanceField, value: GovernanceSelectValue) => void;
  isPending?: boolean;
  errorMessage?: string | null;
}) {
  const { t } = useTranslation();
  const kindLabels = interactionKindLabels();
  const columnDefaultPolicy = t("settings.company.governance.columnDefaultPolicy", {
    defaultValue: "Default policy",
  });
  const columnCap = t("settings.company.governance.columnCap", { defaultValue: "Cap" });
  return (
    <div className="space-y-4" data-testid="company-settings-interaction-governance-section">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {t("settings.company.governance.sectionTitle", { defaultValue: "Interaction governance" })}
      </div>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("settings.company.governance.introPrefix", {
            defaultValue: "Thread interactions are open by default:",
          })}{" "}
          <span className="font-medium text-foreground">
            {t("settings.company.governance.introAnyone", { defaultValue: "Anyone" })}
          </span>{" "}
          {t("settings.company.governance.introMiddle", {
            defaultValue:
              "in the organization — the board or any agent, including the one that asked — can respond. Narrow a kind only when you need to.",
          })}{" "}
          <span className="font-medium text-foreground">{columnDefaultPolicy}</span>{" "}
          {t("settings.company.governance.introDefaultPolicyEffect", {
            defaultValue: "is the audience new cards get when the requester does not ask for one;",
          })}{" "}
          <span className="font-medium text-foreground">{columnCap}</span>{" "}
          {t("settings.company.governance.introCapEffect", {
            defaultValue:
              "narrows every request of that kind and can never widen one. Tool-approval confirmations always stay",
          })}{" "}
          <span className="font-medium text-foreground">
            {t("app.interactionAudience.policyLabels.humanOnly", { defaultValue: "Human only" })}
          </span>
          .
        </p>
        {/*
         * Responsive: below `sm` the row collapses to a single column so the
         * two 170px selects never force horizontal overflow on a ~390px
         * viewport (WCAG 2.1 SC 1.4.10 Reflow — design review R2). Each kind
         * then stacks as: label → Default policy → Cap, each full-width with
         * its own inline label. At `sm`+ it restores the aligned 3-col grid.
         */}
        <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-x-4 sm:gap-y-2.5">
          <div className="hidden text-xs font-medium text-muted-foreground uppercase tracking-wide sm:block">
            {t("settings.company.governance.columnKind", { defaultValue: "Kind" })}
          </div>
          <div className="hidden text-xs font-medium text-muted-foreground uppercase tracking-wide sm:block">
            {columnDefaultPolicy}
          </div>
          <div className="hidden text-xs font-medium text-muted-foreground uppercase tracking-wide sm:block">
            {columnCap}
          </div>
          {ISSUE_THREAD_INTERACTION_KINDS.map((kind) => {
            const entry = governance[kind] ?? {};
            const kindLabel = kindLabels[kind];
            return (
              <Fragment key={kind}>
                <div className="text-sm font-medium sm:font-normal">{kindLabel}</div>
                <GovernanceSelect
                  field="defaultPolicy"
                  testId={`governance-${kind}-default`}
                  ariaLabel={t("settings.company.governance.ariaDefaultFor", {
                    kind: kindLabel,
                    defaultValue: `Default resolver audience for ${kindLabel}`,
                  })}
                  mobileLabel={columnDefaultPolicy}
                  value={toGovernanceSelectValue(entry.defaultPolicy)}
                  disabled={isPending}
                  onChange={(v) => onChange(kind, "defaultPolicy", v)}
                />
                <GovernanceSelect
                  field="cap"
                  testId={`governance-${kind}-cap`}
                  ariaLabel={t("settings.company.governance.ariaCapFor", {
                    kind: kindLabel,
                    defaultValue: `Resolver cap for ${kindLabel}`,
                  })}
                  mobileLabel={columnCap}
                  value={toGovernanceSelectValue(entry.cap)}
                  disabled={isPending}
                  onChange={(v) => onChange(kind, "cap", v)}
                />
              </Fragment>
            );
          })}
        </div>
        {errorMessage ? (
          <span className="text-xs text-destructive">{errorMessage}</span>
        ) : null}
      </div>
    </div>
  );
}
