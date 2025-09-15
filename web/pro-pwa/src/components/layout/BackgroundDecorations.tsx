import React from "react";

interface BackgroundDecorationsProps {
  variant?: "default" | "calm" | "vivid";
}

/**
 * Subtle brand background decorations for medium+ screens.
 * Avoids heavy blur; focused on soft gradients for a premium, non-AI look.
 */
const BackgroundDecorations: React.FC<BackgroundDecorationsProps> = ({ variant = "default" }) => {
  const isDefault = variant === "default";
  const isCalm = variant === "calm";
  const isVivid = variant === "vivid";

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none hidden sm:block motion-reduce:hidden">
      {/* Top Right blob */}
      <div
        aria-hidden
        className={
          `absolute top-16 right-[15%] w-72 h-72 rounded-full motion-safe:blur-2xl opacity-40 ` +
          (isDefault ? "bg-gradient-to-br from-[#D9E8FF] to-[#E6FFFA]" : "") +
          (isCalm ? "bg-gradient-to-br from-[#EAF2FF] to-[#F1FFF8]" : "") +
          (isVivid ? "bg-gradient-to-br from-[#BFD7FF] to-[#B8FFE9]" : "")
        }
      />

      {/* Bottom Left blob */}
      <div
        aria-hidden
        className={
          `absolute bottom-16 left-[20%] w-64 h-64 rounded-full motion-safe:blur-2xl opacity-40 ` +
          (isDefault ? "bg-gradient-to-tr from-[#E8EEFF] to-[#E6FFF8]" : "") +
          (isCalm ? "bg-gradient-to-tr from-[#F0F6FF] to-[#EDFFF8]" : "") +
          (isVivid ? "bg-gradient-to-tr from-[#D0E2FF] to-[#C7FFEE]" : "")
        }
      />

      {/* Middle Accent blob */}
      <div
        aria-hidden
        className={
          `absolute top-1/2 right-12 -translate-y-1/2 w-40 h-40 rounded-full motion-safe:blur-xl opacity-35 ` +
          (isDefault ? "bg-gradient-to-br from-[#E0F2FE] to-[#D1FAE5]" : "") +
          (isCalm ? "bg-gradient-to-br from-[#E8F2FE] to-[#E2FBEA]" : "") +
          (isVivid ? "bg-gradient-to-br from-[#CFE8FF] to-[#BDF9E3]" : "")
        }
      />
    </div>
  );
};

export default BackgroundDecorations;


