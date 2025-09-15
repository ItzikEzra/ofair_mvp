
import { normalizePhoneNumber } from "@/utils/phoneUtils";
import { Professional } from "@/types/profile";
import UsersService from "./usersService";

export const checkProfessionalByIdentifier = async (identifier: string): Promise<{ data: Professional | null, error: any }> => {
  const isEmail = identifier.includes('@');
  try {
    console.log(`Checking if ${isEmail ? 'email' : 'phone'} exists:`, identifier);

    // Use the Users Service to check professional existence
    const result = await UsersService.checkProfessionalByIdentifier(identifier);

    if (!result.exists || !result.professional) {
      console.log("No professional found for identifier:", identifier);
      return { data: null, error: null };
    }

    console.log("Professional found:", result.professional);

    // Format the response to match our Professional type
    const formattedData: Professional = {
      id: result.professional.id,
      user_id: result.professional.user_id,
      name: result.professional.name,
      phone_number: result.professional.phone_number,
      email: result.professional.email,
      // Add default values for required fields
      profession: result.professional.profession || "כללי",
      location: result.professional.location || "ישראל",
      // Add optional fields if they exist
      ...(result.professional.specialties && {
        specialties: Array.isArray(result.professional.specialties)
          ? result.professional.specialties
          : [result.professional.specialties]
      }),
      ...(result.professional.image && { image: result.professional.image }),
      ...(result.professional.about && { about: result.professional.about })
    };

    return { data: formattedData, error: null };
  } catch (err) {
    console.error("Unexpected error in checkProfessionalByIdentifier:", err);
    return { data: null, error: err };
  }
};
