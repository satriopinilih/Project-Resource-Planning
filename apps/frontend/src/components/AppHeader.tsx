"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell, Sun, Moon, User, Calendar, Check, Briefcase,
  FileText, ArrowRightCircle, X, AlertCircle
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { getSessionUser } from "@/lib/auth";
import {
  getContractExtensionRequests,
  getProjects,
  getHireRequests,
  HireRequest,
  getRequestHistory,
  getStaffNotifications,
} from "@/lib/api";
import { ContractExtensionRequest, Project } from "@/lib/types";
import { usePathname, useRouter } from "next/navigation";

type Role = "GM" | "HR" | "PM" | "Marketing" | "Staff" | null;

const renderFormattedText = (text: string | undefined) => {
  if (!text) return "";
  const parts = text.split("**");
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <strong key={i} className="font-bold text-[var(--dash-text-heading)]">
          {part}
        </strong>
      );
    }
    return part;
  });
};

// ─── Unified notification data model ─────────────────────────────────────────
interface UnifiedNotif {
  key: string;
  ts: number;          // epoch ms — used for sorting
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
  message: React.ReactNode;
  meta?: React.ReactNode; // sub-text (role / note)
  dateLabel: string;
  actionLabel: string; // primary CTA label
  onAction: () => void;
  // Optional second action (e.g. "Dismiss" next to "Click to open project")
  secondaryAction?: {
    label: string;
    onAction: () => Promise<void> | void;
  };
}

// ─── Role styling maps ────────────────────────────────────────────────────────
const roleBadgeClass: Record<string, string> = {
  GM: "bg-[#7c3aed]/10 text-[#7c3aed] border-[#7c3aed]/20",
  HR: "bg-[#059669]/10 text-[#059669] border-[#059669]/20",
  PM: "bg-[#0ea5e9]/10 text-[#0ea5e9] border-[#0ea5e9]/20",
  Marketing: "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20",
  Staff: "bg-[#64748b]/10 text-[#64748b] border-[#64748b]/20",
};

const avatarBgClass: Record<string, string> = {
  GM: "bg-[#2563eb]",
  HR: "bg-[#059669]",
  PM: "bg-[#0ea5e9]",
  Marketing: "bg-[#f59e0b]",
  Staff: "bg-[#64748b]",
};

interface AppHeaderProps {
  title: string;
  role?: Role;
}

