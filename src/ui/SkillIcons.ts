import type { SkillId } from '../config/SkillConfig';

// Original vector art, keyed by saved skill IDs rather than display labels.
const ICON_PATHS: Record<SkillId, string> = {
  power: `
    <path d="M55 16C48 4 21 6 10 26C20 15 38 12 48 20C54 26 50 37 40 43C57 39 64 26 55 16Z" fill="currentColor" opacity=".75"/>
    <path d="M6 35C11 46 26 53 41 47" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    <path d="M48 10L43 28L23 44L16 37L33 17Z" fill="#fdf2cc" stroke="#162c35" stroke-width="2" stroke-linejoin="round"/>
    <path d="M48 10L20 40L23 44L43 28Z" fill="#b4dcd9"/>
    <path d="M13 34L27 48M18 44L11 51" fill="none" stroke="#172b32" stroke-width="7" stroke-linecap="round"/>
    <path d="M13 34L27 48" fill="none" stroke="#edc779" stroke-width="4" stroke-linecap="round"/>
    <path d="M18 44L11 51" fill="none" stroke="#ab7152" stroke-width="4" stroke-linecap="round"/>
    <circle cx="10" cy="52" r="3" fill="#edc779"/>
  `,
  bolt: `
    <path d="M10 6V14M51 8V20M22 3V9M42 1V7" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".6"/>
    <g fill="#cce7ff" stroke="#1c2945" stroke-width="1.6" stroke-linejoin="round">
      <path d="M11 22H19V41L15 49L11 41Z"/>
      <path d="M45 17H53V36L49 44L45 36Z"/>
      <path d="M27 22H37V46L32 57L27 46Z" fill="#fff4d6"/>
    </g>
    <path d="M32 25V48M15 25V41M49 20V36" stroke="currentColor" stroke-width="2"/>
    <path d="M15 14V21M49 9V16M32 11V21" stroke="#a780bd" stroke-width="4" stroke-linecap="round"/>
    <path d="M9 22H21M43 17H55M24 22H40" stroke="#edc779" stroke-width="3" stroke-linecap="round"/>
    <path d="M14 55L22 58M43 57L51 52M32 62V60" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  `,
  heal: `
    <path d="M14 47C1 31 21 23 18 11L29 21L36 3C38 17 53 18 49 33L56 25C61 43 48 57 33 58C23 58 17 54 14 47Z" fill="currentColor"/>
    <path d="M22 46C15 34 30 28 30 20L37 31L42 25C49 42 43 51 33 53Z" fill="#efb470"/>
    <path d="M18 31L30 36L44 30L42 45L32 54L21 46Z" fill="#52263d" stroke="#ffdeb0" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M23 38L29 41M40 37L34 41" stroke="#fff5ca" stroke-width="3" stroke-linecap="round"/>
    <path d="M29 47L32 45L35 47" fill="none" stroke="#ee947b" stroke-width="2" stroke-linecap="round"/>
    <path d="M9 16L13 23M53 7L49 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  `,
};

export function createSkillIcon(id: SkillId): SVGSVGElement {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 64 64');
  icon.setAttribute('class', 'skill-art');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('focusable', 'false');
  icon.innerHTML = ICON_PATHS[id];
  return icon;
}
