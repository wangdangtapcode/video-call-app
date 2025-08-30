import { Star } from "lucide-react";

const StarRating = ({ rating = 0 }) => {
  const safeRating = Number(rating) || 0; // fallback nếu rating null/undefined
  const fullStars = Math.floor(safeRating);
  const halfStar = safeRating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <div className="flex items-center">
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
      ))}
      {halfStar && (
        <Star key="half" className="w-5 h-5 text-yellow-400 fill-yellow-200" />
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} className="w-5 h-5 text-gray-300" />
      ))}
      <span className="ml-2 text-sm text-gray-600">
        {safeRating.toFixed(1)}
      </span>
    </div>
  );
};

export default StarRating;
