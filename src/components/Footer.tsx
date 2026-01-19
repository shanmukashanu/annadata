import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Phone, Mail, MapPin, Facebook, Instagram, Twitter, Youtube, Heart } from 'lucide-react';

interface FooterProps {
  onSecretTrigger?: () => void;
}

const Footer: React.FC<FooterProps> = ({ onSecretTrigger }) => {
  const [tapCount, setTapCount] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleSecretTap = () => {
    // Count 4 taps within 1500ms
    setTapCount((prev) => {
      const next = prev + 1;
      if (next === 1) {
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => setTapCount(0), 1500);
      }
      if (next >= 4) {
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = null;
        setTapCount(0);
        onSecretTrigger?.();
        return 0;
      }
      return next;
    });
  };

  return (
    <footer className="bg-gradient-to-b from-green-900 to-green-950 text-white">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-green-400 to-green-600 p-2 rounded-full">
                <Leaf className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Annadata</h2>
                <p className="text-sm text-orange-400 font-medium">Fruit Bowl</p>
              </div>
            </div>
            <p className="text-green-200 text-sm leading-relaxed">
              Bringing fresh, farm-to-table fruits directly to your doorstep. 
              We support local farmers and ensure the highest quality produce for your family.
            </p>
            <div className="bg-green-800/50 rounded-lg p-3">
              <p className="text-xs text-green-300">FSSAI Registered</p>
              <p className="text-sm font-semibold text-white">21225009001838</p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-orange-400">Quick Links</h3>
            <ul className="space-y-3">
              {[
                { path: '/', label: 'Home' },
                { path: '/products', label: 'Products' },
                { path: '/about', label: 'About Us' },
                { path: '/services', label: 'Services' },
                { path: '/reviews', label: 'Reviews' },
                { path: '/insights', label: 'Insights' },
                { path: '/lucky', label: 'Lucky' },
                { path: '/contact', label: 'Contact' },
              ].map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-green-200 hover:text-white transition-colors flex items-center space-x-2"
                  >
                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-orange-400">Contact Us</h3>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-orange-400 mt-0.5 flex-shrink-0" />
                <span className="text-green-200">KR Puram, Bangalore, Karnataka, India</span>
              </li>
              <li>
                <a
                  href="tel:+916363871946"
                  className="flex items-center space-x-3 text-green-200 hover:text-white transition-colors"
                >
                  <Phone className="h-5 w-5 text-orange-400" />
                  <span>+91-6363871946</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:manchumadhumerin@gmail.com"
                  className="flex items-center space-x-3 text-green-200 hover:text-white transition-colors"
                >
                  <Mail className="h-5 w-5 text-orange-400" />
                  <span>manchumadhumerin@gmail.com</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Social & Newsletter */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-orange-400">Follow Us</h3>
            <div className="flex space-x-3 mb-8">
              {[
                { icon: Facebook, href: '#' },
                { icon: Instagram, href: 'https://www.instagram.com/annadata_fruit_bowl?igsh=bGo5N25qNzBpYjBh' },
                { icon: Twitter, href: '#' },
                { icon: Youtube, href: '#' },
              ].map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className="bg-green-800 hover:bg-orange-500 p-3 rounded-full transition-colors"
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
            <div>
              <h4 className="text-sm font-medium mb-3">Subscribe to Newsletter</h4>
              <NewsletterForm />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-green-800" onClick={handleSecretTap}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-green-300 text-sm">
              © {new Date().getFullYear()} Annadata Fruit Bowl. All rights reserved.
            </p>
            <p className="text-green-300 text-sm flex items-center">
              Website Made with <Heart className="h-4 w-4 text-red-500 mx-1 fill-current" /> for Farmers
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

const NewsletterForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/subscribers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'footer' }),
      });
      if (!res.ok) throw new Error('Failed');
      setStatus('success');
      setMessage('Subscribed!');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setMessage('Failed to subscribe');
    }
  };

  return (
    <form className="flex" onSubmit={onSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        className="flex-1 px-4 py-2 rounded-l-lg bg-green-800 border border-green-700 text-white placeholder-green-400 focus:outline-none focus:border-orange-400"
        required
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-r-lg font-medium transition-colors disabled:opacity-50"
      >
        {status === 'loading' ? '...' : 'Join'}
      </button>
      {message && <span className="ml-3 text-sm text-green-300">{message}</span>}
    </form>
  );
};
