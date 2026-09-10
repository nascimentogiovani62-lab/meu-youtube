// Cole aqui os dados do seu projeto Supabase.
// Encontra em: Project Settings > API (no painel do Supabase)

const SUPABASE_URL = "https://xjbhvwbmvbwvxfsenwja.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYmh2d2JtdmJ3dnhmc2Vud2phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5OTA2MzQsImV4cCI6MjEwNDU2NjYzNH0.1pF9D_9J61keRSQ0LM6TxmQL7dPnPIvY6nH4z-IY3EY";

// Cria o cliente global usado pelo script.js e admin.js
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

