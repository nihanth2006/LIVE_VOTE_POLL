import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Copy, Share2, Check, QrCode } from 'lucide-react';

interface QRCodeCardProps {
  pollId: string;
  question?: string;
  size?: number;
  compact?: boolean;
  theme?: 'dark' | 'light' | 'stage';
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({
  pollId,
  question,
  size = 190,
  compact = false,
  theme = 'dark',
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  // Dynamic URL using current origin
  const pollUrl = typeof window !== 'undefined' ? `${window.location.origin}/poll/${pollId}` : `/poll/${pollId}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(pollUrl);
      } else {
        // Fallback for older environments
        const textArea = document.createElement('textarea');
        textArea.value = pollUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;

    // Create a high-res export canvas with clean white background and padding
    const exportCanvas = document.createElement('canvas');
    const padding = 32;
    exportCanvas.width = canvas.width + padding * 2;
    exportCanvas.height = canvas.height + padding * 2;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // Crisp white background for universal scanner readability
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(canvas, padding, padding);

    const imageURI = exportCanvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = imageURI;
    downloadLink.download = `poll-${pollId}-qr.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: question ? `Live Poll: ${question}` : 'Live Poll',
          text: question ? `Vote on this live poll: "${question}"` : 'Cast your vote on this live poll!',
          url: pollUrl,
        });
        setShareSuccess('Shared!');
        setTimeout(() => setShareSuccess(null), 2000);
        return;
      } catch (err: any) {
        // If user cancelled, don't fallback to error
        if (err?.name === 'AbortError') return;
      }
    }
    // Fallback to copying link
    await handleCopyLink();
    setShareSuccess('Link copied!');
    setTimeout(() => setShareSuccess(null), 2500);
  };

  const isStage = theme === 'stage';

  return (
    <div
      className={`rounded-2xl transition-all ${
        isStage
          ? 'bg-slate-900/90 border-2 border-indigo-500/40 p-5 shadow-2xl backdrop-blur-md'
          : 'bg-slate-900/70 border border-slate-800 p-5'
      } flex flex-col items-center text-center`}
    >
      {/* Header */}
      <div className="flex items-center space-x-2 mb-3">
        <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
          <QrCode className="w-4 h-4" />
        </span>
        <h3 className={`font-bold tracking-wide uppercase ${isStage ? 'text-sm text-indigo-300' : 'text-xs text-slate-300'}`}>
          Scan to Vote
        </h3>
      </div>

      {/* QR Code Graphic Frame (White backdrop ensures 100% camera scanner readability) */}
      <div
        ref={qrRef}
        className="p-3.5 bg-white rounded-xl shadow-lg border border-slate-200 inline-block transition-transform hover:scale-[1.02]"
      >
        <QRCodeCanvas
          value={pollUrl}
          size={size}
          level="H"
          marginSize={1}
          bgColor="#ffffff"
          fgColor="#020617"
        />
      </div>

      {/* Live Voting URL readout */}
      <div className="mt-3 max-w-[260px] truncate text-[11px] font-mono text-slate-400 bg-slate-950/60 px-3 py-1 rounded-full border border-slate-800/80">
        {pollUrl}
      </div>

      {/* Interactive Controls (Download, Copy Link, Share) */}
      {!compact && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 w-full pt-3 border-t border-slate-800/60">
          {/* Download QR button */}
          <button
            type="button"
            onClick={handleDownloadQR}
            title="Download high-resolution PNG for projector or print"
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center space-x-1.5 shadow-sm active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Download QR</span>
          </button>

          {/* Copy Link button */}
          <button
            type="button"
            onClick={handleCopyLink}
            title="Copy poll voting link to clipboard"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-sm active:scale-95 ${
              copied
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>✓ Link copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          {/* Share Poll button */}
          <button
            type="button"
            onClick={handleShare}
            title="Share via device share sheet or copy link"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-sm active:scale-95 ${
              shareSuccess
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>{shareSuccess || 'Share Poll'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
