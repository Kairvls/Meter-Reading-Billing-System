import Image from "next/image";

type Props = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function LeyecoLogo({ size = 96, className = "", priority = false }: Props) {
  return (
    <Image
      src="/leyeco-logo.jpg"
      alt="LEYECO V — Leyte V Electric Cooperative, Inc."
      width={size}
      height={size}
      priority={priority}
      className={`object-contain ${className}`}
    />
  );
}
