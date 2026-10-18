type IconProps = {
  className?: string;
};

export function PlusIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2.5v11M2.5 8h11" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function MinusIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.5 8h11" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function ResetIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3.2 8a4.8 4.8 0 1 0 1.2-3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M3 2.8v3.2h3.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function BackIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M10 3.5 5.5 8 10 12.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function PlayIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5 3.5v9l8-4.5-8-4.5Z" fill="currentColor" />
    </svg>
  );
}

export function PauseIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4.5 3.5h2.2v9H4.5v-9Zm4.8 0h2.2v9H9.3v-9Z" fill="currentColor" />
    </svg>
  );
}

export function MuteIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 6.2h2.2L8.5 3.5v9L5.2 9.8H3V6.2Z" fill="currentColor" />
      <path d="m10.2 6.2 3.2 3.6M13.4 6.2l-3.2 3.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function VolumeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 6.2h2.2L8.5 3.5v9L5.2 9.8H3V6.2Z" fill="currentColor" />
      <path d="M10.2 6.1a2.6 2.6 0 0 1 0 3.8" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="m4 4 8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function StoryIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 4.6C6.4 3.6 4.6 3.4 2.5 3.9v8.2c2.1-.5 3.9-.3 5.5.7 1.6-1 3.4-1.2 5.5-.7V3.9c-2.1-.5-3.9-.3-5.5.7Zm0 0v8.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DoorwayIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M4 13.5V7.2a4 4 0 0 1 8 0v6.3M2.5 13.5h11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MagnifierIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="m10.1 10.1 3.4 3.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function PointsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="1.6" fill="currentColor" />
    </svg>
  );
}
