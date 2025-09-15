
import { supabase } from "@/integrations/supabase/client";

/**
 * העלאת קובץ חשבונית ל-Supabase storage "invoices"
 * @returns public url or null
 */
export async function uploadInvoiceFile(file: File): Promise<string | null> {
  if (!file) return null;
  const ext = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 8)}.${ext}`;
  const { data, error } = await supabase.storage
    .from("invoices")
    .upload(fileName, file, { upsert: true, cacheControl: '3600' });
  if (error) {
    console.error("שגיאה בהעלאת חשבונית:", error);
    return null;
  }
  // קבל קישור public
  const url = supabase.storage.from("invoices").getPublicUrl(fileName).data.publicUrl;
  return url || null;
}
