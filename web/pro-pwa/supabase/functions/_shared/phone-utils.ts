
// A more robust version for Deno environment
export function normalizePhoneNumber(phoneNumber: string): string[] {
  console.log(`[phone-utils] Starting normalization for: ${phoneNumber}`);
  if (!phoneNumber) {
    console.log(`[phone-utils] Phone number is null or empty.`);
    return [];
  }

  const cleaned = phoneNumber.replace(/\D/g, '');
  console.log(`[phone-utils] Cleaned number (digits only): ${cleaned}`);

  let mobile = '';
  // Handle numbers with country code
  if (cleaned.startsWith('972')) {
    // 9725... -> 05...
    mobile = '0' + cleaned.substring(3);
    console.log(`[phone-utils] Handled country code 972. Result: ${mobile}`);
  } 
  // Handle numbers without country code but with leading 0
  else if (cleaned.startsWith('0') && cleaned.length === 10) {
    mobile = cleaned;
    console.log(`[phone-utils] Handled 10-digit number with leading 0. Result: ${mobile}`);
  }
  // Handle numbers without country code and without leading 0 (e.g. 545308505)
  else if (cleaned.length === 9 && cleaned.startsWith('5')) {
    mobile = '0' + cleaned;
    console.log(`[phone-utils] Handled 9-digit number starting with 5. Result: ${mobile}`);
  }

  // Final check for Israeli mobile number format 05X-XXXXXXX
  if (mobile.startsWith('05') && mobile.length === 10) {
    console.log(`[phone-utils] Successfully normalized ${phoneNumber} to [${mobile}]`);
    return [mobile];
  }

  console.log(`[phone-utils] Could not normalize phone number: ${phoneNumber}. Final mobile variable: '${mobile}'`);
  return [];
}
