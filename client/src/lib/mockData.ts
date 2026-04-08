import { addDays, subDays, format } from "date-fns";
import { ne } from "drizzle-orm";

export const users = [
  {
    id: 1,
    name: "Rahul Sharma",
    plan: "Yearly",
    status: "Active",
    expiry: addDays(new Date(), 200),
    avatar: "https://i.pravatar.cc/150?u=1",
    phone: "+91 98765 43210",
    email: "rahul@example.com",
  },
  {
    id: 2,
    name: "Priya Patel",
    plan: "Monthly",
    status: "Expiring Soon",
    expiry: addDays(new Date(), 3),
    avatar: "https://i.pravatar.cc/150?u=2",
    phone: "+91 98765 43211",
    email: "priya@example.com",
  },
  {
    id: 3,
    name: "Amit Kumar",
    plan: "Quarterly",
    status: "Active",
    expiry: addDays(new Date(), 45),
    avatar: "https://i.pravatar.cc/150?u=3",
    phone: "+91 98765 43212",
    email: "amit@example.com",
  },
  {
    id: 4,
    name: "Sneha Gupta",
    plan: "Monthly",
    status: "Inactive",
    expiry: subDays(new Date(), 5),
    avatar: "https://i.pravatar.cc/150?u=4",
    phone: "+91 98765 43213",
    email: "sneha@example.com",
  },
  {
    id: 5,
    name: "Vikram Singh",
    plan: "Yearly",
    status: "Active",
    expiry: addDays(new Date(), 300),
    avatar: "https://i.pravatar.cc/150?u=5",
    phone: "+91 98765 43214",
    email: "vikram@example.com",
  },
  {
    id: 6,
    name: "Anjali Rao",
    plan: "Half Yearly",
    status: "Pending Payment",
    expiry: addDays(new Date(), 0),
    avatar: "https://i.pravatar.cc/150?u=6",
    phone: "+91 98765 43215",
    email: "anjali@example.com",
  },
];

export const leads = [
  {
    id: 1,
    name: "Karan Johar",
    phone: "+91 98000 12345",
    status: "New",
    date: subDays(new Date(), 1),
    interest: "Weight Loss",
  },
  {
    id: 2,
    name: "Deepika P",
    phone: "+91 98000 54321",
    status: "Follow Up",
    date: subDays(new Date(), 2),
    interest: "Muscle Gain",
  },
  {
    id: 3,
    name: "Ranveer S",
    phone: "+91 98000 67890",
    status: "Converted",
    date: subDays(new Date(), 5),
    interest: "General Fitness",
  },
];

export const revenueData = [
  { name: "Jan", total: 150000 },
  { name: "Feb", total: 180000 },
  { name: "Mar", total: 220000 },
  { name: "Apr", total: 200000 },
  { name: "May", total: 250000 },
  { name: "Jun", total: 280000 },
];

export const attendanceData = [
  { day: "Mon", count: 120 },
  { day: "Tue", count: 135 },
  { day: "Wed", count: 128 },
  { day: "Thu", count: 140 },
  { day: "Fri", count: 115 },
  { day: "Sat", count: 90 },
  { day: "Sun", count: 45 },
];

export const plans = [
  {
    id: 1,
    name: "Yearly Elite",
    duration: "12 Months",
    price: 15000,
    features: ["All Access", "PT Sessions x2", "Diet Plan"],
  },
  {
    id: 2,
    name: "Half Yearly Pro",
    duration: "6 Months",
    price: 9000,
    features: ["All Access", "Diet Plan"],
  },
  {
    id: 3,
    name: "Quarterly Starter",
    duration: "3 Months",
    price: 5000,
    features: ["Gym Access"],
  },
  {
    id: 4,
    name: "Monthly Trial",
    duration: "1 Month",
    price: 2000,
    features: ["Gym Access"],
  },
];

export const staff = [
  { id: 1, name: "John Doe", role: "Trainer", shift: "Morning" },
  { id: 2, name: "Jane Smith", role: "Trainer", shift: "Evening" },
  { id: 3, name: "Mike Ross", role: "Receptionist", shift: "Full Day" },
];

export const notifications = [
  {
    id: 1,
    message: "Gym will be closed on Sunday for maintenance.",
    date: "2024-10-20",
    sentTo: "All Members",
  },
  {
    id: 2,
    message: "Yoga Class starts at 7 AM tomorrow.",
    date: "2024-10-22",
    sentTo: "Yoga Group",
  },
];

