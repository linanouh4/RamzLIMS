import { createClient } from "@supabase/supabase-js";



const supabaseUrl = "https://ilmfbdxqvjcwkfucoulf.supabase.co";



const supabaseKey = "sb_publishable_bf-0esv-z2_itRDuCtGZJw_YIzq22io";



export const supabase = createClient(

  supabaseUrl,

  supabaseKey

);