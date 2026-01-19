import React, { useState, useEffect } from 'react';
import { Search, Filter, MessageCircle, ShoppingCart, Plus, Minus, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import EnquiryModal from '@/components/EnquiryModal';
import { useCart } from '@/contexts/CartContext';

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image_url: string;
  category: string;
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

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<(Product | Plan & { __kind: 'plan' })[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [enquiryProduct, setEnquiryProduct] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedToCart, setAddedToCart] = useState<Record<string, boolean>>({});
  const [quickView, setQuickView] = useState<'all' | 'products' | 'plans'>('all');

  const { addToCart } = useCart();
  const categories = ['All', 'Regular', 'Seasonal', 'Plans'];
  const whatsappNumber = '916363871946';

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, plans, searchTerm, selectedCategory, sortBy, quickView]);

  const fetchProducts = async () => {
    // fetch products and plans from backend to match Admin data
    try {
      const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
      const [prodRes, plansRes] = await Promise.all([
        fetch(`${API_URL}/api/products`),
        fetch(`${API_URL}/api/plans`),
      ]);
      const [prodJson, plansJson] = await Promise.all([prodRes.json(), plansRes.json()]);
      if (Array.isArray(prodJson)) {
        const mapped = prodJson.map((p: any) => ({
          id: p._id || p.id,
          name: p.name,
          price: p.price,
          description: p.description || '',
          image_url: p.imageUrl || '',
          category: p.category || 'Regular',
        }));
        setProducts(mapped);
        const initialQuantities: Record<string, number> = {};
        mapped.forEach((p: any) => { initialQuantities[p.id] = 1; });
        setQuantities(initialQuantities);
      }
      if (Array.isArray(plansJson)) setPlans(plansJson.map((p: any) => ({ id: p._id || p.id, ...p })) as Plan[]);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    // combine products and plans for filtering
    let combined: (Product | (Plan & { __kind: 'plan' }))[] = [
      ...products,
      ...plans.map((pl) => ({ ...pl, __kind: 'plan' as const })),
    ];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      combined = combined.filter((item: any) => {
        if (item.__kind === 'plan') {
          return (
            item.title.toLowerCase().includes(q) ||
            (item.description || '').toLowerCase().includes(q) ||
            (Array.isArray(item.features) && item.features.join(' ').toLowerCase().includes(q))
          );
        }
        return (
          (item.name || '').toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q)
        );
      });
    }

    if (selectedCategory !== 'All') {
      if (selectedCategory === 'Plans') {
        combined = combined.filter((i: any) => i.__kind === 'plan');
      } else {
        combined = combined.filter((i: any) => !i.__kind && i.category === selectedCategory);
      }
    }

    // Apply quick view toggle if selected
    if (quickView === 'products') {
      combined = combined.filter((i: any) => !i.__kind);
    } else if (quickView === 'plans') {
      combined = combined.filter((i: any) => i.__kind === 'plan');
    }

    switch (sortBy) {
      case 'price-low':
        combined.sort((a: any, b: any) => (a.__kind ? a.price : a.price) - (b.__kind ? b.price : b.price));
        break;
      case 'price-high':
        combined.sort((a: any, b: any) => (b.__kind ? b.price : b.price) - (a.__kind ? a.price : a.price));
        break;
      case 'name':
      default:
        combined.sort((a: any, b: any) => {
          const an = a.__kind ? a.title : a.name;
          const bn = b.__kind ? b.title : b.name;
          return String(an).localeCompare(String(bn));
        });
    }

    setFilteredProducts(combined);
  };

  const openWhatsApp = (productName: string) => {
    const message = encodeURIComponent(
      `Hi! I'm interested in ordering ${productName} from Annadata Fruit Bowl. Please share more details.`
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  const updateQuantity = (productId: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      // allow 500g steps; minimum 0.5 kg
      [productId]: Math.max(0.5, Number(((prev[productId] || 1) + delta).toFixed(1))),
    }));
  };

  const handleAddToCart = (product: Product | (Plan & { __kind: 'plan' })) => {
    addToCart(
      {
        id: product.__kind ? `plan_${product.id}` : (product as Product).id,
        name: (product as any).name || (product as any).title,
        price: product.price,
        image_url: (product as any).image_url || (product as any).imageUrl,
      },
      product.__kind ? 1 : (quantities[(product as Product).id] || 1)
    );
    const key = product.__kind ? `plan_${product.id}` : (product as Product).id;
    setAddedToCart((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setAddedToCart((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-700 to-green-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Products & Plans</h1>
          <p className="text-green-100 text-lg max-w-2xl">
            Explore our wide range of fresh, farm-picked fruits. Quality guaranteed.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 -mt-8 relative z-10">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search fruits & plans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat} Fruits
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="name">Sort by Name</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
          {/* Quick view toggles below search bar */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => setQuickView('products')}
              className={`px-4 py-2 rounded-xl border transition-colors ${
                quickView === 'products' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setQuickView('plans')}
              className={`px-4 py-2 rounded-xl border transition-colors ${
                quickView === 'plans' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Plans
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No products found. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((product: any) => (
              <div
                key={product.__kind ? `plan_${product.id}` : product.id}
                className={`bg-white rounded-2xl overflow-hidden transition-all group ${
                  product.__kind
                    ? 'border-2 border-pink-400 shadow-lg ring-2 ring-pink-200 hover:ring-pink-300 hover:shadow-xl'
                    : 'shadow-lg hover:shadow-xl'
                }`}
              >
                <div className="aspect-square overflow-hidden relative">
                  <img
                    src={product.image_url || product.imageUrl}
                    alt={(product.name || product.title)}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {!product.__kind && (
                    <div className="absolute top-4 right-4">
                      <span className="bg-green-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                        {product.category}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{product.name || product.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold text-green-600">₹{product.price}</span>
                    <span className="text-gray-500 text-sm">{product.__kind ? `/${product.billingPeriod?.replace('per_', '').replace('_', ' ')}` : 'per kg'}</span>
                  </div>

                  {/* Quantity Selector */}
                  {!product.__kind ? (
                    <div className="flex items-center justify-between mb-4 bg-gray-50 rounded-xl p-2">
                      <button
                        onClick={() => updateQuantity(product.id, -0.5)}
                        className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm hover:bg-gray-100 transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="font-semibold text-lg">{(quantities[product.id] || 1) === 0.5 ? '500 g' : `${quantities[product.id] || 1} kg`}</span>
                      <button
                        onClick={() => updateQuantity(product.id, 0.5)}
                        className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm hover:bg-gray-100 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="mb-4"></div>
                  )}

                  {/* Add to Cart Button */}
                  <button
                    onClick={() => handleAddToCart(product)}
                    className={`w-full flex items-center justify-center space-x-2 py-3 rounded-xl font-medium transition-all mb-3 ${
                      addedToCart[product.__kind ? `plan_${product.id}` : product.id]
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
                    }`}
                  >
                    {addedToCart[product.__kind ? `plan_${product.id}` : product.id] ? (
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

                  {/* WhatsApp & Enquiry */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => openWhatsApp(product.name || product.title)}
                      className="flex items-center justify-center space-x-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl text-sm font-medium transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      onClick={() => setEnquiryProduct(product.name || product.title)}
                      className="flex items-center justify-center space-x-1 bg-orange-100 hover:bg-orange-200 text-orange-700 py-2 rounded-xl text-sm font-medium transition-colors"
                    >
                      <span>Enquiry</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enquiry Modal */}
      <EnquiryModal
        isOpen={!!enquiryProduct}
        onClose={() => setEnquiryProduct(null)}
        productName={enquiryProduct || ''}
      />
    </div>
  );
};

export default ProductsPage;
