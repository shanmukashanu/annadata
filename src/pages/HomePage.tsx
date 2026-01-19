import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, Shield, Leaf, Award, Star, ChevronLeft, ChevronRight, ShoppingCart, MessageCircle, Check } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';
import EnquiryModal from '@/components/EnquiryModal';

interface Review {
  id: string;
  name: string;
  designation: string;
  image_url: string;
  review_text: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
}

interface Plan {
  id: string;
  title: string;
  price: number;
  billingPeriod: 'weekly' | 'monthly' | 'per_day' | 'per_serve' | 'per_year';
  features: string[];
  description?: string;
  imageUrl?: string;
  popular?: boolean;
}


const HomePage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentReview, setCurrentReview] = useState(0);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansApi, setPlansApi] = useState<CarouselApi | null>(null);
  const [enquiryPlan, setEnquiryPlan] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState<Record<string, boolean>>({});
  const { addToCart } = useCart();
  const whatsappNumber = '916363871946';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
    try {
      const [revRes, prodRes, plansRes] = await Promise.all([
        fetch(`${API_URL}/api/reviews`),
        fetch(`${API_URL}/api/products`),
        fetch(`${API_URL}/api/plans`),
      ]);
      const [revJson, prodJson, plansJson] = await Promise.all([
        revRes.json(), prodRes.json(), plansRes.json()
      ]);
      if (Array.isArray(revJson)) {
        const mappedReviews = revJson.slice(0, 6).map((r: any) => ({
          id: r._id || r.id,
          name: r.name || '',
          designation: '',
          image_url: r.imageUrl || '',
          review_text: r.text || '',
        })) as Review[];
        setReviews(mappedReviews);
      }
      if (Array.isArray(prodJson)) {
        const mappedProducts = prodJson.slice(0, 6).map((p: any) => ({
          id: p._id || p.id,
          name: p.name,
          price: p.price,
          image_url: p.imageUrl || '',
        })) as Product[];
        setProducts(mappedProducts);
      }
      if (Array.isArray(plansJson)) {
        const mappedPlans = plansJson.map((p: any) => ({ id: p._id || p.id, ...p })) as Plan[];
        setPlans(mappedPlans);
      }
    } catch (e) {
      // ignore
    }
  };

  const nextReview = () => setCurrentReview((prev) => (prev + 1) % reviews.length);
  const prevReview = () => setCurrentReview((prev) => (prev - 1 + reviews.length) % reviews.length);

  // Auto-advance plans every 4 seconds
  useEffect(() => {
    if (!plansApi) return;
    const id = setInterval(() => plansApi.scrollNext(), 4000);
    return () => clearInterval(id);
  }, [plansApi]);

  const openWhatsApp = (planTitle: string) => {
    const message = encodeURIComponent(
      `Hi! I'm interested in the ${planTitle} plan from Annadata Fruit Bowl. Please share more details.`
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  const handleAddToCart = (plan: Plan) => {
    const id = `plan_${plan.id}`;
    addToCart(
      {
        id,
        name: plan.title,
        price: plan.price,
        image_url: plan.imageUrl,
      },
      1
    );
    setAddedToCart((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => setAddedToCart((prev) => ({ ...prev, [id]: false })), 2000);
  };

  const periodLabel = (p: Plan['billingPeriod']) => {
    switch (p) {
      case 'weekly': return 'week';
      case 'monthly': return 'month';
      case 'per_day': return 'day';
      case 'per_serve': return 'serve';
      case 'per_year': return 'year';
      default: return '';
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-green-50 via-white to-orange-50 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=1920')] bg-cover bg-center opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
                <Shield className="h-4 w-4" />
                <span>FSSAI Registered – 21225009001838</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Fresh Fruits,
                <span className="text-green-600 block">Straight from Farms</span>
              </h1>
              <p className="text-lg text-gray-600 max-w-lg">
                Experience the taste of nature with our handpicked, farm-fresh fruits. 
                We connect you directly with local farmers for the freshest produce.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/products"
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-full font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl"
                >
                  <span>Shop Now</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  to="/about"
                  className="inline-flex items-center space-x-2 bg-white text-green-700 px-8 py-4 rounded-full font-semibold border-2 border-green-200 hover:border-green-300 hover:bg-green-50 transition-all"
                >
                  <span>Learn More</span>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="relative z-10">
                <img
                  src="https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600"
                  alt="Fresh Fruits"
                  className="rounded-3xl shadow-2xl"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-4 z-20">
                <div className="flex items-center space-x-3">
                  <div className="bg-orange-100 p-3 rounded-full">
                    <Truck className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Free Delivery</p>
                    <p className="text-sm text-gray-500">On orders above ₹500</p>
                  </div>
                </div>
              </div>
              <div className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-xl p-4 z-20">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-3 rounded-full">
                    <Leaf className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">100% Fresh</p>
                    <p className="text-sm text-gray-500">Farm Top Quality</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Plans Slider */}
      {plans.length > 0 && (
        <section className="py-20 bg-gradient-to-b from-white to-green-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Plans</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">Choose the plan that fits your lifestyle. Auto slides every 4 seconds, or navigate manually.</p>
            </div>
            <div className="relative">
              <Carousel setApi={setPlansApi} opts={{ loop: true }}>
                <CarouselContent>
                  {plans.map((plan) => (
                    <CarouselItem key={plan.id} className="md:basis-1/2 lg:basis-1/2">
                      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-green-200 h-full flex flex-col">
                        <div className="relative aspect-[16/9]">
                          <img src={plan.imageUrl || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600'} alt={plan.title} className="w-full h-full object-cover" />
                          {plan.popular && (
                            <span className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">Popular</span>
                          )}
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.title}</h3>
                          <p className="text-green-700 text-3xl font-extrabold">₹{plan.price}
                            <span className="text-base text-gray-600 font-medium"> / {periodLabel(plan.billingPeriod)}</span>
                          </p>
                          <ul className="mt-4 space-y-2 text-gray-700">
                            {(plan.features || []).map((f, i) => (
                              <li key={i} className="flex items-start space-x-2">
                                <svg className="h-5 w-5 text-green-600 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                          {plan.description && (
                            <p className="mt-4 text-gray-600">{plan.description}</p>
                          )}
                          <div className="mt-6 space-y-3">
                            <button
                              onClick={() => handleAddToCart(plan)}
                              className={`w-full flex items-center justify-center space-x-2 py-3 rounded-xl font-semibold transition-all ${
                                addedToCart[`plan_${plan.id}`]
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
                              }`}
                            >
                              {addedToCart[`plan_${plan.id}`] ? (
                                <>
                                  <Check className="h-5 w-5" />
                                  <span>Added to Cart</span>
                                </>
                              ) : (
                                <>
                                  <ShoppingCart className="h-5 w-5" />
                                  <span>Add to Cart</span>
                                </>
                              )}
                            </button>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() => openWhatsApp(plan.title)}
                                className="flex items-center justify-center space-x-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl text-sm font-medium transition-colors"
                              >
                                <MessageCircle className="h-4 w-4" />
                                <span>WhatsApp</span>
                              </button>
                              <button
                                onClick={() => setEnquiryPlan(plan.title)}
                                className="flex items-center justify-center space-x-1 bg-orange-100 hover:bg-orange-200 text-orange-700 py-2 rounded-xl text-sm font-medium transition-colors"
                              >
                                <span>Enquiry</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>
          </div>
        </section>
      )}

      {/* About Preview */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600"
                alt="Farmers"
                className="rounded-3xl shadow-xl"
              />
              <div className="absolute -bottom-8 -right-8 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 shadow-xl">
                <p className="text-4xl font-bold">10+</p>
                <p className="text-sm">Years of Experience</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-medium">
                <Award className="h-4 w-4" />
                <span>About Annadata</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Connecting Farmers to Your Table
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Annadata Fruit Bowl was founded with a simple mission: to bring the freshest, 
                highest-quality fruits directly from local farmers to your doorstep. We believe 
                in supporting sustainable agriculture and fair trade practices.
              </p>
              <ul className="space-y-4">
                {[
                  'Direct partnership with 100+ local farmers',
                  'Quality checked and handpicked fruits',
                  'Same-day delivery in Bangalore',
                  'Eco-friendly packaging',
                ].map((item, index) => (
                  <li key={index} className="flex items-center space-x-3">
                    <div className="bg-green-100 p-1 rounded-full">
                      <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/about"
                className="inline-flex items-center space-x-2 text-green-600 font-semibold hover:text-green-700"
              >
                <span>Read Our Story</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Products Preview */}
      <section className="py-20 bg-gradient-to-b from-green-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Fresh Products
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Handpicked selection of the freshest fruits, delivered straight from farms to your home.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 text-center">
                  <h3 className="font-semibold text-gray-800">{product.name}</h3>
                  <p className="text-green-600 font-bold">₹{product.price}/kg</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              to="/products"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-full font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-lg"
            >
              <span>View All Products</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Services
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We offer a range of services to make your fruit shopping experience seamless.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Truck,
                title: 'Home Delivery',
                description: 'Fresh fruits delivered to your doorstep within hours of ordering.',
                color: 'orange',
              },
              {
                icon: Leaf,
                title: 'Organic Produce',
                description: 'Certified organic fruits grown without harmful pesticides.',
                color: 'green',
              },
              {
                icon: Shield,
                title: 'Quality Assured',
                description: 'Every fruit is quality checked before delivery.',
                color: 'blue',
              },
              {
                icon: Award,
                title: 'Bulk Orders',
                description: 'Special pricing for bulk orders and corporate clients.',
                color: 'purple',
              },
            ].map((service, index) => (
              <div
                key={index}
                className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className={`bg-${service.color}-100 w-14 h-14 rounded-2xl flex items-center justify-center mb-4`}>
                  <service.icon className={`h-7 w-7 text-${service.color}-600`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{service.title}</h3>
                <p className="text-gray-600">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="py-20 bg-gradient-to-br from-green-800 to-green-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                What Our Customers Say
              </h2>
              <p className="text-green-200 max-w-2xl mx-auto">
                Don't just take our word for it. Here's what our happy customers have to say.
              </p>
            </div>
            <div className="relative max-w-3xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 md:p-12">
                <div className="flex justify-center mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-xl md:text-2xl text-center mb-8 leading-relaxed">
                  "{reviews[currentReview]?.review_text}"
                </p>
                <div className="flex items-center justify-center space-x-4">
                  <img
                    src={reviews[currentReview]?.image_url}
                    alt={reviews[currentReview]?.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white"
                  />
                  <div>
                    <p className="font-semibold text-lg">{reviews[currentReview]?.name}</p>
                    <p className="text-green-200">{reviews[currentReview]?.designation}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center space-x-4 mt-8">
                <button
                  onClick={prevReview}
                  className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={nextReview}
                  className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-orange-500 to-orange-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Taste the Freshness?
          </h2>
          <p className="text-orange-100 text-lg mb-8 max-w-2xl mx-auto">
            Order now and get farm-fresh fruits delivered to your doorstep within hours.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center space-x-2 bg-white text-orange-600 px-8 py-4 rounded-full font-semibold hover:bg-orange-50 transition-all shadow-lg"
          >
            <span>Order Now</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Enquiry Modal */}
      <EnquiryModal
        isOpen={!!enquiryPlan}
        onClose={() => setEnquiryPlan(null)}
        productName={enquiryPlan || ''}
      />
    </div>
  );
};

export default HomePage;
