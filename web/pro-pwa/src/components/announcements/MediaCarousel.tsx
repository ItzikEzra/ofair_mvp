
import React from "react";
import ImageModal from "./ImageModal";

// קרוסלה לכל סוגי המדיה (תמונה/וידאו)
interface MediaCarouselProps {
  media: string[];
  title: string;
}

const isImage = (url: string) => {
  if (!url) return false;
  return /\.(jpe?g|png|gif|bmp|webp|svg)$/i.test(url) || url.includes('image') || url.includes('photo');
};

const isVideo = (url: string) => {
  if (!url) return false;
  return /\.(mp4|mov|webm|ogg|m4v|avi)$/i.test(url) || url.includes('video');
};

const MediaCarousel: React.FC<MediaCarouselProps> = ({ media, title }) => {
  const [current, setCurrent] = React.useState(0);
  const [selectedImageUrl, setSelectedImageUrl] = React.useState<string>("");
  const [isImageModalOpen, setIsImageModalOpen] = React.useState(false);
  const [imageErrors, setImageErrors] = React.useState<Set<number>>(new Set());
  
  // Debug log
  console.log("MediaCarousel props:", { media, title, mediaLength: media?.length });
  
  // בדיקה אם יש מדיה אמיתית (לא רק strings ריקים או null)
  const validMedia = media && media.length > 0 ? media.filter(item => item && item.trim() !== '') : [];
  const hasValidMedia = validMedia.length > 0;
  
  console.log("MediaCarousel - Valid media check:", { 
    originalMedia: media,
    validMedia,
    hasValidMedia 
  });

  const handleImageClick = (imageUrl: string) => {
    if (hasValidMedia && isImage(imageUrl)) {
      setSelectedImageUrl(imageUrl);
      setIsImageModalOpen(true);
    }
  };

  const handleImageError = (index: number) => {
    console.log("Image failed to load at index:", index, "URL:", validMedia[index]);
    setImageErrors(prev => new Set([...prev, index]));
  };

  // אם אין מדיה תקפה, נציג placeholder עם הודעה ברורה
  if (!hasValidMedia) {
    return (
      <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden shadow-inner">
        <div className="w-full h-full relative flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-3">📷</div>
            <div className="text-lg font-medium">אין תמונות</div>
            <div className="text-sm">לא צורפו תמונות למודעה זו</div>
          </div>
        </div>
      </div>
    );
  }

  const currentMediaUrl = validMedia[current];
  const hasError = imageErrors.has(current);

  return (
    <>
      <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden shadow-inner">
        {/* הצגת תמונה/וידאו */}
        {!hasError && isImage(currentMediaUrl) ? (
          <img 
            src={currentMediaUrl} 
            alt={`${title} - תמונה ${current + 1}`} 
            className="w-full h-full object-cover object-center transition-all duration-300 cursor-pointer hover:scale-105 hover:brightness-110"
            onClick={() => handleImageClick(currentMediaUrl)}
            onError={() => handleImageError(current)}
            onLoad={() => {
              console.log("Image loaded successfully:", currentMediaUrl);
            }}
          />
        ) : !hasError && isVideo(currentMediaUrl) ? (
          <video 
            src={currentMediaUrl} 
            controls 
            className="w-full h-full object-cover object-center rounded-xl"
            onError={() => handleImageError(current)}
          />
        ) : (
          // Error state או תמונה שלא נטענה
          <div className="w-full h-full relative flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-3xl mb-2">⚠️</div>
              <div className="text-sm">שגיאה בטעינת התמונה</div>
            </div>
          </div>
        )}
        
        {/* ניווט בין מדיות אם יש יותר מאחת */}
        {validMedia.length > 1 && (
          <>
            <button
              className="absolute z-10 left-3 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg group hover:bg-white hover:shadow-xl transition-all duration-200"
              onClick={() => setCurrent((current - 1 + validMedia.length) % validMedia.length)}
              aria-label="הקודם"
            >
              <span className="text-lg font-bold text-gray-700 group-hover:text-ofair-blue">‹</span>
            </button>
            <button
              className="absolute z-10 right-3 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg group hover:bg-white hover:shadow-xl transition-all duration-200"
              onClick={() => setCurrent((current + 1) % validMedia.length)}
              aria-label="הבא"
            >
              <span className="text-lg font-bold text-gray-700 group-hover:text-ofair-blue">›</span>
            </button>
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2">
              {validMedia.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrent(idx)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    current === idx 
                      ? 'bg-white shadow-lg scale-125' 
                      : 'bg-white/60 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}
        
        {/* מספר תמונות אם יש יותר מאחת */}
        {validMedia.length > 1 && (
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-2 py-1 rounded-full text-xs z-10">
            {validMedia.length} תמונות
          </div>
        )}
      </div>
      
      <ImageModal
        open={isImageModalOpen}
        onOpenChange={setIsImageModalOpen}
        imageUrl={selectedImageUrl}
        title={title}
      />
    </>
  );
};

export default MediaCarousel;
