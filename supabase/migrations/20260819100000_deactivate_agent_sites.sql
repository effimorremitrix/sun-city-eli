-- השבתת הדפים האישיים של עינבל, קובי ודניאל — לבקשת המשרד. הסוכנים נשארים
-- במדור הצוות (הרוסטר הסטטי בקוד), אבל /inbal /kobi /daniel מפסיקים להיפתר
-- (get_public_site ו-get_public_agents מסננים לפי is_active).
-- הפעלה מחדש אפשרית מלוח הניהול: לשונית "סוכנים" → "דפים אישיים".
UPDATE public.sites SET is_active = false WHERE slug IN ('inbal', 'kobi', 'daniel');
