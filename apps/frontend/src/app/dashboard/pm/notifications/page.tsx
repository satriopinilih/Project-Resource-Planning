"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProjects, markProjectAsRead } from "@/lib/api";
import { Bell, ArrowRight, CheckCircle2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";

interface PMNotification {
  projectId: number;
  projectName: string;
}

export default function PMNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<PMNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifs = async () => {
    try {
      setIsLoading(true);
      const projects = await getProjects();
      
      const newNotifs: PMNotification[] = projects
        .filter(p => p.isUnread && p.projectStatus !== 4 && String(p.projectStatus).toLowerCase() !== "deleted")
        .map(p => ({ projectId: p.projectId, projectName: p.projectName }));
      
      setNotifications(newNotifs.reverse()); // Newest first
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifs();
  }, []);

  const handleClick = async (projectId: number) => {
    try {
      await markProjectAsRead(projectId);
      router.push(`/project/${projectId}`);
    } catch (err) {
      console.error("Failed to mark notification as read", err);
      router.push(`/project/${projectId}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await Promise.all(notifications.map(n => markProjectAsRead(n.projectId)));
      setNotifications([]);
    } catch (err) {
      console.error("Failed to mark all as read", err);
      // Refresh list to see what succeeded
      loadNotifs();
    }
  };

  return (
    <>
      <AppHeader title="Notifications" role="PM" />
      <div className="p-8 max-w-4xl mx-auto w-full h-auto overflow-y-auto">
        {notifications.length > 0 && (
          <div className="flex justify-end mb-6">
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#1e2532] dark:hover:bg-[#2a3041] text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              <CheckCircle2 size={16} />
              Mark all as read
            </button>
          </div>
        )}

      <div className="bg-white dark:bg-[#22252e] border border-gray-200 dark:border-gray-700/50 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400 animate-pulse">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-blue-50 dark:bg-[#1e2532] rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-[#2B7FFC]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">You're all caught up!</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">You have no new notifications at the moment.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {notifications.map((notif) => (
              <div 
                key={notif.projectId}
                onClick={() => handleClick(notif.projectId)}
                className="p-5 flex items-start justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1f28] transition-colors group"
              >
                <div className="flex gap-4">
                  <div className="mt-1 w-2.5 h-2.5 rounded-full bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.6)] flex-shrink-0" />
                  <div>
                    <h4 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1">
                      New Project Assignment
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      You have been assigned as the Project Manager for: <span className="font-semibold text-gray-800 dark:text-gray-200">{notif.projectName}</span>.
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-[#2B7FFC] text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 transform duration-200">
                  View Details <ArrowRight size={16} className="ml-1" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </>
  );
}
