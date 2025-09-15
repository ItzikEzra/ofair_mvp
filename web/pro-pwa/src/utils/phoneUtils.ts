
/**
 * Normalizes a phone number and returns multiple formats to try in database queries
 * This helps with matching phone numbers stored in different formats
 */
export const normalizePhoneNumber = (phone: string) => {
  // Remove any non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Generate different formats to try
  const formats = new Set([phone]); // Original format
  
  // Add cleaned digit-only version
  formats.add(digitsOnly);
  
  // Handle Israeli formats
  if (digitsOnly.startsWith('0')) {
    // 05X-XXXXXXX -> 5X-XXXXXXX
    formats.add(digitsOnly.substring(1));
    
    // 05X-XXXXXXX -> 972-5X-XXXXXXX
    formats.add('972' + digitsOnly.substring(1));
    
    // 05X-XXXXXXX -> +972-5X-XXXXXXX
    formats.add('+972' + digitsOnly.substring(1));
  }
  
  // Handle case where number starts with 5 (already without leading 0)
  if (digitsOnly.startsWith('5')) {
    formats.add('0' + digitsOnly); // 5X-XXXXXXX -> 05X-XXXXXXX
    formats.add('972' + digitsOnly); // 5X-XXXXXXX -> 9725X-XXXXXXX
    formats.add('+972' + digitsOnly); // 5X-XXXXXXX -> +9725X-XXXXXXX
  }
  
  // Handle international format without +
  if (digitsOnly.startsWith('972')) {
    formats.add('0' + digitsOnly.substring(3)); // 972-5X-XXXXXXX -> 05X-XXXXXXX
    formats.add('+' + digitsOnly); // 972-5X-XXXXXXX -> +972-5X-XXXXXXX
    formats.add(digitsOnly.substring(3)); // 972-5X-XXXXXXX -> 5X-XXXXXXX
  }
  
  // Handle international format with +
  if (phone.startsWith('+972')) {
    formats.add('0' + digitsOnly.substring(3)); // +972-5X-XXXXXXX -> 05X-XXXXXXX
    formats.add(digitsOnly); // +972-5X-XXXXXXX -> 9725X-XXXXXXX
    formats.add(digitsOnly.substring(3)); // +972-5X-XXXXXXX -> 5X-XXXXXXX
  }
  
  // Additional handling for phones with country code variations
  if (digitsOnly.startsWith('9725')) {
    formats.add('0' + digitsOnly.substring(3)); // 9725X-XXXXXXX -> 05X-XXXXXXX
  }
  
  // Handle case where number might be stored with spaces or dashes
  const formattedWithDashes = digitsOnly.startsWith('0') 
    ? `${digitsOnly.substring(0, 3)}-${digitsOnly.substring(3)}` 
    : digitsOnly.startsWith('972') 
      ? `${digitsOnly.substring(0, 3)}-${digitsOnly.substring(3)}` 
      : digitsOnly.startsWith('5') 
        ? `0${digitsOnly.substring(0, 2)}-${digitsOnly.substring(2)}` 
        : digitsOnly;
        
  formats.add(formattedWithDashes);
  
  console.log("Phone formats to try:", [...formats]);
  return [...formats];
};

/**
 * Formats a phone number for authentication with Supabase
 * Always returns the number in international format with + prefix
 */
export const formatPhoneForAuth = (phone: string) => {
  // Remove any non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  let formattedPhone = digitsOnly;
  
  // Convert local Israeli format to international
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '972' + formattedPhone.substring(1);
  } else if (formattedPhone.startsWith('5')) {
    // Handle case where number starts with 5 (already without leading 0)
    formattedPhone = '9725' + formattedPhone.substring(1);
  }
  
  // Make sure it doesn't start with double prefix
  if (formattedPhone.startsWith('972972')) {
    formattedPhone = formattedPhone.substring(3);
  }
  
  // Make sure it has the + prefix
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+' + formattedPhone;
  }
  
  console.log("Formatted phone for auth:", formattedPhone);
  return formattedPhone;
};
