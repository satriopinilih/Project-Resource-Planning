import React from "react";

const Decorativestarline: React.FC = () => {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className="w-12 h-1 bg-red-500 rounded-full"></div>
      <span className="flex-shrink text-red-600">✦</span>{" "}
      <div className="w-12 h-1 bg-red-500 rounded-full"></div>
    </div>
  );
};

export default Decorativestarline;
