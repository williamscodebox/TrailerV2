import { useEffect, useState } from "react";
import { BLE } from "../BLE";

export type TrailerState =
  | "OFF"
  | "LEFT"
  | "RIGHT"
  | "BOTH"
  | "HAZARDS"
  | "BRAKE"
  | "BRAKE_LEFT"
  | "BRAKE_RIGHT";

type ConnectionStatus = "idle" | "scanning" | "connecting" | "connected" | "disconnected";

function computeCommand(left: boolean, right: boolean, hazards: boolean, brake: boolean): string {
  if (hazards) return "H";
  if (brake) return "B";
  if (left && right) return "H"; // hazards mimic both
  if (left) return "L";
  if (right) return "R";
  return "O";
}


export function useTrailerController() {
  const [left, setLeft] = useState(false);
  const [right, setRight] = useState(false);
  const [hazards, setHazards] = useState(false);
  const [brake, setBrake] = useState(false);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [trailerState, setTrailerState] = useState<TrailerState>("OFF");
  const [devices, setDevices] = useState<any[]>([]);

  // BLE event handlers
  useEffect(() => {
    BLE.onStatusChange = (status) => setConnectionStatus(status as ConnectionStatus);

    BLE.onTrailerState = (state) => {
      const s = state as TrailerState;
      setTrailerState(s);

      setLeft(s === "LEFT" || s === "BOTH" || s === "BRAKE_LEFT");
      setRight(s === "RIGHT" || s === "BOTH" || s === "BRAKE_RIGHT");
      setHazards(s === "HAZARDS");
      setBrake(
        s === "BRAKE" || s === "BRAKE_LEFT" || s === "BRAKE_RIGHT"
      );
    };

    BLE.onDeviceFound = (device) => {
      setDevices((prev) => {
        if (prev.find((d) => d.id === device.id)) return prev;
        return [...prev, device];
      });
    };
  }, []);

  const startScan = () => {
    setDevices([]);
    BLE.startScan();
  };

  const connectToDevice = async (deviceId: string) => {
    BLE.stopScan();
    await BLE.connect(deviceId);
  };

  const sendCurrentCommand = async (
    nextLeft = left,
    nextRight = right,
    nextHazards = hazards,
    nextBrake = brake
  ) => {
    const cmd = computeCommand(nextLeft, nextRight, nextHazards, nextBrake);
    await BLE.write(cmd);
  };

  const toggleLeft = async () => {
    const nextLeft = !left;
    const nextHazards = false; // hazards off if manually toggling
    setLeft(nextLeft);
    setHazards(nextHazards);
    await sendCurrentCommand(nextLeft, right, nextHazards, brake);
  };

  const toggleRight = async () => {
    const nextRight = !right;
    const nextHazards = false;
    setRight(nextRight);
    setHazards(nextHazards);
    await sendCurrentCommand(left, nextRight, nextHazards, brake);
  };

  const toggleHazards = async () => {
    const nextHazards = !hazards;
    const nextLeft = nextHazards ? true : false;
    const nextRight = nextHazards ? true : false;
    const nextBrake = false; // brake off when hazards on
    setHazards(nextHazards);
    setLeft(nextLeft);
    setRight(nextRight);
    setBrake(nextBrake);
    await sendCurrentCommand(nextLeft, nextRight, nextHazards, nextBrake);
  };

  const toggleBrake = async () => {
    const nextBrake = !brake;
    setBrake(nextBrake);
    await sendCurrentCommand(left, right, hazards, nextBrake);
  };

  return {
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
  };
}
