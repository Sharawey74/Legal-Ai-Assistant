import { useState, useRef } from "react";
import type { DragEvent, ChangeEvent } from "react";
import { uploadDocument } from "../../api/documents.api";
import type { Document } from "../../types/document.types";

const MAX_MB = 20;
const FORMATS = ["PDF", "TXT", "MD", "DOCX"];

interface Props { onUploaded: (doc: Document) => void; }

export default function UploadDropzone({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState("");

  function validate(file: File): string {
    if (!file.name.match(/\.(pdf|txt|md|docx)$/i))
      return "Only PDF, TXT, MD, and DOCX files are supported";
    if (file.size > MAX_MB * 1024 * 1024)
      return `File must be smaller than ${MAX_MB} MB`;
    return "";
  }

  async function handleFile(file: File) {
    const err = validate(file);
    if (err) { setError(err); return; }
    setError("");
    setUploading(true);
    setProgress(0);
    // Simulate progress
    const interval = setInterval(() => setProgress(p => Math.min(p + 12, 85)), 400);
    try {
      const doc = await uploadDocument(file);
      setProgress(100);
      setTimeout(() => { setUploading(false); setProgress(0); }, 400);
      onUploaded(doc);
    } catch (e: any) {
      setError(e.response?.data?.detail ?? "Upload failed");
      setUploading(false);
      setProgress(0);
    } finally {
      clearInterval(interval);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`
        relative rounded-2xl border-2 border-dashed p-10 text-center
        transition-all duration-300 overflow-hidden group
        ${uploading
          ? "border-indigo-500/30 bg-indigo-500/5 cursor-default"
          : dragging
            ? "border-indigo-500/60 bg-indigo-500/10 scale-[1.01] cursor-copy"
            : "border-white/10 hover:border-indigo-500/30 hover:bg-white/3 cursor-pointer"
        }
      `}
    >
      {/* Animated gradient border on drag */}
      {dragging && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-transparent to-violet-500/10 pointer-events-none" />
      )}

      <input ref={inputRef} type="file" accept=".pdf,.txt,.md,.docx" className="hidden" onChange={onChange} />

      {/* Icon */}
      <div
        className={`
          w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-4 transition-all duration-300
          ${dragging
            ? "bg-indigo-500/20 scale-110 border border-indigo-500/30"
            : uploading
              ? "bg-indigo-500/15 border border-indigo-500/20"
              : "bg-white/5 border border-white/10 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20"
          }
        `}
      >
        <span
          className={`material-symbols-outlined text-[22px] transition-colors ${
            dragging || uploading ? "text-indigo-400" : "text-slate-500 group-hover:text-indigo-400"
          } ${uploading ? "animate-spin" : ""}`}
        >
          {uploading ? "progress_activity" : "upload_file"}
        </span>
      </div>

      {/* Text */}
      <p className="text-sm font-bold text-white mb-1">
        {uploading ? "Uploading & Processing…" : dragging ? "Drop to upload" : "Drop a document or click to browse"}
      </p>

      {/* Progress bar */}
      {uploading ? (
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">
            Processing embedding models — this may take up to 30 seconds
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 mt-3">
          {FORMATS.map(f => (
            <span key={f} className="text-[10px] font-bold text-slate-600 bg-white/5 border border-white/8 px-2 py-1 rounded-lg tracking-wider">
              {f}
            </span>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          <span className="material-symbols-outlined text-[16px]">error</span>
          {error}
        </div>
      )}
    </div>
  );
}
