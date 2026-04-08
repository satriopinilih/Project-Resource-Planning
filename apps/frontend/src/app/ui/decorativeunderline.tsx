import React from "react";

const DecorativeUnderline: React.FC = () => {
  return (
    <div className="flex items-center gap-2 mb-6">
      <div className="w-12 h-1.5 bg-red-600 rounded-full"></div>
      <div className="w-2 h-1.5 bg-red-600 rounded-full"></div>
    </div>
  );
};

export default DecorativeUnderline;
