import React from "react";
import {
  Gamepad2,
  Tv,
  Package,
  Music,
  Settings,
  Image,
  Folder,
  Globe,
  ShoppingBag,
  Sparkles,
  MessageCircle,
  MessageSquare,
  Bot,
  Heart,
  Disc3,
  Video,
} from "lucide-react";

interface AppIconProps {
  packageName: string;
  category?: string;
  size?: number;
}

export const AppIcon: React.FC<AppIconProps> = ({
  packageName,
  category = "Apps",
  size = 40,
}) => {
  const cleanPkg = packageName.toLowerCase();
  const iconSize = Math.round(size * 0.52);

  // 1. Instant Branded Matchers (Zero Network Overhead, 0ms render)
  if (cleanPkg.includes("youtube")) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${Math.round(size * 0.26)}px`,
          background: "linear-gradient(135deg, #FF0000, #CC0000)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          boxShadow: "0 4px 12px rgba(255, 0, 0, 0.35)",
          flexShrink: 0,
        }}
      >
        <Video size={iconSize} />
      </div>
    );
  }

  if (cleanPkg.includes("apple.android.music")) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${Math.round(size * 0.26)}px`,
          background: "linear-gradient(135deg, #FA233B 0%, #FB5C74 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          boxShadow: "0 4px 12px rgba(250, 35, 59, 0.35)",
          flexShrink: 0,
        }}
      >
        <Music size={iconSize} />
      </div>
    );
  }

  if (cleanPkg.includes("katana") || cleanPkg.includes("facebook")) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${Math.round(size * 0.26)}px`,
          background: "linear-gradient(135deg, #1877F2, #0D65D9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontWeight: 900,
          fontSize: `${Math.round(size * 0.58)}px`,
          boxShadow: "0 4px 12px rgba(24, 119, 242, 0.35)",
          flexShrink: 0,
        }}
      >
        f
      </div>
    );
  }

  if (cleanPkg.includes("orca") || cleanPkg.includes("messenger")) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${Math.round(size * 0.26)}px`,
          background: "linear-gradient(135deg, #00B2FE 0%, #006AFF 50%, #FF6968 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          boxShadow: "0 4px 12px rgba(0, 106, 255, 0.35)",
          flexShrink: 0,
        }}
      >
        <MessageCircle size={iconSize} />
      </div>
    );
  }

  if (cleanPkg.includes("bard") || cleanPkg.includes("gemini")) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${Math.round(size * 0.26)}px`,
          background: "linear-gradient(135deg, #1BA1E3, #5468FF, #9B51E0, #E040FB)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          boxShadow: "0 4px 12px rgba(155, 81, 224, 0.4)",
          flexShrink: 0,
        }}
      >
        <Sparkles size={iconSize} />
      </div>
    );
  }

  if (cleanPkg.includes("vending")) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${Math.round(size * 0.26)}px`,
          background: "linear-gradient(135deg, #00C3FF, #00F076, #FFB800, #FF3D71)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          boxShadow: "0 4px 12px rgba(0, 195, 255, 0.35)",
          flexShrink: 0,
        }}
      >
        <ShoppingBag size={iconSize} />
      </div>
    );
  }

  if (cleanPkg.includes("sbrowser") || cleanPkg.includes("browser") || cleanPkg.includes("chrome")) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${Math.round(size * 0.26)}px`,
          background: "linear-gradient(135deg, #1C274C, #2A3B8F, #3B82F6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          boxShadow: "0 4px 12px rgba(42, 59, 143, 0.35)",
          flexShrink: 0,
        }}
      >
        <Globe size={iconSize} />
      </div>
    );
  }

  if (cleanPkg.includes("gallery3d") || cleanPkg.includes("gallery")) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${Math.round(size * 0.26)}px`,
          background: "linear-gradient(135deg, #FF5E62, #FF9966)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          boxShadow: "0 4px 12px rgba(255, 94, 98, 0.35)",
          flexShrink: 0,
        }}
      >
        <Image size={iconSize} />
      </div>
    );
  }

  if (cleanPkg.includes("photos")) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${Math.round(size * 0.26)}px`,
          background: "linear-gradient(135deg, #EA4335, #FBBC05, #34A853, #4285F4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          boxShadow: "0 4px 12px rgba(66, 133, 244, 0.35)",
          flexShrink: 0,
        }}
      >
        <Image size={iconSize} />
      </div>
    );
  }

  if (cleanPkg.includes("myfiles") || cleanPkg.includes("file")) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${Math.round(size * 0.26)}px`,
          background: "linear-gradient(135deg, #F7971E, #FFD200)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          boxShadow: "0 4px 12px rgba(247, 151, 30, 0.35)",
          flexShrink: 0,
        }}
      >
        <Folder size={iconSize} />
      </div>
    );
  }

  if (cleanPkg.includes("chatgpt") || cleanPkg.includes("openai")) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${Math.round(size * 0.26)}px`,
          background: "linear-gradient(135deg, #10a37f, #0d8466)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          boxShadow: "0 4px 12px rgba(16, 163, 127, 0.35)",
          flexShrink: 0,
        }}
      >
        <Bot size={iconSize} />
      </div>
    );
  }

  if (cleanPkg.includes("settings")) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${Math.round(size * 0.26)}px`,
          background: "linear-gradient(135deg, #4b5563, #374151)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#e5e7eb",
          boxShadow: "0 4px 12px rgba(55, 65, 81, 0.35)",
          flexShrink: 0,
        }}
      >
        <Settings size={iconSize} />
      </div>
    );
  }

  if (cleanPkg.includes("lastnotif") || cleanPkg.includes("maudio") || cleanPkg.includes("maru")) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${Math.round(size * 0.26)}px`,
          background: "linear-gradient(135deg, #ff71a2, #e85d9f)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          boxShadow: "0 4px 12px rgba(255, 113, 162, 0.35)",
          flexShrink: 0,
        }}
      >
        <Heart size={iconSize} fill="currentColor" />
      </div>
    );
  }

  if (cleanPkg.includes("spotify")) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${Math.round(size * 0.26)}px`,
          background: "linear-gradient(135deg, #1DB954, #1aa34a)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          boxShadow: "0 4px 12px rgba(29, 185, 84, 0.35)",
          flexShrink: 0,
        }}
      >
        <Disc3 size={iconSize} />
      </div>
    );
  }

  if (cleanPkg.includes("discord")) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${Math.round(size * 0.26)}px`,
          background: "linear-gradient(135deg, #5865F2, #4752C4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          boxShadow: "0 4px 12px rgba(88, 101, 242, 0.35)",
          flexShrink: 0,
        }}
      >
        <MessageSquare size={iconSize} />
      </div>
    );
  }

  // 2. Category Fallbacks
  const isGame = category === "Games" || cleanPkg.includes("game") || cleanPkg.includes("unity");
  const isMedia = category === "Media" || cleanPkg.includes("music") || cleanPkg.includes("audio");

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${Math.round(size * 0.26)}px`,
        background: isGame
          ? "linear-gradient(135deg, #8B5CF6, #EC4899)"
          : isMedia
          ? "linear-gradient(135deg, #EC4899, #F43F5E)"
          : "linear-gradient(135deg, #3B82F6, #06B6D4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        boxShadow: isGame
          ? "0 4px 12px rgba(139, 92, 246, 0.35)"
          : isMedia
          ? "0 4px 12px rgba(236, 72, 153, 0.35)"
          : "0 4px 12px rgba(59, 130, 246, 0.35)",
        flexShrink: 0,
      }}
    >
      {isGame ? (
        <Gamepad2 size={iconSize} />
      ) : isMedia ? (
        <Tv size={iconSize} />
      ) : (
        <Package size={iconSize} />
      )}
    </div>
  );
};
