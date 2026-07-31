"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell, Sun, Moon, User, Calendar, Check, Briefcase,
  FileText, ArrowRightCircle, X, AlertCircle, Trash2, RotateCcw, ShieldAlert, Award
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
    // When true the notification is NOT dismissed after the secondary action fires.
    // Use this when the secondary action opens a modal (e.g. "No → timeline edit").
    keepAlive?: boolean;
  };
  autoDismiss?: boolean; // default true
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
      if (notif.autoDismiss !== false && onDismiss) onDismiss(notif.key);
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
      // Only auto-dismiss if the secondary action does NOT want to keep the notification alive
      if (!notif.secondaryAction.keepAlive && onDismiss) onDismiss(notif.key);
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

  const [timelineEditProject, setTimelineEditProject] = useState<any | null>(null);
  const [newEndDate, setNewEndDate] = useState("");           // main project end date
  const [newBabysittingEndDate, setNewBabysittingEndDate] = useState("");
  const [newWarrantyEndDate, setNewWarrantyEndDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleSubmitTimelineEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timelineEditProject) return;
    if (!newEndDate) {
      setEditError("Please select a new proposed main project end date.");
      return;
    }
    setSubmittingEdit(true);
    setEditError(null);
    try {
      const { createTimelineEditRequest, createHireRequest } = await import("@/lib/api");

      // Build a detailed note including whichever dates were provided
      const dateParts: string[] = [];
      dateParts.push(`Main Project End Date: ${new Date(newEndDate).toLocaleDateString()}`);
      if (newBabysittingEndDate)
        dateParts.push(`Babysitting End Date: ${new Date(newBabysittingEndDate).toLocaleDateString()}`);
      if (newWarrantyEndDate)
        dateParts.push(`Warranty End Date: ${new Date(newWarrantyEndDate).toLocaleDateString()}`);

      const requestedDateInfo = `\n` + dateParts.join(" | ");
      const fullNotes = (editNotes || `GM requesting timeline review for project ${timelineEditProject.projectName}`) + requestedDateInfo;

      // The overall proposed end date is the latest of all provided dates
      const proposedDates = [newEndDate, newBabysittingEndDate, newWarrantyEndDate]
        .filter(Boolean)
        .map((d) => new Date(d).getTime());
      const latestEndDate = new Date(Math.max(...proposedDates)).toISOString().split("T")[0];

      await createTimelineEditRequest({
        projectId: timelineEditProject.projectId,
        projectName: timelineEditProject.projectName,
        notes: fullNotes,
        currentStartDate: timelineEditProject.estimatedStartDate,
        currentEndDate: latestEndDate,
      });

      await createHireRequest({
        projectId: timelineEditProject.projectId,
        projectName: timelineEditProject.projectName,
        roleNeeded: "GM Notification",
        quantity: 1,
        startDate: timelineEditProject.estimatedStartDate,
        endDate: latestEndDate,
        notes: `[GM ACTION] Timeline edit requested for ${timelineEditProject.projectName}`,
      });

      // Dismiss the completion notification once the revision request is submitted
      const key = `gm-complete-${timelineEditProject.projectId}`;
      setDismissed((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });

      setTimelineEditProject(null);
      setNewEndDate("");
      setNewBabysittingEndDate("");
      setNewWarrantyEndDate("");
      setEditNotes("");
      setIsNotificationOpen(false);
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setEditError(err.message || "Failed to submit request.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Raw notification state per role
  const [notifications, setNotifications] = useState<ContractExtensionRequest[]>([]);
  const [hireNotifications, setHireNotifications] = useState<HireRequest[]>([]);
  const [gmHireNotifications, setGmHireNotifications] = useState<HireRequest[]>([]);
  const [gmContractNotifications, setGmContractNotifications] = useState<any[]>([]);
  const [gmPendingCompletions, setGmPendingCompletions] = useState<any[]>([]);
  const [pmNotifications, setPmNotifications] = useState<PMNotification[]>([]);
  const [pmPendingCompletions, setPmPendingCompletions] = useState<any[]>([]);
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
        const [reviewed, extensions, allProjects] = await Promise.all([
          getHireRequests(),
          getRequestHistory("HR"),
          getProjects(),
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

        // Filter projects for completion checking (Running, Babysitting, Warranty, Scheduled)
        const activeProjects = (allProjects || []).filter(
          (p) => p && (p.projectStatus === 1 || p.projectStatus === 2 || p.projectStatus === 6 || p.projectStatus === 7)
        );
        setGmPendingCompletions(activeProjects);
      }
      if (userRole === "Marketing") {
        const hires = await getHireRequests("Open");
        setHireNotifications(hires.filter((h) => 
          h.roleNeeded === "Timeline Edit Request" || 
          h.roleNeeded === "Project Deletion Request" || 
          h.roleNeeded === "Project Restoration Request" ||
          h.roleNeeded === "Status Override Notification"
        ));
      }
    } catch {
      setNotifications([]);
      setHireNotifications([]);
      setGmHireNotifications([]);
      setGmContractNotifications([]);
      setGmPendingCompletions([]);
    }
  }, [userRole]);

  const loadPMNotifications = useCallback(async () => {
    if (userRole !== "PM" || !userId) return;
    try {
      const projects = await getProjects();
      setPmNotifications(
        projects.filter((p) => p.isUnread).map((p) => ({ projectId: p.projectId, projectName: p.projectName }))
      );

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const endedProjects = projects.filter((p) => {
        if (p.projectStatus === 3 || p.projectStatus === 4) return false;

        const isPM = p.members?.some(
          (m) => m.userId === userId && 
          (m.role?.toLowerCase() === "pm" || m.role?.toLowerCase().includes("manager")) && 
          m.status === "Assigned"
        );
        if (!isPM) return false;

        let overallEndDate = new Date(p.estimatedEndDate);
        if (p.warrantyDuration > 0 && p.warrantyEndDate) {
          overallEndDate = new Date(p.warrantyEndDate);
        } else if (p.babysittingDuration > 0 && p.babysittingEndDate) {
          overallEndDate = new Date(p.babysittingEndDate);
        }
        overallEndDate.setHours(0, 0, 0, 0);

        return overallEndDate.getTime() <= today.getTime();
      });

      setPmPendingCompletions(endedProjects);
    } catch {
      setPmNotifications([]);
      setPmPendingCompletions([]);
    }
  }, [userRole, userId]);

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

    // ── Marketing: timeline edit requests & action requests ────────────────────────────────
    if (userRole === "Marketing") {
      hireNotifications.forEach((item) => {
        const isProjectDeletion = item.roleNeeded === "Project Deletion Request";
        const isProjectRestoration = item.roleNeeded === "Project Restoration Request";
        const isActionRequest = isProjectDeletion || isProjectRestoration;
        const isStatusOverride = item.roleNeeded === "Status Override Notification";
        const key = `mrkt-req-${item.hireRequestId}`;
        
        feed.push({
          key,
          ts: safeDate(item.createdAt),
          iconBg: isActionRequest ? "bg-red-500/10" : isStatusOverride ? "bg-violet-500/10" : "bg-blue-500/10",
          iconColor: isActionRequest ? "text-red-500" : isStatusOverride ? "text-violet-400" : "text-blue-500",
          icon: isActionRequest ? (isProjectDeletion ? <Trash2 size={14} /> : <RotateCcw size={14} />) : isStatusOverride ? <ShieldAlert size={14} /> : <Calendar size={14} />,
          message: (
            <>
              {isActionRequest ? (isProjectDeletion ? "Project deletion" : "Project restoration") : isStatusOverride ? "Status override" : "Timeline edit"} request for{" "}
              <span className="font-semibold text-[var(--dash-text-heading)]">
                {item.projectName}
              </span>
            </>
          ),
          meta: item.notes?.replace("[TIMELINE EDIT REQUEST] ", "").replace("[PROJECT DELETION REQUEST] ", "").replace("[PROJECT RESTORATION REQUEST] ", "").replace("[STATUS OVERRIDE] ", "") || undefined,
          dateLabel: fmtDate(item.createdAt),
          actionLabel: "Click to review request",
          onAction: async () => {
            setIsNotificationOpen(false);
            // In a real app we might scroll to the exact section, but /dashboard works (auto-redirects to /mrkt)
            router.push("/dashboard");
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

      pmPendingCompletions.forEach((p) => {
        const key = `pm-complete-${p.projectId}`;
        if (dismissed.has(key)) return;

        let overallEndDate = new Date(p.estimatedEndDate);
        if (p.warrantyDuration > 0 && p.warrantyEndDate) {
          overallEndDate = new Date(p.warrantyEndDate);
        } else if (p.babysittingDuration > 0 && p.babysittingEndDate) {
          overallEndDate = new Date(p.babysittingEndDate);
        }
        overallEndDate.setHours(0, 0, 0, 0);

        feed.push({
          key,
          ts: overallEndDate.getTime(),
          iconBg: "bg-red-500/10",
          iconColor: "text-red-500",
          icon: <AlertCircle size={14} />,
          message: (
            <>
              Project{" "}
              <span className="font-semibold text-[var(--dash-text-heading)]">
                {p.projectName}
              </span>{" "}
              warranty timeline has concluded. GM has not marked it as completed.
            </>
          ),
          meta: `Client: ${p.clientOrganization || "Internal"} • Ended On: ${overallEndDate.toLocaleDateString()}`,
          dateLabel: fmtDate(overallEndDate.toISOString()),
          actionLabel: "View details",
          onAction: async () => {
            setIsNotificationOpen(false);
            router.push(`/project/${p.projectId}`);
          },
          autoDismiss: false,
          secondaryAction: {
            label: "Dismiss",
            onAction: () => {
              setDismissed((prev) => new Set([...prev, key]));
            },
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

        const isProjectDeletion = item.roleNeeded === "Project Deletion Request";
        const isProjectRestoration = item.roleNeeded === "Project Restoration Request";
        const isActionRequest = isProjectDeletion || isProjectRestoration;
        const actionLabel = isProjectDeletion ? "deletion" : "restoration";

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
        ) : isActionRequest ? (
          <>
            Project {actionLabel} for{" "}
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
            ? `Note: ${item.notes.replace("[PROJECT DELETION REQUEST] ", "").replace("[PROJECT RESTORATION REQUEST] ", "")}`
            : isTimeline
            ? "Timeline Synchronization"
            : isActionRequest
            ? "Project Action Request"
            : isSelfNotif
            ? undefined
            : `Role: ${item.roleNeeded}`;

        feed.push({
          key,
          ts: safeDate(item.createdAt),
          iconBg: isTimeline || isActionRequest ? "bg-blue-500/10" : isSelfNotif ? "bg-purple-500/10" : item.status === "Fulfilled" ? "bg-emerald-500/10" : "bg-red-500/10",
          iconColor: isTimeline || isActionRequest ? "text-blue-500" : isSelfNotif ? "text-purple-500" : item.status === "Fulfilled" ? "text-emerald-500" : "text-red-500",
          icon: isTimeline ? <Calendar size={14} /> : isActionRequest ? (isProjectDeletion ? <Trash2 size={14} /> : <RotateCcw size={14} />) : <User size={14} />,
          message,
          meta,
          dateLabel: fmtDate(item.createdAt),
          actionLabel: isSelfNotif ? "Click to open project" : isTimeline || isActionRequest ? "Click to view" : "Click to open project",
          onAction: async () => {
            setIsNotificationOpen(false);
            if (item.projectId) router.push(`/project/${item.projectId}`);
            else router.push("/project");
          },
          autoDismiss: false,
          secondaryAction: {
            label: "Dismiss",
            onAction: async () => {
              setGmHireNotifications((prev) =>
                prev.filter((r) => r.hireRequestId !== item.hireRequestId)
              );
            },
          },
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


      // GM: pending project completion checks (End Date <= Today)
      gmPendingCompletions.forEach((p) => {
        const key = `gm-complete-${p.projectId}`;
        if (dismissed.has(key)) return;

        let overallEndDate = new Date(p.estimatedEndDate);
        if (p.warrantyDuration > 0 && p.warrantyEndDate) {
          overallEndDate = new Date(p.warrantyEndDate);
        } else if (p.babysittingDuration > 0 && p.babysittingEndDate) {
          overallEndDate = new Date(p.babysittingEndDate);
        }

        overallEndDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (overallEndDate.getTime() <= today.getTime()) {
          feed.push({
            key,
            ts: overallEndDate.getTime(),
            iconBg: "bg-emerald-500/10",
            iconColor: "text-emerald-500",
            icon: <Award size={14} />,
            message: (
              <>
                Project{" "}
                <span className="font-semibold text-[var(--dash-text-heading)]">
                  {p.projectName}
                </span>{" "}
                has reached overall end date. Confirm completion?
              </>
            ),
            meta: `Client: ${p.clientOrganization || "Internal"} • End Date: ${overallEndDate.toLocaleDateString()}`,
            dateLabel: fmtDate(overallEndDate.toISOString()),
            actionLabel: "Yes, Complete",
            onAction: async () => {
              const { overrideProjectStatus } = await import("@/lib/api");
              await overrideProjectStatus(p.projectId, "completed", false);
              setGmPendingCompletions((prev) => prev.filter((proj) => proj.projectId !== p.projectId));
              window.location.reload();
            },
            autoDismiss: false,
            secondaryAction: {
              label: "No",
              keepAlive: true, // keep the notification visible — the modal handles dismissal after submit
              onAction: () => {
                setTimelineEditProject(p);
                // Pre-fill existing dates so the GM sees what is currently set
                setNewEndDate(p.estimatedEndDate ? p.estimatedEndDate.split("T")[0] : "");
                setNewBabysittingEndDate(p.babysittingEndDate ? p.babysittingEndDate.split("T")[0] : "");
                setNewWarrantyEndDate(p.warrantyEndDate ? p.warrantyEndDate.split("T")[0] : "");
                setEditNotes(`GM declined completion of project "${p.projectName}" after warranty concluded and requested a timeline edit.`);
              },
            },
          });
        }
      });

      // GM: staff project assignment / completion notifications (via UserProject)
      staffNotifications.forEach((n) => {
        if (n.swapReason && (
          n.swapReason.includes("(Project Restoration Request)") ||
          n.swapReason.includes("(Project Deletion Request)") ||
          n.swapReason.includes("(Timeline Edit Request)") ||
          n.swapReason.includes("(Status Override Notification)")
        )) {
          return;
        }

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
          message: n.swapReason && n.swapReason !== "Assigned to project" ? (
            <>{renderFormattedText(n.swapReason)}</>
          ) : isAssigned ? (
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
    gmPendingCompletions,
    pmPendingCompletions,
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
    ...(userRole === "Marketing" ? hireNotifications.map((n) => `mrkt-req-${n.hireRequestId}`) : []),
    ...(userRole === "GM" ? gmHireNotifications.map((n) => `gm-hire-${n.hireRequestId}`) : []),
    ...(userRole === "GM" ? gmContractNotifications.map((n) => `gm-ext-${n.referenceId}`) : []),
    ...(userRole === "GM"
      ? gmPendingCompletions
          .filter((p) => {
            let overallEndDate = new Date(p.estimatedEndDate);
            if (p.warrantyDuration > 0 && p.warrantyEndDate) {
              overallEndDate = new Date(p.warrantyEndDate);
            } else if (p.babysittingDuration > 0 && p.babysittingEndDate) {
              overallEndDate = new Date(p.babysittingEndDate);
            }
            overallEndDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return overallEndDate.getTime() <= today.getTime();
          })
          .map((p) => `gm-complete-${p.projectId}`)
      : []),
    ...(userRole === "PM"
      ? [
          ...pmNotifications.map((n) => `pm-proj-${n.projectId}`),
          ...pmPendingCompletions.map((p) => `pm-complete-${p.projectId}`),
        ]
      : []),
    ...((userRole === "Staff" || userRole === "GM")
      ? staffNotifications.map((n) => `staff-notif-${n.userProjectId ?? n.id}-${n.swapReason}`)
      : []),
  ];

  const hasUnread =
    currentNotifIds.length > 0 && currentNotifIds.some((id) => !readNotifIds.includes(id));
  const unreadCount = currentNotifIds.filter((id) => !readNotifIds.includes(id)).length;

  const handleToggleNotifications = () => {
    if (!isNotificationOpen) {
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
    <>
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

      {timelineEditProject && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
        >
          <div className="relative bg-[#13151a] border border-[#2a2d36] rounded-2xl w-full max-w-lg shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-[18px] font-bold text-white mb-1 tracking-tight">Request Timeline Revision</h3>
            <p className="text-[13px] text-gray-400 mb-4 leading-relaxed">
              Since you chose not to complete{" "}
              <span className="text-[#3b82f6] font-semibold">{timelineEditProject.projectName}</span>, please propose
              updated end dates and submit a revision request to Marketing.
            </p>

            {editError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[12px] font-medium">
                {editError}
              </div>
            )}

            <form onSubmit={handleSubmitTimelineEdit} className="space-y-4">
              {/* ── Main project end date ── */}
              <div>
                <label className="block text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  New Main Project End Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-[#1e2028] border border-[#2a2d36] text-white text-[13px] focus:border-[#3b82f6] focus:outline-none transition-all"
                />
              </div>

              {/* ── Babysitting end date (only shown when project has babysitting) ── */}
              {(timelineEditProject.babysittingDuration > 0 || timelineEditProject.babysittingEndDate) && (
                <div>
                  <label className="block text-[12px] font-semibold text-indigo-400 uppercase tracking-wider mb-1.5">
                    New Babysitting End Date
                    <span className="ml-1 text-[10px] text-gray-500 normal-case">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={newBabysittingEndDate}
                    onChange={(e) => setNewBabysittingEndDate(e.target.value)}
                    min={newEndDate || undefined}
                    className="w-full h-11 px-4 rounded-xl bg-[#1e2028] border border-indigo-900/50 text-white text-[13px] focus:border-indigo-500 focus:outline-none transition-all"
                  />
                  {timelineEditProject.babysittingEndDate && (
                    <p className="text-[10px] text-gray-500 mt-1">
                      Current: {new Date(timelineEditProject.babysittingEndDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {/* ── Warranty end date (only shown when project has warranty) ── */}
              {(timelineEditProject.warrantyDuration > 0 || timelineEditProject.warrantyEndDate) && (
                <div>
                  <label className="block text-[12px] font-semibold text-blue-400 uppercase tracking-wider mb-1.5">
                    New Warranty End Date
                    <span className="ml-1 text-[10px] text-gray-500 normal-case">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={newWarrantyEndDate}
                    onChange={(e) => setNewWarrantyEndDate(e.target.value)}
                    min={newBabysittingEndDate || newEndDate || undefined}
                    className="w-full h-11 px-4 rounded-xl bg-[#1e2028] border border-blue-900/50 text-white text-[13px] focus:border-blue-500 focus:outline-none transition-all"
                  />
                  {timelineEditProject.warrantyEndDate && (
                    <p className="text-[10px] text-gray-500 mt-1">
                      Current: {new Date(timelineEditProject.warrantyEndDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {/* ── Notes ── */}
              <div>
                <label className="block text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Revision Reason / Notes</label>
                <textarea
                  required
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Explain why the timeline needs to be extended..."
                  className="w-full p-4 rounded-xl bg-[#1e2028] border border-[#2a2d36] text-white text-[13px] focus:border-[#3b82f6] focus:outline-none h-24 resize-none transition-all placeholder:text-gray-600"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTimelineEditProject(null);
                    setNewEndDate("");
                    setNewBabysittingEndDate("");
                    setNewWarrantyEndDate("");
                    setEditNotes("");
                    setEditError(null);
                  }}
                  disabled={submittingEdit}
                  className="flex-1 py-2.5 rounded-xl bg-[#1e2028] hover:bg-[#252830] text-[13px] font-bold text-gray-200 border border-[#2a2d36] transition-all disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="flex-1 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-blue-500 text-[13px] font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submittingEdit ? "Submitting..." : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
