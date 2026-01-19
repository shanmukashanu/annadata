import React, { useState, useEffect } from 'react';
import { Star, Quote } from 'lucide-react';
// Fetching from backend API instead of Supabase

interface Review {
  id: string;
  name: string;
  designation: string;
  image_url: string;
  review_text: string;
  created_at: string;
}

const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_URL}/api/reviews`);
      const json = await res.json();
      if (Array.isArray(json)) {
        const mapped = json.map((r: any) => ({
          id: r._id || r.id,
          name: r.name || '',
          designation: '',
          image_url: r.imageUrl || '',
          review_text: r.text || '',
          created_at: r.createdAt || new Date().toISOString(),
        })) as Review[];
        setReviews(mapped);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-800 to-green-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Customer Reviews</h1>
            <p className="text-xl text-green-100 leading-relaxed">
              Don't just take our word for it. See what our happy customers have to say 
              about their experience with Annadata Fruit Bowl.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 -mt-16 relative z-10">
            {[
              { number: '4.9', label: 'Average Rating', icon: Star },
              { number: '5000+', label: 'Happy Customers', icon: null },
              { number: '98%', label: 'Satisfaction Rate', icon: null },
              { number: '1000+', label: 'Reviews', icon: null },
            ].map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-shadow"
              >
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <span className="text-3xl md:text-4xl font-bold text-green-600">{stat.number}</span>
                  {stat.icon && <Star className="h-6 w-6 text-yellow-400 fill-current" />}
                </div>
                <p className="text-gray-600 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Grid */}
      <section className="py-20 bg-gradient-to-b from-white to-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-20">
              <Quote className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No reviews yet. Be the first to share your experience!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white rounded-3xl shadow-lg p-8 hover:shadow-xl transition-all hover:-translate-y-1"
                >
                  <div className="flex items-center space-x-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <Quote className="h-8 w-8 text-green-200 mb-4" />
                  <p className="text-gray-700 leading-relaxed mb-6">
                    "{review.review_text}"
                  </p>
                  <div className="flex items-center space-x-4 pt-4 border-t border-gray-100">
                    <img
                      src={review.image_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'}
                      alt={review.name}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">{review.name}</p>
                      <p className="text-green-600 text-sm">{review.designation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Testimonial Highlight */}
      <section className="py-20 bg-gradient-to-br from-green-700 to-green-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Quote className="h-16 w-16 text-green-400 mx-auto mb-8" />
          <p className="text-2xl md:text-3xl font-medium leading-relaxed mb-8">
            "Annadata Fruit Bowl has transformed how we source fruits for our restaurant. 
            The quality is consistently excellent, and the delivery is always on time. 
            Our customers love the freshness!"
          </p>
          <div className="flex items-center justify-center space-x-4">
            <img
              src="madhu.jpg"
              alt="Featured Review"
              className="w-16 h-16 rounded-full object-cover border-2 border-white"
            />
            <div className="text-left">
              <p className="font-semibold text-lg">Madhu</p>
              <p className="text-green-200">Fruit Bowl  Owner, Bangalore</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Experience the Quality Yourself
          </h2>
          <p className="text-gray-600 mb-8">
            Join thousands of satisfied customers who trust Annadata for their fruit needs.
          </p>
          <a
            href="/products"
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-full font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-lg"
          >
            <span>Shop Now</span>
          </a>
        </div>
      </section>
    </div>
  );
};

export default ReviewsPage;
