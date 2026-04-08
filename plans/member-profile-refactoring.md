# MemberProfile Tab Component Refactoring Plan

## Overview
This document outlines the complete refactoring plan to move all tab contents from `client/src/pages/MemberProfile.tsx` to separate files for easy editing and management.

## Current Structure Analysis

The current `MemberProfile.tsx` contains:
- **6 main tabs**: Memberships, Measurement, Body Composition, BMI Tracking, Workouts, Diet
- **Complex state management**: Multiple useState hooks for forms and modals
- **Data fetching**: Multiple useQuery hooks for different data types
- **Shared dependencies**: Member ID, query client, and common imports

## Proposed Architecture

### Directory Structure
```
client/src/pages/MemberProfile/
├── MemberProfile.tsx (main component - profile info + tab navigation)
├── tabs/
│   ├── MemberMemberships.tsx
│   ├── MemberMeasurement.tsx
│   ├── MemberBodyComposition.tsx
│   ├── MemberBmiTracking.tsx
│   ├── MemberWorkouts.tsx
│   └── MemberDiet.tsx
└── types.ts (shared types)
```

### Implementation Approach: Individual Data Fetching

Each tab component will:
1. **Manage its own data**: Use individual useQuery hooks for data fetching
2. **Handle its own state**: Local state for forms and modals
3. **Be self-contained**: Minimal dependencies on parent component
4. **Accept memberId prop**: Only dependency from parent

## Component Breakdown

### 1. MemberMemberships.tsx
**Purpose**: Display and manage member memberships
**Features**:
- Display membership table with Receipt#, Plan, Start/End dates, Amount, Status
- Add membership modal with form (Plan, Amount, Start/End dates)
- Edit membership modal with form
- Delete membership functionality
- Status badges (Active/Expired)

**Data Sources**:
- GET `/api/members/{id}/memberships` (memberships list)
- POST `/api/members/{id}/memberships` (add membership)
- PUT `/api/members/{id}/memberships/{id}` (edit membership)
- DELETE `/api/members/{id}/memberships/{id}` (delete membership)

**State Management**:
- `openAddMembership`: boolean
- `openEditMembership`: boolean
- Form data for add/edit operations

### 2. MemberMeasurement.tsx
**Purpose**: Display and add body measurements
**Features**:
- Display measurement table (Date, Chest, Waist, Arms, Thighs)
- Add measurement modal with form fields
- No measurements message when empty

**Data Sources**:
- GET `/api/members/{id}/measurements` (measurements list)
- POST `/api/members/{id}/measurements` (add measurement)

**State Management**:
- `openAddMeasurement`: boolean
- Form data for measurement inputs

### 3. MemberBodyComposition.tsx
**Purpose**: Display and manage body composition data
**Features**:
- Display body composition table (Date, Weight, BMI, Fat%, LBM)
- Add body composition modal with form fields
- Delete body composition entry

**Data Sources**:
- GET `/api/members/{id}/body-composition` (body composition list)
- POST `/api/members/{id}/body-composition` (add body composition)
- DELETE `/api/members/{id}/body-composition/{id}` (delete entry)

**State Management**:
- `openAddBodyComp`: boolean
- Form data for body composition inputs

### 4. MemberBmiTracking.tsx
**Purpose**: Display and manage BMI tracking with detailed metrics
**Features**:
- Dynamic table with BMI metrics (Body Weight, BMI, Body Fat%, etc.)
- Add BMI record functionality with current date
- Clear and save BMI record actions
- No records message when empty

**Data Sources**:
- GET `/api/members/{id}/bmi-records` (BMI records list)
- POST `/api/members/{id}/bmi-records` (add BMI record)

**State Management**:
- `isAddingBmi`: boolean
- `bmiInputs`: object with all BMI metric inputs
- `sortedBmiRecords`: sorted BMI records array

**Special Features**:
- 12 different BMI metrics
- Dynamic table columns based on records
- Current date auto-generation
- Input validation and formatting

### 5. MemberWorkouts.tsx
**Purpose**: Display assigned workout programs
**Features**:
- Display assigned workouts table (Day, Program Name, Difficulty, Duration, Goal)
- No workouts message when empty
- Workout program details display

**Data Sources**:
- GET `/api/members/{id}/workout-assignments` (workout assignments)
- GET `/api/workout-programs` (all workout programs)
- Filtered display of assigned workouts

**State Management**:
- No local state required (read-only display)

### 6. MemberDiet.tsx
**Purpose**: Display assigned diet plans
**Features**:
- Display assigned diet plans table (Meal, Foods, Calories, Protein, Carbs, Fat)
- No diet plans message when empty
- Diet plan details display

