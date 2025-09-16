import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Phone, Building2, MapPin, Briefcase, Clock, FileText } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Professional registration form schema with Hebrew validation
const registrationSchema = z.object({
  // Personal Information
  firstName: z.string()
    .min(2, 'שם פרטי חייב להכיל לפחות 2 תווים')
    .max(50, 'שם פרטי לא יכול להכיל יותר מ-50 תווים')
    .regex(/^[\u0590-\u05FF\s]+$/, 'שם פרטי חייב להיות בעברית'),

  lastName: z.string()
    .min(2, 'שם משפחה חייב להכיל לפחות 2 תווים')
    .max(50, 'שם משפחה לא יכול להכיל יותר מ-50 תווים')
    .regex(/^[\u0590-\u05FF\s]+$/, 'שם משפחה חייב להיות בעברית'),

  phone: z.string()
    .regex(/^\+972[0-9]{9}$/, 'מספר טלפון חייב להיות בפורמט +972XXXXXXXXX'),

  email: z.string()
    .email('כתובת אימייל לא תקינה')
    .optional()
    .or(z.literal('')),

  // Business Information
  businessName: z.string()
    .min(2, 'שם עסק חייב להכיל לפחות 2 תווים')
    .max(100, 'שם עסק לא יכול להכיל יותר מ-100 תווים'),

  businessNumber: z.string()
    .optional()
    .or(z.literal('')),

  profession: z.string()
    .min(2, 'מקצוע חייב להכיל לפחות 2 תווים'),

  experienceYears: z.coerce.number()
    .min(0, 'שנות ניסיון חייבות להיות לפחות 0')
    .max(50, 'שנות ניסיון לא יכולות להיות יותר מ-50'),

  serviceArea: z.string()
    .min(2, 'אזור שירות חייב להכיל לפחות 2 תווים'),

  description: z.string()
    .min(10, 'תיאור חייב להכיל לפחות 10 תווים')
    .max(500, 'תיאור לא יכול להכיל יותר מ-500 תווים'),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

const professionalCategories = [
  'שיפוצים כלליים',
  'אינסטלציה',
  'חשמל',
  'צבעים',
  'ריצוף וחיפוי',
  'נגרות',
  'מסגרות',
  'אוויר ממוזג',
  'גינון ונוי',
  'ניקיון',
  'אחר'
];

const israeliCities = [
  'תל אביב-יפו',
  'ירושלים',
  'חיפה',
  'רעננה',
  'הרצליה',
  'כפר סבא',
  'רמת גן',
  'גבעתיים',
  'פתח תקווה',
  'ראשון לציון',
  'רחובות',
  'נתניה',
  'באר שבע',
  'אילת',
  'אחר'
];

interface ProfessionalRegistrationFormProps {
  onSuccess: (data: RegistrationFormData) => void;
  isLoading?: boolean;
}

export const ProfessionalRegistrationForm: React.FC<ProfessionalRegistrationFormProps> = ({
  onSuccess,
  isLoading = false
}) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      businessName: '',
      businessNumber: '',
      profession: '',
      experienceYears: 0,
      serviceArea: '',
      description: '',
    },
  });

  const onSubmit = async (data: RegistrationFormData) => {
    try {
      console.log('Registration data:', data);

      toast({
        title: 'נתונים נשלחו בהצלחה',
        description: 'הרשמה בתהליך...',
      });

      onSuccess(data);
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: 'שגיאה בהרשמה',
        description: 'אנא נסה שוב מאוחר יותר',
        variant: 'destructive',
      });
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepValid = async (step: number): Promise<boolean> => {
    switch (step) {
      case 1:
        return await form.trigger(['firstName', 'lastName', 'phone', 'email']);
      case 2:
        return await form.trigger(['businessName', 'profession', 'experienceYears']);
      case 3:
        return await form.trigger(['serviceArea', 'description']);
      default:
        return true;
    }
  };

  const handleNextStep = async () => {
    const valid = await isStepValid(currentStep);
    if (valid) {
      nextStep();
    } else {
      toast({
        title: 'יש לתקן שגיאות',
        description: 'אנא מלא את כל השדות הנדרשים',
        variant: 'destructive',
      });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4" dir="rtl">
            <div className="text-center mb-6">
              <User className="h-12 w-12 mx-auto text-blue-600 mb-2" />
              <h3 className="text-lg font-semibold">פרטים אישיים</h3>
              <p className="text-sm text-muted-foreground">בואו נכיר אותך</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>שם פרטי *</FormLabel>
                    <FormControl>
                      <Input placeholder="ישראל" {...field} className="text-right" dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>שם משפחה *</FormLabel>
                    <FormControl>
                      <Input placeholder="ישראלי" {...field} className="text-right" dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>מספר טלפון נייד *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+972501234567"
                      {...field}
                      className="text-left"
                      dir="ltr"
                      onChange={(e) => {
                        let value = e.target.value;
                        // Auto-format Israeli phone number
                        if (value && !value.startsWith('+972')) {
                          if (value.startsWith('0')) {
                            value = '+972' + value.substring(1);
                          } else if (!value.startsWith('+')) {
                            value = '+972' + value;
                          }
                        }
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>כתובת אימייל (אופציונלי)</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="example@gmail.com"
                      {...field}
                      className="text-left"
                      dir="ltr"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4" dir="rtl">
            <div className="text-center mb-6">
              <Building2 className="h-12 w-12 mx-auto text-blue-600 mb-2" />
              <h3 className="text-lg font-semibold">פרטי עסק</h3>
              <p className="text-sm text-muted-foreground">ספר לנו על העסק שלך</p>
            </div>

            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>שם העסק *</FormLabel>
                  <FormControl>
                    <Input placeholder="שיפוצי ישראל בע״מ" {...field} className="text-right" dir="rtl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="businessNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>מספר עסק (אופציונלי)</FormLabel>
                  <FormControl>
                    <Input placeholder="123456789" {...field} className="text-left" dir="ltr" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="profession"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>מקצוע *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-right" dir="rtl">
                        <SelectValue placeholder="בחר מקצוע" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {professionalCategories.map((category) => (
                        <SelectItem key={category} value={category} className="text-right">
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="experienceYears"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>שנות ניסיון *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="5"
                      {...field}
                      className="text-center"
                      min="0"
                      max="50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-4" dir="rtl">
            <div className="text-center mb-6">
              <MapPin className="h-12 w-12 mx-auto text-blue-600 mb-2" />
              <h3 className="text-lg font-semibold">אזור שירות ותיאור</h3>
              <p className="text-sm text-muted-foreground">איפה אתה פעיל ומה אתה מציע</p>
            </div>

            <FormField
              control={form.control}
              name="serviceArea"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>אזור שירות עיקרי *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-right" dir="rtl">
                        <SelectValue placeholder="בחר עיר עיקרית" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {israeliCities.map((city) => (
                        <SelectItem key={city} value={city} className="text-right">
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>תיאור שירותים *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="ספר על השירותים שאתה מציע, הניסיון שלך והמומחיות שלך..."
                      {...field}
                      className="text-right min-h-[100px]"
                      dir="rtl"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    {field.value?.length || 0}/500 תווים
                  </p>
                </FormItem>
              )}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8" dir="ltr">
      {Array.from({ length: totalSteps }, (_, index) => (
        <React.Fragment key={index}>
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              index + 1 <= currentStep
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-300 text-gray-300'
            }`}
          >
            {index + 1}
          </div>
          {index < totalSteps - 1 && (
            <div
              className={`h-0.5 w-16 ${
                index + 1 < currentStep ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {renderStepIndicator()}

        {renderStepContent()}

        <div className="flex justify-between pt-6 border-t" dir="ltr">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={isLoading}
            >
              הקודם
            </Button>
          )}

          <div className="flex-1" />

          {currentStep < totalSteps ? (
            <Button
              type="button"
              onClick={handleNextStep}
              disabled={isLoading}
            >
              הבא
            </Button>
          ) : (
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  נרשם...
                </>
              ) : (
                'השלם הרשמה'
              )}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
};

export default ProfessionalRegistrationForm;