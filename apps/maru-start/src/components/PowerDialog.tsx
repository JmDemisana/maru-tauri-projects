import React from "react";
import {
  Power,
  RotateCcw,
  Moon,
  BedDouble,
  Lock,
  LogOut,
  X,
} from "lucide-react";

interface PowerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
}

export const PowerDialog: React.FC<PowerDialogProps> = ({
  isOpen,
  onClose,
  onAction,
}) => {
  if (!isOpen) return null;

  const actions = [
    {
      id: "shutdown",
      label: "Power off",
      description: "Shuts down PC completely",
      icon: Power,
      bg: "bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/40 hover:border-red-400",
      iconBg: "bg-red-500 text-white",
    },
    {
      id: "restart",
      label: "Restart",
      description: "Reboots system safely",
      icon: RotateCcw,
      bg: "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/40 hover:border-emerald-400",
      iconBg: "bg-emerald-500 text-white",
    },
    {
      id: "hibernate",
      label: "Hibernate",
      description: "Saves session & powers off",
      icon: Moon,
      bg: "bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/40 hover:border-blue-400",
      iconBg: "bg-blue-500 text-white",
    },
    {
      id: "sleep",
      label: "Sleep",
      description: "Low power instant standby",
      icon: BedDouble,
      bg: "bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 border-teal-500/40 hover:border-teal-400",
      iconBg: "bg-teal-500 text-white",
    },
    {
      id: "lock",
      label: "Lock",
      description: "Secures work session",
      icon: Lock,
      bg: "bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border-amber-500/40 hover:border-amber-400",
      iconBg: "bg-amber-500 text-white",
    },
    {
      id: "signout",
      label: "Sign out",
      description: "Close apps & log out",
      icon: LogOut,
      bg: "bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border-purple-500/40 hover:border-purple-400",
      iconBg: "bg-purple-500 text-white",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl flex flex-col items-center gap-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1.5">
            Power Options
          </h2>
          <p className="text-sm text-white/60">
            Select an action for your PC
          </p>
        </div>

        {/* Android-style Big Touch Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                onClick={() => {
                  onAction(act.id);
                }}
                className={`flex flex-col items-center justify-center p-5 rounded-xl border transition-all duration-150 cursor-pointer active:scale-95 group ${act.bg}`}
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 shadow-lg transition-transform group-hover:scale-110 ${act.iconBg}`}
                >
                  <Icon size={26} />
                </div>
                <span className="text-base font-semibold text-white mb-0.5">
                  {act.label}
                </span>
                <span className="text-[11px] text-white/60 text-center leading-tight">
                  {act.description}
                </span>
              </button>
            );
          })}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer text-sm font-medium border border-white/10"
        >
          <X size={18} />
          <span>Cancel</span>
        </button>
      </div>
    </div>
  );
};
