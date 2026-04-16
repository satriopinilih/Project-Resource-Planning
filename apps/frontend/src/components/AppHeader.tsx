"use client";

import { useState, useEffect } from "react";
import { Bell, Sun, Moon, User, Check, X, Calendar } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { getSessionUser } from "@/lib/auth";
import { getContractExtensionRequests, getProjects, getHireRequests, HireRequest, getRequestHistory } from "@/lib/api";
import { ContractExtensionRequest } from "@/lib/types";
import { usePathname, useRouter } from "next/navigation";

type Role = "GM" | "HR" | "PM" | "Marketing" | "Staff" | null;

const roleColors: Record<string, { bg: string; text: string; border: string; avatar: string }> = {
  GM: { bg: "#7c3aed/10", text: "#7c3aed", border: "#7c3aed/20", avatar: "#2563eb" },
  HR: { bg: "#059669/10", text: "#059669", border: "#059669/20", avatar: "#059669" },
  PM: { bg: "#0ea5e9/10", text: "#0ea5e9", border: "#0ea5e9/20", avatar: "#0ea5e9" },
  Marketing: { bg: "#f59e0b/10", text: "#f59e0b", border: "#f59e0b/20", avatar: "#f59e0b" },
  Staff: { bg: "#64748b/10", text: "#64748b", border: "#64748b/20", avatar: "#64748b" },
};

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

