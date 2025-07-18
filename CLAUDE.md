# SmartPop V2 - Clean Implementation Guide
🚨 CRITICAL NOTE FOR ALL CLAUDE CODE COMMANDS 🚨
NEVER USE MIGRATIONS - ONLY USE npx prisma db push

❌ NEVER add npx prisma migrate commands anywhere
❌ NEVER add prisma migrate deploy to any script
❌ NEVER create migration files in prisma/migrations/
✅ ONLY use npx prisma db push for database changes
✅ ONLY use npx prisma generate for client generation
✅ Build scripts should ONLY contain npx prisma generate
## Project Overview
Build a rock-solid Shopify popup app with zero database migration bullshit. PostgreSQL from day 1, no switching, no migrations - only `db push`.

## Technical Stack (LOCKED IN)
- **Framework**: Shopify Remix App Template
- **Database**: PostgreSQL on Supabase (from start)
- **Frontend**: React with Polaris design system
- **Backend**: Remix with built-in API routes
- **Authentication**: Shopify OAuth (embedded app)
- **Deployment**: Vercel
- **Database Operations**: `prisma db push` ONLY (never migrate)

## Implementation Phases

### Phase 1: Foundation (Must Work 100%)
1. Create fresh Shopify app
2. Set up PostgreSQL database
3. Configure authentication
4. Test app installation completely
5. Verify dashboard loads

### Phase 2: Core Popup System
1. Database schema for popups
2. Basic CRUD interface
3. Popup script with triggers
4. Test popup display on storefront

### Phase 3: Email Capture
1. Email storage system
2. Email management interface
3. Analytics tracking

### Phase 4: Advanced Features
1. Multi-step popup builder
2. Quiz/zero-party data collection
3. Dynamic discounts
4. Advanced analytics

## Database Schema (PostgreSQL from Start)

### Required Models
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// CRITICAL: Shopify session storage
model Session {
  id          String   @id
  shop        String
  state       String
  isOnline    Boolean  @default(false)
  scope       String?
  expires     DateTime?
  accessToken String
  userId      BigInt?
  firstName   String?
  lastName    String?
  email       String?
  accountOwner Boolean  @default(false)
  locale      String?
  collaborator Boolean? @default(false)
  emailVerified Boolean? @default(false)
  
  @@map("sessions")
}

// Core popup model
model Popup {
  id           String   @id @default(cuid())
  shop         String
  title        String
  isActive     Boolean  @default(true)
  triggerType  String   // "delay", "scroll", "exit"
  triggerValue Int      // seconds or percentage
  heading      String
  description  String?
  buttonText   String   @default("Get Discount")
  discountCode String?
  views        Int      @default(0)
  conversions  Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  analytics PopupAnalytics[]
  emails    EmailSubmissions[]
  
  @@index([shop, isActive])
}

// Analytics tracking
model PopupAnalytics {
  id        String   @id @default(cuid())
  popupId   String
  popup     Popup    @relation(fields: [popupId], references: [id], onDelete: Cascade)
  event     String   // "view", "conversion", "close"
  sessionId String
  timestamp DateTime @default(now())
  userAgent String?
  referrer  String?
  
  @@index([popupId, event])
}

// Email capture storage
model EmailSubmissions {
  id        String   @id @default(cuid())
  popupId   String
  popup     Popup    @relation(fields: [popupId], references: [id], onDelete: Cascade)
  email     String
  sessionId String
  timestamp DateTime @default(now())
  userAgent String?
  referrer  String?
  
  @@index([popupId])
  @@index([email])
}
```

## Environment Setup

### Local (.env)
```
DATABASE_URL="postgresql://postgres.[PROJECT-ID]:[PASSWORD]@aws-0-region.pooler.supabase.co:6543/postgres"
SHOPIFY_API_KEY="your-client-id"
SHOPIFY_API_SECRET="your-client-secret"
SHOPIFY_APP_URL="http://localhost:3000"
```

### Production (Vercel)
```
DATABASE_URL="same-as-local"
SHOPIFY_API_KEY="same-as-local"
SHOPIFY_API_SECRET="same-as-local"
SHOPIFY_APP_URL="https://smartpop-v2.vercel.app"
```

## Critical Rules

### Database Operations
- ✅ **ONLY use**: `npx prisma db push`
- ✅ **ONLY use**: `npx prisma generate`
- ❌ **NEVER use**: `npx prisma migrate`
- ❌ **NEVER use**: migration files

### URL Management
- ✅ **Lock app URL**: `https://smartpop-v2.vercel.app`
- ✅ **Set in shopify.app.toml**: `application_url = "https://smartpop-v2.vercel.app"`
- ✅ **Set in Partner Dashboard**: Same URL
- ❌ **NEVER let CLI change URLs**

