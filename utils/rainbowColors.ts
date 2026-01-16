import { Colors } from '@/constants/theme';

/**
 * Represents a rainbow color scheme for cards
 * Includes colors for icon background, card border, and icon itself
 */
export interface RainbowColorScheme {
    /** Background color for the icon container (e.g., "bg-red-50") */
    iconBgColor: string;
    /** Border color for the card (e.g., "border-red-200") */
    borderColor: string;
    /** HEX color for the icon from Colors.rainbow array */
    iconColor: string;
}

/**
 * Pre-defined array of 7 rainbow color schemes
 * Uses complete Tailwind class names for build-time generation
 * Matches the 7 colors in Colors.rainbow from theme.ts
 */
const rainbowColorSchemes: RainbowColorScheme[] = [
    // Red
    {
        iconBgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        iconColor: Colors.rainbow[0], // #E81416
    },
    // Orange
    {
        iconBgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        iconColor: Colors.rainbow[1], // #FFA500
    },
    // Yellow
    {
        iconBgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        iconColor: Colors.rainbow[2], // #FAEB36
    },
    // Green
    {
        iconBgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        iconColor: Colors.rainbow[3], // #79C314
    },
    // Blue
    {
        iconBgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: Colors.rainbow[4], // #487DE7
    },
    // Indigo
    {
        iconBgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200',
        iconColor: Colors.rainbow[5], // #4B369D
    },
    // Violet
    {
        iconBgColor: 'bg-violet-50',
        borderColor: 'border-violet-200',
        iconColor: Colors.rainbow[6], // #70369D
    },
];

/**
 * Get a rainbow color scheme by index with automatic cycling
 * Uses modulo operator to repeat colors after reaching the end
 * 
 * @param index - The index for color selection (0-based)
 * @returns RainbowColorScheme object with iconBgColor, borderColor, and iconColor
 * 
 * @example
 * // First card gets red
 * const scheme0 = getRainbowColorScheme(0);
 * 
 * // Eighth card gets red again (cycles back)
 * const scheme7 = getRainbowColorScheme(7);
 */
export function getRainbowColorScheme(index: number): RainbowColorScheme {
    const safeIndex = index % rainbowColorSchemes.length;
    return rainbowColorSchemes[safeIndex];
}
