# Zhixin车 Setup Guide

## Quick Start

### 1. Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Sanity Configuration (Required for production)
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production

# Clerk Authentication (Optional for now)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
CLERK_SECRET_KEY=your-clerk-secret-key

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Sanity CMS Setup

**Project Information:**
- **Project Name:** Zhixin车
- **Project ID:** `fhp2b1rf`
- **Organization ID:** `odeOGKGmh`
- **Dataset:** `production`
- **Plan:** Growth Trial (Active)

1. **Install Sanity CLI (if not already installed):**
   ```bash
   npm install -g @sanity/cli
   ```

2. **Login to Sanity:**
   ```bash
   sanity login
   ```

3. **Link your project (if needed):**
   ```bash
   npx sanity@latest init --project fhp2b1rf --dataset production
   ```
   Or use the command from Sanity dashboard:
   ```bash
   npm create sanity@latest -- --project fhp2b1rf --dataset production
   ```

4. **Deploy schemas:**
   The schemas are already defined in `sanity/schemas/`. The schemas will be automatically available when you access the studio.

5. **Access Sanity Studio:**
   - Development: `http://localhost:3000/studio`
   - The studio is integrated into your Next.js app at `/studio` route
   - You can also access it via Sanity's hosted studio at your project dashboard

6. **Verify Configuration:**
   - Check `.env.local` has `NEXT_PUBLIC_SANITY_PROJECT_ID=fhp2b1rf`
   - Check `NEXT_PUBLIC_SANITY_DATASET=production`
   - Run `npm run dev` and visit `http://localhost:3000/studio`

### 3. Clerk Authentication (Optional)

1. Create a Clerk account at [clerk.com](https://clerk.com)
2. Create a new application
3. Copy the publishable key and secret key to `.env.local`
4. Configure authentication routes in `app/` directory

### 4. Run Development Server

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout with Inter font
│   ├── page.tsx           # Home page (main vehicle grid)
│   ├── studio/            # Sanity Studio route
│   └── globals.css        # Global styles with Autohome colors
├── components/             # React components
│   ├── Header.tsx         # Top navigation, search, filters
│   ├── Sidebar.tsx        # Left sidebar with brand filters
│   ├── VehicleGrid.tsx   # Main vehicle grid with infinite scroll
│   ├── VehicleCard.tsx   # Individual vehicle card component
│   └── Footer.tsx        # Footer with links
├── lib/                   # Utility libraries
│   ├── sanity/            # Sanity client and GROQ queries
│   └── taxonomy/          # Global vehicle taxonomy
├── stores/                # Zustand state management
│   ├── filterStore.ts     # Filter state (brand, type, etc.)
│   ├── categoryStore.ts   # Category state
│   ├── uiStore.ts         # UI state (sidebar, view mode)
│   ├── galleryStore.ts    # Gallery/vehicle state
│   └── authStore.ts       # Authentication state
├── hooks/                 # Custom React hooks
│   └── useVehicles.ts     # Vehicle fetching hook
├── types/                 # TypeScript type definitions
│   └── index.ts           # Shared types
└── sanity/                # Sanity CMS schemas
    ├── config.ts          # Sanity configuration
    └── schemas/           # Content schemas
        ├── vehicleCategory.ts
        ├── vehicleType.ts
        ├── vehicle.ts
        └── imageAsset.ts
```

## Features Implemented

✅ **Pixel-perfect layout** matching Autohome structure
✅ **Global vehicle taxonomy** (Land, Air, Sea, Rail, Special)
✅ **Infinite scroll** vehicle grid
✅ **Advanced filtering** (brand, type, on sale, new energy)
✅ **Sanity CMS integration** with proper schemas
✅ **Zustand state management** for all app state
✅ **TypeScript** throughout
✅ **Inter font** as specified
✅ **Autohome color system** (primary blue #00AEEF)
✅ **Responsive grid** system
✅ **Image optimization** with Next.js Image
✅ **Mock data fallback** when Sanity not configured

## Next Steps

### Phase 1: Data Ingestion
- Set up crawler/scraper for vehicle data
- Create data ingestion pipeline
- Populate Sanity with initial vehicle data

### Phase 2: Authentication
- Complete Clerk integration
- Add role-based access control
- Implement user profiles

### Phase 3: Image Pipeline
- Set up CDN for images
- Implement image transformations
- Add lazy loading optimizations

### Phase 4: Performance
- Implement ISR (Incremental Static Regeneration)
- Add caching strategies
- Optimize bundle size

### Phase 5: Advanced Features
- Search functionality
- VR view integration
- Price inquiry system
- Analytics dashboard

## Development Commands

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm run start

# Lint
npm run lint

# Format
npm run format
```

## Notes

- The app works with mock data if Sanity is not configured
- All components are pixel-perfect matches to Autohome layout
- Vehicle taxonomy is expanded globally beyond just cars
- Infinite scroll is implemented with Intersection Observer
- All state is managed with Zustand for predictable updates