### Build Process
- ✅ **package.json build**: `"build": "remix build"`
- ✅ **package.json postinstall**: `"postinstall": "npx prisma generate"`
- ❌ **NO migration commands** in any script

## Testing Checkpoints

### Checkpoint 1: Foundation
- [ ] App created successfully
- [ ] Database connected
- [ ] Auth works (can install app)
- [ ] Dashboard loads without errors

### Checkpoint 2: Core Features
- [ ] Can create popup in admin
- [ ] Popup displays on storefront
- [ ] Basic analytics tracking works

### Checkpoint 3: Email System
- [ ] Email capture works
- [ ] Emails stored in database
- [ ] Email management interface works

### Checkpoint 4: Advanced Features
- [ ] Multi-step popups work
- [ ] Quiz functionality complete
- [ ] Dynamic discounts working

## Admin Interface Structure

### Dashboard (app._index.jsx)
- Total active popups
- Total views/conversions
- Recent activity
- Quick actions

### Popup Management
- List all popups (app.popups._index.jsx)
- Create popup (app.popups.new.jsx)
- Edit popup (app.popups.$id.jsx)

### Email Management
- View captured emails (app.emails._index.jsx)
- Export functionality
- Email analytics

### Analytics
- Popup performance metrics
- Conversion tracking
- Device/browser analytics

## Popup Script Requirements

### Core Functionality
- Admin detection (prevent showing in Shopify admin)
- Three trigger types: delay, scroll percentage, exit intent
- Mobile-responsive design
- Email form validation
- Session management (prevent duplicate displays)

### API Integration
- Fetch popup configuration: `GET /api/popup-config`
- Track events: `POST /api/track-event`
- Capture emails: `POST /api/capture-email`

## Security & Performance

### Security
- Input validation and sanitization
- CORS configuration for script loading
- Rate limiting on public endpoints
- Shop-scoped data access

### Performance
- Optimized script loading
- Database query optimization
- Proper indexing
- CDN-ready static assets

## Deployment Strategy

### Vercel Configuration
- Environment variables set correctly
- Build command: `npm run build`
- Install command: `npm install && npx prisma generate`
- No migration commands anywhere

### Shopify Configuration
- App URL locked in Partner Dashboard
- Redirect URLs properly set
- Scopes configured: `write_script_tags,read_script_tags`

## Success Criteria

### Phase 1 Success
- App installs without auth loops
- Dashboard loads and displays properly
- Database connection stable
- No migration errors

### Phase 2 Success
- Can create and edit popups
- Popups display correctly on storefront
- Basic trigger system works
- Analytics tracking functional

### Phase 3 Success
- Email capture works reliably
- Emails stored and retrievable
- Email management interface complete
- Export functionality working

### Phase 4 Success
- Multi-step builder functional
- Quiz/poll system working
- Dynamic discounts operational
- Advanced analytics complete

## Troubleshooting Prevention

### Common Issues Avoided
- Migration conflicts (using db push only)
- Auth loops (proper embedded configuration)
- URL conflicts (locked URLs from start)
- Database timeouts (correct connection string)
- Build failures (clean scripts)

### Monitoring Points
- Database connection health
- Authentication success rate
- Popup display rate
- Email capture success
- API response times

This guide ensures a clean, working implementation without the bullshit that broke the previous version.