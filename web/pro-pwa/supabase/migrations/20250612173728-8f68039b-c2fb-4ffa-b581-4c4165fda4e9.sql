
-- תיקון הכפילויות עם טיפול נכון בכל הטבלאות הקשורות
-- ראשית, בדיקה של הכפילויות הקיימות
SELECT phone_number, COUNT(*) as count, array_agg(id::text) as ids, array_agg(name) as names
FROM professionals 
WHERE phone_number IS NOT NULL
GROUP BY phone_number 
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- טיפול בכפילויות - עדכון כל ההפניות תחילה
DO $$
DECLARE
    duplicate_phone TEXT;
    keep_id UUID;
    delete_id UUID;
    duplicate_ids UUID[];
BEGIN
    -- לולאה על כל הטלפונים הכפולים
    FOR duplicate_phone IN 
        SELECT phone_number 
        FROM professionals 
        WHERE phone_number IS NOT NULL
        GROUP BY phone_number 
        HAVING COUNT(*) > 1
    LOOP
        -- קבלת כל המזהים עבור הטלפון הזה, ממוינים לפי תאריך יצירה
        SELECT ARRAY(
            SELECT id 
            FROM professionals 
            WHERE phone_number = duplicate_phone 
            ORDER BY created_at
        ) INTO duplicate_ids;
        
        -- שמירת הראשון
        keep_id := duplicate_ids[1];
        
        -- עדכון הפניות של כל השאר בכל הטבלאות הקשורות
        FOR i IN 2..array_length(duplicate_ids, 1) LOOP
            delete_id := duplicate_ids[i];
            
            -- עדכון referrals
            UPDATE referrals 
            SET professional_id = keep_id 
            WHERE professional_id = delete_id;
            
            -- עדכון proposals
            UPDATE proposals 
            SET professional_id = keep_id 
            WHERE professional_id = delete_id;
            
            -- עדכון leads
            UPDATE leads 
            SET professional_id = keep_id 
            WHERE professional_id = delete_id;
            
            -- עדכון notifications
            UPDATE notifications 
            SET professional_id = keep_id 
            WHERE professional_id = delete_id;
            
            -- עדכון quotes (זה מה שהיה חסר!)
            UPDATE quotes 
            SET professional_id = keep_id 
            WHERE professional_id = delete_id;
            
            -- עדכון professional_notification_areas
            UPDATE professional_notification_areas 
            SET professional_id = keep_id 
            WHERE professional_id = delete_id;
            
            -- עדכון lead_payments
            UPDATE lead_payments 
            SET professional_id = keep_id 
            WHERE professional_id = delete_id;
            
            -- עדכון quote_payments  
            UPDATE quote_payments 
            SET professional_id = keep_id 
            WHERE professional_id = delete_id;
            
            -- עדכון projects
            UPDATE projects 
            SET professional_id = keep_id 
            WHERE professional_id = delete_id;
            
            -- עדכון work_completions
            UPDATE work_completions 
            SET professional_id = keep_id 
            WHERE professional_id = delete_id;
        END LOOP;
    END LOOP;
END $$;

-- כעת מחיקת הרישומים הכפולים (לא כולל הראשון שנשמר)
DELETE FROM professionals p1
WHERE EXISTS (
    SELECT 1 FROM professionals p2 
    WHERE p2.phone_number = p1.phone_number 
    AND p2.created_at < p1.created_at
);

-- בדיקה שאין יותר כפילויות
SELECT phone_number, COUNT(*) as count
FROM professionals 
WHERE phone_number IS NOT NULL
GROUP BY phone_number 
HAVING COUNT(*) > 1;

-- הוספת constraint ייחודי (כעת זה אמור לעבוד)
ALTER TABLE professionals 
ADD CONSTRAINT professionals_phone_unique UNIQUE (phone_number);

-- יצירת אינדקס לחיפוש מהיר
CREATE INDEX IF NOT EXISTS idx_professionals_name_phone 
ON professionals (name, phone_number) 
WHERE name IS NOT NULL AND phone_number IS NOT NULL;
