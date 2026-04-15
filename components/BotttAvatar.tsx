'use client';
import Image from 'next/image';
import { getBotttUrl } from '@/lib/dicebear';
import { cn } from '@/lib/utils';

export function BotttAvatar({
  seed,
  anrede,
  size = 64,
  className,
}: {
  seed: string;
  anrede?: string;
  size?: number;
  className?: string;
}) {
  const url = getBotttUrl(seed, anrede);
  return (
    <div
      className={cn('rounded-full overflow-hidden shrink-0 border border-border bg-surface', className)}
      style={{ width: size, height: size }}
    >
      <Image src={url} alt="Bottt" width={size} height={size} unoptimized />
    </div>
  );
}
