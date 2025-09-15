import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { saveProfessionalData } from '@/utils/storageUtils';
import { useAuth } from '@/contexts/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { refreshProfessionalData } = useAuth();
  const callbackProcessedRef = useRef(false);
  
  useEffect(() => {
    // Prevent multiple callbacks processing
    if (callbackProcessedRef.current) return;
    callbackProcessedRef.current = true;
    
    const handleAuthCallback = async () => {
      console.log("Auth callback page loaded");
      console.log("URL params:", Object.fromEntries([...searchParams]));
      
      // Check if there's an error in the URL parameters
      const errorDescription = searchParams.get('error_description');
      if (errorDescription) {
        console.error("Error in URL params:", errorDescription);
        toast({
          title: "שגיאת התחברות",
          description: errorDescription || "אירעה שגיאה בעת ההתחברות"
        });
        navigate('/auth', { replace: true });
        return;
      }
      
      try {
        // Get the session from URL
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          toast({
            title: "שגיאת התחברות",
            description: error.message || "אירעה שגיאה בעת ההתחברות"
          });
          navigate('/auth', { replace: true });
          return;
        }

        if (data?.session?.user) {
          console.log("Auth successful, user found:", data.session.user.email);
          
          // Special case for test user
          if (data.session.user.email === 'test@example.com') {
            console.log("Test user detected, creating test professional data");
            localStorage.setItem("rememberAuth", "true");
            
            const testData = {
              id: data.session.user.id, // Use the actual user ID instead of a fixed test ID
              user_id: data.session.user.id,
              name: 'בעל מקצוע לבדיקה',
              phone_number: '0545308505',
              email: 'test@example.com',
              profession: 'בודק מערכת',
              location: 'לא צוין' // Required field
            };
            
            // Check if the professional record exists first
            const { data: existingProf, error: checkError } = await supabase
              .from('professionals')
              .select('id')
              .eq('user_id', data.session.user.id as any)
              .single();

            if (checkError && checkError.code !== 'PGRST116') {
              console.error("Error checking for existing professional:", checkError);
            }

            if (!existingProf) {
              // Create the professional record
              const { data: newProf, error: createError } = await supabase
                .from('professionals')
                .upsert([testData] as any)
                .select('id')
                .single();
                
              if (createError) {
                console.error("Error creating test professional:", createError);
              } else {
                console.log("Created test professional:", newProf);
                localStorage.setItem("professionalId", String(newProf.id));
              }
            } else {
              console.log("Test professional already exists:", existingProf);
              localStorage.setItem("professionalId", String(existingProf.id));
            }
            
            localStorage.setItem("professionalData", JSON.stringify(testData));
            
            toast({
              title: "התחברות בוצעה בהצלחה",
              description: "ברוכים הבאים למצב בדיקה"
            });
            
            navigate('/dashboard', { replace: true });
            return;
          }
          
          try {
            // Check if user exists in professionals table
            const { data: professionalData, error: professionalError } = await supabase
              .from('professionals')
              .select('*')
              .eq('user_id', data.session.user.id)
              .single();

            // If database error occurs, still allow login but warn the user
            if (professionalError && professionalError.code === '500') {
              console.error("Database error:", professionalError);
              localStorage.setItem("rememberAuth", "true");
              
              toast({
                title: "התחברות בוצעה בהצלחה",
                description: "ישנה בעיה זמנית בשרת, חלק מהפונקציות עלולות לא לעבוד"
              });
              
              navigate('/dashboard', { replace: true });
              return;
            }

            if (professionalError && professionalError.code !== 'PGRST116') {
              console.error("Professional query error:", professionalError);
              toast({
                title: "שגיאת התחברות",
                description: "אירעה שגיאה בעת אימות פרטי בעל המקצוע"
              });
              navigate('/auth', { replace: true });
              return;
            }

            if (!professionalData) {
              console.log("Professional not found, creating new record");
              
              try {
                // If no professional record exists, create one for OAuth users
                const newProfessional = {
                  id: data.session.user.id, // Use user ID as professional ID to ensure they match
                  user_id: data.session.user.id,
                  name: data.session.user.user_metadata?.full_name || data.session.user.email?.split('@')[0] || 'משתמש חדש',
                  email: data.session.user.email,
                  profession: 'לא צוין', // Default profession
                  location: 'לא צוין' // Default location (required field)
                };
                
                const { error: insertError, data: newProfessionalData } = await supabase
                  .from('professionals')
                  .upsert([newProfessional])
                  .select('*')
                  .single();

                if (insertError) {
                  // If database insert fails, still allow login but warn the user
                  if (insertError.code === '500') {
                    console.error("Database error during record creation:", insertError);
                    localStorage.setItem("rememberAuth", "true");
                    
                    toast({
                      title: "התחברות בוצעה בהצלחה",
                      description: "ישנה בעיה זמנית בשרת, פרטי הפרופיל אינם זמינים כרגע"
                    });
                    
                    navigate('/dashboard', { replace: true });
                    return;
                  }
                  
                  console.error("Error creating professional record:", insertError);
                  
                  // If there's an error creating the professional record, sign out
                  await supabase.auth.signOut();
                  toast({
                    title: "שגיאת התחברות",
                    description: "לא ניתן ליצור פרופיל בעל מקצוע"
                  });
                  navigate('/auth', { replace: true });
                  return;
                }
                
                if (newProfessionalData) {
                  console.log("Created new professional record:", newProfessionalData);
                  localStorage.setItem("professionalId", String(newProfessionalData.id));
                  localStorage.setItem("professionalData", JSON.stringify(newProfessionalData));
                }
              } catch (err) {
                console.error("Exception during record creation:", err);
                localStorage.setItem("rememberAuth", "true");
                
                toast({
                  title: "התחברות בוצעה בהצלחה",
                  description: "ישנה בעיה זמנית בשרת, פרטי הפרופיל אינם זמינים כרגע"
                });
                
                navigate('/dashboard', { replace: true });
                return;
              }
            } else {
              console.log("Professional record found:", professionalData.name);
              localStorage.setItem("professionalId", String(professionalData.id));
              localStorage.setItem("professionalData", JSON.stringify(professionalData));
            }

            localStorage.setItem("rememberAuth", "true");
            
            toast({
              title: "התחברות בוצעה בהצלחה",
              description: "ברוכים הבאים"
            });
            
            navigate('/dashboard', { replace: true });
          } catch (err) {
            console.error("Unexpected error during professional check:", err);
            
            // If any exception occurs, still allow login
            localStorage.setItem("rememberAuth", "true");
            
            toast({
              title: "התחברות בוצעה בהצלחה",
              description: "ישנה בעיה זמנית בגישה לנתונים"
            });
            
            navigate('/dashboard', { replace: true });
          }
        } else {
          console.log("No session found in callback");
          navigate('/auth', { replace: true });
        }
      } catch (err) {
        console.error("Unexpected error during auth callback:", err);
        toast({
          title: "שגיאת התחברות",
          description: "אירעה שגיאה בלתי צפויה"
        });
        navigate('/auth', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate, toast, searchParams, refreshProfessionalData]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin h-8 w-8 border-4 border-t-ofair-blue border-r-transparent border-b-transparent border-l-transparent rounded-full mb-4"></div>
        <h2 className="text-xl font-bold text-gray-700">מאמת...</h2>
        <p className="text-gray-500">אנא המתן</p>
      </div>
    </div>
  );
};

export default AuthCallback;