export const inventory = [
  {
    id: 1,
    name: "Treadmill",
    type: "Gym Equipment",
    quantity: 10,
    price: 20000,
    stock: 20,
    category: "Electronic Equipment",
    purchaseDate: "2024-01-15",
    needService: true,
    serviceHistory: [
      { date: "2024-01-15", service: "Maintenance", cost: 500 },
      { date: "2024-02-15", service: "Maintenance", cost: 750 },
    ],
    nextServiceDate: "2024-02-15",
  },
  {
    id: 2,
    name: "Yoga Mat",
    type: "Gym Equipment",
    quantity: 20,
    price: 5000,
    stock: 50,
    category: "Miscellaneous",
    purchaseDate: "2024-02-20",
    needService: false,
    serviceHistory: [],
    nextServiceDate: "",
  },
  {
    id: 3,
    name: "Weightlifting Machine",
    type: "Gym Equipment",
    quantity: 5,
    price: 15000,
    stock: 24,
    category: "Manual Equipment",
    purchaseDate: "2024-03-10",
    needService: true,
    serviceHistory: [{ date: "2024-03-10", service: "Maintenance", cost: 300 }],
    nextServiceDate: "2024-04-10",
  },
  {
    id: 4,
    name: "Dumbbells",
    type: "Gym Equipment",
    quantity: 30,
    price: 10000,
    stock: 300,
    category: "Manual Equipment",
    purchaseDate: "2024-05-10",
    needService: false,
    serviceHistory: [],
    nextServiceDate: "",
  },
];

export const merchandise = [
  {
    id: 1,
    name: "Protein Powder",
    category: "Supplements",
    price: 2000,
    cost: 1500,
    stock: 500,
    salesData: [120, 150, 180, 200, 220, 250],
    supplier: "MuscleTech",
    reorderLevel: 100,
    type: "Merchandise",
    image:
      "https://images.unsplash.com/photo-1595341888016-a392ef81b7de?w=500&auto=format&fit=crop&q=60",
  },
  {
    id: 2,
    name: "Gym T-Shirt",
    category: "Apparel",
    price: 800,
    cost: 500,
    stock: 150,
    salesData: [80, 90, 120, 140, 160, 180],
    supplier: "Nike",
    reorderLevel: 50,
    type: "Merchandise",
    image:
      "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60",
  },
  {
    id: 3,
    name: "Protein Bars",
    category: "Supplements",
    price: 150,
    cost: 100,
    stock: 800,
    salesData: [300, 350, 400, 450, 500, 550],
    supplier: "Optimum Nutrition",
    reorderLevel: 200,
    type: "Merchandise",
    image:
      "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=500&auto=format&fit=crop&q=60",
  },
  {
    id: 4,
    name: "Gym Water Bottle",
    category: "Accessories",
    price: 300,
    cost: 200,
    stock: 300,
    salesData: [100, 120, 140, 160, 180, 200],
    supplier: "Hydro Flask",
    reorderLevel: 50,
    type: "Merchandise",
    image:
      "https://images.unsplash.com/photo-1525144199301-116380933d3e?w=500&auto=format&fit=crop&q=60",
  },
  {
    id: 5,
    name: "Resistance Bands",
    category: "Training Aids",
    price: 600,
    cost: 400,
    stock: 200,
    salesData: [60, 80, 100, 120, 140, 160],
    supplier: "TheraBand",
    reorderLevel: 30,
    type: "Merchandise",
    image:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&auto=format&fit=crop&q=60",
  },
  {
    id: 6,
    name: "Gym Shorts",
    category: "Apparel",
    price: 1200,
    cost: 800,
    stock: 80,
    salesData: [40, 50, 60, 70, 80, 90],
    supplier: "Adidas",
    reorderLevel: 20,
    type: "Merchandise",
    image:
      "https://images.unsplash.com/photo-1517495306984-1f91ed45a4de?w=500&auto=format&fit=crop&q=60",
  },
  {
    id: 7,
    name: "Pre-Workout Supplement",
    category: "Supplements",
    price: 1800,
    cost: 1300,
    stock: 120,
    salesData: [50, 70, 90, 110, 130, 150],
    supplier: "Cellucor",
    reorderLevel: 30,
    type: "Merchandise",
    image:
      "https://images.unsplash.com/photo-1595341888016-a392ef81b7de?w=500&auto=format&fit=crop&q=60",
  },
  {
    id: 8,
    name: "Gym Gloves",
    category: "Accessories",
    price: 500,
    cost: 350,
    stock: 180,
    salesData: [80, 90, 100, 110, 120, 130],
    supplier: "Nike",
    reorderLevel: 40,
    type: "Merchandise",
    image:
      "https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?w=500&auto=format&fit=crop&q=60",
  },
];

