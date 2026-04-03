type IconName =
  | "home"
  | "library"
  | "review"
  | "settings"
  | "play"
  | "search"
  | "level"
  | "topic"
  | "bookmark"
  | "spark"
  | "flag"
  | "download"
  | "upload"
  | "refresh"
  | "audio"
  | "eye";

const PATHS: Record<IconName, string> = {
  home: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
  library: "M5 4.5h14a2 2 0 0 1 2 2V20H7a2 2 0 0 0-2 2V4.5z M7 20h14",
  review: "M20 12a8 8 0 1 1-2.34-5.66M20 4v6h-6",
  settings: "M12 3v3m0 12v3m9-9h-3M6 12H3m15.36 6.36-2.12-2.12M7.76 7.76 5.64 5.64m12.72 0-2.12 2.12M7.76 16.24l-2.12 2.12",
  play: "M8 6.5v11l9-5.5z",
  search: "m20 20-4.2-4.2M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0z",
  level: "M4 19h16M6 16l3-4 3 2 6-8",
  topic: "M5 5h14v6H5zM5 14h14v5H5z",
  bookmark: "M7 4h10v16l-5-3-5 3z",
  spark: "M12 3l1.8 4.7L18.5 9l-4.7 1.3L12 15l-1.8-4.7L5.5 9l4.7-1.3z",
  flag: "M6 3v18M6 4h10l-1.6 3L16 10H6",
  download: "M12 4v11m0 0 4-4m-4 4-4-4M5 20h14",
  upload: "M12 20V9m0 0 4 4m-4-4-4 4M5 4h14",
  refresh: "M20 12a8 8 0 1 1-2.34-5.66M20 4v6h-6",
  audio: "M5 15V9m4 9V6m4 12v-8m4 8V8",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
};

export function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d={PATHS[name]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
