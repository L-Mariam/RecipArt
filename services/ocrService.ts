import Tesseract from 'tesseract.js';
import { ReceiptItem } from "../types";

/**
 * Local OCR Service using Tesseract.js
 */

export interface OCRResult {
  items: ReceiptItem[];
  total: number;
  location: string;
  rawText: string;
}

const RECEIPT_KEYWORDS = ['total', 'amount', 'tax', 'visa', 'mastercard', 'cash', 'change', 'balance', 'items', 'receipt', 'invoice', 'merchant', 'qty'];
const TRASH_KEYWORDS = ['amount', 'subtotal', 'tax', 'total', 'visa', 'balance', 'due', 'cash', 'change', '@', ' x ', 'unit', 'price'];

/**
 * Checks if the extracted text likely belongs to a receipt
 */
export const isLikelyReceipt = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  const matchCount = RECEIPT_KEYWORDS.filter(word => lowerText.includes(word)).length;
  return matchCount >= 2;
};

/**
 * Core Logic to parse individual lines and extract prices
 */
export const extractDetailsFromText = (text: string): Omit<OCRResult, 'rawText'> => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
  
  // 1. Extract Merchant (usually top of receipt)
  // Skip lines that look like addresses or phone numbers if possible
  const locationLine = lines.find(l => !l.match(/\d{3}-\d{3}/) && !l.toLowerCase().includes('date')) || 'Unknown Merchant';
  const location = locationLine.replace(/[^a-zA-Z0-9\s]/g, '').trim();

  // 2. Extract Total
  // Specifically look for patterns like "TOTAL 12.34"
  const totalRegex = /(?:TOTAL|TOTAL\s*DUE|BALANCE|AMOUNT|NET)[\s:]*[\$]?\s*(\d+[\.,]\d{2})/i;
  let total = 0;
  const totalMatch = text.match(totalRegex);
  if (totalMatch && totalMatch[1]) {
    total = parseFloat(totalMatch[1].replace(',', '.'));
  }

  // 3. Extract Items
  const items: ReceiptItem[] = [];
  
  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    
    // Filter out lines that contain unit price indicators or "Amount" headers
    const isTrash = TRASH_KEYWORDS.some(k => lowerLine.includes(k));
    if (isTrash) return;

    // Look for a price at the end of the line
    // Pattern: Some text ... followed by a number like 10.00
    const priceAtEndRegex = /^(.*?)\s+[\$]?\s*(\d+[\.,]\d{2})$/;
    const match = line.match(priceAtEndRegex);

    if (match) {
      const name = match[1].trim()
        .replace(/^[*\.\-\s]+/, '') // Remove leading bullets
        .replace(/[*\.\-\s]+$/, ''); // Remove trailing dots/dashes
      
      const price = parseFloat(match[2].replace(',', '.'));

      // Sanity check: price shouldn't be 0 and name shouldn't be empty
      if (price > 0 && name.length > 1) {
        items.push({ name, price });
      }
    }
  });

  return { location, total, items };
};

/**
 * Main OCR Entry Point
 */
export const performLocalOCR = async (
  imageSource: string | File, 
  onProgress?: (progress: number) => void
): Promise<OCRResult> => {
  const { data: { text } } = await Tesseract.recognize(imageSource, 'eng', {
    logger: m => {
      if (m.status === 'recognizing' && onProgress) {
        onProgress(m.progress);
      }
    }
  });

  const details = extractDetailsFromText(text);
  
  return {
    ...details,
    rawText: text
  };
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};
