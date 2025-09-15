
export const insertLead = async (supabase: any, requestData: any, processedLocation: string) => {
  console.log("💾 Inserting lead with processed location:", processedLocation);
  
  const leadData = {
    professional_id: requestData.professional_id,
    title: requestData.title,
    description: requestData.description,
    location: processedLocation, // Use the processed location (city name)
    profession: requestData.profession,
    budget: requestData.budget,
    notes: requestData.notes,
    share_percentage: requestData.share_percentage,
    client_name: requestData.client_name,
    client_phone: requestData.client_phone,
    client_address: requestData.client_address,
    work_date: requestData.work_date,
    work_time: requestData.work_time,
    constraints: requestData.constraints,
    status: requestData.status || 'active',
    latitude: requestData.latitude,
    longitude: requestData.longitude,
    image_urls: requestData.media_urls
  };

  console.log("📊 Final lead data being inserted:", leadData);

  const { data, error } = await supabase
    .from('leads')
    .insert([leadData])
    .select();

  if (error) {
    console.error("Database insertion error:", error);
    throw new Error(`Failed to insert lead: ${error.message}`);
  }

  console.log("✅ Lead inserted successfully:", data[0]);
  return data[0];
};
