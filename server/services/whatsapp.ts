import axios from 'axios';

// Configuration - supports both Meta WhatsApp API and WAHA
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const PHONENUMBER_ID = process.env.PHONENUMBER_ID;

// WAHA Configuration (self-hosted)
const WAHA_URL = process.env.WAHA_URL || 'http://146.190.221.253:3000';
const WAHA_API_KEY = process.env.WAHA_API_KEY || 'my-secret-api-key';
const USE_WAHA = process.env.USE_WAHA === 'true';

// WhatsApp API endpoints (Meta)
const WHATSAPP_API_BASE = 'https://graph.facebook.com/v20.0';
const WHATSAPP_MESSAGES_ENDPOINT = PHONENUMBER_ID ? `${WHATSAPP_API_BASE}/${PHONENUMBER_ID}/messages` : '';

// WhatsApp API Error Types
export interface WhatsAppError {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

// WhatsApp Message Response
export interface WhatsAppMessageResponse {
  messaging_product: string;
  contacts?: Array<{
    input: string;
    wa_id: string;
  }>;
  messages?: Array<{
    id: string;
  }>;
}

// WhatsApp Test Request
export interface WhatsAppTestRequest {
  to: string;
  message: string;
}

// WhatsApp Health Check Response
export interface WhatsAppHealthResponse {
  success: boolean;
  message: string;
  phoneNumberId?: string;
  source: 'meta' | 'waha' | 'none';
  error?: string;
}

/**
 * Check if WhatsApp is configured (either Meta or WAHA)
 */
export function isWhatsAppConfigured(): boolean {
  if (USE_WAHA) return true;
  return !!WHATSAPP_API_TOKEN && !!PHONENUMBER_ID;
}

/**
 * Get the current WhatsApp source
 */
export function getWhatsAppSource(): 'meta' | 'waha' | 'none' {
  if (USE_WAHA) return 'waha';
  if (WHATSAPP_API_TOKEN && PHONENUMBER_ID) return 'meta';
  return 'none';
}

/**
 * Validate phone number format for WAHA
 */
function validatePhoneNumberForWAHA(phoneNumber: string): boolean {
  const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
  const phoneRegex = /^\+?[1-9]\d{7,14}$/;
  return phoneRegex.test(cleanNumber);
}

/**
 * Convert phone number to WAHA format (91XXXXXXXXXX@c.us)
 */
function formatPhoneForWAHA(phoneNumber: string): string {
  let clean = phoneNumber.replace(/[\s\-\(\)]/g, '');
  if (clean.startsWith('+')) {
    clean = clean.substring(1);
  }
  return `${clean}@c.us`;
}

/**
 * Validate phone number format for Meta API
 */
function validatePhoneNumber(phoneNumber: string): boolean {
  const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
  const phoneRegex = /^\+[1-9]\d{7,14}$/;
  return phoneRegex.test(cleanNumber);
}

/**
 * Send WhatsApp message via WAHA
 */
async function sendViaWAHA(to: string, message: string): Promise<WhatsAppMessageResponse> {
  const chatId = formatPhoneForWAHA(to);
  
  console.log(`WAHA: Sending message to ${chatId}`);
  
  const response = await axios.post(
    `${WAHA_URL}/api/sendText`,
    {
      session: 'default',
      chatId: chatId,
      text: message
    },
    {
      headers: {
        'X-Api-Key': WAHA_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );

  console.log('WAHA: Message sent successfully');
  
  return {
    messaging_product: 'whatsapp',
    contacts: [{ input: to, wa_id: chatId }],
    messages: [{ id: response.data.id?.toString() || `waha_${Date.now()}` }]
  };
}

/**
 * Send a test WhatsApp message (supports both Meta and WAHA)
 */
export async function sendWhatsAppTestMessage(
  request: WhatsAppTestRequest
): Promise<WhatsAppMessageResponse | WhatsAppError> {
  
  // If WAHA is enabled, use WAHA
  if (USE_WAHA) {
    try {
      return await sendViaWAHA(request.to, request.message);
    } catch (error: any) {
      console.error('WAHA: Error sending message:', error.message);
      throw new Error(`WAHA error: ${error.message}`);
    }
  }

  // Otherwise use Meta API
  if (!isWhatsAppConfigured()) {
    throw new Error('WhatsApp API credentials not configured');
  }

  if (!validatePhoneNumber(request.to)) {
    throw new Error('Invalid phone number format. Please use international format (e.g., +1234567890)');
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: request.to,
    type: 'text',
    text: {
      body: request.message
    }
  };

  try {
    console.log('WhatsApp (Meta): Sending test message to', request.to);
    
    const response = await axios.post(
      WHATSAPP_MESSAGES_ENDPOINT,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('WhatsApp (Meta): Message sent successfully');
    
    return response.data as WhatsAppMessageResponse;
    
  } catch (error: any) {
    console.error('WhatsApp (Meta): Error sending message:', error.message);
    
    if (error.response) {
      return error.response.data as WhatsAppError;
    } else if (error.request) {
      throw new Error('No response received from WhatsApp API');
    } else {
      throw new Error(`Request setup error: ${error.message}`);
    }
  }
}

/**
 * Check WhatsApp API health/status
 */
export async function checkWhatsAppHealth(): Promise<WhatsAppHealthResponse> {
  const source = getWhatsAppSource();
  
  if (source === 'none') {
    return {
      success: false,
      message: 'WhatsApp is not configured',
      source: 'none',
      error: 'Set USE_WAHA=true or configure WHATSAPP_API_TOKEN and PHONENUMBER_ID'
    };
  }

  // Check WAHA health
  if (source === 'waha') {
    try {
      const response = await axios.get(
        `${WAHA_URL}/api/sessions/default`,
        {
          headers: { 'X-Api-Key': WAHA_API_KEY },
          timeout: 5000
        }
      );
      
      const status = response.data.status;
      return {
        success: status === 'WORKING' || status === 'CONNECTED',
        message: status === 'WORKING' || status === 'CONNECTED' 
          ? 'WAHA is connected and working' 
          : `WAHA session status: ${status}`,
        phoneNumberId: 'default',
        source: 'waha'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Unable to connect to WAHA server',
        source: 'waha',
        error: error.message
      };
    }
  }

  // Check Meta API health
  if (!WHATSAPP_API_TOKEN || !PHONENUMBER_ID) {
    return {
      success: false,
      message: 'WhatsApp API credentials not configured',
      source: 'meta',
      error: 'Missing WHATSAPP_API_TOKEN or PHONENUMBER_ID'
    };
  }

  try {
    const response = await axios.get(
      `${WHATSAPP_API_BASE}/${PHONENUMBER_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`
        },
        timeout: 5000
      }
    );

    return {
      success: true,
      message: 'WhatsApp API is configured and accessible',
      phoneNumberId: response.data.id,
      source: 'meta'
    };

  } catch (error: any) {
    return {
      success: false,
      message: 'WhatsApp API credentials are invalid or API is not accessible',
      source: 'meta',
      error: error.response?.data?.error?.message || 'Unknown API error'
    };
  }
}

/**
 * Format phone number for WhatsApp API
 */
export function formatPhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/[^\d+]/g, '');
}
