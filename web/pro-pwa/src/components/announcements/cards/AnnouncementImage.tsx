
import React from "react";

// רשימת placeholder images זמינים
const placeholderImages = [
  "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?auto=format&fit=crop&w=600&q=80",
];

interface AnnouncementImageProps {
  imageUrl?: string;
  title: string;
}

const AnnouncementImage = ({ imageUrl, title }: AnnouncementImageProps) => {
  const [imageError, setImageError] = React.useState(false);
  
  // נבחר placeholder רנדומלי אם אין תמונה או אם יש שגיאה
  const placeholderImage = React.useMemo(() => 
    placeholderImages[Math.floor(Math.random() * placeholderImages.length)], 
    []
  );
  
  const effectiveImage = (imageUrl && !imageError) ? imageUrl : placeholderImage;
  
  return (
    <div className="h-48 w-full rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 shadow-inner">
      <img
        src={effectiveImage}
        alt={title}
        className="w-full h-full object-cover object-center transition-all duration-300 hover:scale-105 hover:brightness-110"
        loading="lazy"
        onError={(e) => {
          console.log("Image failed to load:", imageUrl);
          setImageError(true);
          if (effectiveImage !== placeholderImage) {
            e.currentTarget.src = placeholderImage;
          }
        }}
        onLoad={() => {
          if (imageUrl) {
            setImageError(false);
          }
        }}
      />
    </div>
  );
};

export default AnnouncementImage;
