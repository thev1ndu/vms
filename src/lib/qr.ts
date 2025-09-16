import QRCode from 'qrcode';

export async function makeQRDataURL(payload: object) {
  return QRCode.toDataURL(JSON.stringify(payload), { width: 256, margin: 1 });
}
