
import React from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Star } from "lucide-react";
import { useRatings } from "@/hooks/useRatings";
import { format } from "date-fns";
import { he } from "date-fns/locale";

const RatingItem = ({ label, value, color }: { label: string; value: number; color: string }) => {
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span>{label}</span>
        <span className="font-bold">{value.toFixed(1)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full ${color}`}
          style={{ width: `${(value / 5) * 100}%` }}
        ></div>
      </div>
    </div>
  );
};

const ReviewCard = ({
  name,
  date,
  rating,
  comment,
}: {
  name: string;
  date: string;
  rating: number;
  comment: string;
}) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">{name}</h3>
        <span className="text-gray-500 text-sm">{date}</span>
      </div>
      <div className="flex items-center mb-2">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
      <p className="text-gray-600">{comment}</p>
    </div>
  );
};

// Loading skeleton for the ratings page
const RatingsSkeleton = () => (
  <div className="animate-pulse" dir="rtl">
    <div className="bg-white rounded-xl p-6 shadow-md mb-6">
      <div className="flex items-center justify-center flex-col mb-6">
        <div className="h-10 w-20 bg-gray-200 rounded"></div>
        <div className="h-4 w-32 bg-gray-200 rounded mt-2"></div>
      </div>

      <div className="mb-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <div className="h-4 w-20 bg-gray-200 rounded"></div>
              <div className="h-4 w-8 bg-gray-200 rounded"></div>
            </div>
            <div className="h-2.5 w-full bg-gray-200 rounded-full"></div>
          </div>
        ))}
      </div>

      <div className="bg-gray-100 p-4 rounded-lg">
        <div className="h-5 w-32 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-full bg-gray-200 rounded"></div>
      </div>
    </div>

    <div className="h-6 w-40 bg-gray-200 rounded mb-4"></div>
    
    {[1, 2].map((i) => (
      <div key={i} className="bg-white p-4 rounded-xl shadow mb-4">
        <div className="flex justify-between items-center mb-2">
          <div className="h-5 w-24 bg-gray-200 rounded"></div>
          <div className="h-4 w-20 bg-gray-200 rounded"></div>
        </div>
        <div className="flex items-center mb-2 space-x-1">
          {[1, 2, 3, 4, 5].map((j) => (
            <div key={j} className="h-4 w-4 bg-gray-200 rounded-full"></div>
          ))}
        </div>
        <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
      </div>
    ))}
  </div>
);

// Error state component
const RatingsError = ({ message }: { message: string }) => (
  <div className="bg-white rounded-xl p-6 shadow-md mb-6 text-center" dir="rtl">
    <div className="text-red-500 text-xl mb-3">!</div>
    <h3 className="font-bold text-lg mb-2">שגיאה בטעינת הדירוגים</h3>
    <p className="text-gray-600 mb-4">{message}</p>
  </div>
);

const Ratings = () => {
  const { ratingsData, isLoading, error } = useRatings();

  if (isLoading) {
    return (
      <MainLayout title="דירוגים וביקורות">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/20">
          <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
            <div className="absolute top-32 right-1/4 w-72 h-72 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-3xl"></div>
            <div className="absolute bottom-40 left-1/3 w-56 h-56 bg-gradient-to-br from-amber-400/15 to-yellow-400/15 rounded-full blur-3xl"></div>
          </div>
          <div className="p-6">
            <RatingsSkeleton />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="דירוגים וביקורות">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/20">
          <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
            <div className="absolute top-32 right-1/4 w-72 h-72 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-3xl"></div>
            <div className="absolute bottom-40 left-1/3 w-56 h-56 bg-gradient-to-br from-amber-400/15 to-yellow-400/15 rounded-full blur-3xl"></div>
          </div>
          <div className="p-6">
            <RatingsError message={error} />
          </div>
        </div>
      </MainLayout>
    );
  }

  const ratingsDisplay = ratingsData || {
    overall: 0,
    service: 0,
    communication: 0,
    cleanliness: 0,
    timeliness: 0,
    reviewCount: 0,
    reviews: []
  };

  // AI insights based on the ratings
  const getAIInsights = () => {
    // Find the highest rated category
    const categories = [
      { name: "תקשורת", value: ratingsDisplay.communication },
      { name: "שירות", value: ratingsDisplay.service },
      { name: "ניקיון", value: ratingsDisplay.cleanliness },
      { name: "עמידה בזמנים", value: ratingsDisplay.timeliness },
    ];
    
    const highestRating = categories.reduce((prev, current) => 
      (current.value > prev.value) ? current : prev, categories[0]);
    
    if (ratingsDisplay.reviewCount === 0) {
      return "עדיין אין ביקורות לניתוח. התחל לקבל ביקורות מלקוחות כדי לראות תובנות.";
    }
    
    if (highestRating.value >= 4.5) {
      return `הלקוחות שלך מעריכים במיוחד את ה${highestRating.name} המצוינת! המשך לשמור על רמה גבוהה בתחום זה.`;
    } else if (highestRating.value >= 4) {
      return `נקודת החוזק שלך היא ה${highestRating.name}. התמקד בשיפור תחומים אחרים גם כן.`;
    } else {
      return "עבוד על שיפור השירות בכל התחומים כדי להגדיל את שביעות רצון הלקוחות.";
    }
  };

  // Format the date for display
  const formatReviewDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy", { locale: he });
    } catch (e) {
      console.error("Error formatting date:", e);
      return dateString; // Return original string if formatting fails
    }
  };

  return (
    <MainLayout title="דירוגים וביקורות">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/20">
        {/* Floating background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-32 right-1/4 w-72 h-72 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-3xl"></div>
          <div className="absolute bottom-40 left-1/3 w-56 h-56 bg-gradient-to-br from-amber-400/15 to-yellow-400/15 rounded-full blur-3xl"></div>
          <div className="absolute top-2/3 right-16 w-40 h-40 bg-gradient-to-br from-star-400/15 to-orange-400/15 rounded-full blur-3xl"></div>
        </div>

        <div className="p-6" dir="rtl">
          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-2xl shadow-purple-500/10 border-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <Star size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">דירוגים וביקורות</h2>
                  <p className="text-sm text-gray-600">ביצועים ושביעות רצון לקוחות</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-2xl shadow-purple-500/10 mb-6 border-0">
            <div className="flex items-center justify-center flex-col mb-6">
              <div className="flex items-center">
                <span className="text-4xl font-bold">{ratingsDisplay.overall.toFixed(1)}</span>
                <Star className="w-8 h-8 mr-2 fill-amber-400 text-amber-400" />
              </div>
              <p className="text-gray-500">ממוצע מ-{ratingsDisplay.reviewCount} ביקורות</p>
            </div>

            <div className="mb-6">
              <RatingItem label="שירות" value={ratingsDisplay.service} color="bg-green-500" />
              <RatingItem label="תקשורת" value={ratingsDisplay.communication} color="bg-blue-500" />
              <RatingItem label="ניקיון" value={ratingsDisplay.cleanliness} color="bg-purple-500" />
              <RatingItem label="עמידה בזמנים" value={ratingsDisplay.timeliness} color="bg-amber-500" />
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <h3 className="font-bold text-blue-800 mb-2">💡 תובנות AI</h3>
              <p className="text-blue-700">
                {getAIInsights()}
              </p>
            </div>
          </div>

          {ratingsDisplay.reviews.length > 0 ? (
            <>
              <h2 className="text-xl font-bold mb-4">ביקורות אחרונות</h2>
              <div>
                {ratingsDisplay.reviews.map((review) => (
                  <div key={review.id} className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-lg mb-4 border-0">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold">{review.customer_initials}</h3>
                      <span className="text-gray-500 text-sm">{formatReviewDate(review.created_at)}</span>
                    </div>
                    <div className="flex items-center mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating_overall ? "fill-amber-400 text-amber-400" : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-gray-600">{review.recommendation || "לא נכתבה ביקורת טקסטואלית."}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border-0">
              <h2 className="text-xl font-bold mb-2">עדיין אין ביקורות</h2>
              <p className="text-gray-600">
                כשלקוחות ישאירו לך ביקורות, הן יופיעו כאן.
              </p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Ratings;
