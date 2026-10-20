import React from 'react';
import Svg, { Path, Circle, Rect, G, Line } from 'react-native-svg';

interface DoodleProps {
  size?: number;
  color?: string;
  accentColor?: string;
}

/**
 * Doodle 1: Mindful Reading & Quiet Contemplation
 * Hand-drawn notebook, steaming cup, soft ambient breeze
 */
export const DoodleReading: React.FC<DoodleProps> = ({
  size = 180,
  color = '#2C2825',
  accentColor = '#8A7E72',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      {/* Ambient background soft glow */}
      <Circle cx="80" cy="80" r="64" fill="#F4EBE1" />

      {/* Hand-drawn Open Book */}
      <Path
        d="M28 104 C48 94, 76 96, 80 106 C84 96, 112 94, 132 104 L130 52 C110 42, 84 44, 80 54 C76 44, 50 42, 30 52 Z"
        stroke={color}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="#FAF6F0"
      />
      {/* Book Center spine */}
      <Path
        d="M80 54 L80 106"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Hand-drawn Page Lines (Left) */}
      <Path
        d="M40 64 C52 60, 68 62, 72 66"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="M40 76 C52 72, 68 74, 72 78"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="M42 88 C52 84, 66 86, 70 90"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Hand-drawn Page Lines (Right) */}
      <Path
        d="M88 66 C92 62, 108 60, 120 64"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="M88 78 C92 74, 108 72, 120 76"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="M90 90 C94 86, 106 84, 118 88"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Floating bookmark ribbon */}
      <Path
        d="M80 106 Q82 120, 88 126 L94 120 L100 126 Q92 116, 80 106"
        fill={accentColor}
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Subtle doodle dots / breeze sparks */}
      <Circle cx="35" cy="38" r="3" fill={accentColor} />
      <Circle cx="125" cy="35" r="2.5" fill={accentColor} />
      <Path
        d="M120 118 Q126 114, 132 118"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
};

/**
 * Doodle 2: Organized Collections & Bookmarked Tags
 * Hand-drawn folder layers, tag chips, bookmark tabs
 */
export const DoodleCollections: React.FC<DoodleProps> = ({
  size = 180,
  color = '#2C2825',
  accentColor = '#8A7E72',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      {/* Ambient background soft glow */}
      <Circle cx="80" cy="80" r="64" fill="#F4EBE1" />

      {/* Back folder sheet */}
      <Path
        d="M45 45 L80 45 L90 55 L125 55 C129 55, 131 57, 131 61 L126 116 C126 120, 123 123, 119 123 L41 123 C37 123, 34 120, 34 116 L39 51 C39 47, 41 45, 45 45 Z"
        stroke={accentColor}
        strokeWidth="2.5"
        strokeDasharray="4 4"
        fill="#E8DFD5"
      />

      {/* Main Front Folder */}
      <Path
        d="M32 60 L68 60 L78 72 L128 72 C132 72, 135 75, 135 79 L132 122 C132 126, 129 129, 125 129 L35 129 C31 129, 28 126, 28 122 L29 67 C29 63, 31 60, 32 60 Z"
        stroke={color}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="#FAF6F0"
      />

      {/* Inside Paper protruding */}
      <Rect
        x="48"
        y="35"
        width="54"
        height="40"
        rx="4"
        stroke={color}
        strokeWidth="2.5"
        fill="#FFFFFF"
      />
      <Line x1="56" y1="46" x2="84" y2="46" stroke={accentColor} strokeWidth="2" strokeLinecap="round" />
      <Line x1="56" y1="56" x2="94" y2="56" stroke={accentColor} strokeWidth="2" strokeLinecap="round" />

      {/* Little tag doodle chip */}
      <G transform="translate(85, 96)">
        <Rect
          x="0"
          y="0"
          width="42"
          height="20"
          rx="10"
          stroke={color}
          strokeWidth="2"
          fill="#FAF6F0"
        />
        <Circle cx="8" cy="10" r="2.5" fill={accentColor} />
        <Line x1="16" y1="10" x2="34" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </G>

      {/* Little floating dot */}
      <Circle cx="35" cy="40" r="3" fill={accentColor} />
      <Circle cx="128" cy="48" r="2" fill={accentColor} />
    </Svg>
  );
};

/**
 * Doodle 3: Calm Time Balance & Nudges
 * Hand-drawn hourglass, soft sun orbital rings, gentle ticks
 */
export const DoodleTime: React.FC<DoodleProps> = ({
  size = 180,
  color = '#2C2825',
  accentColor = '#8A7E72',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      {/* Ambient background soft glow */}
      <Circle cx="80" cy="80" r="64" fill="#F4EBE1" />

      {/* Orbiting dashed ring */}
      <Circle
        cx="80"
        cy="80"
        r="54"
        stroke={accentColor}
        strokeWidth="1.8"
        strokeDasharray="6 6"
      />

      {/* Hand-drawn Hourglass */}
      {/* Top bar */}
      <Line x1="50" y1="36" x2="110" y2="36" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
      {/* Bottom bar */}
      <Line x1="50" y1="124" x2="110" y2="124" stroke={color} strokeWidth="3.5" strokeLinecap="round" />

      {/* Glass curves */}
      <Path
        d="M58 38 C58 70, 76 76, 80 80 C84 76, 102 70, 102 38 Z"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        fill="#FAF6F0"
      />
      <Path
        d="M58 122 C58 90, 76 84, 80 80 C84 84, 102 90, 102 122 Z"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        fill="#FAF6F0"
      />

      {/* Falling sand grains */}
      <Path
        d="M66 52 Q80 62, 94 52 L80 76 Z"
        fill={accentColor}
      />
      <Line x1="80" y1="80" x2="80" y2="98" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 3" />
      <Path
        d="M68 122 Q80 110, 92 122 Z"
        fill={accentColor}
      />

      {/* Little sun arc / smile arc */}
      <Path
        d="M26 80 C26 65, 34 52, 45 44"
        stroke={accentColor}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Path
        d="M134 80 C134 95, 126 108, 115 116"
        stroke={accentColor}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Svg>
  );
};

/**
 * Doodle 4: Personal Sanctuary & Safe Account
 * Minimalist padlock, calm feather/key lines, privacy shield
 */
export const DoodleSanctuary: React.FC<DoodleProps> = ({
  size = 180,
  color = '#2C2825',
  accentColor = '#8A7E72',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      {/* Ambient background soft glow */}
      <Circle cx="80" cy="80" r="64" fill="#F4EBE1" />

      {/* Shackle */}
      <Path
        d="M60 70 L60 52 C60 40, 70 30, 80 30 C90 30, 100 40, 100 52 L100 70"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Padlock Body */}
      <Rect
        x="46"
        y="68"
        width="68"
        height="56"
        rx="14"
        stroke={color}
        strokeWidth="3.2"
        fill="#FAF6F0"
      />

      {/* Keyhole */}
      <Circle cx="80" cy="92" r="5" fill={color} />
      <Path
        d="M77 94 L83 94 L85 106 L75 106 Z"
        fill={color}
      />

      {/* Ambient serene protective halo rings */}
      <Path
        d="M32 78 C30 96, 36 114, 50 126"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 4"
      />
      <Path
        d="M128 78 C130 96, 124 114, 110 126"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 4"
      />

      {/* Peaceful spark accents */}
      <Circle cx="44" cy="48" r="3" fill={accentColor} />
      <Circle cx="118" cy="46" r="2.5" fill={accentColor} />
    </Svg>
  );
};
