# Lime Fitness - Gym Management System

## Overview

Lime Fitness is a modern gym management system built for the Indian market. It provides a comprehensive platform for managing gym operations including member management, lead tracking, attendance monitoring, workout/diet planning, trainer assignments, and administrative functions.

The application features a role-based access control system with distinct interfaces for administrators, managers, trainers, staff, and members.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS v4 with shadcn/ui component library
- **Build Tool**: Vite with custom plugins for Replit integration

The frontend follows a component-based architecture with:
- Layout components for admin (`Layout`) and member (`MemberLayout`) interfaces
- Reusable UI components from shadcn/ui (Radix UI primitives)
- Page components organized by feature area
- Custom hooks for mobile detection and toast notifications

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Style**: RESTful JSON API
- **Database ORM**: Drizzle ORM with PostgreSQL

The server implements:
- Simple authentication via username/password (SHA-256 hashing)
- Storage layer abstraction (`IStorage` interface) for database operations
- Development mode with Vite middleware for HMR
- Production mode with static file serving

### Authentication & Authorization
- Client-side authentication state stored in localStorage
- Role-based route protection defined in `routePermissions` map
- Five user roles: admin, manager, trainer, staff, member
- Each role has defined permission scopes for accessing features

### Data Layer
- PostgreSQL database (requires DATABASE_URL environment variable)
- Drizzle ORM for type-safe database queries
- Schema defined in `shared/schema.ts` with Zod validation via drizzle-zod
- User table with role-based access and password storage

### Project Structure
```
├── client/          # React frontend
│   ├── src/
│   │   ├── components/  # UI and layout components
│   │   ├── pages/       # Route page components
│   │   ├── lib/         # Utilities, auth, query client
│   │   └── hooks/       # Custom React hooks
├── server/          # Express backend
│   ├── routes.ts    # API route definitions
│   ├── storage.ts   # Database operations
│   └── db.ts        # Database connection
├── shared/          # Shared types and schema
│   └── schema.ts    # Drizzle schema + Zod validation
```

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connected via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe query builder and schema management
- **connect-pg-simple**: PostgreSQL session store (available but not actively used)

### UI Component Libraries
- **Radix UI**: Headless accessible components (dialogs, dropdowns, forms, etc.)
- **Recharts**: Chart library for dashboard visualizations
- **Lucide React**: Icon library
- **Embla Carousel**: Carousel component

### Development Tools
- **Vite**: Build tool with HMR support
- **Replit Plugins**: Dev banner, cartographer, runtime error overlay
- **esbuild**: Server bundling for production

### Form Handling
- **React Hook Form**: Form state management
- **Zod**: Schema validation (shared between client and server)