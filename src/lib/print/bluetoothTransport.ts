type BluetoothGattServerLike = any;
type BluetoothGattCharacteristicLike = any;

declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice: (options: any) => Promise<any>;
    };
  }
}

const SERVICE_CANDIDATES = [
  0xffe0,
  0xfff0,
  0x1101, // Serial Port Service may not be accessible in Web Bluetooth, but keep as candidate
  0x1800,
  0x1810
];

const CHARACTERISTIC_CANDIDATES = [
  0xffe1,
  0xfff2,
  0x2a9c,
  0x2a0e
];

function ensureBluetoothAvailable(): void {
  if (!navigator.bluetooth) {
    throw new Error('Web Bluetooth tidak tersedia di browser ini. Gunakan Chrome atau Edge di Android dengan fitur Bluetooth aktif.');
  }
}

async function findWritableCharacteristic(server: BluetoothGattServerLike): Promise<BluetoothGattCharacteristicLike> {
  for (const serviceUuid of SERVICE_CANDIDATES) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      for (const charUuid of CHARACTERISTIC_CANDIDATES) {
        try {
          const characteristic = await service.getCharacteristic(charUuid);
          if (characteristic.properties.write || characteristic.properties.writeWithoutResponse) {
            return characteristic;
          }
        } catch (error) {
          // ignore not found characteristic
        }
      }
    } catch (error) {
      // ignore not found service
    }
  }

  const services = await server.getPrimaryServices();
  for (const service of services) {
    try {
      const characteristics = await service.getCharacteristics();
      for (const characteristic of characteristics) {
        if (characteristic.properties.write || characteristic.properties.writeWithoutResponse) {
          return characteristic;
        }
      }
    } catch (error) {
      // ignore
    }
  }

  throw new Error('Tidak dapat menemukan karakteristik penulisan di printer Bluetooth. Pastikan printer kompatibel dengan Web Bluetooth.');
}

async function connectPrinter(): Promise<BluetoothGattCharacteristicLike> {
  ensureBluetoothAvailable();

  const device = await navigator.bluetooth!.requestDevice({
    acceptAllDevices: true,
    optionalServices: SERVICE_CANDIDATES
  });

  if (!device.gatt) {
    throw new Error('Perangkat Bluetooth tidak mendukung GATT.');
  }

  const server = await device.gatt.connect();
  const characteristic = await findWritableCharacteristic(server);

  return characteristic;
}

export async function sendToPrinter(data: Uint8Array): Promise<void> {
  const characteristic = await connectPrinter();
  const chunkSize = 180;
  const useWriteResponse = characteristic.properties.write;
  const useWriteWithoutResponse = characteristic.properties.writeWithoutResponse;

  if (!useWriteResponse && !useWriteWithoutResponse) {
    throw new Error('Karakteristik printer tidak mendukung penulisan data.');
  }

  for (let offset = 0; offset < data.length; offset += chunkSize) {
    const chunk = data.slice(offset, offset + chunkSize);
    if (useWriteWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValue(chunk);
    }
  }

  if (characteristic.service.device.gatt?.connected) {
    await characteristic.service.device.gatt.disconnect();
  }
}

export async function testPrinterConnection(): Promise<void> {
  const characteristic = await connectPrinter();
  if (characteristic.service.device.gatt?.connected) {
    await characteristic.service.device.gatt.disconnect();
  }
}

