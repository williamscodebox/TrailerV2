import { Buffer } from "buffer";
import { PermissionsAndroid } from "react-native";
import { BleManager, Characteristic, Device } from "react-native-ble-plx";

(globalThis as any).Buffer = Buffer;  

const SERVICE_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
const RX_UUID = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"; // phone writes
const TX_UUID = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"; // notifications


async function requestBlePermissions() {
  await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    "android.permission.BLUETOOTH_SCAN",
    "android.permission.BLUETOOTH_CONNECT",
  ]);
}

class BLEController {
  manager = new BleManager();
  device: Device | null = null;
  txChar: Characteristic | null = null;

  // callbacks
  onStatusChange?: (status: string) => void;
  onTrailerState?: (state: string) => void;
  onDeviceFound?: (device: Device) => void; // ⭐ NEW: search callback

  // write queue
  private queue: string[] = [];
  private writing = false;

  setStatus(status: string) {
    console.log("BLE STATUS:", status);
    this.onStatusChange?.(status);
  }


  // -----------------------------
  // ⭐ SEARCH DEVICES
  // -----------------------------
 
  async startScan() {

    await requestBlePermissions();

    this.setStatus("scanning");

    this.manager.startDeviceScan(null, null, (error, scannedDevice) => {
      if (error) {
        console.log("Scan error:", error);
        this.setStatus("disconnected");
        return;
      }

      if (scannedDevice) {
        // send every device to UI
        this.onDeviceFound?.(scannedDevice);
      }
    });
  }

  stopScan() {
    this.manager.stopDeviceScan();
    this.setStatus("idle");
  }

  // -----------------------------
  // ⭐ CONNECT TO SELECTED DEVICE
  // -----------------------------
  async connect(deviceId: string) {
    this.setStatus("connecting");

    try {
      this.device = await this.manager.connectToDevice(deviceId);
      await this.device.discoverAllServicesAndCharacteristics();
      await this.setupCharacteristics();

      this.setStatus("connected");
    } catch (e) {
      console.log("Connect error:", e);
      this.setStatus("disconnected");
    }
  }

  // -----------------------------
  // Setup characteristics + notifications
  // -----------------------------
  private async setupCharacteristics() {
    if (!this.device) return;

    const services = await this.device.services();
    for (const service of services) {
      if (service.uuid === SERVICE_UUID) {
        const chars = await service.characteristics();
        for (const c of chars) {
          if (c.uuid === RX_UUID) {
            this.txChar = c;
          }

          if (c.uuid === TX_UUID) {
            c.monitor((error, characteristic) => {
              if (error) {
                console.log("Monitor error:", error);
                return;
              }

              const value = characteristic?.value;
              if (!value) return;

              try {
                const decoded = Buffer.from(value, "base64").toString("utf8");
                this.onTrailerState?.(decoded);
              } catch (e) {
                console.log("Decode error:", e);
              }
            });
          }
        }
      }
    }
  }

  // -----------------------------
  // Write queue
  // -----------------------------
async write(cmd: string) {
  if (!this.device || !this.txChar) {
    console.log("BLE not ready");
    this.setStatus("disconnected");
    return;
  }

  // Convert ONE ASCII character into base64
  const base64 = Buffer.from(cmd[0], "ascii").toString("base64");

  this.queue.push(base64);
  this.processQueue();
}

private async processQueue() {
  if (this.writing || !this.txChar) return;
  this.writing = true;

  try {
    while (this.queue.length > 0) {
      const base64 = this.queue.shift()!;
      await this.txChar.writeWithoutResponse(base64);
      console.log("Sent:", Buffer.from(base64, "base64").toString("ascii"));
    }
  } catch (e) {
    console.log("Write error:", e);
    this.setStatus("disconnected");
  } finally {
    this.writing = false;
  }
}


  // -----------------------------
  // Auto reconnect
  // -----------------------------
  async autoReconnect() {
    try {
      const connected = await this.manager.connectedDevices([SERVICE_UUID]);
      if (connected.length > 0) {
        this.device = connected[0];
        await this.device.discoverAllServicesAndCharacteristics();
        await this.setupCharacteristics();
        this.setStatus("connected");
        return true;
      }
    } catch (e) {
      console.log("AutoReconnect error:", e);
    }
    return false;
  }

  // -----------------------------
  // Disconnect
  // -----------------------------
  async disconnect() {
    if (!this.device) return;

    try {
      await this.manager.cancelDeviceConnection(this.device.id);
    } catch (e) {
      console.log("Disconnect error:", e);
    }

    this.device = null;
    this.txChar = null;
    this.queue = [];
    this.writing = false;

    this.setStatus("disconnected");
  }
}

export const BLE = new BLEController();
