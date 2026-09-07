import { Buffer } from "buffer";
import { PermissionsAndroid } from "react-native";
import { BleManager, Characteristic, Device } from "react-native-ble-plx";

(globalThis as any).Buffer = Buffer;

// const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const SERVICE_UUID = "9ecadc24-0ee5-a9e0-93f3-a3b50100406e";
// const SERVICE_UUID = "9ecadc24-0ee5-a9e0-93f3-a3b50100406e";

const TX_UUID = "9ecadc24-0ee5-a9e0-93f3-a3b50300406e"; // notify
const RX_UUID = "9ecadc24-0ee5-a9e0-93f3-a3b50200406e"; // write


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
  rxChar: Characteristic | null = null;

  onStatusChange?: (status: string) => void;
  onTrailerState?: (state: string) => void;
  onDeviceFound?: (device: Device) => void;

  private queue: string[] = [];
  private writing = false;

  setStatus(status: string) {
    console.log("BLE STATUS:", status);
    this.onStatusChange?.(status);
  }

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
        this.onDeviceFound?.(scannedDevice);
      }
    });
  }

  stopScan() {
    this.manager.stopDeviceScan();
    this.setStatus("idle");
  }

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

  private async setupCharacteristics() {
    if (!this.device) return;

    const services = await this.device.services();
     console.log("SERVICES:");

     services.forEach(s => console.log("  ", s.uuid));
    for (const service of services) {
      if (service.uuid.toLowerCase() === SERVICE_UUID.toLowerCase()) {
        const chars = await service.characteristics();
        for (const c of chars) {
          console.log("CHAR:", c.uuid);
          console.log("CHAR PROPERTIES:", c.isWritableWithoutResponse, c.isNotifiable);


          if (c.uuid.toLowerCase() === RX_UUID.toLowerCase()) {
            this.rxChar = c;
            console.log("RX characteristic bound");
          }

          if (c.uuid.toLowerCase() === TX_UUID.toLowerCase()) {
            c.monitor((error, characteristic) => {
              if (error) {
                console.log("Monitor error:", error);
                return;
              }

              const value = characteristic?.value;
              if (!value) return;

              try {
                const decoded = Buffer.from(value, "base64").toString("utf8");
                console.log("NOTIFY:", decoded);
                this.onTrailerState?.(decoded);
              } catch (e) {
                console.log("Decode error:", e);
              }
            });
          }
        }
      }
    }

    if (!this.rxChar) {
      console.log("RX characteristic NOT FOUND");
    }
  }

  async write(cmd: number) {
    if (!this.device || !this.rxChar) {
      console.log("BLE not ready (no RX characteristic yet)");
      return;
    }

    const buf = Buffer.from([cmd]);
    const base64 = buf.toString("base64");

    this.queue.push(base64);
    this.processQueue();
  }

  private async processQueue() {
    if (this.writing || !this.rxChar) return;
    this.writing = true;

    try {
      while (this.queue.length > 0) {
        const base64 = this.queue.shift()!;
        await this.rxChar.writeWithoutResponse(base64);

        const sent = Buffer.from(base64, "base64")[0];
        console.log("Sent CMD:", sent);
      }
    } catch (e) {
      console.log("Write error:", e);
      this.setStatus("disconnected");
    } finally {
      this.writing = false;
    }
  }

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

  async disconnect() {
    if (!this.device) return;

    try {
      await this.manager.cancelDeviceConnection(this.device.id);
    } catch (e) {
      console.log("Disconnect error:", e);
    }

    this.device = null;
    this.rxChar = null;
    this.queue = [];
    this.writing = false;

    this.setStatus("disconnected");
  }
}

export const BLE = new BLEController();
