"use client";

import { useCallback, useRef } from "react";
import { ImagePlus, Film, X } from "lucide-react";
import type {
  PostType,
  MediaFile,
  ExistingMedia,
} from "@/hooks/use-post-composer";
import { cn } from "@/lib/utils";

interface Props {
  postType: Exclude<PostType, "text">;
  files: MediaFile[];
  existingMedia?: ExistingMedia[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
}

const accept: Record<string, string> = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  video: "video/mp4,video/quicktime,video/webm",
};

export default function MediaUpload({
  postType,
  files,
  existingMedia = [],
  onAdd,
  onRemove,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length) onAdd(dropped);
    },
    [onAdd],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || []);
      if (selected.length) onAdd(selected);
      e.target.value = "";
    },
    [onAdd],
  );

  const isVideo = postType === "video";
  const Icon = isVideo ? Film : ImagePlus;

  const hasAnyMedia = files.length > 0 || existingMedia.length > 0;

  if (hasAnyMedia) {
    return (
      <div className="flex flex-wrap gap-3">
        {/* Existing (already-uploaded) media */}
        {existingMedia.map((m) => (
          <div
            key={m.id}
            className="relative group rounded-lg overflow-hidden border bg-muted max-w-xs"
          >
            {m.isVideo ? (
              <video
                src={m.url}
                controls
                className="max-h-96 w-auto rounded-lg"
              />
            ) : (
              <img src={m.url} alt="" className="max-h-96 w-auto rounded-lg" />
            )}
            <button
              onClick={() => onRemove(m.id)}
              className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {/* New local files */}
        {files.map((f) => (
          <div
            key={f.id}
            className="relative group rounded-lg overflow-hidden border bg-muted max-w-xs"
          >
            {f.file.type.startsWith("video") ? (
              <video
                src={f.preview}
                controls
                className="max-h-96 w-auto rounded-lg"
              />
            ) : (
              <img
                src={f.preview}
                alt=""
                className="max-h-96 w-auto rounded-lg"
              />
            )}
            <button
              onClick={() => onRemove(f.id)}
              className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {/* Add more button (images only) */}
        {!isVideo && (
          <button
            onClick={() => inputRef.current?.click()}
            className="rounded-lg min-w-40 border-2 border-dashed border-muted-foreground/20 aspect-square flex items-center justify-center hover:border-primary/40 transition-colors"
          >
            <ImagePlus className="size-6 text-muted-foreground/40" />
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept[postType]}
          multiple={!isVideo}
          onChange={handleChange}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/20",
        "py-12 cursor-pointer transition-colors hover:border-primary/40 hover:bg-primary/5",
      )}
    >
      <Icon className="size-10 text-muted-foreground/40" strokeWidth={1.5} />
      <p className="text-sm font-medium text-muted-foreground">
        Click to upload or drag and drop
      </p>
      <p className="text-xs text-muted-foreground/60">
        {isVideo ? "Video" : "Image(s)"}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={accept[postType]}
        multiple={!isVideo}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