export default function AppHeader({ title, role }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [userName, setUserName] = useState("User");
  const [userRole, setUserRole] = useState<string>(role ?? "Staff");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const [notifications, setNotifications] = useState<ContractExtensionRequest[]>([]);
  const [hireNotifications, setHireNotifications] = useState<HireRequest[]>([]);
  const [gmHireNotifications, setGmHireNotifications] = useState<HireRequest[]>([]);
  const [gmContractNotifications, setGmContractNotifications] = useState<any[]>([]);
  const [pmNotifications, setPmNotifications] = useState<PMNotification[]>([]);

  const [readNotifIds, setReadNotifIds] = useState<string[]>([]);
  
  useEffect(() => {
    try {
      const stored = localStorage.getItem('read_notif_ids');
      if (stored) setReadNotifIds(JSON.parse(stored));
    } catch {}
  }, []);

  const loadNotifications = async () => {
    try {
      if (userRole === "HR") {
        const pending = await getContractExtensionRequests("Pending");
        setNotifications(pending);
        const hires = await getHireRequests('Open');
        // ❌ Filter OUT timeline requests for HR
        setHireNotifications(hires.filter(h => h.roleNeeded !== 'Timeline Edit Request'));
      }
      if (userRole === "GM") {
        const reviewed = await getHireRequests();
        setGmHireNotifications(reviewed.filter((h) => h.status === 'Fulfilled' || h.status === 'Declined'));
        const extensions = await getRequestHistory('HR');
        const processed = extensions
          .filter((r: any) => r.status === 'Approved' || r.status === 'Declined')
          .sort((a: any, b: any) => {
             const dateA = new Date(a.reviewedDate || a.requestedDate).getTime();
             const dateB = new Date(b.reviewedDate || b.requestedDate).getTime();
             return dateB - dateA;
          });
        setGmContractNotifications(processed);
      }
      if (userRole === "Marketing") {
        // ✅ Load timeline edit requests for Marketing
        // We reuse the setHireNotifications or create a new state? 
        // Let's reuse setHireNotifications for Marketing but map it to TimelineEditRequest
        const hires = await getHireRequests('Open');
        setHireNotifications(hires.filter(h => h.roleNeeded === 'Timeline Edit Request'));
      }
    } catch {
      setNotifications([]);
      setHireNotifications([]);
      setGmHireNotifications([]);
      setGmContractNotifications([]);
    }
  };

  const loadPMNotifications = async () => {
    // Only load if explicit PM role string check passes
    if (userRole !== "PM") return;
    try {
      const projects = await getProjects();
      
      const newNotifs: PMNotification[] = projects
        .filter(p => p.isUnread)
        .map(p => ({ projectId: p.projectId, projectName: p.projectName }));
        
      setPmNotifications(newNotifs);
    } catch {
      setPmNotifications([]);
    }
  };

  useEffect(() => {
    const auth = getSessionUser();
    if (auth) {
      if (auth.mustChangePassword && pathname !== '/settings') {
        router.replace('/settings?forcePasswordChange=1');
        return;
      }
      setUserName(auth.userName);
      if (!role) {
        // Detect role from session if not passed as prop
        const r = auth.roles?.[0] ?? "Staff";
        setUserRole(r);
      } else {
        setUserRole(role);
      }
    }
  }, [role, pathname, router]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (userRole === "HR" || userRole === "GM" || userRole === "Marketing") {
      loadNotifications();
      timer = setInterval(loadNotifications, 10000);
    } else if (userRole === "PM") {
      loadPMNotifications();
      timer = setInterval(loadPMNotifications, 15000);
    } else {
      setNotifications([]);
      setHireNotifications([]);
      setPmNotifications([]);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [userRole]);

  const handlePMNotificationClick = async (notif: PMNotification) => {
    try {
      const { markProjectAsRead } = await import("@/lib/api");
      await markProjectAsRead(notif.projectId);
      
      setPmNotifications(prev => prev.filter(n => n.projectId !== notif.projectId));
      setIsNotificationOpen(false);
      router.push(`/project/${notif.projectId}`);
    } catch (err) {
      console.error("Failed to mark notification as read", err);
      setIsNotificationOpen(false);
      router.push(`/project/${notif.projectId}`);
    }
  };

  const currentNotifIds = [
    ...(userRole === "HR" ? notifications.map(n => `hr-ext-${n.id}`) : []),
    ...(userRole === "HR" ? hireNotifications.map(n => `hr-hire-${n.hireRequestId}`) : []),
    ...(userRole === "Marketing" ? hireNotifications.map(n => `mrkt-timeline-${n.hireRequestId}`) : []),
    ...(userRole === "GM" ? gmHireNotifications.map(n => `gm-hire-${n.hireRequestId}`) : []),
    ...(userRole === "GM" ? gmContractNotifications.map(n => `gm-ext-${n.referenceId}`) : []),
    ...(userRole === "PM" ? pmNotifications.map(n => `pm-proj-${n.projectId}`) : [])
  ];

  const hasUnread = currentNotifIds.length > 0 && currentNotifIds.some(id => !readNotifIds.includes(id));
  const unreadCount = currentNotifIds.filter(id => !readNotifIds.includes(id)).length;

  const handleToggleNotifications = () => {
    if (!isNotificationOpen) {
      if (userRole === "HR" || userRole === "Marketing" || userRole === "GM") {
        loadNotifications();
      }
      if (userRole === "PM") loadPMNotifications();
      
      // Mark as read
      if (currentNotifIds.length > 0) {
        const newReadIds = Array.from(new Set([...readNotifIds, ...currentNotifIds]));
        setReadNotifIds(newReadIds);
        localStorage.setItem('read_notif_ids', JSON.stringify(newReadIds));
      }
    }
    setIsNotificationOpen((prev) => !prev);
  };

  const handleHRHireNotificationClick = () => {
    setIsNotificationOpen(false);
    router.push('/dashboard#hire-requests-section');
  };

  const handleHRExtensionNotificationClick = () => {
    setIsNotificationOpen(false);
    router.push('/dashboard#pending-contract-extension-section');
  };

  const handleGMHireOutcomeClick = (item: HireRequest) => {
    setIsNotificationOpen(false);
    if (item.projectId) {
      router.push(`/project/${item.projectId}`);
      return;
    }
    router.push('/project');
  };

  const badgeClass = roleBadgeClass[userRole] ?? roleBadgeClass["Staff"];
  const avatarClass = avatarBgClass[userRole] ?? avatarBgClass["Staff"];

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between h-[80px] px-8 bg-[var(--dash-bg-header)] backdrop-blur-xl border-b border-[var(--dash-border)] transition-colors duration-300">
      {/* Page Title */}
      <h2 className="text-[20px] font-bold text-[var(--dash-text-heading)] tracking-tight">
        {title}
      </h2>

      {/* Right section */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <button
            onClick={handleToggleNotifications}
            className="relative p-2.5 rounded-xl text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] transition-all duration-200 cursor-pointer"
          >
            <Bell size={22} strokeWidth={1.8} />
            {hasUnread && (
              <>
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#f59e0b] rounded-full border-2 border-[var(--dash-bg-header)] animate-pulse" />
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[var(--dash-bg-header)] leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </>
            )}
          </button>

          {isNotificationOpen && (
            <div className="absolute right-[-10px] mt-3 w-[320px] rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-5 py-4 border-b border-[var(--dash-border-subtle)] bg-[var(--dash-bg-header)]/50">
                <h3 className="text-[20px] font-bold text-[var(--dash-text-heading)] tracking-tight">Notifications</h3>
              </div>

              {userRole === "HR" && (notifications.length > 0 || hireNotifications.length > 0) && (
                <div className="max-h-72 overflow-y-auto">
                  {hireNotifications.slice(0, 4).map((item) => (
                    <button
                      key={`hire-${item.hireRequestId}`}
                      onClick={handleHRHireNotificationClick}
                      className="w-full text-left px-4 py-3 border-b border-[var(--dash-border-subtle)] hover:bg-[var(--dash-bg-hover)] transition-colors cursor-pointer"
                    >
                      <p className="text-[13px] text-[var(--dash-text-primary)] leading-5">
                        New hire request for <span className="font-semibold text-[var(--dash-text-heading)]">{item.projectName}</span>
                      </p>
                      <p className="text-[12px] text-[var(--dash-text-secondary)] mt-1">
                        Requested by {item.requestedBy || 'GM'} • Role needed: {item.roleNeeded}
                      </p>
                    </button>
                  ))}
                  {notifications.slice(0, 6).map((item) => (
                    <button
                      key={item.id}
                      onClick={handleHRExtensionNotificationClick}
                      className="w-full text-left px-4 py-3 border-b border-[var(--dash-border-subtle)] last:border-b-0 hover:bg-[var(--dash-bg-hover)] transition-colors cursor-pointer"
                    >
                      <p className="text-[13px] text-[var(--dash-text-primary)] leading-5">
                        Contract extension request for <span className="font-semibold text-[var(--dash-text-heading)]">{item.employeeName}</span>
                      </p>
                      <p className="text-[12px] text-[var(--dash-text-secondary)] mt-1">
                        Requested by {item.requestedByName || item.requestedBy || "GM"}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {userRole === "Marketing" && hireNotifications.length > 0 && (
                <div className="max-h-[400px] overflow-y-auto">
                  {hireNotifications.map((item) => (
                    <button
                      key={`mrkt-${item.hireRequestId}`}
                      onClick={() => {
                        setIsNotificationOpen(false);
                        if (item.projectId) router.push(`/project/${item.projectId}`);
                        else router.push('/project');
                      }}
                      className="w-full text-left px-5 py-4 border-b border-[var(--dash-border-subtle)] hover:bg-[var(--dash-bg-hover)] transition-all duration-300"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">Timeline Request</span>
                      </div>
                      <p className="text-[14px] font-semibold text-[var(--dash-text-heading)] leading-tight mb-1">
                        {item.projectName}
                      </p>
                      <p className="text-[12.5px] text-[var(--dash-text-secondary)] mb-4 line-clamp-3 leading-relaxed">
                        "{item.notes.replace('[TIMELINE EDIT REQUEST] ', '')}"
                      </p>
                      <p className="text-[12px] text-[#2B7FFC] mt-1 font-semibold">Click to open project</p>
                    </button>
                  ))}
                </div>
              )}

              {userRole === "PM" && pmNotifications.length > 0 && (
                <div className="max-h-72 overflow-y-auto">
                  {/* LIMIT 3 NOTIFICATIONS (Newest First) */}
                  {pmNotifications.slice().reverse().slice(0, 3).map((n) => (
                    <div
                      key={n.projectId}
                      onClick={() => handlePMNotificationClick(n)}
                      className="px-4 py-3 border-b border-[var(--dash-border-subtle)] hover:bg-[var(--dash-bg-hover)] transition-colors cursor-pointer"
                    >
                      <p className="text-[13px] text-[var(--dash-text-primary)] leading-5">
                        You have been assigned as PM to project: <span className="font-semibold text-[var(--dash-text-heading)]">{n.projectName}</span>
                      </p>
                      <p className="text-[12px] text-[#2B7FFC] mt-1 font-semibold">
                        Click to view details
                      </p>
                    </div>
                  ))}

                  {pmNotifications.length > 3 && (
                    <div
                      onClick={() => {
                        setIsNotificationOpen(false);
                        router.push('/dashboard/pm/notifications');
                      }}
                      className="px-4 py-3 text-center text-[13px] font-semibold text-[#2B7FFC] cursor-pointer hover:bg-[var(--dash-bg-hover)] transition-colors border-t border-[var(--dash-border)]"
                    >
                      View All Notifications ({pmNotifications.length})
                    </div>
                  )}
                </div>
              )}

              {userRole === "GM" && (gmHireNotifications.length > 0 || gmContractNotifications.length > 0) && (
                <div className="max-h-72 overflow-y-auto">
                  {gmHireNotifications.slice(0, 6).map((item) => {
                    if (item.roleNeeded === 'GM Notification') {
                      return (
                        <button
                          key={`gm-self-${item.hireRequestId}`}
                          onClick={() => {
                            setIsNotificationOpen(false);
                            if (item.projectId) router.push(`/project/${item.projectId}`);
                            else router.push('/project');
                          }}
                          className="w-full text-left px-5 py-3.5 border-b border-[var(--dash-border-subtle)] hover:bg-[var(--dash-bg-hover)] transition-colors cursor-pointer"
                        >
                          <p className="text-[13px] text-[var(--dash-text-primary)] leading-5">
                            {item.notes}
                          </p>
                          <p className="text-[11px] text-[var(--dash-text-secondary)] mt-1">Click to open project</p>
                        </button>
                      );
                    }
                    const isTimeline = item.roleNeeded === 'Timeline Edit Request';
                    return (
                      <button
                        key={`gm-hire-${item.hireRequestId}`}
                        onClick={() => handleGMHireOutcomeClick(item)}
                        className="w-full text-left px-5 py-3.5 border-b border-[var(--dash-border-subtle)] last:border-b-0 hover:bg-[var(--dash-bg-hover)] transition-colors cursor-pointer group"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 p-1.5 rounded-lg ${isTimeline ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                            {isTimeline ? <Calendar size={14} /> : <User size={14} />}
                          </div>
                          <div>
                            <p className="text-[13px] text-[var(--dash-text-primary)] leading-5">
                              {isTimeline ? (
                                <>Timeline edit for <span className="font-semibold text-[var(--dash-text-heading)]">{item.projectName}</span> was <span className={`font-semibold ${item.status === 'Fulfilled' ? 'text-emerald-500' : 'text-red-500'}`}>{item.status === 'Fulfilled' ? 'Approved' : 'Declined'}</span> by Marketing.</>
                              ) : (
                                <>Hire request for <span className="font-semibold text-[var(--dash-text-heading)]">{item.projectName}</span> is <span className={`font-semibold ${item.status === 'Fulfilled' ? 'text-emerald-500' : 'text-red-500'}`}>{item.status === 'Fulfilled' ? 'Fulfilled' : 'Declined'}</span>.</>
                              )}
                            </p>
                            <p className="text-[11px] text-[var(--dash-text-secondary)] mt-1 opacity-70">
                              {isTimeline ? 'Timeline Synchronization' : `Role: ${item.roleNeeded}`}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {gmContractNotifications.slice(0, 6).map((item) => (
                    <div key={`gm-contract-${item.referenceId}`} className="px-4 py-3 border-b border-[#2a3041] last:border-b-0">
                      <p className="text-[13px] text-[#d9e0f2] leading-5">
                        Contract extension for <span className="font-semibold">{item.employeeName}</span> was <span className={`font-semibold ${item.status === 'Approved' ? 'text-emerald-400' : 'text-red-400'}`}>{item.status.toLowerCase()}</span> by HR.
                      </p>
                      <p className="text-[12px] text-[#93a2c0] mt-1 text-right">{item.reviewedDate || item.requestedDate}</p>
                    </div>
                  ))}
                </div>
              )}

              {((userRole === "HR" && notifications.length === 0 && hireNotifications.length === 0) || 
                (userRole === "GM" && gmHireNotifications.length === 0 && gmContractNotifications.length === 0) ||
                (userRole === "PM" && pmNotifications.length === 0) || 
                (userRole === "Marketing" && hireNotifications.length === 0) ||
                (!["HR", "PM", "GM", "Marketing"].includes(userRole || ""))) && (
                <div className="px-4 py-8 text-center text-[13px] text-[var(--dash-text-secondary)]">No notifications</div>
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
          {isDarkMode ? (
            <Sun size={22} strokeWidth={1.8} />
          ) : (
            <Moon size={22} strokeWidth={1.8} />
          )}
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
          {/* Avatar circle */}
          <div className="relative">
            <div className={`flex items-center justify-center w-11 h-11 rounded-full ${avatarClass} text-white shadow-[0_2px_8px_rgba(0,0,0,0.2)]`}>
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
