import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt", // Show update toast instead of silent auto-update
      includeAssets: ["favicon.ico", "icons/*.png"],
      manifest: {
        name: "Dorm67 — Campus Super App",
        short_name: "Dorm67",
        description: "Marketplace, chats and announcements for university students",
        theme_color: "#6366f1",
        background_color: "#0f0f23",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            // Maskable icon required for Android adaptive icons
            src: "/icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icons/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
          },
        ],
      },
      workbox: {
        // Cache static assets only — Firestore SDK handles its own offline persistence
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
        // DO NOT add runtimeCaching for Firestore — let Firebase SDK handle offline
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
