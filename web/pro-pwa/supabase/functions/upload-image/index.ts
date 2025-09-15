
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
    // Get authorization header from the request
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader && authHeader !== 'Bearer null') {
      console.log("Authorization header received:", authHeader ? "Present" : "Missing");
    }

    // Extract the form data (file and metadata)
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const bucketName = formData.get("bucket") as string;
    
    if (!file || !bucketName) {
      return new Response(
        JSON.stringify({ error: "File and bucket name are required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`Processing file upload: ${file.name} to bucket: ${bucketName}`);

    // Generate a unique filename
    const timestamp = new Date().getTime();
    const fileExt = file.name.split(".").pop();
    const fileName = `${timestamp}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;

    // Initialize Supabase client with admin privileges
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // First ensure the bucket exists
    const { data: buckets, error: bucketListError } = await supabaseClient
      .storage
      .listBuckets();
      
    if (bucketListError) {
      console.error("Error listing buckets:", bucketListError);
      return new Response(
        JSON.stringify({ error: "Failed to check buckets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Bucket ${bucketName} doesn't exist, creating it`);
      const { error: createBucketError } = await supabaseClient.storage
        .createBucket(bucketName, { public: true });
        
      if (createBucketError) {
        console.error("Error creating bucket:", createBucketError);
        return new Response(
          JSON.stringify({ error: "Failed to create bucket" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Read file data
    const arrayBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);

    // Upload the file
    const { data, error: uploadError } = await supabaseClient
      .storage
      .from(bucketName)
      .upload(fileName, fileData, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true
      });

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the public URL
    const { data: { publicUrl } } = supabaseClient
      .storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({ 
        success: true, 
        publicUrl,
        path: fileName,
        bucket: bucketName
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
