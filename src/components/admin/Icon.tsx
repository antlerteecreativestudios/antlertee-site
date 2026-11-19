// Small line icons for the admin (20px, currentColor). Decorative: the text next to them carries the meaning.
const PATHS = {
  home: "M3 10.5 10 4l7 6.5V17a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1z",
  inbox: "M3 11h4l1.5 2.5h3L13 11h4M3 11l2-6h10l2 6v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z",
  techpack: "M6 3h6l4 4v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM12 3v4h4M8 11h5M8 14h5",
  tag: "M3 10V4a1 1 0 0 1 1-1h6l7 7-7 7zM7 7h.01",
  post: "M4 4h12M4 8h12M4 12h8M4 16h6",
  folder: "M3 6a1 1 0 0 1 1-1h4l2 2h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z",
  people: "M7.5 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 17c0-3 2.5-5 5.5-5s5.5 2 5.5 5M13.5 3.5a3 3 0 0 1 0 5.5M15 12c1.8.6 3 2.4 3 5",
  settings:
    "M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM16 10l1.6-1-1.5-2.6-1.8.6a6 6 0 0 0-1.5-.9L12.4 4H9.6l-.4 2.1a6 6 0 0 0-1.5.9l-1.8-.6L4.4 9 6 10l-1.6 1 1.5 2.6 1.8-.6c.4.4.9.7 1.5.9L9.6 16h2.8l.4-2.1c.6-.2 1.1-.5 1.5-.9l1.8.6 1.5-2.6z",
  menu: "M3 6h14M3 10h14M3 14h14",
  close: "M5 5l10 10M15 5 5 15",
  external: "M11 3h6v6M17 3l-8 8M14 12v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4",
  plus: "M10 4v12M4 10h12",
  search: "M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM17 17l-3.5-3.5",
  download: "M10 3v10M6 9l4 4 4-4M4 17h12",
  trash: "M4 6h12M8 6V4h4v2M6 6l1 11h6l1-11",
  image: "M3 5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 13l4-4 3 3 2-2 5 5M13 8h.01",
  arrowLeft: "M12 4 6 10l6 6",
  up: "M10 15V5M5 10l5-5 5 5",
  down: "M10 5v10M5 10l5 5 5-5",
  star: "M10 3l2.2 4.5 4.8.7-3.5 3.4.8 4.9L10 14.2l-4.3 2.3.8-4.9L3 8.2l4.8-.7z",
  whatsapp: "M4 16l1-3.5A6.5 6.5 0 1 1 7.5 15zM8 7.5c0 2.5 2 4.5 4.5 4.5l1-1-1.5-1-1 .5c-.7-.3-1.2-.8-1.5-1.5l.5-1-1-1.5z",
  mail: "M3 5h14v10H3zM3 5l7 6 7-6",
  file: "M6 3h6l4 4v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM12 3v4h4",
  link: "M8.5 11.5a3 3 0 0 0 4.2 0l2.6-2.6a3 3 0 0 0-4.2-4.2l-.8.8M11.5 8.5a3 3 0 0 0-4.2 0l-2.6 2.6a3 3 0 0 0 4.2 4.2l.8-.8",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="a-icon"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
