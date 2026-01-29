import { format, parseISO, addMinutes } from 'date-fns';

/**
 * Convert UTC date to IST (Indian Standard Time - UTC+5:30)
 */
const convertToIST = (date: string | Date | null | undefined): Date | null => {
  if (!date) return null;
  
  try {
    const utcDate = typeof date === 'string' ? parseISO(date) : date;
    // Add 5 hours 30 minutes (330 minutes) for IST
    return addMinutes(utcDate, 330);
  } catch (error) {
    console.error('Error converting to IST:', error);
    return null;
  }
};

/**
 * Format date to DD-MM-YYYY (IST)
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  const istDate = convertToIST(date);
  if (!istDate) return '';
  
  try {
    return format(istDate, 'dd-MM-yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Format date with time to DD-MM-YYYY HH:mm IST
 */
export const formatDateTime = (date: string | Date | null | undefined): string => {
  const istDate = convertToIST(date);
  if (!istDate) return '';
  
  try {
    return format(istDate, 'dd-MM-yyyy HH:mm') + ' IST';
  } catch (error) {
    console.error('Error formatting date time:', error);
    return '';
  }
};

/**
 * Get current date/time in IST for display
 */
export const getCurrentDateTimeIST = (): string => {
  const now = new Date();
  const istDate = addMinutes(now, 330);
  return format(istDate, 'dd-MM-yyyy HH:mm:ss') + ' IST';
};

/**
 * Get current date in YYYY-MM-DD format for input fields
 */
export const getCurrentDateForInput = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

/**
 * Convert DD-MM-YYYY to YYYY-MM-DD for backend
 */
export const convertToBackendFormat = (ddmmyyyy: string): string => {
  if (!ddmmyyyy) return '';
  
  try {
    const parts = ddmmyyyy.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return ddmmyyyy;
  } catch (error) {
    return ddmmyyyy;
  }
};
