"use client";

import { useState, useEffect } from "react";
import { Bell, Sun, Moon, User } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { getSessionUser } from "@/lib/auth";
import { getContractExtensionRequests, getProjects, getHireRequests, HireRequest } from "@/lib/api";
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
  const [pmNotifications, setPmNotifications] = useState<PMNotification[]>([]);

  const loadNotifications = async () => {
    try {
      const pending = await getContractExtensionRequests("Pending");
      setNotifications(pending);
      const hires = await getHireRequests('Open');
      setHireNotifications(hires);
      const reviewed = await getHireRequests();
      setGmHireNotifications(reviewed.filter((h) => h.status === 'Fulfilled' || h.status === 'Declined'));
    } catch {
      setNotifications([]);
      setHireNotifications([]);
      setGmHireNotifications([]);
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

    if (userRole === "HR" || userRole === "GM") {
      loadNotifications();
      timer = setInterval(loadNotifications, 15000);
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
      router.push(`/pm/projects/${notif.projectId}`);
    } catch (err) {
      console.error("Failed to mark notification as read", err);
      setIsNotificationOpen(false);
      router.push(`/pm/projects/${notif.projectId}`);
    }
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
            onClick={() => {
              if (!isNotificationOpen) {
                if (userRole === "HR") loadNotifications();
                if (userRole === "PM") loadPMNotifications();
              }
              setIsNotificationOpen((prev) => !prev);
            }}
            className="relative p-2.5 rounded-xl text-[var(--dash-text-muted)] hover:text-[var(--dash-text-heading)] hover:bg-[var(--dash-bg-hover)] transition-all duration-200 cursor-pointer"
          >
            <Bell size={22} strokeWidth={1.8} />
            {((userRole === "HR" && (notifications.length + hireNotifications.length) > 0) || (userRole === "GM" && gmHireNotifications.length > 0) || (userRole === "PM" && pmNotifications.length > 0)) && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#f59e0b] rounded-full border-2 border-[var(--dash-bg-header)]" />
            )}
          </button>

          {isNotificationOpen && (
            <div className="absolute right-0 mt-3 w-[340px] rounded-xl border border-[#30374a] bg-[#1b1f2a] shadow-[0_20px_40px_rgba(0,0,0,0.35)] overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-[#30374a]">
                <h3 className="text-[23px] font-semibold text-white">Notifications</h3>
              </div>

              {userRole === "HR" && (notifications.length > 0 || hireNotifications.length > 0) && (
                <div className="max-h-72 overflow-y-auto">
                  {hireNotifications.slice(0, 4).map((item) => (
                    <div key={`hire-${item.hireRequestId}`} className="px-4 py-3 border-b border-[#2a3041]">
                      <p className="text-[13px] text-[#d9e0f2] leading-5">
                        New hire request for <span className="font-semibold">{item.projectName}</span>
                      </p>
                      <p className="text-[12px] text-[#93a2c0] mt-1">
                        Role needed: {item.roleNeeded}
                      </p>
                    </div>
                  ))}
                  {notifications.slice(0, 6).map((item) => (
                    <div key={item.id} className="px-4 py-3 border-b border-[#2a3041] last:border-b-0">
                      <p className="text-[13px] text-[#d9e0f2] leading-5">
                        Contract extension request for <span className="font-semibold">{item.employeeName}</span>
                      </p>
                      <p className="text-[12px] text-[#93a2c0] mt-1">
                        Requested by {item.requestedByName || item.requestedBy || "GM"}
                      </p>
                    </div>
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
                      className="px-4 py-3 border-b border-[#2a3041] hover:bg-[#2a3041] transition-colors cursor-pointer"
                    >
                      <p className="text-[13px] text-[#d9e0f2] leading-5">
                        You have been assigned as PM to project: <span className="font-semibold">{n.projectName}</span>
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
                        router.push('/pm/notifications');
                      }}
                      className="px-4 py-3 text-center text-[13px] font-semibold text-[#2B7FFC] cursor-pointer hover:bg-[#2a3041] transition-colors border-t border-[#30374a]"
                    >
                      View All Notifications ({pmNotifications.length})
                    </div>
                  )}
                </div>
              )}

              {userRole === "GM" && gmHireNotifications.length > 0 && (
                <div className="max-h-72 overflow-y-auto">
                  {gmHireNotifications.slice(0, 6).map((item) => (
                    <div key={`gm-hire-${item.hireRequestId}`} className="px-4 py-3 border-b border-[#2a3041] last:border-b-0">
                      <p className="text-[13px] text-[#d9e0f2] leading-5">
                        Hire request for <span className="font-semibold">{item.projectName}</span> is <span className="font-semibold">{item.status === 'Fulfilled' ? 'Fulfilled' : 'Declined'}</span>
                      </p>
                      <p className="text-[12px] text-[#93a2c0] mt-1">Role: {item.roleNeeded}</p>
                    </div>
                  ))}
                </div>
              )}

              {((userRole === "HR" && notifications.length === 0 && hireNotifications.length === 0) || 
                (userRole === "GM" && gmHireNotifications.length === 0) ||
                (userRole === "PM" && pmNotifications.length === 0) || 
                (userRole !== "HR" && userRole !== "PM" && userRole !== "GM")) && (
                <div className="px-4 py-8 text-center text-[22px] text-[#9aa7c0]">No notifications</div>
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
          <div className={`flex items-center justify-center w-11 h-11 rounded-full ${avatarClass} text-white shadow-[0_2px_8px_rgba(0,0,0,0.2)]`}>
            <User size={22} strokeWidth={2} />
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
