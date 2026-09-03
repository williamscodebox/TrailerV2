import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Ionicons from "react-native-vector-icons/Ionicons";
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

  const blink = useSharedValue(1);

  useEffect(() => {
    const blinking =
      trailerState === "LEFT" ||
      trailerState === "RIGHT" ||
      trailerState === "BOTH" ||
      trailerState === "HAZARDS" ||
      trailerState === "BRAKE_LEFT" ||
      trailerState === "BRAKE_RIGHT";

    blink.value = blinking
      ? withRepeat(withTiming(0, { duration: 300 }), -1, true)
      : 1;
  }, [trailerState]);

  const blinkStyle = useAnimatedStyle(() => ({
    opacity: blink.value,
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trailer Controller</Text>

      <View
        style={[
          styles.statusBar,
          {
            backgroundColor:
              connectionStatus === "connected"
                ? "#22C55E"
                : connectionStatus === "connecting"
                ? "#FACC15"
                : connectionStatus === "scanning"
                ? "#3B82F6"
                : "#EF4444",
          },
        ]}
      >
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
                blinkStyle,
                {
                  backgroundColor:
                    trailerState === "HAZARDS"
                      ? "#FACC15"
                      : trailerState === "BRAKE"
                      ? "#EF4444"
                      : trailerState === "BRAKE_LEFT"
                      ? "#EF4444"
                      : trailerState === "LEFT" || trailerState === "BOTH"
                      ? "#6366F1"
                      : "#D1D5DB",
                },
              ]}
            />

            <Animated.View
              style={[
                styles.light,
                blinkStyle,
                {
                  backgroundColor:
                    trailerState === "HAZARDS"
                      ? "#FACC15"
                      : trailerState === "BRAKE"
                      ? "#EF4444"
                      : trailerState === "BRAKE_RIGHT"
                      ? "#EF4444"
                      : trailerState === "RIGHT" || trailerState === "BOTH"
                      ? "#6366F1"
                      : "#D1D5DB",
                },
              ]}
            />
          </View>

          <View style={styles.row}>
            <ControlButton label="Left" icon="arrow-back" active={left} onPress={toggleLeft} />
            <ControlButton label="Right" icon="arrow-forward" active={right} onPress={toggleRight} />
          </View>

          <ControlButton label="Hazards" icon="warning" active={hazards} onPress={toggleHazards} />
          <ControlButton label="Brake" icon="stop" active={brake} onPress={toggleBrake} />

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
