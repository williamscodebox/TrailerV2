import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTrailerController } from "../hooks/useTrailerController";

type ControlButtonProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
};

export default function TrailerController() {
  const {
    left,
    right,
    hazards,
    brake,
    trailerState,
    connectionStatus,
    devices,
    startScan,
    connectToDevice,
    toggleLeft,
    toggleRight,
    toggleHazards,
    toggleBrake,
  } = useTrailerController();

  // Independent blink values
  const blinkLeft = useSharedValue(1);
  const blinkRight = useSharedValue(1);

  useEffect(() => {
    blinkLeft.value = withRepeat(withTiming(0, { duration: 300 }), -1, true);
    blinkRight.value = withRepeat(withTiming(0, { duration: 300 }), -1, true);
  }, []);

  // LEFT blink logic (no BOTH)
  const leftBlinkStyle = useAnimatedStyle(() => {
    const shouldBlink =
      trailerState === "LEFT" ||
      trailerState === "HAZARDS";

    return { opacity: shouldBlink ? blinkLeft.value : 1 };
  });

  // RIGHT blink logic (no BOTH)
  const rightBlinkStyle = useAnimatedStyle(() => {
    const shouldBlink =
      trailerState === "RIGHT" ||
      trailerState === "HAZARDS";

    return { opacity: shouldBlink ? blinkRight.value : 1 };
  });

  // Clean + memoized color logic
  const getLightColor = useCallback((side: "left" | "right", state: string) => {
    const isLeft = side === "left";
    const isRight = side === "right";

    switch (state) {
      case "HAZARDS":
        return "#FACC15";

      case "BRAKE":
        return "#EF4444";

      case "BRAKE_LEFT":
        return isLeft ? "#EF4444" : "#D1D5DB";

      case "BRAKE_RIGHT":
        return isRight ? "#EF4444" : "#D1D5DB";

      case "LEFT":
        return isLeft ? "#6366F1" : "#D1D5DB";

      case "RIGHT":
        return isRight ? "#6366F1" : "#D1D5DB";

      default:
        return "#D1D5DB"; // OFF
    }
  }, []);

  const statusColor = {
    connected: "#22C55E",
    connecting: "#FACC15",
    scanning: "#3B82F6",
    idle: "#EF4444",
    disconnected: "#EF4444",
  }[connectionStatus];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trailer Controller</Text>

      <View style={[styles.statusBar, { backgroundColor: statusColor }]}>
        <Text style={styles.statusBarText}>
          {connectionStatus === "connected" && "Connected"}
          {connectionStatus === "connecting" && "Connecting…"}
          {connectionStatus === "scanning" && "Scanning…"}
          {connectionStatus === "idle" && "Idle"}
          {connectionStatus === "disconnected" && "Disconnected"}
        </Text>
      </View>

      {connectionStatus !== "connected" && (
        <View style={{ width: "100%", marginBottom: 20 }}>
          <TouchableOpacity style={styles.scanButton} onPress={startScan}>
            <Text style={styles.scanButtonText}>Scan for Devices</Text>
          </TouchableOpacity>

          <ScrollView style={{ maxHeight: 200, marginTop: 10 }}>
            {devices.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={styles.deviceItem}
                onPress={() => connectToDevice(d.id)}
              >
                <Text style={styles.deviceName}>{d.name || "Unnamed Device"}</Text>
                <Text style={styles.deviceId}>{d.id}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {connectionStatus === "connected" && (
        <>
          <View style={styles.trailerRow}>
            <Animated.View
              style={[
                styles.light,
                leftBlinkStyle,
                { backgroundColor: getLightColor("left", trailerState) },
              ]}
            />

            <Animated.View
              style={[
                styles.light,
                rightBlinkStyle,
                { backgroundColor: getLightColor("right", trailerState) },
              ]}
            />
          </View>

          <View style={styles.row}>
            <ControlButton label="Left" icon="arrow-back" active={left} onPress={toggleLeft} />
            <ControlButton label="Right" icon="arrow-forward" active={right} onPress={toggleRight} />
          </View>

          <View style={styles.row}>
            <ControlButton label="Hazards" icon="warning" active={hazards} onPress={toggleHazards} />
            <ControlButton label="Brake" icon="stop" active={brake} onPress={toggleBrake} />
          </View>

          <Text style={styles.status}>{trailerState}</Text>
        </>
      )}
    </View>
  );
}

function ControlButton({ label, icon, active, onPress }: ControlButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.button, { backgroundColor: active ? "#6366F1" : "#FFFFFF" }]}
    >
      <Ionicons name={icon} size={40} color={active ? "#FFFFFF" : "#6366F1"} />
      <Text style={[styles.buttonText, { color: active ? "#FFFFFF" : "#6366F1" }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6", padding: 20, alignItems: "center" },
  title: { fontSize: 28, fontWeight: "bold", marginTop: 20, marginBottom: 30 },

  statusBar: {
    width: "100%",
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: "center",
  },
  statusBarText: { color: "white", fontSize: 16, fontWeight: "bold" },

  scanButton: {
    backgroundColor: "#3B82F6",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  scanButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },

  deviceItem: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  deviceName: { fontSize: 16, fontWeight: "bold" },
  deviceId: { fontSize: 12, color: "#666" },

  trailerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "60%",
    marginBottom: 40,
  },
  light: { width: 50, height: 50, borderRadius: 25 },

  row: { flexDirection: "row", gap: 20, marginBottom: 20 },

  button: {
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    width: 140,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: { marginTop: 8, fontSize: 16, fontWeight: "bold" },

  status: { marginTop: 30, fontSize: 22, fontWeight: "bold" },
});
