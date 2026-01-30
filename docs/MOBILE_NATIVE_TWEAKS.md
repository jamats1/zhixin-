# Mobile “Native-App” Quality Tweaks

Screen-by-screen, specific tweaks to make the app feel native on mobile.

---

## 1. Header

| Tweak | Why | Implementation |
|-------|-----|----------------|
| **Safe-area top** | Notch/home indicator on iOS | Add `pt-[env(safe-area-inset-top)]` to header; keep `sticky top-0` or use `top-[env(safe-area-inset-top)]` when fixed. |
| **Min tap height** | 44px is iOS HIG minimum | Ensure logo + search container has `min-h-[44px]` on mobile; search input `min-h-[44px]` or `py-3`. |
| **Search full-bleed on focus (optional)** | Native apps often expand search | On small screens, consider expanding search to full width or a modal when focused (optional enhancement). |
| **Reduce horizontal padding on very small screens** | More space for search | Use `px-3` on mobile, avoid doubling with `pr-4`; single consistent padding e.g. `px-3` (12px). |
| **Prevent zoom on input focus (iOS)** | Avoid 16px zoom | Ensure search input has `text-base` or `font-size: 16px` minimum so iOS doesn’t zoom. |

**Files:** `components/Header.tsx`, `app/globals.css` (if adding safe-area vars).

---

## 2. Filters (main Filters strip + MobileFilters drawer)

### 2a. In-page Filters (visible on desktop; on mobile only tabs/categories may show)

| Tweak | Why | Implementation |
|-------|-----|----------------|
| **Tabs as pill row on mobile** | Clear, thumb-friendly | On mobile, make Vehicles/Car Parts a horizontal scrollable row with `overflow-x-auto scrollbar-hide`, `snap-x snap-mandatory`, and pill-style `rounded-full` tabs; ensure 44px min height. |
| **Category chips scroll with snap** | Native horizontal picker feel | Add `scroll-snap-type: x mandatory` and `scroll-snap-align: start` to category row; `-webkit-overflow-scrolling: touch`. |
| **Larger tap targets for category chips** | Avoid mis-taps | Use `min-h-[40px]` and `px-3 py-2` for each chip on mobile. |
| **Hide “Brand” / “Category” labels on small screens (optional)** | Less clutter | Below a breakpoint (e.g. `sm`), hide the left “Brand”/“Category” labels and rely on chip context. |

**Files:** `components/Filters.tsx`.

### 2b. MobileFilters drawer

| Tweak | Why | Implementation |
|-------|-----|----------------|
| **Safe-area bottom for drawer** | Home indicator on iOS | Add `pb-[env(safe-area-inset-bottom)]` to drawer content container so content isn’t hidden. |
| **Drag handle at top** | Standard bottom-sheet affordance | Add a small pill handle (e.g. `w-10 h-1 rounded-full bg-gray-300`) centered at top of drawer. |
| **Max height with safe area** | Doesn’t cover status bar | Use `max-h-[min(80vh,calc(100vh-env(safe-area-inset-top)))]` so drawer never overlaps notch. |
| **FAB position above safe area** | FAB not hidden by home indicator | Position Filters FAB with `bottom: calc(1rem + env(safe-area-inset-bottom))` (e.g. `bottom-4` + padding-bottom from safe area). |
| **Slightly larger touch targets** | Easier tapping | Keep radio/checkbox labels at min 44px height; buttons already `py-2`/`py-1.5`—ensure full row is tappable. |

**Files:** `components/MobileFilters.tsx`.

---

## 3. Cards (VehicleCard + grid)

| Tweak | Why | Implementation |
|-------|-----|----------------|
| **Card tap feedback** | Instant native feel | Add `active:scale-[0.98]` and/or `active:opacity-95` to card container; ensure `transition-transform`/`transition-opacity`. |
| **Min 44px for primary actions** | Reliable taps | “Inquire Price” / “Add to Cart” and “View Series” / “View Details”: `min-h-[44px]` and comfortable padding e.g. `py-2.5`. |
| **Spacing between cards** | Clear separation on small screens | Use consistent gap e.g. `gap-3` or `gap-4` in grid on mobile; avoid cramped `gap-2` for 2-column layout. |
| **Image aspect ratio** | Consistent card height | Keep aspect ratio (e.g. 4/3); consider `aspect-[4/3]` with `object-cover` so list doesn’t jump. |
| **No hover-only actions** | Everything tappable | Ensure “VR View” and image count are visible and tappable on touch; no hover-only reveals. |
| **Skeleton or placeholder on load** | Perceived performance | Use skeleton cards (same aspect ratio + blocks for title/price) while loading so layout doesn’t shift. |
| **2-column grid with equal width** | Predictable layout | On mobile use `grid-cols-2` with `min-w-0` on cards so text truncates and images don’t overflow. |

**Files:** `components/VehicleCard.tsx`, `components/VehicleGrid.tsx`.

---

## 4. Footer

| Tweak | Why | Implementation |
|-------|-----|----------------|
| **Safe-area bottom** | Content above home indicator | Add `pb-[env(safe-area-inset-bottom)]` to footer inner container. |
| **Link tap targets** | Easy tapping | Make each link a block or add `py-2` so effective tap height is at least 44px (e.g. wrap in `<span className="block py-2">` or use padding on `<a>`). |
| **Reduce link density on mobile** | Less overwhelming | Consider grouping “About / Contact / Join” and “Feedback / License / App / Mobile” into two rows or a single column with clear spacing. |
| **Slightly larger disclaimer text** | Readability | On mobile use `text-xs` minimum; consider `text-sm` for disclaimer if it’s legal-critical. |

**Files:** `components/Footer.tsx`.

---

## 5. Global / page-level

| Tweak | Why | Implementation |
|-------|-----|----------------|
| **Safe-area insets on root** | Entire app respects notches | Add `padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right);` to `body` or main wrapper if you want full-bleed with safe padding (optional if content is already inset). |
| **Overscroll behavior** | Prevent rubber-band on main scroll | Add `overscroll-behavior-y: none` or `contain` on main scroll container to avoid background pull (use sparingly). |
| **Loading / pull-to-refresh (optional)** | Native list behavior | Consider pull-to-refresh on VehicleGrid (e.g. trigger refetch on overscroll); implement only if it fits product. |
| **Sticky header height** | No content jump | Ensure header has fixed height (e.g. `h-14` or min-height) so `sticky top-0` doesn’t cause layout shift when scrolling. |

**Files:** `app/globals.css`, `app/page.tsx`, `components/Header.tsx`.

---

## Priority order

1. **High (do first):** Safe-area top (header), safe-area bottom (drawer + footer), 44px min tap targets (header, card buttons, footer links), card active state, search input 16px (no zoom).
2. **Medium:** Tabs as scrollable pills with snap, drawer drag handle, FAB above safe area, grid gap and card min-width.
3. **Lower:** Hide filter labels on small screens, pull-to-refresh, full-bleed safe-area on body.

---

## Verification

- Test on real iOS (Safari) and Android (Chrome) with notched devices.
- Use DevTools device mode + “Show device frame” and check safe-area.
- Confirm no element is obscured by notch or home indicator.
- Tap all primary actions with thumb; ensure no mis-taps from small targets.
