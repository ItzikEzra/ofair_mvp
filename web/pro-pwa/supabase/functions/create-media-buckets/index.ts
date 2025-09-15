
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the project URL and service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Server configuration error: Missing Supabase URL or key");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if buckets exist and create them if they don't
    const { data: existingBuckets } = await supabase
      .storage
      .listBuckets();
    
    const bucketsToCreate = [
      { id: 'lead-images', name: 'lead-images' },
      { id: 'proposal-samples', name: 'proposal-samples' },
      { id: 'request-media', name: 'request-media' }
    ];

    const results = [];
    
    for (const bucket of bucketsToCreate) {
      const bucketExists = existingBuckets?.some(b => b.name === bucket.name);
      
      if (!bucketExists) {
        const { data, error } = await supabase
          .storage
          .createBucket(bucket.id, {
            public: true,
            fileSizeLimit: 10485760, // 10MB
            allowedMimeTypes: [
              'image/png', 'image/jpeg', 'image/gif', 'image/webp',
              'video/mp4', 'video/mov', 'video/webm', 'video/ogg'
            ]
          });
        
        if (error) {
          console.error(`Error creating bucket ${bucket.name}:`, error);
          results.push({ bucket: bucket.name, status: 'error', error: error.message });
        } else {
          console.log(`Created bucket ${bucket.name}:`, data);
          results.push({ bucket: bucket.name, status: 'created' });
        }
      } else {
        console.log(`Bucket ${bucket.name} already exists`);
        results.push({ bucket: bucket.name, status: 'exists' });
      }
    }

    return new Response(
      JSON.stringify({ success: true, buckets: results }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error configuring storage buckets:", error);

    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
