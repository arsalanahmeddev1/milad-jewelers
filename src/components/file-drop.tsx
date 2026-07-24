import { Image as ImageIcon } from "lucide-react";

export function FileDrop({ label, onFile }: { label: string; onFile: (f: File) => void }) {
  return (
    <label className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30 transition-colors">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <ImageIcon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="font-semibold">{label}</div>
      <div className="text-xs text-muted-foreground mt-1">Click to browse — images, PDF, or CAD</div>
      <input type="file" accept="image/*,.pdf,.stl,.obj" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
    </label>
  );
}
