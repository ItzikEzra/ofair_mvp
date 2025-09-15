
import React, { useCallback } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubmitLeadForm } from "@/hooks/useSubmitLeadForm";
import { useLeadSubmission } from "@/hooks/useLeadSubmission";
import { BasicLeadInfoForm } from "@/components/leads/BasicLeadInfoForm";
import { PricingCommissionForm } from "@/components/leads/PricingCommissionForm";
import { CityDisplaySection } from "@/components/leads/CityDisplaySection";
import { MediaUploadSection } from "@/components/leads/MediaUploadSection";
import { LeadTipsSection } from "@/components/leads/LeadTipsSection";
import ClientDetailsForm from "@/components/leads/ClientDetailsForm";
import WorkScheduleForm from "@/components/leads/WorkScheduleForm";

const SubmitLead = () => {
  const { toast } = useToast();
  const { formData, updateFormData, resubmitLeadId } = useSubmitLeadForm();
  const { submitLead, isSubmitting } = useLeadSubmission();

  // Helper function to extract city from address
  const extractCityFromAddress = (address: string): string => {
    console.log("Extracting city from address:", address);
    
    // Remove common prefixes and clean the address
    const cleanAddress = address.replace(/^(\d+\s+)/, '').trim();
    
    // Split by comma and try different extraction methods
    const parts = cleanAddress.split(',').map(part => part.trim());
    
    // Method 1: Look for known Israeli city patterns
    const israeliCityPattern = /(תל אביב|ירושלים|חיפה|באר שבע|פתח תקווה|נתניה|אשדוד|ראשון לציון|הרצליה|רמת גן|בני ברק|חולון|בת ים|רמלה|לוד|מודיעין|כפר סבא|רעננה|גבעתיים|קרית אונו)/i;
    
    for (const part of parts) {
      const cityMatch = part.match(israeliCityPattern);
      if (cityMatch) {
        console.log("Found Israeli city:", cityMatch[1]);
        return cityMatch[1];
      }
    }
    
    // Method 2: Take a meaningful part (usually the city)
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      // Skip if it's "Israel" or postal code
      if (!lastPart.match(/israel|ישראל|\d{5,7}/i) && lastPart.length > 2) {
        console.log("Using last part as city:", lastPart);
        return lastPart;
      }
      
      // Try second to last
      if (parts.length >= 3) {
        const secondToLast = parts[parts.length - 2];
        if (!secondToLast.match(/israel|ישראל|\d{5,7}/i) && secondToLast.length > 2) {
          console.log("Using second to last part as city:", secondToLast);
          return secondToLast;
        }
      }
    }
    
    // Method 3: Take the first part that looks like a city (not a street number/name)
    for (const part of parts) {
      if (!part.match(/^\d+/) && part.length > 2 && !part.match(/רחוב|street|st\./i)) {
        console.log("Using first non-street part as city:", part);
        return part;
      }
    }
    
    // Fallback: return a default
    console.log("Could not extract city, using default");
    return "לא צוין";
  };

  const handleClientAddressSelect = useCallback((place: {
    address: string;
    lat?: number;
    lng?: number;
    placeData?: any;
    city?: string;
  }) => {
    const handlerId = `HANDLE_SELECT_${Date.now()}`;
    console.log(`🎯 [${handlerId}] Client address selected from Google Places:`, place);
    console.log(`🎯 [${handlerId}] Current formData state:`, {
      currentAddress: formData.clientAddress,
      currentCity: formData.extractedCity,
      hasLocationData: formData.hasLocationData,
      lat: formData.latitude,
      lng: formData.longitude
    });
    
    
    // Set coordinates if available
    if (place.lat && place.lng) {
      updateFormData({
        latitude: place.lat,
        longitude: place.lng,
        hasLocationData: true
      });
    }
    
    // Extract city for display in the ad
    let extractedCity = "";
    if (place.city && place.city.trim() && place.city !== "לא צוין" && place.city.length >= 2) {
      // Use the city from Google Places if valid
      const cleanCity = place.city.trim();
      if (!cleanCity.match(/^\d+\s+|בן גוריון|הרצל|רוטשילד|דיזנגוף|אלנבי|יהודה הלוי|רחוב|דרך|שדרות/i)) {
        extractedCity = cleanCity;
        console.log("✅ Using city from Google Places:", extractedCity);
      }
    }
    
    // Fallback: extract from full address
    if (!extractedCity) {
      extractedCity = extractCityFromAddress(place.address);
      console.log("✅ Extracted city from address:", extractedCity);
    }
    
    // Update everything at once, including the address - this prevents conflicts
    // This mimics the current location approach where everything is updated in one go
    console.log(`🎯 [${handlerId}] About to update form data with:`, {
      clientAddress: place.address,
      extractedCity,
      hasLocationData: place.lat && place.lng ? true : false,
      latitude: place.lat || null,
      longitude: place.lng || null
    });
    
    updateFormData({ 
      clientAddress: place.address,
      extractedCity,
      hasLocationData: place.lat && place.lng ? true : false,
      latitude: place.lat || null,
      longitude: place.lng || null
    });
    
    console.log(`🎯 [${handlerId}] ✅ Updated form data with Google Places selection:`, {
      address: place.address,
      city: extractedCity,
      hasCoords: !!(place.lat && place.lng)
    });
    
    if (extractedCity && extractedCity !== "לא צוין") {
      toast({
        title: "עיר זוהתה בהצלחה!",
        description: `העיר "${extractedCity}" נקבעה לתצוגה במודעה`,
        duration: 4000
      });
    }
    
    if (place.lat && place.lng) {
      toast({
        title: "מיקום מדויק נקבע",
        description: "כתובת הלקוח שויכה למיקום מדויק"
      });
    }
  }, [updateFormData, toast, extractCityFromAddress]);

  const handleLocationButtonClick = useCallback((address: string, lat: number, lng: number) => {
    console.log("Location button clicked, received full address:", { address, lat, lng });
    
    // Store the full address
    updateFormData({
      clientAddress: address,
      latitude: lat,
      longitude: lng,
      hasLocationData: true
    });

    // Extract city from the full address for display
    const extractedCity = extractCityFromAddress(address);
    updateFormData({ extractedCity });
    
    console.log("City extracted from location address:", extractedCity);
    
    toast({
      title: "מיקום מדויק נקבע",
      description: "כתובת מולאה לפי המיקום הנוכחי"
    });
  }, [updateFormData, extractCityFromAddress, toast]);

  const handleClientAddressChange = useCallback((newAddress: string) => {
    const changeId = `HANDLE_CHANGE_${Date.now()}`;
    console.log(`🔄 [${changeId}] Client address changed:`, newAddress);
    console.log(`🔄 [${changeId}] Current formData.clientAddress:`, formData.clientAddress);
    
    // Always update the form data with the new address value
    updateFormData({ clientAddress: newAddress });
    
    // Only reset location/city data if this looks like manual typing
    // Google Places addresses typically contain commas and multiple parts
    if (formData.hasLocationData || formData.extractedCity) {
      const looksLikeGooglePlaces = newAddress.includes(',') && newAddress.split(',').length >= 2;
      
      if (!looksLikeGooglePlaces) {
        console.log(`🔄 [${changeId}] Manual typing detected, resetting location/city data`);
        updateFormData({
          hasLocationData: false,
          latitude: null,
          longitude: null,
          extractedCity: ""
        });
      } else {
        console.log(`🔄 [${changeId}] Google Places format detected, keeping location/city data`);
      }
    }
  }, [updateFormData, formData.hasLocationData, formData.extractedCity]);

  const handleImageUploaded = (fileUrl: string) => {
    updateFormData(prev => ({
      mediaUrls: [...prev.mediaUrls, fileUrl]
    }));
  };

  const handleRemoveImage = (fileUrl: string) => {
    updateFormData({
      mediaUrls: formData.mediaUrls.filter(url => url !== fileUrl)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitLead(formData, resubmitLeadId);
  };

  const pageTitle = resubmitLeadId ? "הגש ליד מחדש" : "הגש ליד";
  const cardTitle = resubmitLeadId ? "הגשת ליד מחדש" : "פרסום ליד חדש";
  const submitButtonText = resubmitLeadId ? "הגש ליד מחדש" : "פרסם ליד";

  return (
    <MainLayout title={pageTitle}>
      {/* Floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-32 right-1/4 w-72 h-72 bg-gradient-to-br from-blue-400/15 to-cyan-400/15 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 left-1/3 w-56 h-56 bg-gradient-to-br from-green-400/15 to-emerald-400/15 rounded-full blur-3xl"></div>
        <div className="absolute top-2/3 right-16 w-40 h-40 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-3xl"></div>
      </div>

      <div dir="rtl" className="max-w-2xl mx-auto p-4 px-0">
        <Card className="border-0 shadow-2xl shadow-blue-500/10 bg-white/90 backdrop-blur-sm rounded-3xl">
          <CardHeader className="pt-8 px-8">
            <CardTitle className="text-2xl font-bold text-gray-800">{cardTitle}</CardTitle>
            <p className="text-sm text-gray-600 leading-relaxed">
              {resubmitLeadId 
                ? "עדכן את פרטי הליד ותאריך העבודה לפי הצורך והגש מחדש."
                : "פרסם ליד ותן לבעלי מקצוע להגיש הצעות מחיר. תוכל להרוויח עמלה מכל עבודה שמתבצעת."
              }
            </p>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <BasicLeadInfoForm
                title={formData.title}
                setTitle={(value) => updateFormData({ title: value })}
                description={formData.description}
                setDescription={(value) => updateFormData({ description: value })}
                profession={formData.profession}
                setProfession={(value) => updateFormData({ profession: value })}
              />

              <PricingCommissionForm
                agreedPrice={formData.agreedPrice}
                setAgreedPrice={(value) => updateFormData({ agreedPrice: value })}
                constraints={formData.constraints}
                setConstraints={(value) => updateFormData({ constraints: value })}
                sharePercentage={formData.sharePercentage}
                setSharePercentage={(value) => updateFormData({ sharePercentage: value })}
              />

              <MediaUploadSection
                mediaUrls={formData.mediaUrls}
                onImageUploaded={handleImageUploaded}
                onRemoveImage={handleRemoveImage}
              />

              <WorkScheduleForm 
                workDate={formData.workDate} 
                setWorkDate={(value) => updateFormData({ workDate: value })} 
                workTime={formData.workTime} 
                setWorkTime={(value) => updateFormData({ workTime: value })} 
              />

              <ClientDetailsForm 
                clientName={formData.clientName} 
                setClientName={(value) => updateFormData({ clientName: value })} 
                clientPhone={formData.clientPhone} 
                setClientPhone={(value) => updateFormData({ clientPhone: value })} 
                clientAddress={formData.clientAddress} 
                setClientAddress={handleClientAddressChange} 
                onAddressSelect={handleClientAddressSelect} 
                onLocationFound={handleLocationButtonClick} 
                hasLocationData={formData.hasLocationData} 
              />

              <CityDisplaySection extractedCity={formData.extractedCity} />

              <LeadTipsSection />

              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-lg py-4 rounded-2xl shadow-2xl shadow-blue-500/25 font-medium transition-all duration-300 transform hover:scale-[1.02]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {resubmitLeadId ? "מגיש ליד מחדש..." : "מפרסם ליד..."}
                  </>
                ) : (
                  submitButtonText
                )}
              </Button>
              
              <p className="text-xs text-gray-500 text-center">
                לאחר הפרסום, בעלי מקצוע יוכלו להגיש הצעות מחייר והליד יופיע בלוח המודעות
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default SubmitLead;
