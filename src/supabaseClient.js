import { createClient } from '@supabase/supabase-js'

// Substitua pelos dados que aparecem no seu painel do Supabase
// Settings > API
const supabaseUrl = 'https://auuancsrpqaununsuigy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dWFuY3NycHFhdW51bnN1aWd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MTY3MzAsImV4cCI6MjA4NjQ5MjczMH0.bpsCAc8pahAI4OnFCeGb5ni6krV66tnGi8oUZpDpsUg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)