# Sanity CMS Integration - Zhixin车 Project

## Project Information

- **Project Name:** Zhixin车
- **Project ID:** `fhp2b1rf`
- **Organization ID:** `odeOGKGmh`
- **Dataset:** `production`
- **Plan:** Growth Trial (Active - 29 days remaining)

## Current Configuration

### Environment Variables

Your `.env.local` file should contain:

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=fhp2b1rf
NEXT_PUBLIC_SANITY_DATASET=production
```

### Sanity Studio Access

- **Local Development:** `http://localhost:3000/studio`
- **Sanity Dashboard:** https://www.sanity.io/manage/personal/project/fhp2b1rf

## Schemas Implemented

The following content schemas are defined in `sanity/schemas/`:

1. **vehicleCategory** - Top-level vehicle categories (Land, Air, Sea, Rail, Special)
2. **vehicleType** - Specific vehicle types (Cars, SUVs, Trucks, etc.)
3. **vehicle** - Individual vehicle entries with galleries, specs, pricing
4. **brand** - Vehicle brands with logos and ordering
5. **imageAsset** - Reusable image assets with alt text and captions

## Initial Setup Steps

### 1. Verify Sanity CLI Installation

```bash
npm install -g @sanity/cli
sanity --version
```

### 2. Login to Sanity

```bash
sanity login
```

### 3. Link Project (if needed)

If you need to initialize the project locally:

```bash
npm create sanity@latest -- --project fhp2b1rf --dataset production
```

Or use the command from your Sanity dashboard:
```bash
npm create sanity@latest -- --project fhp2b1rf --dataset production
```

### 4. Access Studio

Start your development server:

```bash
npm run dev
```

Then visit: `http://localhost:3000/studio`

## Content Creation Workflow

### Step 1: Create Vehicle Categories

1. Go to `/studio`
2. Click "Vehicle Category"
3. Create categories like:
   - Land (order: 1)
   - Air (order: 2)
   - Sea (order: 3)
   - Rail (order: 4)
   - Special (order: 5)

### Step 2: Create Vehicle Types

1. Go to "Vehicle Type"
2. Create types under each category:
   - **Land:** Cars, SUVs, Trucks, Buses, Vans, Motorcycles, etc.
   - **Air:** Airplanes, Helicopters, Drones, etc.
   - **Sea:** Boats, Ships, Yachts, etc.
   - **Rail:** Trains, Trams, Metro, etc.
   - **Special:** Space vehicles, Rovers, etc.

### Step 3: Create Brands

1. Go to "Brand"
2. Add vehicle brands with:
   - Title (e.g., "Tesla", "BMW", "Toyota")
   - Logo image
   - Display order (lower numbers appear first)

### Step 4: Create Vehicles

1. Go to "Vehicle"
2. Fill in:
   - Brand (text field - must match brand title)
   - Model
   - Year
   - Vehicle Type (reference)
   - Image Gallery (array of images with types)
   - Price Range (optional)
   - Specifications (optional)
   - On Sale (boolean)
   - New Energy Vehicle (boolean)

## API Usage

### Client Configuration

The Sanity client is configured in `lib/sanity/client.ts`:

```typescript
import client from "@/lib/sanity/client";
```

### GROQ Queries

All queries are defined in `lib/sanity/queries.ts`. **Vehicles are fetched from Vehicle Series (Autohome)** only:

- `vehicleSeriesByFiltersQuery` - Paginated vehicle series with category, type, brand, on-sale, new-energy filters
- `vehicleSeriesCountQuery` - Count vehicle series with same filters
- `vehicleCategoriesQuery` - Get all vehicle categories
- `vehicleTypesQuery` - Get all vehicle types
- `brandsQuery` - Get all brands with vehicle-series count

### Example Usage

```typescript
import client from "@/lib/sanity/client";
import { vehicleSeriesByFiltersQuery } from "@/lib/sanity/queries";

const filters = { start: 0, end: 20 };
const vehicles = await client.fetch(vehicleSeriesByFiltersQuery(filters), filters);
```

## Image Handling

### Image URL Builder

Use the `urlFor` function for image URLs:

```typescript
import { urlFor } from "@/lib/sanity/client";

const imageUrl = urlFor(vehicle.gallery[0].image)
  .width(800)
  .height(600)
  .url();
```

### Brand Logo Helper

```typescript
import { brandLogoUrl } from "@/lib/sanity/client";

const logoUrl = brandLogoUrl(brand.logo, 64); // 64x64px
```

## CORS Configuration

Your Sanity project has CORS configured for:
- `http://localhost:3000` (development)

For production, add your production domain in the Sanity dashboard:
1. Go to https://www.sanity.io/manage/personal/project/fhp2b1rf
2. Navigate to API → CORS origins
3. Add your production URL

## Next Steps

1. **Populate Initial Data:**
   - Create vehicle categories
   - Create vehicle types
   - Add popular brands
   - Import initial vehicle data

2. **Set Up Webhooks (Optional):**
   - Configure webhooks for content updates
   - Enable real-time previews

3. **Configure CDN:**
   - Images are automatically served via Sanity CDN
   - Configure image transformations as needed

4. **Set Up GraphQL (Optional):**
   ```bash
   npm run sanity:graphql
   ```

## Troubleshooting

### Studio Not Loading

1. Check `.env.local` has correct project ID
2. Verify you're logged into Sanity: `sanity login`
3. Check browser console for errors
4. Verify CORS settings in Sanity dashboard

### Client Not Working

1. Verify `NEXT_PUBLIC_SANITY_PROJECT_ID` is set
2. Check network tab for API errors
3. Verify dataset name matches (`production`)

### Schema Changes Not Appearing

1. Restart development server
2. Clear browser cache
3. Check schema files are exported in `sanity/schemas/index.ts`

## Resources

- [Sanity Documentation](https://www.sanity.io/docs)
- [GROQ Query Language](https://www.sanity.io/docs/groq)
- [Next.js + Sanity Guide](https://www.sanity.io/docs/js-client)
- [Project Dashboard](https://www.sanity.io/manage/personal/project/fhp2b1rf)