interface PMNotification {
  projectId: number;
  projectName: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeDate = (v: string | null | undefined): number =>
  v ? new Date(v).getTime() || 0 : 0;

const fmtDate = (v: string | null | undefined): string => {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// ─── Unified NotificationItem ─────────────────────────────────────────────────
function NotificationItem({
  notif,
  onDismiss,
}: {
  notif: UnifiedNotif;
  onDismiss?: (key: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [secLoading, setSecLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    setError(false);
    try {
      await notif.onAction();
      if (onDismiss) onDismiss(notif.key);
    } catch (err) {
      console.error("Notification dismiss failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSecondary = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notif.secondaryAction) return;
    setSecLoading(true);
    try {
      await notif.secondaryAction.onAction();
      if (onDismiss) onDismiss(notif.key);
    } catch (err) {
      console.error("Secondary action failed:", err);
    } finally {
      setSecLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading || secLoading}
      className="w-full text-left px-5 py-4 border-b border-[var(--dash-border-subtle)] last:border-b-0 hover:bg-[var(--dash-bg-hover)] transition-colors cursor-pointer group disabled:opacity-60"
    >
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${notif.iconBg} ${notif.iconColor}`}>
          {notif.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-[var(--dash-text-primary)] leading-5">
            {notif.message}
          </p>
          {notif.meta && (
            <p className="text-[11px] text-[var(--dash-text-secondary)] mt-0.5 leading-4">
              {notif.meta}
            </p>
          )}

          {/* Footer: date left, actions right */}
          <div className="flex items-center justify-between mt-1.5 gap-2">
            {notif.dateLabel ? (
              <span className="text-[10px] text-[var(--dash-text-secondary)] opacity-70 shrink-0">
                {notif.dateLabel}
              </span>
            ) : <span />}

            <div className="flex items-center gap-3 shrink-0">
              {error ? (
                <span className="text-[10px] text-red-400 flex items-center gap-1">
                  <AlertCircle size={10} /> Failed — try again
                </span>
              ) : loading ? (
                <span className="text-[10px] text-[var(--dash-text-secondary)]">…</span>
              ) : (
                <span className="text-[10px] font-semibold text-[#2B7FFC]">
                  {notif.actionLabel}
                </span>
              )}

              {/* Secondary action button (e.g. "Dismiss" alongside "Click to open project") */}
              {notif.secondaryAction && (
                <span
                  onClick={handleSecondary}
                  className="text-[10px] font-semibold text-[var(--dash-text-secondary)] hover:text-red-400 transition-colors cursor-pointer"
                >
                  {secLoading ? "…" : notif.secondaryAction.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AppHeader({ title, role }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isDarkMode, toggleDarkMode } = useTheme();

  const [userName, setUserName] = useState("User");
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>(role ?? "Staff");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Raw notification state per role
  const [notifications, setNotifications] = useState<ContractExtensionRequest[]>([]);
  const [hireNotifications, setHireNotifications] = useState<HireRequest[]>([]);
  const [gmHireNotifications, setGmHireNotifications] = useState<HireRequest[]>([]);
  const [gmContractNotifications, setGmContractNotifications] = useState<any[]>([]);
  const [pmNotifications, setPmNotifications] = useState<PMNotification[]>([]);
  const [staffNotifications, setStaffNotifications] = useState<Project[]>([]);

  // Optimistic dismiss tracking — initialized from localStorage SYNCHRONOUSLY via lazy
  // useState so dismissed keys are correct before the very first render. This prevents
  // the race condition where loadNotifications() returns data while dismissed is still
  // an empty Set (the old useEffect approach).
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("dismissed_notif_keys");
      if (stored) return new Set<string>(JSON.parse(stored));
    } catch {}
    return new Set<string>();
  });

  const [readNotifIds, setReadNotifIds] = useState<string[]>([]);

  // Load read_notif_ids from localStorage on mount (badge state).
  // dismissed is already loaded synchronously via lazy useState above.
  useEffect(() => {
    try {
      const stored = localStorage.getItem("read_notif_ids");
      if (stored) setReadNotifIds(JSON.parse(stored));
    } catch {}
  }, []);

  // ─── Data loaders ───────────────────────────────────────────────────────────
  const loadNotifications = useCallback(async () => {
    try {
      if (userRole === "HR") {
        const [pending, hires] = await Promise.all([
          getContractExtensionRequests("Pending"),
          getHireRequests("Open"),
        ]);
        setNotifications(pending);
        setHireNotifications(hires.filter((h) => h.roleNeeded !== "Timeline Edit Request"));
      }
      if (userRole === "GM") {
        const [reviewed, extensions] = await Promise.all([
          getHireRequests(),
          getRequestHistory("HR"),
        ]);
        const filteredHire = reviewed
          .filter((h) => h.status === "Fulfilled" || h.status === "Declined")
          .sort((a, b) => safeDate(b.createdAt) - safeDate(a.createdAt));
        setGmHireNotifications(filteredHire);

        // Only include Contract Extension outcomes — hire request outcomes already
        // appear in gmHireNotifications (from getHireRequests). Including them here
        // too causes the same hire request to show with TWO different keys, so
        // dismissing one leaves the duplicate visible.
        const processed = extensions
          .filter((r: any) => (r.status === "Approved" || r.status === "Declined") && r.requestType === "Contract Extension")
          .sort((a: any, b: any) =>
            safeDate(b.reviewedDate || b.requestedDate) - safeDate(a.reviewedDate || a.requestedDate)
          );
        setGmContractNotifications(processed);
      }
      if (userRole === "Marketing") {
        const hires = await getHireRequests("Open");
        setHireNotifications(hires.filter((h) => h.roleNeeded === "Timeline Edit Request"));
      }
    } catch {
      setNotifications([]);
      setHireNotifications([]);
      setGmHireNotifications([]);
      setGmContractNotifications([]);
    }
  }, [userRole]);

  const loadPMNotifications = useCallback(async () => {
    if (userRole !== "PM") return;
    try {
      const projects = await getProjects();
      setPmNotifications(
        projects.filter((p) => p.isUnread).map((p) => ({ projectId: p.projectId, projectName: p.projectName }))
      );
    } catch {
      setPmNotifications([]);
    }
  }, [userRole]);

  const loadStaffNotifications = useCallback(async () => {
    if ((userRole !== "Staff" && userRole !== "GM") || !userId) return;
    try {
      const data = await getStaffNotifications(userId);
      setStaffNotifications(data.hasUnread ? data.notifications : []);
    } catch {
      setStaffNotifications([]);
    }
  }, [userRole, userId]);

  // ─── Auth effect ────────────────────────────────────────────────────────────
  useEffect(() => {
    const auth = getSessionUser();
    if (auth) {
      if (auth.mustChangePassword && pathname !== "/settings") {
        router.replace("/settings?forcePasswordChange=1");
        return;
      }
      setUserName(auth.userName);
      setUserId(auth.userId);
      setUserRole(role ? role : auth.roles?.[0] ?? "Staff");
    }
  }, [role, pathname, router]);

  // ─── Polling effect ─────────────────────────────────────────────────────────
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (userRole === "HR" || userRole === "GM" || userRole === "Marketing") {
      loadNotifications();
      if (userRole === "GM") loadStaffNotifications();
      timer = setInterval(() => {
        loadNotifications();
        if (userRole === "GM") loadStaffNotifications();
      }, 10000);
    } else if (userRole === "PM") {
      loadPMNotifications();
      timer = setInterval(loadPMNotifications, 15000);
    } else if (userRole === "Staff") {
      if (userId) loadStaffNotifications();
      timer = setInterval(loadStaffNotifications, 15000);
    } else {
      setNotifications([]);
      setHireNotifications([]);
      setPmNotifications([]);
      setStaffNotifications([]);
    }

    return () => { if (timer) clearInterval(timer); };
  }, [userRole, userId, loadNotifications, loadPMNotifications, loadStaffNotifications]);

  // ─── Build unified notification feed ────────────────────────────────────────
  const buildFeed = useCallback((): UnifiedNotif[] => {
    const feed: UnifiedNotif[] = [];

    // ── HR: pending hire requests ─────────────────────────────────────────
    if (userRole === "HR") {
      hireNotifications.forEach((item) => {
        const key = `hr-hire-${item.hireRequestId}`;
        feed.push({
          key,
          ts: safeDate(item.createdAt),
          iconBg: "bg-emerald-500/10",
          iconColor: "text-emerald-500",
          icon: <Briefcase size={14} />,
          message: (
            <>
              New hire request for{" "}
              <span className="font-semibold text-[var(--dash-text-heading)]">
                {item.projectName}
              </span>
            </>
          ),
          meta: `By ${item.requestedBy || "GM"} • Role: ${item.roleNeeded}`,
          dateLabel: fmtDate(item.createdAt),
          actionLabel: "Click to review",
          onAction: async () => {
            setIsNotificationOpen(false);
            router.push("/dashboard#hire-requests-section");
          },
        });
      });

      // HR: pending contract extensions
      notifications.forEach((item) => {
        const key = `hr-ext-${item.id}`;
        feed.push({
          key,
          ts: safeDate(item.requestedOn),
          iconBg: "bg-amber-500/10",
          iconColor: "text-amber-500",
          icon: <FileText size={14} />,
          message: (
            <>
              Contract extension request for{" "}
              <span className="font-semibold text-[var(--dash-text-heading)]">
                {item.employeeName}
              </span>
            </>
          ),
          meta: `By ${item.requestedByName || item.requestedBy || "GM"}`,
          dateLabel: fmtDate(item.requestedOn),
          actionLabel: "Click to review",
          onAction: async () => {
            setIsNotificationOpen(false);
            router.push("/dashboard#pending-contract-extension-section");
          },
        });
      });
    }

    // ── Marketing: timeline edit requests ────────────────────────────────
    if (userRole === "Marketing") {
      hireNotifications.forEach((item) => {
        const key = `mrkt-timeline-${item.hireRequestId}`;
        feed.push({
          key,
          ts: safeDate(item.createdAt),
          iconBg: "bg-blue-500/10",
          iconColor: "text-blue-500",
          icon: <Calendar size={14} />,
          message: (
            <>
              Timeline edit request for{" "}
              <span className="font-semibold text-[var(--dash-text-heading)]">
                {item.projectName}
              </span>
            </>
          ),
          meta: item.notes?.replace("[TIMELINE EDIT REQUEST] ", "") || undefined,
          dateLabel: fmtDate(item.createdAt),
          actionLabel: "Click to review request",
          onAction: async () => {
            setIsNotificationOpen(false);
            router.push("/dashboard#timeline-edit-requests-section");
          },
        });
      });
    }

    // ── PM: project assignments ──────────────────────────────────────────
    if (userRole === "PM") {
      pmNotifications.forEach((n) => {
        const key = `pm-proj-${n.projectId}`;
        feed.push({
          key,
          ts: Date.now(), // PM notifications don't carry a timestamp
          iconBg: "bg-sky-500/10",
          iconColor: "text-sky-500",
          icon: <Briefcase size={14} />,
          message: (
            <>
              You have been assigned as PM to project:{" "}
              <span className="font-semibold text-[var(--dash-text-heading)]">
                {n.projectName}
              </span>
            </>
          ),
          dateLabel: "",
          actionLabel: "Click to view details",
          onAction: async () => {
            const { markProjectAsRead } = await import("@/lib/api");
            await markProjectAsRead(n.projectId);
            setPmNotifications((prev) => prev.filter((p) => p.projectId !== n.projectId));
            setIsNotificationOpen(false);
            router.push(`/project/${n.projectId}`);
          },
        });
      });
    }

    // ── GM: fulfilled/declined hire requests ─────────────────────────────
    if (userRole === "GM") {
      gmHireNotifications.forEach((item) => {
        const key = `gm-hire-${item.hireRequestId}`;
        const isTimeline = item.roleNeeded === "Timeline Edit Request";
        const isSelfNotif = item.roleNeeded === "GM Notification";

        const message: React.ReactNode = isSelfNotif ? (
          <>{item.notes}</>
        ) : isTimeline ? (
          <>
            Timeline edit for{" "}
            <span className="font-semibold text-[var(--dash-text-heading)]">{item.projectName}</span>{" "}
            was{" "}
            <span className={`font-semibold ${item.status === "Fulfilled" ? "text-emerald-500" : "text-red-500"}`}>
              {item.status === "Fulfilled" ? "Approved" : "Declined"}
            </span>{" "}
            by Marketing.
          </>
        ) : (
          <>
            Hire request for{" "}
            <span className="font-semibold text-[var(--dash-text-heading)]">{item.projectName}</span>{" "}
            is{" "}
            <span className={`font-semibold ${item.status === "Fulfilled" ? "text-emerald-500" : "text-red-500"}`}>
              {item.status === "Fulfilled" ? "Fulfilled" : "Declined"}
            </span>
            .
          </>
        );

        const meta =
          item.status === "Declined" && item.notes && !isSelfNotif
            ? `Note: ${item.notes}`
            : isTimeline
            ? "Timeline Synchronization"
            : isSelfNotif
            ? undefined
            : `Role: ${item.roleNeeded}`;

        feed.push({
          key,
          ts: safeDate(item.createdAt),
          iconBg: isTimeline ? "bg-blue-500/10" : isSelfNotif ? "bg-purple-500/10" : item.status === "Fulfilled" ? "bg-emerald-500/10" : "bg-red-500/10",
          iconColor: isTimeline ? "text-blue-500" : isSelfNotif ? "text-purple-500" : item.status === "Fulfilled" ? "text-emerald-500" : "text-red-500",
          icon: isTimeline ? <Calendar size={14} /> : <User size={14} />,
          message,
          meta,
          dateLabel: fmtDate(item.createdAt),
          actionLabel: isSelfNotif ? "Click to open project" : isTimeline ? "Click to view" : "Click to open project",
          onAction: async () => {
            setIsNotificationOpen(false);
            if (item.projectId) router.push(`/project/${item.projectId}`);
            else router.push("/project");
          },
          // Regular hire outcomes: also show a separate Dismiss button
          ...(!isSelfNotif && !isTimeline ? {
            secondaryAction: {
              label: "Dismiss",
              onAction: async () => {
                setGmHireNotifications((prev) =>
                  prev.filter((r) => r.hireRequestId !== item.hireRequestId)
                );
              },
            },
          } : {}),
        });
      });

      // GM: contract extension AND hire request outcomes (both come from getRequestHistory)
      gmContractNotifications.forEach((item: any) => {
        const key = `gm-ext-${item.referenceId}`;
        const isHire = item.requestType === "Hire New Person";
        const statusLabel = isHire
          ? item.status === "Approved" || item.status === "Fulfilled" ? "fulfilled" : "declined"
          : item.status === "Approved" ? "approved" : "declined";

        feed.push({
          key,
          ts: safeDate(item.reviewedDate || item.requestedDate),
          iconBg: (item.status === "Approved" || item.status === "Fulfilled") ? "bg-emerald-500/10" : "bg-red-500/10",
          iconColor: (item.status === "Approved" || item.status === "Fulfilled") ? "text-emerald-500" : "text-red-500",
          icon: isHire ? <Briefcase size={14} /> : <FileText size={14} />,
          message: (
            <>
              {isHire ? "Hire request" : "Contract extension"} for{" "}
              <span className="font-semibold text-[var(--dash-text-heading)]">
                {item.employeeName !== "-" ? item.employeeName : item.projectName || "—"}
              </span>{" "}
              was{" "}
              <span className={`font-semibold ${(item.status === "Approved" || item.status === "Fulfilled") ? "text-emerald-500" : "text-red-500"}`}>
                {statusLabel}
              </span>{" "}
              by HR.
            </>
          ),
          meta:
            item.status === "Declined" && item.reviewNote && item.reviewNote !== "-"
              ? `Note: ${item.reviewNote}`
              : item.projectName && item.projectName !== "-"
              ? `Project: ${item.projectName}`
              : undefined,
          dateLabel: fmtDate(item.reviewedDate || item.requestedDate),
          actionLabel: "Dismiss",
          onAction: async () => {
            setGmContractNotifications((prev) =>
              prev.filter((r: any) => r.referenceId !== item.referenceId)
            );
          },
        });
      });


      // GM: staff project assignment / completion notifications (via UserProject)
      staffNotifications.forEach((n) => {
        const uniqueId = n.userProjectId ?? n.id;
        const key = `staff-notif-${uniqueId}-${n.swapReason}`;
        feed.push({
          key,
          ts: Date.now(), // no timestamp on these
          iconBg: "bg-blue-500/10",
          iconColor: "text-blue-500",
          icon: <User size={14} />,
          message: <>{renderFormattedText(n.swapReason)}</>,
          dateLabel: "",
          actionLabel: "Click to dismiss",
          onAction: async () => {
            const { markNotificationAsRead, markProjectAsRead } = await import("@/lib/api");
            if (n.userProjectId) {
              await markNotificationAsRead(n.userProjectId);
            } else {
              await markProjectAsRead(Number(n.id));
            }
            setStaffNotifications((prev) =>
              prev.filter((s) => (s.userProjectId ? s.userProjectId !== n.userProjectId : s.id !== n.id))
            );
          },
        });
      });
    }

    // ── Staff: own assignment notifications ──────────────────────────────
    if (userRole === "Staff") {
      staffNotifications.forEach((n) => {
        const uniqueId = n.userProjectId ?? n.id;
        const key = `staff-notif-${uniqueId}-${n.swapReason}`;
        const isAssigned = n.swapReason === "Assigned to project" || n.status !== "Completed";
        feed.push({
          key,
          ts: Date.now(),
          iconBg: isAssigned ? "bg-emerald-500/10" : "bg-amber-500/10",
          iconColor: isAssigned ? "text-emerald-500" : "text-amber-500",
          icon: <Briefcase size={14} />,
          message: isAssigned ? (
            <>
              Congrats, you have been assigned to Project{" "}
              <span className="font-semibold text-[var(--dash-text-heading)]">{n.name}</span> by the GM.
            </>
          ) : (
            <>
              Your assignment on Project{" "}
              <span className="font-semibold text-[var(--dash-text-heading)]">{n.name}</span> has been
              marked as completed/reassigned by the GM.
            </>
          ),
          dateLabel: "",
          actionLabel: "Click to dismiss",
          onAction: async () => {
            const { markNotificationAsRead, markProjectAsRead } = await import("@/lib/api");
            if (n.userProjectId) {
              await markNotificationAsRead(n.userProjectId);
            } else {
              await markProjectAsRead(Number(n.id));
            }
            setStaffNotifications((prev) =>
              prev.filter((s) => (s.userProjectId ? s.userProjectId !== n.userProjectId : s.id !== n.id))
            );
          },
        });
      });
    }

    // ── Global sort: newest first, then filter already-dismissed ─────────
    return feed
      .filter((f) => !dismissed.has(f.key))
      .sort((a, b) => b.ts - a.ts);
  }, [
    userRole,
    notifications,
    hireNotifications,
    gmHireNotifications,
    gmContractNotifications,
    pmNotifications,
    staffNotifications,
    dismissed,
    router,
  ]);

  // Persist dismissed keys to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("dismissed_notif_keys", JSON.stringify([...dismissed]));
    } catch {}
  }, [dismissed]);

  // Optimistic dismiss handler passed to each NotificationItem
  const handleDismiss = useCallback((key: string) => {
    setDismissed((prev) => new Set([...prev, key]));
  }, []);

  // ─── Badge state ────────────────────────────────────────────────────────────
  const currentNotifIds = [
    ...(userRole === "HR" ? notifications.map((n) => `hr-ext-${n.id}`) : []),
    ...(userRole === "HR" ? hireNotifications.map((n) => `hr-hire-${n.hireRequestId}`) : []),
    ...(userRole === "Marketing" ? hireNotifications.map((n) => `mrkt-timeline-${n.hireRequestId}`) : []),
    ...(userRole === "GM" ? gmHireNotifications.map((n) => `gm-hire-${n.hireRequestId}`) : []),
    ...(userRole === "GM" ? gmContractNotifications.map((n) => `gm-ext-${n.referenceId}`) : []),
    ...(userRole === "PM" ? pmNotifications.map((n) => `pm-proj-${n.projectId}`) : []),
    ...((userRole === "Staff" || userRole === "GM")
      ? staffNotifications.map((n) => `staff-notif-${n.userProjectId ?? n.id}-${n.swapReason}`)
      : []),
  ];

  const hasUnread =
    currentNotifIds.length > 0 && currentNotifIds.some((id) => !readNotifIds.includes(id));
  const unreadCount = currentNotifIds.filter((id) => !readNotifIds.includes(id)).length;

  const handleToggleNotifications = () => {
    if (!isNotificationOpen) {
      if (userRole === "HR" || userRole === "Marketing" || userRole === "GM") loadNotifications();
      if (userRole === "PM") loadPMNotifications();
      if (userRole === "Staff" || userRole === "GM") loadStaffNotifications();

      if (currentNotifIds.length > 0) {
        const newReadIds = Array.from(new Set([...readNotifIds, ...currentNotifIds]));
        setReadNotifIds(newReadIds);
        localStorage.setItem("read_notif_ids", JSON.stringify(newReadIds));
      }
    }
    setIsNotificationOpen((prev) => !prev);
  };

  const badgeClass = roleBadgeClass[userRole] ?? roleBadgeClass["Staff"];
  const avatarClass = avatarBgClass[userRole] ?? avatarBgClass["Staff"];

  const feed = buildFeed();

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between h-[80px] px-8 bg-[var(--dash-bg-header)] backdrop-blur-xl border-b border-[var(--dash-border)] transition-colors duration-300">
      {/* Page Title */}
      <h2 className="text-[20px] font-bold text-[var(--dash-text-heading)] tracking-tight">
        {title}
      </h2>

      {/* Right section */}
      <div className="flex items-center gap-6">
        <div className="relative">
          {/* Bell button */}
          <button
            onClick={handleToggleNotifications}
            className="relative p-2.5 rounded-xl text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] transition-all duration-200 cursor-pointer"
          >
            <Bell size={22} strokeWidth={1.8} />
            {hasUnread && (
              <>
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#f59e0b] rounded-full border-2 border-[var(--dash-bg-header)] animate-pulse" />
                <span className="absolute -bottom-0.5 -left-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[var(--dash-bg-header)] leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              </>
            )}
          </button>

          {/* Dropdown */}
          {isNotificationOpen && (
            <div className="absolute right-[-10px] mt-3 w-[340px] rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Header */}
              <div className="px-5 py-4 border-b border-[var(--dash-border-subtle)] bg-[var(--dash-bg-header)]/50 flex items-center justify-between">
                <h3 className="text-[16px] font-bold text-[var(--dash-text-heading)] tracking-tight">
                  Notifications
                </h3>
                {feed.length > 0 && (
                  <span className="text-[11px] font-semibold text-[var(--dash-text-secondary)] bg-[var(--dash-bg-hover)] px-2 py-0.5 rounded-full">
                    {feed.length}
                  </span>
                )}
              </div>

              {/* Feed */}
              {feed.length === 0 ? (
                <div className="px-4 py-10 text-center text-[13px] text-[var(--dash-text-secondary)]">
                  No notifications
                </div>
              ) : (
                <div className="max-h-[360px] overflow-y-auto">
                  {/* PM: "view all" footer when > 3 */}
                  {userRole === "PM" && feed.length > 3
                    ? feed.slice(0, 3).map((n) => (
                        <NotificationItem key={n.key} notif={n} onDismiss={handleDismiss} />
                      ))
                    : feed.map((n) => (
                        <NotificationItem key={n.key} notif={n} onDismiss={handleDismiss} />
                      ))}

                  {userRole === "PM" && feed.length > 3 && (
                    <button
                      onClick={() => {
                        setIsNotificationOpen(false);
                        router.push("/dashboard/pm/notifications");
                      }}
                      className="w-full px-4 py-3 text-center text-[13px] font-semibold text-[#2B7FFC] cursor-pointer hover:bg-[var(--dash-bg-hover)] transition-colors border-t border-[var(--dash-border)]"
                    >
                      View All Notifications ({feed.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2.5 rounded-xl text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] transition-all duration-200 cursor-pointer"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun size={22} strokeWidth={1.8} /> : <Moon size={22} strokeWidth={1.8} />}
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-[var(--dash-border)]" />

        {/* User info */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[15px] font-bold text-[var(--dash-text-heading)] leading-tight">
              {userName}
            </p>
            <p className="text-[12px] text-[var(--dash-text-faint)] font-medium mt-0.5">
              {userRole}
            </p>
          </div>
          {/* Avatar */}
          <div className="relative">
            <div
              className={`flex items-center justify-center w-11 h-11 rounded-full ${avatarClass} text-white shadow-[0_2px_8px_rgba(0,0,0,0.2)]`}
            >
              <User size={22} strokeWidth={2} />
            </div>
            {hasUnread && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#f59e0b] rounded-full border-2 border-[var(--dash-bg-header)]" />
            )}
          </div>
          {/* Role Pill */}
          <div className={`px-3 py-1.5 rounded-full text-[13px] font-bold border ${badgeClass}`}>
            {userRole}
          </div>
        </div>
      </div>
    </header>
  );
}
