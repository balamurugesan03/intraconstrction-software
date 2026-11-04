import { useState } from 'react';
import { Download, Share, SquarePlus } from 'lucide-react';
import { Button, Modal } from './ui';
import { useInstallApp } from '../lib/pwa';
import { cn } from '../lib/format';

/** "Install app" button. Hidden when the browser can't install it or it is already installed. */
export default function InstallApp({ variant = 'button', className }) {
  const { canInstall, ios, install } = useInstallApp();
  const [help, setHelp] = useState(false);
  if (!canInstall) return null;

  const onClick = () => (ios ? setHelp(true) : install());

  return (
    <>
      {variant === 'icon' ? (
        <button onClick={onClick} title="Install app" className={cn('flex items-center gap-1.5 rounded-lg p-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-slate-800', className)}>
          <Download className="size-5" /><span className="hidden sm:inline">Install app</span>
        </button>
      ) : (
        <Button variant="secondary" icon={Download} onClick={onClick} className={className}>Install app on this device</Button>
      )}
      <Modal open={help} onClose={() => setHelp(false)} title="Install on iPhone / iPad" size="sm"
        footer={<Button onClick={() => setHelp(false)}>Got it</Button>}>
        <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex items-center gap-2">1. Open this page in <b>Safari</b></li>
          <li className="flex items-center gap-2">2. Tap the Share button <Share className="size-4 text-brand-600" /></li>
          <li className="flex items-center gap-2">3. Choose <b>Add to Home Screen</b> <SquarePlus className="size-4 text-brand-600" /></li>
          <li>4. Tap <b>Add</b> — the Intra ERP icon appears on your home screen.</li>
        </ol>
      </Modal>
    </>
  );
}
