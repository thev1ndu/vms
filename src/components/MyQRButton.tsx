'use client';
import { useEffect, useState } from 'react';
import StableDialog from '@/components/StableDialog';
import { makeQRDataURL } from '@/lib/qr';
import { QrCode } from 'lucide-react';

export default function MyQRButton() {
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch('/api/me');
        const j = await res.json();
        if (!res.ok) return;

        const who = await fetch('/api/whoami');
        const wj = await who.json();
        if (!who.ok || !wj?.id) return;

        const payload = { v: 1, kind: 'VOL', uid: wj.id };
        const img = await makeQRDataURL(payload);
        if (!cancelled) setQr(img);
      } catch {
        /* ignore */
      }
    }
    if (open && !qr) run();
    return () => {
      cancelled = true;
    };
  }, [open, qr]);

  return (
    <StableDialog
      open={open}
      onOpenChange={(v) => setOpen(v)}
      trigger={
        <QrCode
          className="w-7 h-7 cursor-pointer text-white hover:text-[#FFFFFF] transition"
          aria-label="My QR"
        />
      }
      title="SHARE YOUR VOLUNTEER QR"
      contentClassName="sm:max-w-md border-2 border-[#A5D8FF] bg-[#000000] rounded-none"
      headerClassName="p-0"
      titleClassName="mx-auto w-[90%] bg-[#C49799] j text-xl text-black text-center py-3 mb-4"
    >
      <div className="flex items-center justify-center p-4">
        {qr ? (
          <img src={qr} alt="My QR" className="w-56 h-56" />
        ) : (
          <div className="text-sm">Generating…</div>
        )}
      </div>
    </StableDialog>
  );
}
