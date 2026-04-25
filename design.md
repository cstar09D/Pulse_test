# Pulse60 Design System & UI Guide

This document serves as the single source of truth for the Pulse60 Analytics Dashboard design. It is intended for use by AI agents (Stitch) and designers to maintain visual consistency across the application and Figma.

## 🎨 Color Palette

| Name | Hex Code | Usage |
| :--- | :--- | :--- |
| **Background** | `#0f1117` | Main page background |
| **Foreground** | `#f8fafc` | Primary text and icons |
| **Accent** | `#6366f1` | Primary actions, branding, highlights |
| **Accent Light** | `#818cf8` | Hover states and secondary highlights |
| **Surface** | `#1e212b` | Card and container backgrounds |
| **Surface Border** | `#2e323f` | Borders for cards and containers |
| **White (Low Opacity)** | `rgba(255, 255, 255, 0.05)` | Background for secondary elements |
| **Red (Warning)** | `#ef4444` | Delete actions and negative growth |
| **Green (Success)** | `#4ade80` | Positive growth and metrics |

## 📐 Spacing & Layout

- **Max Container Width**: `1400px`
- **Main Padding**: `px-4 py-16` (Desktop), `px-2 py-6` (Mobile)
- **Grid Gap**: `gap-8` (Standard), `gap-4` (Compact)
- **Section Margin**: `mb-12`

## 🔘 Components & Tokens

### Border Radius (Rounding)
| Class Name | Value | Usage |
| :--- | :--- | :--- |
| `rounded-xl` | `12px` | Buttons, small controls |
| `rounded-2xl` | `16px` | Modal containers, small cards |
| `rounded-3xl` | `24px` | Standard metric cards |
| `rounded-[2.5rem]` | `40px` | Main sections (Hero, Chart Area) |
| `rounded-[3rem]` | `48px` | Large image thumbnails |

### Buttons
- **Primary**: `bg-accent text-white font-bold rounded-xl px-4 py-2.5`
- **Ghost**: `text-gray-400 hover:text-white transition-colors`
- **Icon Button**: `p-2 rounded-xl bg-white/5 hover:bg-accent/20`

### Cards
- **Surface Card**: `bg-surface border border-surface-border rounded-[2.5rem] p-12 shadow-2xl`
- **Stats Card**: `bg-white/5 border border-white/5 rounded-3xl p-6`

## 🔠 Typography

- **Font Family**: `Inter, system-ui, sans-serif`
- **Headings**: `font-black tracking-tight`
- **Labels**: `font-black uppercase tracking-widest text-[10px] text-gray-500`
- **Body**: `font-bold text-gray-400`

## 🔗 Figma Mapping (Current Nodes)

| Section | Figma Node ID | Description |
| :--- | :--- | :--- |
| **Main Dashboard** | `2:19` | Main overview page |
| **Post Detail** | `2:3` | Individual post analysis page |
| **Hero Section** | `2:4` | Top header with thumbnail and title |
| **Stats Grid** | `2:7` | Quick metrics row |
| **Sidebar** | `2:18` | Visualization controls |
| **Chart Area** | `2:17` | Main data visualization canvas |

---
*Last updated: April 25, 2026*
