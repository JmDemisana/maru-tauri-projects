import React, { useState } from "react";
import { motion } from "framer-motion";
import { AdbDevice } from "../types";
import {
  Wifi,
  Smartphone,
  RefreshCw,
  Link,
  ShieldCheck,
  CheckCircle2,
  Cpu,
} from "lucide-react";

interface ConnectionScreenProps {
  devices: AdbDevice[];
  activeDevice: AdbDevice | null;
  onSelectDevice: (device: AdbDevice) => void;
  onConnect: (ipPort: string) => Promise<void>;
  onPair: (ipPort: string, code: string) => Promise<void>;
  onRefresh: () => void;
  isLoading: boolean;
}

export const ConnectionScreen: React.FC<ConnectionScreenProps> = ({
  devices,
  activeDevice,
  onSelectDevice,
  onConnect,
  onPair,
  onRefresh,
  isLoading,
}) => {
  const [connectIp, setConnectIp] = useState("192.168.8.199:46791");
  const [pairIp, setPairIp] = useState("192.168.8.199:");
  const [pairCode, setPairCode] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const handleConnect = async () => {
    if (!connectIp) return;
    setIsBusy(true);
    setStatusMessage("Connecting to wireless device...");
    try {
      await onConnect(connectIp);
      setStatusMessage("Connected successfully!");
    } catch (e: any) {
      setStatusMessage(`Connection failed: ${e}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handlePair = async () => {
    if (!pairIp || !pairCode) return;
    setIsBusy(true);
    setStatusMessage("Pairing device with code...");
    try {
      await onPair(pairIp, pairCode);
      setStatusMessage("Device paired successfully! Now connect via main IP:Port.");
    } catch (e: any) {
      setStatusMessage(`Pairing failed: ${e}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "24px 32px",
        overflowY: "auto",
        background: "radial-gradient(ellipse at top left, rgba(112, 165, 255, 0.08) 0%, transparent 60%)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "24px",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "20px",
              background: "rgba(112, 165, 255, 0.14)",
              border: "1px solid rgba(112, 165, 255, 0.3)",
              color: "var(--maru-accent-blue)",
              fontSize: "11px",
              fontWeight: 700,
              marginBottom: "8px",
            }}
          >
            <Wifi size={12} />
            <span>WIRELESS &amp; USB LINK</span>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.5px" }}>
            Device Connectivity
          </h1>
          <p style={{ fontSize: "13px", color: "var(--maru-text-muted)", marginTop: "4px" }}>
            Connect wirelessly via Android Wireless Debugging or plug in a USB cable.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onRefresh}
          disabled={isLoading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "10px",
            background: "rgba(112, 165, 255, 0.15)",
            border: "1px solid rgba(112, 165, 255, 0.4)",
            color: "var(--maru-accent-blue)",
            fontSize: "12.5px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={14} className={isLoading ? "spin" : ""} />
          <span>{isLoading ? "Scanning..." : "Scan Devices"}</span>
        </motion.button>
      </div>

      {statusMessage && (
        <div
          style={{
            marginBottom: "20px",
            padding: "10px 14px",
            borderRadius: "10px",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid var(--maru-border)",
            fontSize: "12.5px",
            color: "#fff",
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* Discovered Devices */}
      <div style={{ marginBottom: "28px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px", color: "#fff" }}>
          Active Connected Devices
        </h3>

        {devices.length === 0 ? (
          <div
            style={{
              padding: "24px",
              borderRadius: "14px",
              background: "var(--maru-surface-card)",
              border: "1px solid var(--maru-border)",
              textAlign: "center",
              color: "var(--maru-text-dim)",
              fontSize: "13px",
            }}
          >
            No active ADB device detected. Connect via Wireless Debugging below or plug in via USB.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {devices.map((dev) => {
              const isSelected = activeDevice?.serial === dev.serial;
              return (
                <div
                  key={dev.serial}
                  onClick={() => onSelectDevice(dev)}
                  style={{
                    background: isSelected ? "rgba(74, 222, 128, 0.08)" : "var(--maru-surface-card)",
                    border: isSelected ? "1px solid rgba(74, 222, 128, 0.5)" : "1px solid var(--maru-border)",
                    borderRadius: "14px",
                    padding: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "12px",
                        background: "rgba(74, 222, 128, 0.15)",
                        border: "1px solid rgba(74, 222, 128, 0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#4ade80",
                      }}
                    >
                      <Smartphone size={20} />
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>
                          {dev.model}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "10px",
                            background: "rgba(74, 222, 128, 0.2)",
                            color: "#4ade80",
                          }}
                        >
                          {dev.is_wireless ? "Wireless ADB" : "USB"}
                        </span>
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--maru-text-dim)", marginTop: "3px" }}>
                        Serial: {dev.serial} &bull; Android {dev.android_version} (API {dev.sdk_version})
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <CheckCircle2 size={16} color="#4ade80" />
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#4ade80" }}>
                      Active
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two-Column Setup: Connect vs Pair */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Connect Box */}
        <div
          style={{
            background: "var(--maru-surface-card)",
            border: "1px solid var(--maru-border)",
            borderRadius: "14px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Link size={18} color="var(--maru-accent-blue)" />
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>
              Quick Connect
            </h3>
          </div>
          <p style={{ fontSize: "12px", color: "var(--maru-text-dim)" }}>
            Enter the IP and port from Developer Options &gt; Wireless Debugging.
          </p>

          <input
            type="text"
            placeholder="192.168.x.xxx:xxxxx"
            value={connectIp}
            onChange={(e) => setConnectIp(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--maru-border)",
              color: "#fff",
              fontSize: "13px",
            }}
          />

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConnect}
            disabled={isBusy}
            style={{
              padding: "10px",
              borderRadius: "10px",
              background: "rgba(112, 165, 255, 0.2)",
              border: "1px solid rgba(112, 165, 255, 0.5)",
              color: "var(--maru-accent-blue)",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Connect Wireless ADB
          </motion.button>
        </div>

        {/* Pair Box */}
        <div
          style={{
            background: "var(--maru-surface-card)",
            border: "1px solid var(--maru-border)",
            borderRadius: "14px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ShieldCheck size={18} color="var(--maru-accent-pink)" />
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>
              Pair New Device
            </h3>
          </div>
          <p style={{ fontSize: "12px", color: "var(--maru-text-dim)" }}>
            Tap "Pair device with pairing code" on your phone to get the code &amp; port.
          </p>

          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="IP:PairPort"
              value={pairIp}
              onChange={(e) => setPairIp(e.target.value)}
              style={{
                flex: 1.2,
                padding: "10px 14px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--maru-border)",
                color: "#fff",
                fontSize: "13px",
              }}
            />
            <input
              type="text"
              placeholder="6-digit PIN"
              value={pairCode}
              onChange={(e) => setPairCode(e.target.value)}
              style={{
                flex: 0.8,
                padding: "10px 14px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--maru-border)",
                color: "#fff",
                fontSize: "13px",
                letterSpacing: "1px",
              }}
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePair}
            disabled={isBusy}
            style={{
              padding: "10px",
              borderRadius: "10px",
              background: "rgba(232, 93, 159, 0.2)",
              border: "1px solid rgba(232, 93, 159, 0.5)",
              color: "var(--maru-accent-pink)",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Pair Device
          </motion.button>
        </div>
      </div>
    </div>
  );
};
