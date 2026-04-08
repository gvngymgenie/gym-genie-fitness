import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gym Genie API',
      version: '1.0.0',
      description: 'Complete API documentation for Gym Genie management system',
      contact: {
        name: 'Gym Genie Support',
        email: 'support@gymgenie.com',
      },
    },
    servers: [
      {
        url: 'https://gym-genie-cy4dekrrl-inkstellars-projects.vercel.app',
        description: 'Production server',
      },
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User ID',
            },
            username: {
              type: 'string',
              description: 'Username',
            },
            email: {
              type: 'string',
              description: 'User email',
            },
            firstName: {
              type: 'string',
              description: 'First name',
            },
            lastName: {
              type: 'string',
              description: 'Last name',
            },
            phone: {
              type: 'string',
              description: 'Phone number',
            },
            role: {
              type: 'string',
              enum: ['admin', 'manager', 'trainer', 'staff', 'member'],
              description: 'User role',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether user account is active',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation date',
            },
          },
        },
        Member: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Member ID',
            },
            firstName: {
              type: 'string',
              description: 'Member first name',
            },
            lastName: {
              type: 'string',
              description: 'Member last name',
            },
            email: {
              type: 'string',
              description: 'Member email',
            },
            phone: {
              type: 'string',
              description: 'Member phone number',
            },
            address: {
              type: 'string',
              description: 'Member address',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              description: 'Member gender',
            },
            dob: {
              type: 'string',
              description: 'Date of birth',
            },
            height: {
              type: 'integer',
              description: 'Height in cm',
            },
            source: {
              type: 'string',
              description: 'How member found the gym',
            },
            interestArea: {
              type: 'string',
              description: 'Member interest area',
            },
            healthBackground: {
              type: 'string',
              description: 'Member health background',
            },
            plan: {
              type: 'string',
              description: 'Current membership plan',
            },
            startDate: {
              type: 'string',
              description: 'Membership start date',
            },
            endDate: {
              type: 'string',
              description: 'Membership end date',
            },
            discount: {
              type: 'integer',
              description: 'Discount amount',
            },
            totalDue: {
              type: 'integer',
              description: 'Total amount due',
            },
            amountPaid: {
              type: 'integer',
              description: 'Amount paid',
            },
            paymentMethod: {
              type: 'string',
              description: 'Payment method',
            },
            assignedStaff: {
              type: 'string',
              description: 'Assigned staff member ID',
            },
            status: {
              type: 'string',
              enum: ['Active', 'Inactive', 'Pending'],
              description: 'Member status',
            },
            avatar: {
              type: 'string',
              description: 'Avatar image URL',
            },
            branch: {
              type: 'string',
              description: 'Branch ID',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Member creation date',
            },
          },
        },
        InventoryItem: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Inventory item ID',
            },
            name: {
              type: 'string',
              description: 'Item name',
            },
            category: {
              type: 'string',
              description: 'Item category',
            },
            price: {
              type: 'integer',
              description: 'Item price in cents',
            },
            stock: {
              type: 'integer',
              description: 'Current stock quantity',
            },
            purchaseDate: {
              type: 'string',
              description: 'Purchase date',
            },
            needsService: {
              type: 'boolean',
              description: 'Whether item needs service',
            },
            nextServiceDate: {
              type: 'string',
              description: 'Next service date',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Item creation date',
            },
          },
        },
        Attendance: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Attendance record ID',
            },
            memberId: {
              type: 'string',
              description: 'Member ID',
            },
            memberName: {
              type: 'string',
              description: 'Member name',
            },
            date: {
              type: 'string',
              description: 'Attendance date',
            },
            checkInTime: {
              type: 'string',
              description: 'Check-in time',
            },
            method: {
              type: 'string',
              enum: ['Manual', 'QR', 'Biometric'],
              description: 'Check-in method',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Record creation date',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./server/routes/*.ts'],
};

const specs = swaggerJsdoc(swaggerOptions);

export default specs;