import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Users, Award, Heart, Target, Eye, ArrowRight, Shield } from 'lucide-react';

const AboutPage: React.FC = () => {
  const stats = [
    { number: '10+', label: 'Years Experience' },
    { number: '100+', label: 'Partner Farmers' },
    { number: '5000+', label: 'Happy Customers' },
    { number: '50+', label: 'Fruit Varieties' },
  ];

// (state and handlers will be defined inside AboutPage)

  const values = [
    {
      icon: Heart,
      title: 'Farmer First',
      description: 'We ensure fair prices and support for our partner farmers, helping them grow sustainably.',
    },
    {
      icon: Leaf,
      title: 'Quality Assured',
      description: 'Every fruit is handpicked and quality checked to ensure only the best reaches you.',
    },
    {
      icon: Users,
      title: 'Community Focus',
      description: 'We believe in building strong relationships with farmers and customers alike.',
    },
    {
      icon: Award,
      title: 'Sustainability',
      description: 'Eco-friendly practices from farm to delivery, minimizing our environmental impact.',
    },
  ];

  const team = [
    {
      name: 'Madhu',
      role: 'Founder & CEO',
      image: 'ceo.jpg',
      description: 'Passionate about connecting farmers with consumers.',
    },
    {
      name: 'Bindu',
      role: 'Operations Head',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300',
      description: 'Ensures smooth delivery and quality control.',
    },
    {
      name: 'Ravi Kumar',
      role: 'Farmer Relations',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
      description: 'Works directly with our partner farmers.',
    },
  ];

  const navigate = useNavigate();
  const [showSecret, setShowSecret] = useState(false);
  const [secretInput, setSecretInput] = useState('');
  const onSecretChange = (v: string) => {
    const val = (v || '').slice(0, 2).toLowerCase();
    setSecretInput(val);
    if (val.length === 2 && val !== 'hi') {
      setShowSecret(false);
      setSecretInput('');
    }
  };
  const onSecretOk = () => {
    if (secretInput === 'hi') {
      setShowSecret(false);
      setSecretInput('');
      navigate('/admin-login');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-green-800 to-green-900 text-white py-20 lg:py-32">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1920')] bg-cover bg-center opacity-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Leaf className="h-4 w-4" />
              <span>Our Story</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              About Annadata Fruit Bowl
            </h1>
            <p className="text-xl text-green-100 leading-relaxed">
              We are on a mission to bring the freshest, farm-to-table fruits directly to your 
              doorstep while supporting local farmers and sustainable agriculture.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 -mt-20 relative z-10">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-xl p-8 text-center hover:shadow-2xl transition-shadow"
              >
                <p className="text-4xl md:text-5xl font-bold text-green-600 mb-2">{stat.number}</p>
                <p className="text-gray-600 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Our Journey
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Annadata Fruit Bowl started with a simple idea: what if we could bring the 
                freshness of farm-picked fruits directly to urban homes? Founded in Bangalore, 
                we began by partnering with local farmers in Karnataka.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Today, we work with over 100 farmers across South India, ensuring they get 
                fair prices for their produce while our customers enjoy the freshest fruits 
                possible. Our name "Annadata" means "provider of food" in Sanskrit, reflecting 
                our deep respect for farmers.
              </p>
              <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r-xl">
                <p className="text-green-800 font-medium">
                  "We believe that when farmers prosper, communities thrive. Our mission is to 
                  create a sustainable ecosystem that benefits everyone."
                </p>
                <p className="text-green-600 mt-2"> Madhu -Founder, Annadata Fruit Bowl</p>
              </div>
            </div>
            <div className="relative">
              <img
                src="madhu.jpg"
                alt="Our Journey"
                className="rounded-3xl shadow-xl"
              />
              <div className="absolute -bottom-6 -left-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 shadow-xl">
                <Shield className="h-8 w-8 mb-2" />
                <p className="text-sm">FSSAI Registered</p>
                <p className="font-bold">21225009001838</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-gradient-to-b from-green-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-white rounded-3xl shadow-xl p-10 hover:shadow-2xl transition-shadow">
              <div className="bg-green-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <Target className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h3>
              <p className="text-gray-600 leading-relaxed">
                To revolutionize the way fresh fruits reach consumers by creating a direct 
                bridge between farmers and families. We aim to ensure fair compensation for 
                farmers while providing premium quality produce at reasonable prices.
              </p>
            </div>
            <div className="bg-white rounded-3xl shadow-xl p-10 hover:shadow-2xl transition-shadow">
              <div className="bg-orange-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <Eye className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h3>
              <p className="text-gray-600 leading-relaxed">
                To become India's most trusted farm-to-table fruit delivery service, known 
                for quality, sustainability, and farmer welfare. We envision a future where 
                every family has access to fresh, chemical-free fruits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              These core values guide everything we do at Annadata Fruit Bowl.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-2xl hover:bg-green-50 transition-colors"
              >
                <div className="bg-gradient-to-br from-green-500 to-green-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <value.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
          {/* Secret icon (mobile & desktop) */}
          <div className="mt-8 flex items-center justify-center">
            <button
              aria-label="Values Secret"
              onClick={() => setShowSecret(true)}
              className="p-3 rounded-full bg-green-600 text-white shadow-lg active:scale-95"
            >
              <Heart className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-gradient-to-b from-green-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Meet Our Team</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              The passionate people behind Annadata Fruit Bowl.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <div
                key={index}
                className="bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all group"
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6 text-center">
                  <h3 className="text-xl font-bold text-gray-900">{member.name}</h3>
                  <p className="text-green-600 font-medium mb-3">{member.role}</p>
                  <p className="text-gray-600 text-sm">{member.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-green-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Join the Annadata Family
          </h2>
          <p className="text-green-100 text-lg mb-8 max-w-2xl mx-auto">
            Experience the difference of farm-fresh fruits delivered with care.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center space-x-2 bg-white text-green-700 px-8 py-4 rounded-full font-semibold hover:bg-green-50 transition-all shadow-lg"
          >
            <span>Explore Products</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
      {/* Secret modal */}
      {showSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => { setShowSecret(false); setSecretInput(''); }}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xs p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Enter Code</h3>
            <input
              value={secretInput}
              onChange={(e) => onSecretChange(e.target.value)}
              maxLength={2}
              inputMode="text"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="__"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setShowSecret(false); setSecretInput(''); }}
                className="px-3 py-2 rounded-lg border hover:bg-gray-50"
              >Cancel</button>
              <button
                onClick={onSecretOk}
                disabled={secretInput !== 'hi'}
                className={`px-3 py-2 rounded-lg text-white ${secretInput === 'hi' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`}
              >OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AboutPage;
