
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export const useBiometric = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkBiometricAvailability = async () => {
      try {
        // Check if the browser supports WebAuthn
        if (window.PublicKeyCredential) {
          // Check if platform authenticator is available
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsAvailable(available);
        }
      } catch (error) {
        console.error('Error checking biometric availability:', error);
        setIsAvailable(false);
      }
    };

    checkBiometricAvailability();
  }, []);

  const registerBiometric = async (userId: string, email: string) => {
    try {
      // Generate random challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Create credential options
      const createCredentialOptions: CredentialCreationOptions = {
        publicKey: {
          challenge,
          rp: {
            name: 'Pro Work Hub',
            id: window.location.hostname
          },
          user: {
            id: Uint8Array.from(userId, c => c.charCodeAt(0)),
            name: email,
            displayName: email
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 }, // ES256
            { type: 'public-key', alg: -257 } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required'
          }
        }
      };

      // Create credential
      const credential = await navigator.credentials.create(createCredentialOptions);
      
      if (!credential) {
        throw new Error('Failed to create credential');
      }

      return true;
    } catch (error) {
      console.error('Error registering biometric:', error);
      toast({
        title: "שגיאה ברישום טביעת אצבע",
        description: "אנא נסה שנית מאוחר יותר",
        variant: "destructive"
      });
      return false;
    }
  };

  const authenticateWithBiometric = async () => {
    try {
      // Generate random challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Create credential request options
      const getCredentialOptions: CredentialRequestOptions = {
        publicKey: {
          challenge,
          userVerification: 'required'
        }
      };

      // Get credential
      const credential = await navigator.credentials.get(getCredentialOptions);
      
      if (!credential) {
        throw new Error('Failed to get credential');
      }

      // Here you would typically validate the credential with your server
      // For now, we'll just check if we got a valid credential response
      toast({
        title: "אימות בוצע בהצלחה",
        description: "זוהית בהצלחה באמצעות טביעת אצבע"
      });

      return true;
    } catch (error) {
      console.error('Error authenticating with biometric:', error);
      toast({
        title: "שגיאת אימות",
        description: "אנא נסה שנית מאוחר יותר",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    isAvailable,
    registerBiometric,
    authenticateWithBiometric
  };
};

export default useBiometric;
