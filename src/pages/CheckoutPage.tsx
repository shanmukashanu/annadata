import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, User, Phone, Mail, MapPin, Home, CreditCard, 
  Truck, ShoppingBag, CheckCircle, Loader2, AlertCircle 
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/lib/supabase';

const CheckoutPage: React.FC = () => {
  const { items, getTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: 'Bangalore',
    pincode: '',
    landmark: '',
    notes: '',
    paymentMethod: 'cod',
  });

  const deliveryFee = getTotal() >= 500 ? 0 : 40;
  const finalTotal = getTotal() + deliveryFee;

  const generateOrderNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `AFB-${timestamp}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const newOrderNumber = generateOrderNumber();

    try {
      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          order_number: newOrderNumber,
          customer_name: formData.name,
          customer_phone: formData.phone,
          customer_email: formData.email,
          delivery_address: formData.address,
          delivery_city: formData.city,
          delivery_pincode: formData.pincode,
          delivery_landmark: formData.landmark,
          subtotal: getTotal(),
          delivery_fee: deliveryFee,
          total: finalTotal,
          status: 'pending',
          payment_method: formData.paymentMethod,
          notes: formData.notes,
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: orderData.id,
        product_id: item.id,
        product_name: item.name,
        product_price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Create plan subscriptions (if cart contains any plans)
      try {
        const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
        // identify plan items: ids starting with 'plan_'
        const planItemIds = items
          .filter((it) => String(it.id).startsWith('plan_'))
          .map((it) => String(it.id).replace('plan_', ''));
        if (planItemIds.length > 0) {
          // fetch plans from backend and build map
          const plansRes = await fetch(`${API_URL}/api/plans`);
          const plansJson: any[] = await plansRes.json();
          const planMap = new Map<string, any>();
          plansJson.forEach((p: any) => planMap.set(String(p._id || p.id), p));

          for (const pid of planItemIds) {
            const plan = planMap.get(pid);
            if (!plan) continue;
            const bp: string = plan.billingPeriod || 'monthly';
            const totalDays = bp === 'weekly' ? 7 : bp === 'monthly' ? 30 : bp === 'per_year' ? 365 : 7;
            const { data: subData, error: subErr } = await supabase
              .from('plan_subscriptions')
              .insert([
                {
                  order_id: orderData.id,
                  plan_backend_id: String(plan._id || plan.id),
                  plan_title: plan.title,
                  billing_period: bp,
                  total_days: totalDays,
                },
              ])
              .select()
              .single();
            if (subErr) {
              console.error('Plan subscription insert failed:', subErr);
              continue;
            }
            // Pre-create daily delivery rows as 'pending'
            const deliveries = Array.from({ length: totalDays }, (_, i) => ({
              subscription_id: subData.id,
              day_number: i + 1,
              status: 'pending',
            }));
            const { error: delErr } = await supabase
              .from('plan_deliveries')
              .insert(deliveries);
            if (delErr) {
              console.error('Plan deliveries insert failed:', delErr);
            }
          }
        }
      } catch (planErr) {
        console.error('Plan creation error:', planErr);
        // do not fail the whole checkout on plan creation issues
      }

      setOrderNumber(newOrderNumber);
      setOrderPlaced(true);
      clearCart();
    } catch (err) {
      console.error('Order error:', err);
      setError('Failed to place order. Please try again.');
    }

    setLoading(false);
  };

  if (items.length === 0 && !orderPlaced) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <ShoppingBag className="h-20 w-20 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Add some products before checking out.</p>
          <Link
            to="/products"
            className="inline-flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-full font-medium hover:bg-green-700"
          >
            <span>Browse Products</span>
          </Link>
        </div>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Placed!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your order. We'll deliver your fresh fruits soon!
          </p>
          <div className="bg-green-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-600">Order Number</p>
            <p className="text-2xl font-bold text-green-600">{orderNumber}</p>
          </div>
          <p className="text-sm text-gray-500 mb-8">
            Save this order number to track your delivery status.
          </p>
          <div className="space-y-3">
            <Link
              to={`/track-order?order=${orderNumber}`}
              className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700"
            >
              <Truck className="h-5 w-5" />
              <span>Track Order</span>
            </Link>
            <Link
              to="/"
              className="w-full flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200"
            >
              <Home className="h-5 w-5" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Information */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <User className="h-5 w-5 text-green-600" />
                  <span>Contact Information</span>
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="+91-XXXXXXXXXX"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <span>Delivery Address</span>
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Address *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                      placeholder="House/Flat No., Building, Street, Area"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Bangalore"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pincode *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="560001"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.landmark}
                      onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Near Metro Station, etc."
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  <span>Payment Method</span>
                </h2>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 p-4 border-2 border-green-500 bg-green-50 rounded-xl cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      value="cod"
                      checked={formData.paymentMethod === 'cod'}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="w-5 h-5 text-green-600"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Cash on Delivery</p>
                      <p className="text-sm text-gray-500">Pay when you receive your order</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Order Notes */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Order Notes (Optional)
                </h2>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  placeholder="Any special instructions for delivery..."
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              {/* Mobile Submit Button */}
              <div className="lg:hidden">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-semibold hover:from-green-700 hover:to-green-800 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <span>Place Order - ₹{finalTotal.toFixed(2)}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        ₹{item.price} x {item.quantity} kg
                      </p>
                    </div>
                    <p className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{getTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span>{deliveryFee === 0 ? <span className="text-green-600">FREE</span> : `₹${deliveryFee}`}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                  <span>Total</span>
                  <span>₹{finalTotal.toFixed(2)}</span>
                </div>
              </div>
              <button
                type="submit"
                form="checkout-form"
                onClick={handleSubmit}
                disabled={loading}
                className="hidden lg:flex w-full mt-6 bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-semibold hover:from-green-700 hover:to-green-800 disabled:opacity-50 items-center justify-center space-x-2"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span>Place Order</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
