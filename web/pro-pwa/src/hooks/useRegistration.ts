import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { RegistrationService, ProfessionalRegistrationData } from '@/services/registrationService';

export const useRegistration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const registerProfessional = async (data: ProfessionalRegistrationData): Promise<boolean> => {
    setIsLoading(true);

    try {
      console.log('Starting professional registration:', {
        phone: data.phone,
        businessName: data.businessName,
        profession: data.profession
      });

      // Format phone number
      const formattedData = {
        ...data,
        phone: RegistrationService.formatPhoneNumber(data.phone)
      };

      const response = await RegistrationService.registerProfessional(formattedData);

      if (response.success) {
        toast({
          title: 'הרשמה הושלמה בהצלחה!',
          description: response.message_he || response.message,
        });

        console.log('Registration successful:', {
          userId: response.user_id,
          professionalId: response.professional_id
        });

        // Navigate to login page after successful registration
        setTimeout(() => {
          navigate('/auth?registered=true', {
            replace: true,
            state: {
              phone: formattedData.phone,
              message: 'הרשמה הושלמה בהצלחה! כעת ניתן להתחבר עם מספר הטלפון'
            }
          });
        }, 2000);

        return true;
      } else {
        toast({
          title: 'שגיאה בהרשמה',
          description: response.message_he || response.message,
          variant: 'destructive',
        });

        console.warn('Registration failed:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);

      let errorMessage = 'שגיאה לא צפויה בהרשמה';

      if (error instanceof Error) {
        if (error.message.includes('phone number already registered')) {
          errorMessage = 'מספר הטלפון כבר רשום במערכת';
        } else if (error.message.includes('email already registered')) {
          errorMessage = 'כתובת האימייל כבר רשומה במערכת';
        } else if (error.message.includes('network')) {
          errorMessage = 'בעיית רשת - אנא בדוק את החיבור לאינטרנט';
        }
      }

      toast({
        title: 'שגיאה בהרשמה',
        description: errorMessage,
        variant: 'destructive',
      });

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const checkPhoneAvailability = async (phone: string): Promise<boolean> => {
    try {
      const formatted = RegistrationService.formatPhoneNumber(phone);
      return await RegistrationService.checkPhoneAvailability(formatted);
    } catch (error) {
      console.error('Phone availability check failed:', error);
      return false;
    }
  };

  const validateRegistrationData = (data: ProfessionalRegistrationData): string[] => {
    const errors: string[] = [];

    // Personal information validation
    const firstNameError = RegistrationService.validateHebrewText(data.firstName, 'שם פרטי');
    if (firstNameError) errors.push(firstNameError);

    const lastNameError = RegistrationService.validateHebrewText(data.lastName, 'שם משפחה');
    if (lastNameError) errors.push(lastNameError);

    const phoneError = RegistrationService.validateIsraeliPhone(data.phone);
    if (phoneError) errors.push(phoneError);

    // Business information validation
    const businessNameError = RegistrationService.validateHebrewText(data.businessName, 'שם עסק');
    if (businessNameError) errors.push(businessNameError);

    if (!data.profession || data.profession.trim().length < 2) {
      errors.push('מקצוע חייב להכיל לפחות 2 תווים');
    }

    if (data.experienceYears < 0 || data.experienceYears > 50) {
      errors.push('שנות ניסיון חייבות להיות בין 0 ל-50');
    }

    const serviceAreaError = RegistrationService.validateHebrewText(data.serviceArea, 'אזור שירות');
    if (serviceAreaError) errors.push(serviceAreaError);

    if (!data.description || data.description.trim().length < 10) {
      errors.push('תיאור שירותים חייב להכיל לפחות 10 תווים');
    }

    if (data.description && data.description.length > 500) {
      errors.push('תיאור שירותים לא יכול להכיל יותר מ-500 תווים');
    }

    // Email validation (optional)
    if (data.email && data.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push('כתובת אימייל לא תקינה');
      }
    }

    return errors;
  };

  return {
    registerProfessional,
    checkPhoneAvailability,
    validateRegistrationData,
    isLoading,
  };
};

export default useRegistration;