export const merchandiseSalesData = [
  { name: "Jan", total: 45000 },
  { name: "Feb", total: 52000 },
  { name: "Mar", total: 61000 },
  { name: "Apr", total: 68000 },
  { name: "May", total: 75000 },
  { name: "Jun", total: 82000 },
];

export const categorySalesData = [
  { name: "Supplements", value: 45, fill: "var(--color-supplements)" },
  { name: "Apparel", value: 25, fill: "var(--color-apparel)" },
  { name: "Accessories", value: 20, fill: "var(--color-accessories)" },
  { name: "Training Aids", value: 10, fill: "var(--color-training)" },
];

// Enhanced Revenue Data for comprehensive dashboard
export const subscriptionRevenueData = [
  {
    name: "Jan",
    yearly: 75000,
    halfYearly: 45000,
    quarterly: 25000,
    monthly: 30000,
  },
  {
    name: "Feb",
    yearly: 82000,
    halfYearly: 48000,
    quarterly: 28000,
    monthly: 32000,
  },
  {
    name: "Mar",
    yearly: 90000,
    halfYearly: 52000,
    quarterly: 32000,
    monthly: 35000,
  },
  {
    name: "Apr",
    yearly: 85000,
    halfYearly: 49000,
    quarterly: 29000,
    monthly: 33000,
  },
  {
    name: "May",
    yearly: 95000,
    halfYearly: 55000,
    quarterly: 35000,
    monthly: 38000,
  },
  {
    name: "Jun",
    yearly: 100000,
    halfYearly: 58000,
    quarterly: 38000,
    monthly: 40000,
  },
];

export const serviceCostData = [
  { name: "Jan", equipment: 8000, maintenance: 5000, utilities: 12000 },
  { name: "Feb", equipment: 9000, maintenance: 6000, utilities: 12500 },
  { name: "Mar", equipment: 7500, maintenance: 4500, utilities: 13000 },
  { name: "Apr", equipment: 8500, maintenance: 5500, utilities: 12800 },
  { name: "May", equipment: 9500, maintenance: 6500, utilities: 13500 },
  { name: "Jun", equipment: 8000, maintenance: 5000, utilities: 13200 },
];

export const revenueStreamsData = [
  { name: "Subscriptions", value: 45, fill: "var(--color-subscriptions)" },
  { name: "Merchandise", value: 25, fill: "var(--color-merchandise)" },
  { name: "Services", value: 15, fill: "var(--color-services)" },
  { name: "Other", value: 15, fill: "var(--color-other)" },
];

export const profitLossData = [
  { name: "Jan", income: 180000, expenses: 120000, profit: 60000 },
  { name: "Feb", income: 195000, expenses: 125000, profit: 70000 },
  { name: "Mar", income: 210000, expenses: 130000, profit: 80000 },
  { name: "Apr", income: 200000, expenses: 128000, profit: 72000 },
  { name: "May", income: 225000, expenses: 135000, profit: 90000 },
  { name: "Jun", income: 235000, expenses: 132000, profit: 103000 },
];

export const planRevenueBreakdown = [
  { name: "Yearly", revenue: 40, fill: "var(--color-yearly)" },
  { name: "Half Yearly", revenue: 25, fill: "var(--color-halfyearly)" },
  { name: "Quarterly", revenue: 20, fill: "var(--color-quarterly)" },
  { name: "Monthly", revenue: 15, fill: "var(--color-monthly)" },
];

export const expenseCategoriesData = [
  { name: "Equipment Service", value: 35, fill: "var(--color-equipment)" },
  { name: "Maintenance", value: 25, fill: "var(--color-maintenance)" },
  { name: "Utilities", value: 25, fill: "var(--color-utilities)" },
  { name: "Inventory Purchases", value: 15, fill: "var(--color-inventory)" },
];

// AI Usage Mock Data
export const monthlyAICreditUsage = [
  { name: "Jan", credits: 4500 },
  { name: "Feb", credits: 5200 },
  { name: "Mar", credits: 6100 },
  { name: "Apr", credits: 5800 },
  { name: "May", credits: 7200 },
  { name: "Jun", credits: 8500 },
];

export const weeklyAICreditUsage = [
  { name: "Week 1", credits: 1200 },
  { name: "Week 2", credits: 1450 },
  { name: "Week 3", credits: 1380 },
  { name: "Week 4", credits: 1620 },
];

