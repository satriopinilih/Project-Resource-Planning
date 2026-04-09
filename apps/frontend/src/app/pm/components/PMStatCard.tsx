import React, { ReactNode } from "react";

interface PMStatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  variant: "blue" | "sky" | "green" | "gray";
}

const PMStatCard: React.FC<PMStatCardProps> = ({
  title,
  value,
  icon,
  variant,
}) => {
  // Color palette disesuaikan dengan gambar (Background Icon & Warna Angka)
  const styles = {
    blue: {
      iconBg: "bg-blue-600/20 text-blue-500",
      textValue: "text-black dark:text-white",
    },
    sky: {
      iconBg: "bg-sky-600/20 text-sky-500",
      textValue: "text-sky-500",
    },
    green: {
      iconBg: "bg-emerald-600/20 text-emerald-500",
      textValue: "text-emerald-500",
    },
    gray: {
      iconBg: "bg-slate-700/30 text-slate-600 dark:text-slate-400",
      textValue: "text-black dark:text-white",
    },
  };

  return (
    <div className="bg-white dark:bg-[#2A2B2E] p-6 py-8  rounded-[15px] border border-gray-800/50 flex items-start justify-between min-w-[240px] transition-all">
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-medium dark:text-gray-400 text-gray-600 tracking-wide">
          {title}
        </p>
        <p
          className={`text-3xl font-semibold leading-none ${styles[variant].textValue}`}
        >
          {value}
        </p>
      </div>

      {/* Container Icon dengan bentuk rounded square sesuai gambar */}
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
