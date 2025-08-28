import { Star } from "lucide-react";

const StarRating = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <div className="flex items-center">
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} className="text-yellow-400 fill-yellow-400" size={18} />
      ))}
      {halfStar && <Star className="text-yellow-400 fill-yellow-200" size={18} />}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} className="text-gray-300" size={18} />
      ))}
      <span className="ml-2 text-sm text-gray-500">({rating.toFixed(2)})</span>
    </div>
  );
};

export default StarRating;