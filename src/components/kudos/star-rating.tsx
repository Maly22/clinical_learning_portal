import { Star } from "lucide-react";

export function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="star-rating" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star key={value} size={size} fill={value <= rating ? "currentColor" : "none"} strokeWidth={value <= rating ? 0 : 1.5} />
      ))}
    </span>
  );
}
