import Svg, { Circle, Path } from 'react-native-svg';

type TabIconName = 'timer' | 'stats' | 'achievements' | 'settings';

interface TabIconProps {
  name: TabIconName;
  color: string;
}

export function TabIcon({ name, color }: TabIconProps) {
  switch (name) {
    case 'timer':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.5} />
          <Path
            d="M12 6v6l4 2"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'stats':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 20V12M10 20V8M16 20V4M22 20V10"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'achievements':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2l3 6.5 7 .5-5.2 4.5 1.7 7L12 17l-6.5 3.5 1.7-7L2 9l7-.5L12 2z"
            stroke={color}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'settings':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.5} />
          <Path
            d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </Svg>
      );
  }
}
