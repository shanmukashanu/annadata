import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Search, Package, Truck, CheckCircle, Clock, MapPin, Phone, 
  ArrowLeft, Loader2, AlertCircle, Home, ShoppingBag
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_city: string;
  delivery_pincode: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  created_at: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  total: number;
}

const OrderTrackingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (searchParams.get('order')) {
      handleSearch();
    }
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const val = orderNumber.trim();
    if (!val) return;

    setLoading(true);
    setError('');
    setSearched(true);

    // Attempt by order number first
    let orderData: any = null;
    let orderError: any = null;
    const byNumber = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', val.toUpperCase())
      .single();
    orderData = byNumber.data;
    orderError = byNumber.error;

    // Fallback: try exact phone match, pick latest if multiple
    if (orderError || !orderData) {
      const byPhone = await supabase
        .from('orders')
        .select('*')
        .eq('customer_phone', val)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      orderData = byPhone.data;
      orderError = byPhone.error;
    }

    if (orderError || !orderData) {
      setError('Order not found. Please check your order number or phone.');
      setOrder(null);
      setOrderItems([]);
      setLoading(false);
      return;
    }

    const { data: itemsData } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderData.id);

    setOrder(orderData);
    setOrderItems(itemsData || []);
    setLoading(false);
  };

  const getStatusStep = (status: string) => {
    const steps = ['pending', 'confirmed', 'out_for_delivery', 'delivered'];
    return steps.indexOf(status);
  };

  const statusLabels: Record<string, string> = {
    pending: 'Order Placed',
    confirmed: 'Confirmed',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock className="h-6 w-6" />,
    confirmed: <Package className="h-6 w-6" />,
    out_for_delivery: <Truck className="h-6 w-6" />,
    delivered: <CheckCircle className="h-6 w-6" />,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-700 to-green-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-green-100 hover:text-white mb-6"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Home</span>
          </Link>
          <h1 className="text-4xl font-bold mb-4">Track Your Order</h1>
          <p className="text-green-100 text-lg">
            Enter your order number to see the delivery status.
          </p>
        </div>
      </div>

      {/* Search Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Enter your order number (e.g., AFB-XXXXX-XXXX)"
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-xl font-semibold hover:from-green-700 hover:to-green-800 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  <span>Track Order</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading && (
          <div className="text-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
            <p className="text-gray-600">Searching for your order...</p>
          </div>
        )}

        {error && searched && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Order Not Found</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              to="/contact"
              className="inline-flex items-center space-x-2 text-green-600 font-medium hover:text-green-700"
            >
              <Phone className="h-5 w-5" />
              <span>Contact Support</span>
            </Link>
          </div>
        )}

        {order && !loading && (
          <div className="space-y-8">
            {/* Status Timeline */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-8">Order Status</h2>
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                <div className="space-y-8">
                  {['pending', 'confirmed', 'out_for_delivery', 'delivered'].map((status, index) => {
                    const currentStep = getStatusStep(order.status);
                    const isCompleted = index <= currentStep;
                    const isCurrent = index === currentStep;

                    return (
                      <div key={status} className="relative flex items-start space-x-6">
                        <div
                          className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center ${
                            isCompleted
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-400'
                          } ${isCurrent ? 'ring-4 ring-green-200' : ''}`}
                        >
                          {statusIcons[status]}
                        </div>
                        <div className="flex-1 pt-2">
                          <h3
                            className={`font-semibold ${
                              isCompleted ? 'text-gray-900' : 'text-gray-400'
                            }`}
                          >
                            {statusLabels[status]}
                          </h3>
                          {isCurrent && (
                            <p className="text-green-600 text-sm mt-1">Current Status</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Order Details */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Order Info */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Order Details</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Number</span>
                    <span className="font-semibold text-green-600">{order.order_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Date</span>
                    <span className="font-medium">{formatDate(order.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method</span>
                    <span className="font-medium">Cash on Delivery</span>
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span>₹{Number(order.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery</span>
                      <span>{Number(order.delivery_fee) === 0 ? 'FREE' : `₹${order.delivery_fee}`}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold mt-2">
                      <span>Total</span>
                      <span className="text-green-600">₹{Number(order.total).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <span>Delivery Address</span>
                </h2>
                <div className="space-y-2">
                  <p className="font-semibold text-gray-900">{order.customer_name}</p>
                  <p className="text-gray-600">{order.delivery_address}</p>
                  <p className="text-gray-600">
                    {order.delivery_city} - {order.delivery_pincode}
                  </p>
                  <p className="text-gray-600 flex items-center space-x-2">
                    <Phone className="h-4 w-4" />
                    <span>{order.customer_phone}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <ShoppingBag className="h-5 w-5 text-green-600" />
                <span>Order Items</span>
              </h2>
              <div className="divide-y">
                {orderItems.map((item) => (
                  <div key={item.id} className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{item.product_name}</p>
                      <p className="text-sm text-gray-500">
                        ₹{Number(item.product_price).toFixed(2)} x {item.quantity} kg
                      </p>
                    </div>
                    <p className="font-semibold">₹{Number(item.total).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-green-50 rounded-2xl p-6 text-center">
              <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
              <p className="text-gray-600 mb-4">
                Contact us for any queries about your order.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="tel:+916363871946"
                  className="flex items-center space-x-2 text-green-600 font-medium hover:text-green-700"
                >
                  <Phone className="h-5 w-5" />
                  <span>+91-6363871946</span>
                </a>
                <a
                  href="https://wa.me/916363871946"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  <span>Chat on WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {!searched && !loading && (
          <div className="text-center py-20">
            <Package className="h-20 w-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Track Your Order</h3>
            <p className="text-gray-600">
              Enter your order number above to see the delivery status.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTrackingPage;