export const topAICreditUsers = [
  { id: 1, name: "Rahul Sharma", avatar: "https://i.pravatar.cc/150?u=1", creditsUsed: 1250, usagePercent: 18 },
  { id: 2, name: "Priya Patel", avatar: "https://i.pravatar.cc/150?u=2", creditsUsed: 980, usagePercent: 14 },
  { id: 3, name: "Vikram Singh", avatar: "https://i.pravatar.cc/150?u=5", creditsUsed: 850, usagePercent: 12 },
  { id: 4, name: "Amit Kumar", avatar: "https://i.pravatar.cc/150?u=3", creditsUsed: 720, usagePercent: 10 },
  { id: 5, name: "Sneha Gupta", avatar: "https://i.pravatar.cc/150?u=4", creditsUsed: 650, usagePercent: 9 },
];

export const workoutVsDietTrend = [
  { name: "Jan", workouts: 280, diet: 170 },
  { name: "Feb", workouts: 320, diet: 200 },
  { name: "Mar", workouts: 380, diet: 230 },
  { name: "Apr", workouts: 350, diet: 230 },
  { name: "May", workouts: 450, diet: 270 },
  { name: "Jun", workouts: 520, diet: 330 },
];

// Member Credit Balances (from member_credits table)
export const memberCreditBalances = [
  { memberId: "m1", balance: 50 },
  { memberId: "m2", balance: 25 },
  { memberId: "m3", balance: 0 },
  { memberId: "m4", balance: 75 },
  { memberId: "m5", balance: 10 },
];

// Individual AI Request History (for modal display)
export const memberAIRequestHistory = [
  {
    memberId: "m1",
    requests: [
      { id: "r1", date: "2024-01-15 10:30:00", type: "workout", description: "Generated workout plan for upper body", credits: 25, status: "success" },
      { id: "r2", date: "2024-01-14 14:20:00", type: "diet", description: "Generated diet plan for weight loss", credits: 20, status: "success" },
      { id: "r3", date: "2024-01-13 09:15:00", type: "workout", description: "Generated workout plan for legs", credits: 25, status: "success" },
      { id: "r4", date: "2024-01-12 16:45:00", type: "workout", description: "Generated workout plan for cardio", credits: 20, status: "success" },
      { id: "r5", date: "2024-01-11 11:00:00", type: "diet", description: "Generated diet plan for muscle gain", credits: 20, status: "failed" },
    ]
  },
  {
    memberId: "m2",
    requests: [
      { id: "r6", date: "2024-01-15 08:30:00", type: "workout", description: "Generated workout plan for full body", credits: 25, status: "success" },
      { id: "r7", date: "2024-01-14 13:00:00", type: "diet", description: "Generated diet plan for maintenance", credits: 20, status: "success" },
      { id: "r8", date: "2024-01-13 10:30:00", type: "workout", description: "Generated workout plan for strength", credits: 25, status: "success" },
    ]
  },
  {
    memberId: "m3",
    requests: [
      { id: "r9", date: "2024-01-12 15:00:00", type: "workout", description: "Generated workout plan for beginners", credits: 25, status: "success" },
      { id: "r10", date: "2024-01-11 09:30:00", type: "diet", description: "Generated diet plan", credits: 20, status: "success" },
    ]
  },
  {
    memberId: "m4",
    requests: [
      { id: "r11", date: "2024-01-15 12:00:00", type: "workout", description: "Generated workout plan for advanced", credits: 25, status: "success" },
      { id: "r12", date: "2024-01-14 10:00:00", type: "diet", description: "Generated diet plan for athletes", credits: 20, status: "success" },
      { id: "r13", date: "2024-01-13 14:30:00", type: "workout", description: "Generated workout plan for HIIT", credits: 25, status: "success" },
      { id: "r14", date: "2024-01-12 11:15:00", type: "diet", description: "Generated diet plan for lean", credits: 20, status: "success" },
      { id: "r15", date: "2024-01-11 16:00:00", type: "workout", description: "Generated workout plan for core", credits: 25, status: "success" },
    ]
  },
  {
    memberId: "m5",
    requests: [
      { id: "r16", date: "2024-01-14 09:00:00", type: "workout", description: "Generated workout plan", credits: 25, status: "success" },
      { id: "r17", date: "2024-01-13 14:00:00", type: "diet", description: "Generated diet plan", credits: 20, status: "failed" },
    ]
  },
];
