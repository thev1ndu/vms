'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import StableDialog from '@/components/StableDialog';
import { Scanner as CamScanner } from '@yudiel/react-qr-scanner';
import { QrCode, ArrowUpRight } from 'lucide-react';

export default function QRScanButton() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>('');

  async function handlePayload(payload: any) {
    if (payload?.kind === 'VOL' && payload?.uid) {
      const res = await fetch('/api/social/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      });
      const j = await res.json();
      if (!res.ok) setStatus(j.error || 'Scan failed');
      else
        setStatus(j.message || `+${j.awarded ?? 0} XP! Level ${j.level ?? ''}`);
      return;
    }

    if (payload?.kind === 'TASK' && payload?.taskId) {
      const res = await fetch('/api/tasks/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      });
      const j = await res.json();
      if (!res.ok) setStatus(j.error || 'Join failed');
      else setStatus(`Joined! ${j.assigned}/${j.required} slots`);
      return;
    }

    setStatus('Unsupported QR');
  }

  async function onScan(text: string) {
    try {
      const payload = JSON.parse(text);
      await handlePayload(payload);
    } catch {
      setStatus('Invalid QR');
    }
  }

  return (
    <StableDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setStatus('');
      }}
      trigger={
        <Button className="h-14 w-full text-lg rounded-none bg-[#9FFF82] text-black hover:bg-[#9FFF82] cursor-pointer flex items-center justify-center gap-2">
          {/* <ArrowUpRight className="w-5 h-5" /> <br /> */}
          <span>Scan QR</span>
        </Button>
      }
      title="SCAN QR"
      contentClassName="sm:max-w-md border-2 border-[#A5D8FF] bg-[#000000] rounded-none"
      headerClassName="p-0"
      titleClassName="mx-auto w-[90%] bg-[#C49799] j text-xl text-black text-center py-3 mb-4"
    >
      <div className="flex flex-col items-center justify-center p-4">
        <div className="w-64 h-64">
          <CamScanner
            onScan={(codes) => {
              const text = codes?.[0]?.rawValue || '';
              if (text) void onScan(text);
            }}
            onError={() => setStatus('Camera error')}
          />
        </div>
        <div className="text-sm text-center text-white mt-8">{status}</div>
      </div>
    </StableDialog>
  );
}
