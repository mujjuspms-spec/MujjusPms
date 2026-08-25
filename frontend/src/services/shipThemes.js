// One ship color scheme per venture — swap freely once you have real brand colors.
export const SHIP_THEMES = {
  pr1: { primary: '#b9c1cc', dark: '#333a44', glass: '#8ec6ff', accent: '#0e7c66', accent2: '#eda100' },
  pr2: { primary: '#e3c9c9', dark: '#3a2d2d', glass: '#8ec6ff', accent: '#e34948', accent2: '#eda100' },
  pr3: { primary: '#c9d4e3', dark: '#2c333e', glass: '#bfe0ff', accent: '#2a78d6', accent2: '#5fc9a8' },
  pr4: { primary: '#cdd6c9', dark: '#2b332c', glass: '#8ec6ff', accent: '#1baf7a', accent2: '#eda100' },
  pr5: { primary: '#d6cce3', dark: '#2f2b3a', glass: '#c9b8ff', accent: '#4a3aa7', accent2: '#e34948' },
  pr6: { primary: '#e3dcc9', dark: '#3a352b', glass: '#8ec6ff', accent: '#eda100', accent2: '#0e7c66' },
  pr7: { primary: '#c9e3d6', dark: '#2b3a33', glass: '#8ec6ff', accent: '#1baf7a', accent2: '#2a78d6' },
  pr8: { primary: '#e3d3a3', dark: '#3a3220', glass: '#ffe1a3', accent: '#eda100', accent2: '#0e7c66' },
};

export function shipTheme(pid) {
  return SHIP_THEMES[pid] || SHIP_THEMES.pr1;
}
