
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
    const { bucketName, isPublic = true } = await req.json();
    
    if (!bucketName) {
      return new Response(
        JSON.stringify({ error: "Bucket name is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    console.log(`Ensuring bucket exists: ${bucketName}, public: ${isPublic}`);

    // Initialize Supabase client with admin privileges
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if bucket exists
    try {
      const { data: buckets, error: listError } = await supabaseAdmin
        .storage
        .listBuckets();

      if (listError) {
        console.error("Error listing buckets:", listError);
        return new Response(
          JSON.stringify({ error: "Failed to list buckets", details: listError }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }

      const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
      let result;
      
      if (!bucketExists) {
        console.log(`Creating bucket ${bucketName}`);
        try {
          const { data: newBucket, error: createError } = await supabaseAdmin
            .storage
            .createBucket(bucketName, {
              public: isPublic,
              fileSizeLimit: 5 * 1024 * 1024, // 5MB limit
            });
          
          if (createError) {
            console.error("Error creating bucket:", createError);
            // If bucket already exists error, don't treat as failure
            if (createError.message.includes("already exists")) {
              result = { created: false, bucket: bucketName, note: "Bucket already exists" };
            } else {
              return new Response(
                JSON.stringify({ error: "Failed to create bucket", details: createError }),
                { 
                  status: 500, 
                  headers: { ...corsHeaders, "Content-Type": "application/json" } 
                }
              );
            }
          } else {
            result = { created: true, bucket: bucketName };
          }
        } catch (err) {
          console.error("Exception creating bucket:", err);
          // Return success anyway to let the upload attempt proceed
          result = { created: false, bucket: bucketName, note: "Error creating bucket but proceeding with upload attempt" };
        }
      } else {
        // Update bucket if needed
        try {
          const { data: updateBucket, error: updateError } = await supabaseAdmin
            .storage
            .updateBucket(bucketName, {
              public: isPublic,
            });
          
          if (updateError) {
            console.warn("Warning: Could not update bucket:", updateError);
          }
          
          result = { created: false, bucket: bucketName };
        } catch (err) {
          console.warn("Exception updating bucket:", err);
          result = { created: false, bucket: bucketName, note: "Error updating bucket but proceeding with upload attempt" };
        }
      }

      return new Response(
        JSON.stringify(result),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } catch (bucketError) {
      console.error("Error checking bucket:", bucketError);
      // Return partial success to allow upload attempt
      return new Response(
        JSON.stringify({ 
          error: "Error checking bucket", 
          details: bucketError,
          status: "proceeding" 
        }),
        { 
          status: 200, // Return 200 to not block the upload attempt
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
