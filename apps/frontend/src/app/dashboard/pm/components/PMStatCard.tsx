import React, { ReactNode } from "react";
import stylesModule from "./PMStatCard.module.css";

interface PMStatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  variant: "running" | "scheduled" | "green"  | "premium";
  onClick?: () => void;
}

const PMStatCard: React.FC<PMStatCardProps> = ({ title, value, icon, variant, onClick }) => {
  const styles = {
    running: {
      iconBg: "bg-green-500/10 text-green-400",
      textValue: "text-green-400",
      cardBg:
        "bg-[var(--dash-bg-card)] border-[var(--dash-border-subtle)] hover: border-green-500/20 hover:shadow-lg hover:-translate-y-1",
      titleColor: "text-[var(--dash-text-muted)]",
    },
    scheduled: {
      iconBg: "bg-purple-500/10 text-purple-400",
      textValue: "text-purple-400",
      cardBg:
        "bg-[var(--dash-bg-card)] border-[var(--dash-border-subtle)] hover:border-purple-500/20 hover:shadow-lg hover:-translate-y-1",
      titleColor: "text-[var(--dash-text-muted)]",
    },
    green: {
      iconBg: "bg-gray-500/10 text-gray-400",
      textValue: "text-gray-400",
      cardBg:
        "bg-[var(--dash-bg-card)] border-[var(--dash-border-subtle)] hover:border-gray-500/20 hover:shadow-lg hover:-translate-y-1",
      titleColor: "text-[var(--dash-text-muted)]",
    },
    premium: {
      iconBg: stylesModule.premiumIconBg,
      textValue: stylesModule.premiumText,
      cardBg: stylesModule.premiumCard,
      titleColor: stylesModule.premiumTitle,
    },
  };

  return (
    <div
      onClick={onClick}
      className={`${styles[variant].cardBg} p-6 py-8 rounded-[15px] border flex items-start justify-between transition-all ${onClick ? "cursor-pointer hover:scale-[1.01] active:scale-[0.98]" : ""}`}
    >
      <div className="flex flex-col gap-2">
        <p className={`text-[13px] font-medium tracking-wide ${styles[variant].titleColor}`}>{title}</p>
        <p className={`text-3xl font-semibold leading-none ${styles[variant].textValue}`}>{value}</p>
      </div>

      <div className={`p-3.5 rounded-2xl flex items-center justify-center ${styles[variant].iconBg}`}>
        {React.isValidElement(icon)
          ? React.cloneElement(icon as React.ReactElement<any>, {
              size: 24,
              strokeWidth: 2,
            })
          : icon}
      </div>
    </div>
  );
};

export default PMStatCard;
