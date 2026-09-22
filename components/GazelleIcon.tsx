/**
 * أيقونة فطين — غزال أنيق وذكي (SVG بسيط، غير كرتوني)
 * ملف مشترك يُستخدم في جميع شاشات تحدي فطين
 */

export default function GazelleIcon({
  size = 20,
  className = '',
  strokeWidth = 1.3,
}: {
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* قرنان مميزان — سمة الغزال */}
      <path d="M10 14Q7 7 4 2" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M22 14Q25 7 28 2" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* تفرّع خفيف للقرنين */}
      <path d="M7.6 9.5Q6 8.8 5 7.4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M24.4 9.5Q26 8.8 27 7.4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      {/* الرأس */}
      <path
        d="M9 17Q16 11 23 17Q21 23 16 25Q11 23 9 17Z"
        fill="currentColor"
        opacity="0.1"
      />
      <path
        d="M9 17Q16 11 23 17Q21 23 16 25Q11 23 9 17Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* العين */}
      <circle cx="12.6" cy="16.8" r="0.75" fill="currentColor" />
      {/* الأنف */}
      <circle cx="16" cy="22.6" r="0.6" fill="currentColor" opacity="0.55" />
    </svg>
  );
}
