'use client'
import { useTheme } from 'next-themes'
import { useEffect } from 'react'

const themeColors = {
  light: '#ffffff',
  dark: '#09090b',
  ghibli: '#f0f9ff', // A light blue, can be adjusted
}

export function ThemeColorUpdater() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const metaThemeColorTags = document.querySelectorAll("meta[name=theme-color]");
    if (metaThemeColorTags.length > 0 && resolvedTheme) {
      const color = themeColors[resolvedTheme as keyof typeof themeColors] || themeColors.light;
      metaThemeColorTags.forEach(tag => {
        tag.setAttribute("content", color);
        // Once the theme is set client-side, we remove the media query 
        // to ensure the selected theme's color is applied.
        tag.removeAttribute("media");
      });
    }
  }, [resolvedTheme])

  return null
} 