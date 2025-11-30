# FloatingHeader Quick Reference

## Import
```tsx
import { FloatingHeader } from '@/components/ui/floating-header';
```

## Basic Usage
```tsx
<FloatingHeader showLogout={true} onLogout={handleLogout} />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `links` | `Array<{label: string, href: string}>` | Dashboard, Classes, Reports | Navigation links |
| `showLogout` | `boolean` | `false` | Show logout button |
| `onLogout` | `() => void` | `undefined` | Logout callback |

## Default Navigation Links
- Dashboard → `/dashboard`
- Classes → `/class/list`
- Reports → `/reports`

## Customization Example
```tsx
<FloatingHeader
  links={[
    { label: 'Home', href: '/' },
    { label: 'Settings', href: '/settings' },
  ]}
  showLogout={true}
  onLogout={() => {
    // Clear auth state
    logout();
  }}
/>
```

## Features
- ✓ Sticky header (top-5)
- ✓ Responsive (mobile drawer on small screens)
- ✓ IDGuard branding
- ✓ Glassmorphism design
- ✓ Accessible
- ✓ Dark mode ready

## Files Location
- Component: `components/ui/floating-header.tsx`
- Dependencies: `components/ui/sheet.tsx`, `components/ui/button.tsx`
- Utils: `lib/utils.ts`

## Dependencies
- lucide-react
- @radix-ui/react-dialog
- @radix-ui/react-slot
- class-variance-authority
- clsx, tailwind-merge

## Styling
All styling uses Tailwind CSS. Customize by editing the component's className props.

### Key CSS Classes
- Sticky positioning: `sticky top-5 z-50`
- Responsive max-width: `max-w-5xl`
- Glassmorphism: `bg-background/95 backdrop-blur-lg`
- Mobile menu: `lg:hidden`

## Browser Support
- Chrome/Edge: ✓
- Firefox: ✓
- Safari: ✓
- Mobile browsers: ✓

---
**Last Updated**: November 30, 2025
**Status**: ✅ Production Ready
