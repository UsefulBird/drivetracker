import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Generates the PNG app icons from public/favicon.svg. Run with `npm run icons`
// after changing the SVG, then commit the PNGs it writes into public/.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // Black instead of white padding, so the icons match the app.
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#000000' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#000000' } },
  },
  images: ['public/favicon.svg'],
})
