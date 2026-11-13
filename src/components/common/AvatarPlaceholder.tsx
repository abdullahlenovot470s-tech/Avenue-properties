import React, { useId } from 'react';

export type AvatarVariant = 'male' | 'female' | 'hijab';

interface AvatarPlaceholderProps {
  variant?: AvatarVariant;
  className?: string;
}

export const AvatarPlaceholder: React.FC<AvatarPlaceholderProps> = ({
  variant = 'male',
  className = '',
}) => {
  const uniqueId = useId().replace(/:/g, '');
  const gradientId = `avatar-grad-${uniqueId}`;

  return (
    <div className={`relative w-full h-full overflow-hidden flex items-end justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full block"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Soft background gradient from #E6ECF5 (top) to #FFFFFF (bottom) */}
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E6ECF5" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>
        </defs>

        {/* Card background */}
        <rect width="100" height="100" fill={`url(#${gradientId})`} />

        {/* 
          Silhouette in slate-blue #2F4B73 at 85% opacity.
          Figure is centred and fills ~70% of the card width (x: 15 to 85).
          Shoulders are cropped by the bottom edge (y: 100).
        */}
        <g fill="#2F4B73" fillOpacity="0.85">
          {variant === 'male' && (
            <>
              {/* Male torso & shoulders: cropped at bottom edge y=100, spans 70% width */}
              <path d="M 15 100 C 15 82 28 73 40 68 L 40 52 L 60 52 L 60 68 C 72 73 85 82 85 100 Z" />
              {/* Male head with short, neat hair outline */}
              <path d="M 50 18 C 40 18 33 24 33 34 C 33 39 35 43 36 44 C 37 49 42 54 50 54 C 58 54 63 49 64 44 C 65 43 67 39 67 34 C 67 24 60 18 50 18 Z" />
            </>
          )}

          {variant === 'female' && (
            <>
              {/* Female shoulders & torso */}
              <path d="M 16 100 C 16 83 29 74 41 70 L 41 54 L 59 54 L 59 70 C 71 74 84 83 84 100 Z" />
              {/* Female head with slightly longer hair outline falling to shoulders */}
              <path d="M 50 18 C 39 18 31 24 31 36 C 31 46 29 57 30 65 C 33 66 37 64 38 60 C 38 56 39 53 41 52 C 43 54 46 55 50 55 C 54 55 57 54 59 52 C 61 53 62 56 62 60 C 63 64 67 66 70 65 C 71 57 69 46 69 36 C 69 24 61 18 50 18 Z" />
            </>
          )}

          {variant === 'hijab' && (
            <>
              {/* Hijab shoulders, neck drape and head covered by a smooth draped hijab outline */}
              <path d="M 14 100 C 14 78 26 69 37 63 C 41 61 42 54 42 52 L 58 52 C 58 54 59 61 63 63 C 74 69 86 78 86 100 Z" />
              {/* Smooth draped headscarf contour over head and chin */}
              <path d="M 50 16 C 38 16 32 24 32 36 C 32 47 38 56 50 56 C 62 56 68 47 68 36 C 68 24 62 16 50 16 Z" />
            </>
          )}
        </g>
      </svg>
    </div>
  );
};
