import axios from 'axios';

// WAHA Configuration (self-hosted)
const WAHA_URL = process.env.WAHA_URL || 'http://146.190.221.253:3000';
const WAHA_API_KEY = process.env.WAHA_API_KEY || 'my-secret-api-key';

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
  source: 'waha' | 'none';
  error?: string;
}

/**
 * Check if WhatsApp is configured
 */
export function isWhatsAppConfigured(): boolean {
  return true;
}

/**
 * Get the current WhatsApp source
 */
export function getWhatsAppSource(): 'waha' | 'none' {
  return 'waha';
}

/**
 * Convert phone number to WAHA format (91XXXXXXXXXX@c.us) with 91 prefix
 */
function formatPhoneForWAHA(phoneNumber: string): string {
  let clean = phoneNumber.replace(/[^\d]/g, '');
  if (!clean.startsWith('91')) {
    clean = '91' + clean;
  }
  return `${clean}@c.us`;
}

/**
 * Send WhatsApp message via WAHA
 */
export async function sendWhatsAppTestMessage(
  request: WhatsAppTestRequest
): Promise<WhatsAppMessageResponse | WhatsAppError> {
  const chatId = formatPhoneForWAHA(request.to);
  
  console.log(`WAHA: Sending message to ${chatId}`);
  
  try {
    const response = await axios.post(
      `${WAHA_URL}/api/sendText`,
      {
        session: 'default',
        chatId: chatId,
        text: request.message
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
      contacts: [{ input: request.to, wa_id: chatId }],
      messages: [{ id: response.data.id?.toString() || `waha_${Date.now()}` }]
    };
  } catch (error: any) {
    console.error('WAHA: Error sending message:', error.message);
    throw new Error(`WAHA error: ${error.message}`);
  }
}

/**
 * Check WhatsApp API health/status
 */
export async function checkWhatsAppHealth(): Promise<WhatsAppHealthResponse> {
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

/**
 * Send OTP via WhatsApp
 */
export async function sendWhatsAppOTP(phoneNumber: string, otp: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const message = `Your verification code is: ${otp}\n\nThis code will expire in 5 minutes.`;
  
  try {
    const result = await sendWhatsAppTestMessage({
      to: phoneNumber,
      message
    });
    
    if ('messages' in result && result.messages?.[0]?.id) {
      return { success: true, messageId: result.messages[0].id };
    }
    return { success: false, error: 'Failed to send message' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Format phone number for WhatsApp API
 */
export function formatPhoneNumber(phoneNumber: string): string {
  let clean = phoneNumber.replace(/[^\d]/g, '');
  if (!clean.startsWith('91')) {
    clean = '91' + clean;
  }
  return clean;
}