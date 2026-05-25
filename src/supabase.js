import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(
  "https://vjwnueotcrsdinzkqodt.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqd251ZW90Y3JzZGluemtxb2R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1OTg4MDYsImV4cCI6MjA5NTE3NDgwNn0.OozXBq8wanoSD8k2NEMFo6wrXISseh_NnJFsL8rjoCM"
);
