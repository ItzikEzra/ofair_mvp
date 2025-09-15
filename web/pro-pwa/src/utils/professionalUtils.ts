
import { supabase } from "@/integrations/supabase/client";

export interface Professional {
  id: string;
  name: string;
  phone_number: string;
  profession: string;
  location: string;
}

export class ProfessionalManager {
  /**
   * מוצא או יוצר מקצועי לפי מספר טלפון
   * אם המקצועי קיים - מחזיר אותו
   * אם לא קיים - יוצר חדש
   */
  static async findOrCreateProfessional(professionalData: {
    name: string;
    phone_number: string;
    profession: string;
    location?: string;
  }): Promise<{ professional: Professional; isNew: boolean }> {
    console.log("Finding or creating professional:", professionalData);

    try {
      // בדיקה אם המקצועי כבר קיים
      const { data: existing, error: findError } = await supabase
        .from('professionals')
        .select('id, name, phone_number, profession, location')
        .eq('phone_number', professionalData.phone_number)
        .maybeSingle();

      if (findError) {
        console.error("Error finding existing professional:", findError);
        throw new Error("שגיאה בחיפוש מקצועי קיים");
      }

      if (existing) {
        console.log("Found existing professional:", existing.id);
        return { 
          professional: existing, 
          isNew: false 
        };
      }

      // יצירת מקצועי חדש
      const { data: newProfessional, error: createError } = await supabase
        .from('professionals')
        .insert({
          name: professionalData.name,
          phone_number: professionalData.phone_number,
          profession: professionalData.profession,
          location: professionalData.location || 'לא צוין'
        })
        .select('id, name, phone_number, profession, location')
        .single();

      if (createError) {
        console.error("Error creating new professional:", createError);
        
        // בדיקה אם זו שגיאת unique constraint (כפילות)
        if (createError.code === '23505') {
          // נסה שוב למצוא - אולי נוצר בינתיים
          const { data: retryExisting, error: retryError } = await supabase
            .from('professionals')
            .select('id, name, phone_number, profession, location')
            .eq('phone_number', professionalData.phone_number)
            .single();

          if (retryError) {
            throw new Error("שגיאה ביצירת מקצועי - כפילות לא מזוהה");
          }

          console.log("Found professional after retry:", retryExisting.id);
          return { 
            professional: retryExisting, 
            isNew: false 
          };
        }

        throw new Error("שגיאה ביצירת מקצועי חדש");
      }

      console.log("Created new professional:", newProfessional.id);
      return { 
        professional: newProfessional, 
        isNew: true 
      };

    } catch (error) {
      console.error("Error in findOrCreateProfessional:", error);
      throw error;
    }
  }

  /**
   * מאחד מקצועיים כפולים - מעביר את כל ההפניות למקצועי היעד ומוחק את המקור
   */
  static async mergeProfessionals(sourceId: string, targetId: string): Promise<void> {
    console.log(`Merging professional ${sourceId} into ${targetId}`);

    try {
      // עדכון כל ההפניות
      const updatePromises = [
        supabase.from('referrals').update({ professional_id: targetId }).eq('professional_id', sourceId),
        supabase.from('proposals').update({ professional_id: targetId }).eq('professional_id', sourceId),
        supabase.from('leads').update({ professional_id: targetId }).eq('professional_id', sourceId),
        supabase.from('notifications').update({ professional_id: targetId }).eq('professional_id', sourceId),
        supabase.from('quotes').update({ professional_id: targetId }).eq('professional_id', sourceId),
        supabase.from('professional_notification_areas').update({ professional_id: targetId }).eq('professional_id', sourceId),
        supabase.from('lead_payments').update({ professional_id: targetId }).eq('professional_id', sourceId),
        supabase.from('quote_payments').update({ professional_id: targetId }).eq('professional_id', sourceId),
        supabase.from('projects').update({ professional_id: targetId }).eq('professional_id', sourceId),
        supabase.from('work_completions').update({ professional_id: targetId }).eq('professional_id', sourceId)
      ];

      const results = await Promise.all(updatePromises);
      
      // בדיקת שגיאות
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error("Errors during merge:", errors);
        throw new Error("שגיאה בעדכון הפניות");
      }

      // מחיקת המקצועי המקור
      const { error: deleteError } = await supabase
        .from('professionals')
        .delete()
        .eq('id', sourceId);

      if (deleteError) {
        console.error("Error deleting source professional:", deleteError);
        throw new Error("שגיאה במחיקת המקצועי הכפול");
      }

      console.log("Successfully merged professionals");
    } catch (error) {
      console.error("Error in mergeProfessionals:", error);
      throw error;
    }
  }
}
