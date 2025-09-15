-- תיקון הצעות וקוטיישנים מאושרים ללא תאריך ושעה
-- הוספת תאריך ושעה דמה (מחר ב-10:00) להצעות קיימות

-- עדכון הצעות ללא תאריך ושעה
UPDATE public.proposals 
SET scheduled_date = CURRENT_DATE + INTERVAL '1 day',
    scheduled_time = '10:00'
WHERE status = 'accepted' 
  AND (scheduled_date IS NULL OR scheduled_time IS NULL);

-- עדכון קוטיישנים ללא תאריך ושעה
UPDATE public.quotes 
SET scheduled_date = CURRENT_DATE + INTERVAL '1 day',
    scheduled_time = '10:00'
WHERE status = 'accepted' 
  AND (scheduled_date IS NULL OR scheduled_time IS NULL);

-- יצירת תזכורות סיום עבודה עבור הצעות מאושרות שלא קיימות בטבלה
INSERT INTO public.work_completion_reminders (proposal_id, proposal_type, scheduled_work_time)
SELECT p.id, 'proposal', (p.scheduled_date::TEXT || ' ' || p.scheduled_time)::TIMESTAMP WITH TIME ZONE
FROM proposals p
LEFT JOIN work_completion_reminders wcr ON wcr.proposal_id = p.id AND wcr.proposal_type = 'proposal'
WHERE p.status = 'accepted' 
  AND p.scheduled_date IS NOT NULL 
  AND p.scheduled_time IS NOT NULL
  AND wcr.id IS NULL;

-- יצירת תזכורות סיום עבודה עבור קוטיישנים מאושרים שלא קיימים בטבלה
INSERT INTO public.work_completion_reminders (proposal_id, proposal_type, scheduled_work_time)
SELECT q.id, 'quote', (q.scheduled_date::TEXT || ' ' || q.scheduled_time)::TIMESTAMP WITH TIME ZONE
FROM quotes q
LEFT JOIN work_completion_reminders wcr ON wcr.proposal_id = q.id AND wcr.proposal_type = 'quote'
WHERE q.status = 'accepted' 
  AND q.scheduled_date IS NOT NULL 
  AND q.scheduled_time IS NOT NULL
  AND wcr.id IS NULL;