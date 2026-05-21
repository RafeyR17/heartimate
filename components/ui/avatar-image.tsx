import Image from 'next/image'

type AvatarImageProps = {
  src: string
  alt: string
  className?: string
  sizes?: string
  /** Fixed box (e.g. header avatar). Omit when parent is `relative` + `fill`. */
  width?: number
  height?: number
  fill?: boolean
}

function needsUnoptimized(src: string): boolean {
  return src.startsWith('blob:') || src.startsWith('data:')
}

export function AvatarImage({
  src,
  alt,
  className = 'object-cover',
  sizes,
  width,
  height,
  fill,
}: AvatarImageProps) {
  const unoptimized = needsUnoptimized(src)

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized={unoptimized}
        className={className}
        sizes={sizes ?? '48px'}
      />
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 48}
      height={height ?? 48}
      unoptimized={unoptimized}
      className={className}
      sizes={sizes}
    />
  )
}
