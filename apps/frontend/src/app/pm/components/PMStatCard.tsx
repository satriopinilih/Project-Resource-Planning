import React, { ReactNode } from "react";
import stylesModule from "./PMStatCard.module.css";

interface PMStatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  variant: "blue" | "sky" | "green" | "gray" | "amber" | "premium";
  onClick?: () => void;
}

const PMStatCard: React.FC<PMStatCardProps> = ({
  title,
  value,
  icon,
  variant,
  onClick,
}) => {
  const styles = {
    blue: {
      iconBg: "bg-blue-600/20 text-blue-500",
      textValue: "text-black dark:text-white",
      cardBg: "bg-white dark:bg-[var(--dash-bg-card)] border-gray-800/50",
      titleColor: "dark:text-gray-400 text-gray-600",
    },
    sky: {
      iconBg: "bg-sky-600/20 text-sky-500",
      textValue: "text-sky-500",
      cardBg: "bg-white dark:bg-[var(--dash-bg-card)] border-gray-800/50",
      titleColor: "dark:text-gray-400 text-gray-600",
    },
    green: {
      iconBg: "bg-emerald-600/20 text-emerald-500",
      textValue: "text-emerald-500",
      cardBg: "bg-white dark:bg-[var(--dash-bg-card)] border-gray-800/50",
      titleColor: "dark:text-gray-400 text-gray-600",
    },
    gray: {
      iconBg: "bg-slate-700/30 text-slate-600 dark:text-slate-400",
      textValue: "text-black dark:text-white",
      cardBg: "bg-white dark:bg-[var(--dash-bg-card)] border-gray-800/50",
      titleColor: "dark:text-gray-400 text-gray-600",
    },
    amber: {
      iconBg: "bg-amber-600/20 text-amber-500",
      textValue: "text-amber-500",
      cardBg: "bg-white dark:bg-[var(--dash-bg-card)] border-gray-800/50",
      titleColor: "dark:text-gray-400 text-gray-600",
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
      className={`${styles[variant].cardBg} p-6 py-8 rounded-[15px] border flex items-start justify-between transition-all ${onClick ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.98]' : ''}`}
    >
      <div className="flex flex-col gap-2">
        <p className={`text-[13px] font-medium tracking-wide ${styles[variant].titleColor}`}>
          {title}
        </p>
        <p
          className={`text-3xl font-semibold leading-none ${styles[variant].textValue}`}
        >
          {value}
        </p>
      </div>

      <div
        className={`p-3.5 rounded-2xl flex items-center justify-center ${styles[variant].iconBg}`}
      >
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