**Data Sources**:
- GET `/api/members/{id}/diet-assignments` (diet assignments)
- GET `/api/diet-plans` (all diet plans)
- Filtered display of assigned diets

**State Management**:
- No local state required (read-only display)

## Shared Types (types.ts)

```typescript
export interface MemberMembership {
  id: string;
  receiptNumber: string;
  plan: string;
  startDate: string;
  endDate: string;
  amountPaid: number;
  status: 'Active' | 'Expired';
}

export interface MemberMeasurement {
  id: string;
  date: string;
  chest: number;
  waist: number;
  arms: number;
  thighs: number;
}

export interface MemberBodyComposition {
  id: string;
  date: string;
  weight: number;
  bmi: number;
  fatPercentage: number;
  lbm: number;
}

export interface BmiRecord {
  id: string;
  recordDate: string;
  bodyWeight: number | null;
  bmi: number | null;
  bodyFatPercentage: number | null;
  muscleMass: number | null;
  bodyWaterPercentage: number | null;
  boneMass: number | null;
  visceralFat: number | null;
  subcutaneousFat: number | null;
  bmr: number | null;
  proteinPercentage: number | null;
  metabolicAge: number | null;
  leanBodyMass: number | null;
}

export interface WorkoutProgram {
  id: string;
  name: string;
  day: string;
  difficulty: string;
  duration: number;
  goal: string;
}

export interface DietPlan {
  id: string;
  meal: string;
  foods: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MemberProfileProps {
  memberId: string;
}
```

## Implementation Steps

### Phase 1: Create Directory Structure
1. Create `client/src/pages/MemberProfile/` directory
2. Create `client/src/pages/MemberProfile/tabs/` subdirectory
3. Create `client/src/pages/MemberProfile/types.ts`

### Phase 2: Extract Tab Components
1. Extract Memberships tab → `MemberMemberships.tsx`
2. Extract Measurement tab → `MemberMeasurement.tsx`
3. Extract Body Composition tab → `MemberBodyComposition.tsx`
4. Extract BMI Tracking tab → `MemberBmiTracking.tsx`
5. Extract Workouts tab → `MemberWorkouts.tsx`
6. Extract Diet tab → `MemberDiet.tsx`

### Phase 3: Update Main Component
1. Import all tab components
2. Replace tab content with component calls
3. Pass `memberId` prop to each tab component
4. Remove extracted state and logic from main component

### Phase 4: Testing and Validation
1. Verify all imports are correct
2. Test each tab component independently
3. Test data fetching and mutations
4. Verify UI consistency and functionality

## Benefits of This Refactoring

1. **Modularity**: Each tab is a self-contained component
2. **Maintainability**: Easier to edit and manage individual tabs
3. **Reusability**: Tab components can potentially be reused elsewhere
4. **Separation of Concerns**: Clear separation between profile layout and tab content
5. **Type Safety**: Shared types ensure consistency across components
6. **Individual Data Fetching**: Each tab manages its own data lifecycle
7. **Reduced Complexity**: Main component becomes simpler and more focused

## API Endpoints Required

### Memberships
- `GET /api/members/{id}/memberships` - Get member memberships
- `POST /api/members/{id}/memberships` - Add membership
- `PUT /api/members/{id}/memberships/{id}` - Edit membership
- `DELETE /api/members/{id}/memberships/{id}` - Delete membership

### Measurements
- `GET /api/members/{id}/measurements` - Get member measurements
- `POST /api/members/{id}/measurements` - Add measurement

### Body Composition
- `GET /api/members/{id}/body-composition` - Get body composition
- `POST /api/members/{id}/body-composition` - Add body composition
- `DELETE /api/members/{id}/body-composition/{id}` - Delete body composition

### BMI Tracking
- `GET /api/members/{id}/bmi-records` - Get BMI records
- `POST /api/members/{id}/bmi-records` - Add BMI record

### Workouts
- `GET /api/members/{id}/workout-assignments` - Get workout assignments
- `GET /api/workout-programs` - Get all workout programs

### Diet
- `GET /api/members/{id}/diet-assignments` - Get diet assignments
- `GET /api/diet-plans` - Get all diet plans

## Migration Strategy

1. **Backup**: Create backup of original MemberProfile.tsx
2. **Incremental**: Extract one tab at a time
3. **Test**: Test each extracted component before proceeding
4. **Validate**: Ensure functionality matches original implementation
5. **Clean up**: Remove unused imports and state from main component

This refactoring will significantly improve the maintainability and organization of the MemberProfile component while preserving all existing functionality.