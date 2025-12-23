// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// Вставьте сюда ваши ключи из настроек Supabase (Project Settings -> API)
const supabaseUrl = 'https://rbtxeyoyurfooedejraq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJidHhleW95dXJmb29lZGVqcmFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzOTkxODksImV4cCI6MjA4MTk3NTE4OX0.Lq4iG7dq9ENxqHJnVRYhaWpQFtswSVvg_Q4y0I-JbXY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)