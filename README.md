# GlobalVehicleHub (GVH)

A pixel-perfect, structure-perfect English clone of Autohome China's image-list platform.

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Zustand** (State Management)
- **Sanity CMS** (Headless Content)
- **Clerk** (Authentication)

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/             # React components
│   ├── Header.tsx         # Top navigation and filters
│   ├── Sidebar.tsx        # Left sidebar with brand filters
│   ├── VehicleGrid.tsx    # Main vehicle grid
│   ├── VehicleCard.tsx    # Individual vehicle card
│   └── Footer.tsx         # Footer component
├── lib/                   # Utility libraries
│   ├── sanity/            # Sanity client and queries
│   └── taxonomy/          # Vehicle taxonomy structure
├── stores/                # Zustand stores
│   ├── filterStore.ts     # Filter state
│   ├── categoryStore.ts   # Category state
│   ├── uiStore.ts         # UI state
│   ├── galleryStore.ts    # Gallery/vehicle state
│   └── authStore.ts       # Authentication state
└── sanity/                # Sanity CMS schemas
    └── schemas/           # Content schemas
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment variables:**
   Your `.env.local` should contain:
   ```bash
   NEXT_PUBLIC_SANITY_PROJECT_ID=fhp2b1rf
   NEXT_PUBLIC_SANITY_DATASET=production
   ```
   (Already configured in your project)

3. **Set up Sanity:**
   - **Project ID:** `fhp2b1rf`
   - **Dataset:** `production`
   - **Studio:** Access at `http://localhost:3000/studio` after starting dev server
   - See `SANITY_SETUP.md` for detailed setup instructions
   - See `VERIFY_SANITY.md` for verification steps

4. **Run development server:**
   ```bash
   npm run dev
   ```

## Features

- ✅ Pixel-perfect layout matching Autohome
- ✅ Global vehicle taxonomy (Land, Air, Sea, Rail, Special)
- ✅ Infinite scroll vehicle grid
- ✅ Advanced filtering (brand, type, on sale, new energy)
- ✅ Sanity CMS integration
- ✅ Responsive design
- ✅ Image optimization with Next.js Image

## Vehicle Taxonomy

The platform supports a comprehensive global vehicle taxonomy:

- **Land**: Cars, SUVs, Trucks, Buses, Vans, Motorcycles, Scooters, ATVs, RVs, Construction, Military
- **Air**: Airplanes, Helicopters, Drones, Gliders, Jets
- **Sea**: Boats, Ships, Yachts, Submarines, Jet Skis
- **Rail**: Trains, Trams, Metro, Monorail
- **Special**: Space Vehicles, Exploration Rovers, Industrial Machinery, Agricultural Machinery

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run linter

## Deployment

The project is configured for deployment on Vercel with:
- ISR (Incremental Static Regeneration)
- Image optimization
- Edge functions support

## License

Private - All Rights Reserved
