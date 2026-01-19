import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Leaf, Shield, Package, Clock, Users, Building2, Gift, ArrowRight, CheckCircle } from 'lucide-react';

const ServicesPage: React.FC = () => {
  const services = [
    {
      icon: Truck,
      title: 'Home Delivery',
      description: 'Fresh fruits delivered right to your doorstep within hours of ordering. We ensure careful handling and temperature-controlled transport.',
      features: ['Same-day delivery', 'Temperature controlled', 'Careful handling', 'Real-time tracking'],
      color: 'orange',
    },
    {
      icon: Leaf,
      title: 'Organic Produce',
      description: 'Certified organic fruits grown without harmful pesticides or chemicals. Sourced from verified organic farms across South India.',
      features: ['Certified organic', 'No pesticides', 'Natural ripening', 'Health conscious'],
      color: 'green',
    },
    {
      icon: Shield,
      title: 'Quality Assurance',
      description: 'Every fruit undergoes rigorous quality checks before delivery. Our FSSAI certification ensures food safety standards.',
      features: ['Multi-point inspection', 'FSSAI certified', 'Freshness guarantee', 'Return policy'],
      color: 'blue',
    },
    {
      icon: Package,
      title: 'Bulk Orders',
      description: 'Special pricing and dedicated service for bulk orders. Perfect for events, offices, and restaurants.',
      features: ['Volume discounts', 'Custom packaging', 'Scheduled delivery', 'Dedicated support'],
      color: 'purple',
    },
    {
      icon: Building2,
      title: 'Corporate Services',
      description: 'Tailored fruit delivery solutions for offices and corporate clients. Keep your team healthy and productive.',
      features: ['Weekly subscriptions', 'Office delivery', 'Custom baskets', 'Invoice billing'],
      color: 'indigo',
    },
    {
      icon: Gift,
      title: 'Gift Baskets',
      description: 'Beautiful fruit gift baskets for special occasions. Perfect for festivals, birthdays, and corporate gifting.',
      features: ['Premium packaging', 'Custom messages', 'Pan-India delivery', 'Occasion themes'],
      color: 'pink',
    },
  ];

  const process = [
    {
      step: '01',
      title: 'Farm Selection',
      description: 'We carefully select partner farms based on quality, sustainability, and ethical practices.',
    },
    {
      step: '02',
      title: 'Harvest Fresh',
      description: 'Fruits are harvested at optimal ripeness to ensure maximum freshness and nutrition.',
    },
    {
      step: '03',
      title: 'Quality Check',
      description: 'Every fruit undergoes rigorous quality inspection before packaging.',
    },
    {
      step: '04',
      title: 'Swift Delivery',
      description: 'Temperature-controlled delivery ensures fruits reach you in perfect condition.',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-800 to-green-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Our Services</h1>
            <p className="text-xl text-green-100 leading-relaxed">
              From farm to your table, we offer comprehensive services to ensure you get 
              the freshest fruits with utmost convenience.
            </p>
          </div>
        </div>
      </section>

      {/* Highlights Carousel (below hero) */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {(() => {
            const slides = [
              { src: '/fruitstall.jpg', title: 'Fresh Fruit Stall', subtitle: 'Handpicked selection straight from trusted farms' },
              { src: '/bowl.jpg', title: 'Careful Packing', subtitle: 'Eco-friendly packaging that protects freshness' },
              { src: '/fruitstall2.jpg', title: 'Wide Variety', subtitle: 'Seasonal and exotic fruits available daily' },
              { src: '/features.jpg', title: 'Quality You Can Trust', subtitle: 'FSSAI-compliant processes and inspections' },
            ];
            const [index, setIndex] = useState(0);
            useEffect(() => {
              const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 3000);
              return () => clearInterval(id);
            }, []);
            const go = (dir: number) => setIndex((i) => (i + dir + slides.length) % slides.length);
            return (
              <div className="relative rounded-3xl overflow-hidden shadow-lg">
                <div className="relative h-80 sm:h-96 md:h-[28rem]">
                  {slides.map((s, i) => (
                    <div
                      key={s.src}
                      className={`absolute inset-0 transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'}`}
                    >
                      {/* Blurred background to avoid visible side blanks */}
                      <img
                        src={s.src}
                        alt=""
                        aria-hidden
                        className="absolute inset-0 w-full h-full object-cover blur-xl scale-110"
                        loading={i === 0 ? 'eager' : 'lazy'}
                      />
                      <div className="absolute inset-0 bg-black/30" />
                      {/* Foreground image fully visible without cropping */}
                      <img
                        src={s.src}
                        alt={s.title}
                        className="absolute inset-0 w-full h-full object-contain"
                        loading={i === 0 ? 'eager' : 'lazy'}
                      />
                    </div>
                  ))}
                  {/* Overlay content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                    <h3 className="text-white text-2xl md:text-3xl font-bold drop-shadow">{slides[index].title}</h3>
                    <p className="text-white/90 text-sm md:text-base mt-2 max-w-2xl drop-shadow">{slides[index].subtitle}</p>
                  </div>
                  {/* Controls */}
                  <button aria-label="Previous" onClick={() => go(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full p-2 shadow">‹</button>
                  <button aria-label="Next" onClick={() => go(1)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full p-2 shadow">›</button>
                  {/* Dots */}
                  <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        aria-label={`Go to slide ${i + 1}`}
                        onClick={() => setIndex(i)}
                        className={`w-2.5 h-2.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/60'} hover:bg-white`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div
                key={index}
                className="bg-white border border-gray-100 rounded-3xl p-8 hover:shadow-2xl transition-all hover:-translate-y-2"
              >
                <div className={`bg-${service.color}-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6`}>
                  <service.icon className={`h-8 w-8 text-${service.color}-600`} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{service.title}</h3>
                <p className="text-gray-600 mb-6">{service.description}</p>
                <ul className="space-y-3">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-20 bg-gradient-to-b from-green-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Process
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              From farm to your doorstep, here's how we ensure quality at every step.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {process.map((item, index) => (
              <div key={index} className="relative">
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                  <span className="text-6xl font-bold text-green-100">{item.step}</span>
                  <h3 className="text-xl font-bold text-gray-900 mt-4 mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
                {index < process.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="h-8 w-8 text-green-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Delivery Info */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <img
                src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600"
                alt="Delivery"
                className="rounded-3xl shadow-xl"
              />
            </div>
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Fast & Reliable Delivery
              </h2>
              <p className="text-gray-600 leading-relaxed">
                We understand that freshness matters. That's why we've built a robust 
                delivery network that ensures your fruits reach you in the shortest time possible.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-green-50 rounded-xl p-6">
                  <Clock className="h-8 w-8 text-green-600 mb-3" />
                  <h4 className="font-bold text-gray-900">Same Day</h4>
                  <p className="text-sm text-gray-600">Delivery in Bangalore</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-6">
                  <Truck className="h-8 w-8 text-orange-600 mb-3" />
                  <h4 className="font-bold text-gray-900">Free Delivery</h4>
                  <p className="text-sm text-gray-600">Orders above ₹500</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-6">
                  <Shield className="h-8 w-8 text-blue-600 mb-3" />
                  <h4 className="font-bold text-gray-900">Safe Packaging</h4>
                  <p className="text-sm text-gray-600">Eco-friendly materials</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-6">
                  <Users className="h-8 w-8 text-purple-600 mb-3" />
                  <h4 className="font-bold text-gray-900">Trained Staff</h4>
                  <p className="text-sm text-gray-600">Careful handling</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-orange-500 to-orange-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Experience Our Services?
          </h2>
          <p className="text-orange-100 text-lg mb-8 max-w-2xl mx-auto">
            Order now and discover why thousands trust Annadata for their fruit needs.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/products"
              className="inline-flex items-center space-x-2 bg-white text-orange-600 px-8 py-4 rounded-full font-semibold hover:bg-orange-50 transition-all shadow-lg"
            >
              <span>Shop Now</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center space-x-2 bg-orange-700 text-white px-8 py-4 rounded-full font-semibold hover:bg-orange-800 transition-all"
            >
              <span>Contact Us</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ServicesPage;
