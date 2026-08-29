interface CruzMaltaProps {
  size?: number;
  color?: string;
  opacity?: number;
}

export function CruzMalta({ size = 16, color = "#C00000", opacity = 1 }: CruzMaltaProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill={color} opacity={opacity}>
      <polygon points="50,2 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35" />
    </svg>
  );
}
