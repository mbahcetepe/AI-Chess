interface AvatarProps {
  emoji: string;
  color: string;
  size?: number;
}

export default function Avatar({ emoji, color, size = 40 }: AvatarProps) {
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        background: `${color}22`,
        border: `2px solid ${color}`,
        fontSize: size * 0.55,
      }}
    >
      {emoji}
    </span>
  );
}
