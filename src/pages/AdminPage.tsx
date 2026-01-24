import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Leaf, LogOut, Package, Star, MessageSquare, Phone, Mail, Users, 
  FileText, Award, Plus, Trash2, Edit, X, Save, Loader2, Menu,
  ShoppingCart, Clock, CheckCircle, Truck, CreditCard, ListChecks
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type TabType = 'orders' | 'products' | 'reviews' | 'blogs' | 'floating' | 'contacts' | 'callbacks' | 'enquiries' | 'farmers' | 'subscribers' | 'plans' | 'newsletter' | 'participants' | 'payments' | 'paid_orders' | 'surveys' | 'staff' | 'transfers';

const AdminPage: React.FC = () => {
  const { isAdmin, logout, adminEmail, token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [orderItemsByOrder, setOrderItemsByOrder] = useState<Record<string, any[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [planSubs, setPlanSubs] = useState<any[]>([]);
  const [planDeliveries, setPlanDeliveries] = useState<Record<string, any[]>>({});
  const [visibleDaysBySub, setVisibleDaysBySub] = useState<Record<string, number>>({});
  const [ordersWithPlans, setOrdersWithPlans] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'total_desc' | 'total_asc'>('date_desc');
  const [showOnly, setShowOnly] = useState<'all' | 'products' | 'plans'>('all');
  const [expandedSubs, setExpandedSubs] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'admin_rejected' | 'out_of_stock' | 'paid' | 'confirmed' | 'shipped' | 'out_for_delivery' | 'customer_rejected' | 'delivered' | 'rejected'>('all');
  const [surveyQuestions, setSurveyQuestions] = useState<{ text: string; required: boolean }[]>([{ text: '', required: false }]);
  const [showResponsesFor, setShowResponsesFor] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [surveySubtab, setSurveySubtab] = useState<'out' | 'in'>('out');
  const [newSurvey, setNewSurvey] = useState<{ title: string; description: string; active: boolean }>({ title: '', description: '', active: true });
  const [selectedRespondentIdx, setSelectedRespondentIdx] = useState<number | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cod' | 'payment_pending' | 'payment_success'>('all');
  const [paymentsByOrder, setPaymentsByOrder] = useState<Record<string, { status: string; method?: string }>>({});
  const [paymentsStatusFilter, setPaymentsStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [paymentsMethodFilter, setPaymentsMethodFilter] = useState<'all' | 'qr' | 'upi' | 'card' | 'unknown'>('all');
  const [staffFilter, setStaffFilter] = useState<'all' | string>('all');
  const [staffByOrder, setStaffByOrder] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin-login');
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const getTableName = () => {
    const tables: Record<TabType, string> = {
      orders: 'orders',
      products: 'products',
      reviews: 'reviews',
      blogs: 'blogs',
      floating: 'floating_texts',
      contacts: 'contact_forms',
      callbacks: 'callback_requests',
      enquiries: 'enquiries',
      farmers: 'lucky_farmers',
      subscribers: 'lucky_subscribers',
      plans: 'plans',
      newsletter: 'subscribers',
      participants: 'participants',
      payments: 'payments',
      paid_orders: 'payments',
      surveys: 'surveys',
      staff: 'staff',
      transfers: 'transfers',
    };
    return tables[activeTab];
  };

  const extendSubscriptionDays = async (subscriptionId: string, currentTotal: number, addDays: number) => {
    const toAdd = Number(addDays);
    if (!toAdd || toAdd <= 0) return;
    // Update total_days
    const newTotal = currentTotal + toAdd;
    await supabase
      .from('plan_subscriptions')
      .update({ total_days: newTotal })
      .eq('id', subscriptionId);
    // Insert new pending deliveries for the extended range
    const deliveries = Array.from({ length: toAdd }, (_, i) => ({
      subscription_id: subscriptionId,
      day_number: currentTotal + i + 1,
      status: 'pending',
    }));
    await supabase
      .from('plan_deliveries')
      .insert(deliveries);
    // Refresh local state
    setPlanSubs((prev) => prev.map((s) => s.id === subscriptionId ? { ...s, total_days: newTotal } : s));
    setPlanDeliveries((prev) => ({
      ...prev,
      [subscriptionId]: [ ...(prev[subscriptionId] || []), ...deliveries.map((d, idx) => ({ id: `temp-${Date.now()}-${idx}`, ...d })) ],
    }));
  };

  const bulkUpdateDeliveryStatus = async (subscriptionId: string, status: string, scope: 'pending' | 'all') => {
    // Update rows in DB
    let query = supabase
      .from('plan_deliveries')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('subscription_id', subscriptionId);
    if (scope === 'pending') query = query.eq('status', 'pending');
    await query;
    // Recompute delivered_count
    const { data: dels } = await supabase
      .from('plan_deliveries')
      .select('day_number,status')
      .eq('subscription_id', subscriptionId)
      .order('day_number', { ascending: true });
    const deliveredCount = (dels || []).filter((d) => d.status === 'delivered').length;
    await supabase
      .from('plan_subscriptions')
      .update({ delivered_count: deliveredCount })
      .eq('id', subscriptionId);
    // Update local state
    setPlanDeliveries((prev) => ({ ...prev, [subscriptionId]: dels || [] }));
    setPlanSubs((prev) => prev.map((s) => s.id === subscriptionId ? { ...s, delivered_count: deliveredCount } : s));
  };

  const fetchData = async () => {
    setLoading(true);
    const backendTabs: TabType[] = ['plans', 'newsletter', 'participants', 'products', 'reviews', 'blogs', 'farmers', 'subscribers', 'payments', 'surveys', 'staff', 'transfers'];
    if (backendTabs.includes(activeTab)) {
      const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
      const endpoint =
        activeTab === 'farmers' ? 'lucky-farmers'
        : activeTab === 'subscribers' ? 'lucky-subscribers'
        : activeTab === 'transfers' ? 'admin/transfers'
        : getTableName();
      const res = await fetch(`${API_URL}/api/${endpoint}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const json = await res.json();
      const mapped = Array.isArray(json)
        ? json.map((it: any) => ({ id: it._id || it.id, ...it }))
        : [];
      setData(mapped);
    } else {
      const { data: result } = await supabase
        .from(getTableName())
        .select('*')
        .order('created_at', { ascending: false });
      const rows = result || [];
      setData(rows);
      // Prefetch order_items for Orders tab to support filtering by item names
      if (activeTab === 'orders' && rows.length) {
        const orderIds = rows.map((r: any) => r.id);
        const { data: itemsData } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);
        const map: Record<string, any[]> = {};
        (itemsData || []).forEach((it) => {
          if (!map[it.order_id]) map[it.order_id] = [];
          map[it.order_id].push(it);
        });
        setOrderItemsByOrder(map);

        // Determine which orders have plan subscriptions
        const { data: subsData } = await supabase
          .from('plan_subscriptions')
          .select('order_id')
          .in('order_id', orderIds);
        const planMap: Record<string, boolean> = {};
        (subsData || []).forEach((s: any) => { planMap[s.order_id] = true; });

        // Fallback: infer plans by matching item names to backend plan titles (in case subs table not populated yet)
        try {
          const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
          const plansRes = await fetch(`${API_URL}/api/plans`);
          const plansJson: any[] = await plansRes.json();
          const planTitles = new Set((plansJson || []).map((p: any) => String(p.title || '').trim().toLowerCase()));
          rows.forEach((r: any) => {
            const items = map[r.id] || [];
            const hasPlanByTitle = items.some((it) => planTitles.has(String(it.product_name || '').trim().toLowerCase()));
            if (hasPlanByTitle) planMap[r.id] = true;
          });
        } catch (e) {
          // ignore backend fetch errors; rely on subs data
        }

        setOrdersWithPlans(planMap);

        // Load payments to map latest status/method per orderNumber for payment column/filtering
        try {
          const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
          const payRes = await fetch(`${API_URL}/api/payments`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
          const payJson: any[] = await payRes.json();
          const pm: Record<string, { status: string; method?: string }> = {};
          (payJson || []).forEach((p: any) => {
            // keep latest by createdAt
            const k = String(p.orderNumber || '').trim();
            if (!k) return;
            if (!pm[k] || new Date(p.createdAt).getTime() > (pm as any)[k]._ts) {
              (pm as any)[k] = { status: String(p.status || 'pending'), method: p.method, _ts: new Date(p.createdAt).getTime() };
            }
          });
          // strip helper
          const clean: Record<string, { status: string; method?: string }> = {};
          Object.keys(pm).forEach((k) => { clean[k] = { status: (pm as any)[k].status, method: (pm as any)[k].method }; });
          setPaymentsByOrder(clean);
        } catch {}

        // Load latest staff action per order to show 'Handled by' and support staff filtering
        try {
          const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
          const orderNumbers = rows.map((r: any) => r.order_number).filter(Boolean).join(',');
          if (orderNumbers) {
            const res2 = await fetch(`${API_URL}/api/staff-actions?orderNumbers=${encodeURIComponent(orderNumbers)}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
            const list = await res2.json();
            const mapHandled: Record<string, string> = {};
            (list || []).forEach((it: any) => { mapHandled[it.orderNumber] = it.staffCode; });
            setStaffByOrder(mapHandled);
          } else {
            setStaffByOrder({});
          }
        } catch {}
      }
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    const backendTabs: TabType[] = ['plans', 'newsletter', 'participants', 'products', 'reviews', 'blogs', 'farmers', 'subscribers', 'payments', 'surveys', 'staff'];
    if (backendTabs.includes(activeTab)) {
      const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
      const endpoint =
        activeTab === 'farmers' ? 'lucky-farmers'
        : activeTab === 'subscribers' ? 'lucky-subscribers'
        : getTableName();
      await fetch(`${API_URL}/api/${endpoint}/${id}` , {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } else {
      await supabase.from(getTableName()).delete().eq('id', id);
    }
    fetchData();
  };

  const handleSave = async () => {
    const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
    if (editItem) {
      if (activeTab === 'plans') {
        // For simplicity, create only; editing can be added later
      } else {
        // Keep Supabase editing for now (not migrating edit flows)
        await supabase.from(getTableName()).update(formData).eq('id', editItem.id);
      }
    } else {
      if (activeTab === 'plans') {
        const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
        const fd = new FormData();
        fd.append('title', formData.title || '');
        fd.append('price', String(formData.price || ''));
        fd.append('billingPeriod', formData.billingPeriod || 'monthly');
        fd.append('description', formData.description || '');
        if (Array.isArray(formData.features)) {
          fd.append('features', JSON.stringify(formData.features));
        } else if (typeof formData.features === 'string') {
          fd.append('features', formData.features);
        }
        fd.append('popular', String(!!formData.popular));
        if (formData.order != null) fd.append('order', String(formData.order));
        if (formData.imageUrl) fd.append('imageUrl', formData.imageUrl);
        if (formData.imageFile) fd.append('image', formData.imageFile);
        await fetch(`${API_URL}/api/plans`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: fd,
        });
      } else {
        const backendTabs: TabType[] = ['products', 'reviews', 'blogs', 'farmers', 'subscribers', 'surveys', 'staff'];
        if (backendTabs.includes(activeTab)) {
          let endpoint = getTableName();
          if (activeTab === 'farmers') endpoint = 'lucky-farmers';
          if (activeTab === 'subscribers') endpoint = 'lucky-subscribers';
          if (activeTab === 'surveys') {
            const parseQuestions = () => {
              const qs = formData.questions;
              if (Array.isArray(qs)) return qs;
              if (typeof qs === 'string') {
                try {
                  const arr = JSON.parse(qs);
                  if (Array.isArray(arr)) {
                    return arr
                      .map((it: any) => ({ text: String((it?.text ?? it) || '').trim(), required: !!it?.required }))
                      .filter((q: any) => q.text);
                  }
                } catch {}
                return String(qs)
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((t) => ({ text: t, required: false }));
              }
              return [];
            };
            const body = {
              title: formData.title || '',
              description: formData.description || '',
              active: !!formData.active,
              questions: parseQuestions(),
            };
            await fetch(`${API_URL}/api/${endpoint}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify(body),
            });
          } else if (activeTab === 'staff') {
            const body = {
              name: formData.name || '',
              username: formData.username || '',
              password: formData.password || '',
              staffCode: formData.staffCode || '',
              active: formData.active !== false,
            };
            await fetch(`${API_URL}/api/${endpoint}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify(body),
            });
          } else if (activeTab === 'products') {
            const fd = new FormData();
            fd.append('name', formData.name || '');
            if (formData.description) fd.append('description', formData.description);
            if (formData.price != null) fd.append('price', String(formData.price));
            if (formData.image_url) fd.append('imageUrl', formData.image_url);
            if (formData.imageFile) fd.append('image', formData.imageFile);
          } else if (activeTab === 'reviews') {
            const fd = new FormData();
            fd.append('name', formData.name || '');
            if (formData.review_text) fd.append('text', formData.review_text);
            if (formData.image_url) fd.append('imageUrl', formData.image_url);
            if (formData.imageFile) fd.append('image', formData.imageFile);
          } else if (activeTab === 'blogs') {
            const fd = new FormData();
            fd.append('title', formData.title || '');
            if (formData.content) fd.append('content', formData.content);
            if (formData.image_url) fd.append('mediaUrl', formData.image_url);
            if (formData.imageFile) fd.append('media', formData.imageFile);
          } else if (activeTab === 'farmers' || activeTab === 'subscribers') {
            const fd = new FormData();
            fd.append('name', formData.name || '');
            if (formData.content) fd.append('content', formData.content);
            if (formData.phone) fd.append('phone', formData.phone);
            if (formData.image_url) fd.append('imageUrl', formData.image_url);
            if (formData.imageFile) fd.append('image', formData.imageFile);
          }

          // If not surveys, send FormData (fd). Since we declared a new fd per-branch, we need to resend based on activeTab
          if (activeTab === 'products' || activeTab === 'reviews' || activeTab === 'blogs' || activeTab === 'farmers' || activeTab === 'subscribers') {
            const fdToSend = new FormData();
            if (activeTab === 'products') {
              fdToSend.append('name', formData.name || '');
              if (formData.description) fdToSend.append('description', formData.description);
              if (formData.price != null) fdToSend.append('price', String(formData.price));
              if (formData.image_url) fdToSend.append('imageUrl', formData.image_url);
              if (formData.imageFile) fdToSend.append('image', formData.imageFile);
            } else if (activeTab === 'reviews') {
              fdToSend.append('name', formData.name || '');
              if (formData.review_text) fdToSend.append('text', formData.review_text);
              if (formData.image_url) fdToSend.append('imageUrl', formData.image_url);
              if (formData.imageFile) fdToSend.append('image', formData.imageFile);
            } else if (activeTab === 'blogs') {
              fdToSend.append('title', formData.title || '');
              if (formData.content) fdToSend.append('content', formData.content);
              if (formData.image_url) fdToSend.append('mediaUrl', formData.image_url);
              if (formData.imageFile) fdToSend.append('media', formData.imageFile);
            } else if (activeTab === 'farmers' || activeTab === 'subscribers') {
              fdToSend.append('name', formData.name || '');
              if (formData.content) fdToSend.append('content', formData.content);
              if (formData.phone) fdToSend.append('phone', formData.phone);
              if (formData.image_url) fdToSend.append('imageUrl', formData.image_url);
              if (formData.imageFile) fdToSend.append('image', formData.imageFile);
            }
            await fetch(`${API_URL}/api/${endpoint}`, {
              method: 'POST',
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              body: fdToSend,
            });
          }
        } else {
          await supabase.from(getTableName()).insert([formData]);
        }
      }
    }
    setShowForm(false);
    setEditItem(null);
    setFormData({});
    fetchData();
  };

  const openForm = (item?: any) => {
    if (item) {
      setEditItem(item);
      setFormData(item);
    } else {
      setEditItem(null);
      setFormData({});
    }
    setShowForm(true);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);
    fetchData();
    if (selectedOrder?.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
  };

  const viewOrderDetails = async (order: any) => {
    setSelectedOrder(order);
    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);
    setOrderItems(items || []);
    // Load plan subscriptions and deliveries for this order
    const { data: subs } = await supabase
      .from('plan_subscriptions')
      .select('*')
      .eq('order_id', order.id);
    setPlanSubs(subs || []);
    const deliveriesMap: Record<string, any[]> = {};
    for (const sub of subs || []) {
      const { data: dels } = await supabase
        .from('plan_deliveries')
        .select('*')
        .eq('subscription_id', sub.id)
        .order('day_number', { ascending: true });
      deliveriesMap[sub.id] = dels || [];
    }
    setPlanDeliveries(deliveriesMap);
    // initialize visible days (show 10 initially per subscription)
    const vis: Record<string, number> = {};
    (subs || []).forEach((s: any) => { vis[s.id] = 10; });
    setVisibleDaysBySub(vis);
    // collapse by default; admin can expand with 'Detailed view'
    const exp: Record<string, boolean> = {};
    (subs || []).forEach((s: any) => { exp[s.id] = false; });
    setExpandedSubs(exp);
  };

  const updateDeliveryStatus = async (subscriptionId: string, dayNumber: number, newStatus: string) => {
    await supabase
      .from('plan_deliveries')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('subscription_id', subscriptionId)
      .eq('day_number', dayNumber);
    // Recompute delivered_count and update subscription
    const { data: dels } = await supabase
      .from('plan_deliveries')
      .select('status')
      .eq('subscription_id', subscriptionId);
    const deliveredCount = (dels || []).filter((d) => d.status === 'delivered').length;
    await supabase
      .from('plan_subscriptions')
      .update({ delivered_count: deliveredCount })
      .eq('id', subscriptionId);
    // refresh local state
    setPlanDeliveries((prev) => ({ ...prev, [subscriptionId]: (prev[subscriptionId] || []).map((d) => d.day_number === dayNumber ? { ...d, status: newStatus } : d) }));
    setPlanSubs((prev) => prev.map((s) => s.id === subscriptionId ? { ...s, delivered_count: deliveredCount } : s));
  };

  const tabs = [
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'blogs', label: 'Blogs', icon: FileText },
    { id: 'floating', label: 'Floating Text', icon: MessageSquare },
    { id: 'contacts', label: 'Contact Forms', icon: Mail },
    { id: 'callbacks', label: 'Callbacks', icon: Phone },
    { id: 'enquiries', label: 'Enquiries', icon: MessageSquare },
    { id: 'farmers', label: 'Lucky Farmers', icon: Users },
    { id: 'subscribers', label: 'Lucky Subscribers', icon: Award },
    { id: 'plans', label: 'Plans', icon: Award },
    { id: 'newsletter', label: 'Newsletter', icon: Mail },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'paid_orders', label: 'Paid Orders', icon: CreditCard },
    { id: 'surveys', label: 'Surveys', icon: ListChecks },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'transfers', label: 'Transfers', icon: Truck },
  ];

  const orderStatuses = [
    { value: 'pending', label: 'Pending', color: 'yellow' },
    { value: 'admin_rejected', label: 'Admin Rejected', color: 'red' },
    { value: 'out_of_stock', label: 'Out of Stock', color: 'orange' },
    { value: 'paid', label: 'Paid', color: 'green' },
    { value: 'confirmed', label: 'Confirmed', color: 'blue' },
    { value: 'shipped', label: 'Shipped', color: 'indigo' },
    { value: 'out_for_delivery', label: 'Out for Delivery', color: 'purple' },
    { value: 'customer_rejected', label: 'Customer Rejected', color: 'red' },
    { value: 'delivered', label: 'Delivered', color: 'green' },
    // legacy
    { value: 'rejected', label: 'Rejected', color: 'red' },
  ];

  // Admin: allow changing order status to any value directly
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);
    // Optimistically update modal and refresh table
    setSelectedOrder((prev: any) => (prev && prev.id === orderId ? { ...prev, status: newStatus } : prev));
    fetchData();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = orderStatuses.find(s => s.value === status) || orderStatuses[0];
    const colorClasses: Record<string, string> = {
      yellow: 'bg-yellow-100 text-yellow-800',
      blue: 'bg-blue-100 text-blue-800',
      indigo: 'bg-indigo-100 text-indigo-800',
      purple: 'bg-purple-100 text-purple-800',
      green: 'bg-green-100 text-green-800',
      red: 'bg-red-100 text-red-800',
      orange: 'bg-orange-100 text-orange-800',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colorClasses[statusConfig.color]}`}>
        {statusConfig.label}
      </span>
    );
  };

  const renderOrdersTable = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      );
    }

    const filtered = data.filter((order) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.trim().toLowerCase();
      const basicMatch =
        String(order.order_number || '').toLowerCase().includes(term) ||
        String(order.customer_name || '').toLowerCase().includes(term) ||
        String(order.customer_phone || '').toLowerCase().includes(term);
      if (basicMatch) return true;
      const items = orderItemsByOrder[order.id] || [];
      return items.some((it) => String(it.product_name || '').toLowerCase().includes(term));
    });

    // Apply showOnly filter (plans/products)
    const filteredByType = filtered.filter((order) => {
      if (showOnly === 'all') return true;
      const hasPlan = !!ordersWithPlans[order.id];
      return showOnly === 'plans' ? hasPlan : !hasPlan;
    });

    // Apply status filter
    const filteredByStatus = filteredByType.filter((order) => statusFilter === 'all' ? true : String(order.status) === statusFilter);

    // Apply payment filter
    const filteredByPayment = filteredByStatus.filter((order) => {
      if (paymentFilter === 'all') return true;
      const paid = String(order.status) === 'paid' || (paymentsByOrder[order.order_number]?.status === 'approved');
      const pending = paymentsByOrder[order.order_number]?.status === 'pending';
      if (paymentFilter === 'payment_success') return paid;
      if (paymentFilter === 'payment_pending') return !paid && pending;
      // cod => no online payment record and not paid
      return !paid && !pending;
    });

    // Apply staff filter
    const filteredByStaff = filteredByPayment.filter((order) => {
      if (staffFilter === 'all') return true;
      const code = staffByOrder[order.order_number] || '';
      return code === staffFilter;
    });

    // Apply sorting
    const sorted = [...filteredByStaff].sort((a: any, b: any) => {
      if (sortBy === 'date_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'date_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'total_desc') return Number(b.total) - Number(a.total);
      if (sortBy === 'total_asc') return Number(a.total) - Number(b.total);
      return 0;
    });

    return (
      <div className="overflow-x-auto">
        <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2 w-full md:w-1/2">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone, order #, product/plan..."
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
            {searchTerm && (
              <button onClick={() => { setSearchTerm(''); setShowOnly('all'); }} className="px-3 py-2 border rounded-lg hover:bg-gray-50">Clear</button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border">
              <button
                className={`px-3 py-2 ${showOnly === 'all' ? 'bg-green-600 text-white' : 'bg-white'}`}
                onClick={() => setShowOnly('all')}
              >All</button>
              <button
                className={`px-3 py-2 ${showOnly === 'products' ? 'bg-green-600 text-white' : 'bg-white'}`}
                onClick={() => setShowOnly('products')}
              >Products</button>
              <button
                className={`px-3 py-2 ${showOnly === 'plans' ? 'bg-green-600 text-white' : 'bg-white'}`}
                onClick={() => setShowOnly('plans')}
              >Plans</button>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border rounded-lg bg-white"
              title="Filter by order status"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="admin_rejected">Admin Rejected</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="paid">Paid</option>
              <option value="confirmed">Confirmed</option>
              <option value="shipped">Shipped</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="customer_rejected">Customer Rejected</option>
              <option value="delivered">Delivered</option>
              <option value="rejected">Rejected (legacy)</option>
            </select>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="px-3 py-2 border rounded-lg bg-white"
              title="Filter by payment"
            >
              <option value="all">All payments</option>
              <option value="payment_pending">Payment pending</option>
              <option value="payment_success">Payment success</option>
              <option value="cod">COD</option>
            </select>
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white"
              title="Filter by staff code"
            >
              <option value="all">All staff</option>
              {Array.from(new Set(Object.values(staffByOrder).filter(Boolean))).map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              <option value="date_desc">Newest</option>
              <option value="date_asc">Oldest</option>
              <option value="total_desc">Total: High → Low</option>
              <option value="total_asc">Total: Low → High</option>
            </select>
            <button
              onClick={() => { setSearchTerm(''); setShowOnly('all'); setStatusFilter('all'); setPaymentFilter('all'); setStaffFilter('all'); setSortBy('date_desc'); }}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50"
            >Reset Filters</button>
          </div>
        </div>
        {sorted.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            No orders found.
          </div>
        ) : (
          <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Handled by</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sorted.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 text-sm font-medium text-green-600">{order.order_number}</td>
                <td className="px-4 py-4 text-sm">
                  <p className="font-medium text-gray-900">{order.customer_name}</p>
                  <p className="text-gray-500">{order.customer_phone}</p>
                </td>
                <td className="px-4 py-4 text-sm font-semibold">₹{Number(order.total).toFixed(2)}</td>
                <td className="px-4 py-4">{getStatusBadge(order.status)}</td>
                <td className="px-4 py-4 text-sm">
                  {String(order.status) === 'paid' ? (
                    <span className="text-green-700">Paid</span>
                  ) : paymentsByOrder[order.order_number] ? (
                    <span className="text-orange-700">{(paymentsByOrder[order.order_number].method || 'online').toUpperCase()} • {paymentsByOrder[order.order_number].status}</span>
                  ) : (
                    <span>COD</span>
                  )}
                </td>
                <td className="px-4 py-4 text-sm">{staffByOrder[order.order_number] || '-'}</td>
                <td className="px-4 py-4 text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleDateString('en-IN')}
                </td>
                <td className="px-4 py-4 text-right space-x-2">
                  <button
                    onClick={() => viewOrderDetails(order)}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDelete(order.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {/* Optional image upload for Supabase tabs */}
            {['products','reviews','blogs','farmers','subscribers'].includes(activeTab) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image (optional)</label>
                <input type="file" accept="image/*" onChange={(e) => setFormData({ ...formData, imageFile: e.target.files?.[0] })} />
                <p className="text-xs text-gray-500 mt-1">You can either paste an Image URL field or upload a file. If both are provided, the uploaded file will be used.</p>
              </div>
            )}
          </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderOrderModal = () => {
    if (!selectedOrder) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedOrder(null)}></div>
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Order Details</h3>
              <p className="text-sm text-green-600">{selectedOrder.order_number}</p>
            </div>
            <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Status Update */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Update Status</h4>
              <div className="flex flex-wrap gap-2">
                {orderStatuses.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => updateOrderStatus(selectedOrder.id, status.value)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                      selectedOrder.status === status.value
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span>{status.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Customer Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 mb-2">Customer</h4>
                <p className="text-gray-700">{selectedOrder.customer_name}</p>
                <p className="text-gray-500">{selectedOrder.customer_phone}</p>
                {selectedOrder.customer_email && (
                  <p className="text-gray-500">{selectedOrder.customer_email}</p>
                )}
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 mb-2">Delivery Address</h4>
                <p className="text-gray-700">{selectedOrder.delivery_address}</p>
                <p className="text-gray-500">
                  {selectedOrder.delivery_city} - {selectedOrder.delivery_pincode}
                </p>
                {selectedOrder.delivery_landmark && (
                  <p className="text-gray-500">Landmark: {selectedOrder.delivery_landmark}</p>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Order Items</h4>
              <div className="bg-gray-50 rounded-xl divide-y">
                {orderItems.map((item) => (
                  <div key={item.id} className="p-4 flex justify-between">
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

            {/* Plan Subscriptions */}
            {planSubs.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Plan Subscriptions</h4>
                <div className="space-y-4">
                  {planSubs.map((sub) => (
                    <div key={sub.id} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{sub.plan_title}</p>
                          <p className="text-sm text-gray-600">{sub.billing_period} • {sub.delivered_count}/{sub.total_days} delivered</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={1}
                              placeholder="Add days"
                              className="w-24 px-2 py-1 border rounded"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = Number((e.target as HTMLInputElement).value);
                                  extendSubscriptionDays(sub.id, sub.total_days, val);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                const inp = (document.activeElement as HTMLInputElement);
                                const val = Number(inp?.value || '');
                                extendSubscriptionDays(sub.id, sub.total_days, val);
                                if (inp) inp.value = '';
                              }}
                              className="px-3 py-1 bg-white border rounded hover:bg-gray-50"
                            >Extend</button>
                          </div>
                          <div className="flex items-center gap-1">
                            <select id={`bulk-status-${sub.id}`} className="px-2 py-1 border rounded">
                              <option value="pending">pending</option>
                              <option value="shipped">shipped</option>
                              <option value="out_for_delivery">out_for_delivery</option>
                              <option value="delivered">delivered</option>
                              <option value="rejected">rejected</option>
                            </select>
                            <button
                              onClick={() => {
                                const sel = document.getElementById(`bulk-status-${sub.id}`) as HTMLSelectElement;
                                bulkUpdateDeliveryStatus(sub.id, sel.value, 'pending');
                              }}
                              className="px-3 py-1 bg-white border rounded hover:bg-gray-50"
                            >Apply to pending</button>
                            <button
                              onClick={() => {
                                const sel = document.getElementById(`bulk-status-${sub.id}`) as HTMLSelectElement;
                                bulkUpdateDeliveryStatus(sub.id, sel.value, 'all');
                              }}
                              className="px-3 py-1 bg-white border rounded hover:bg-gray-50"
                            >Apply to all</button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedSubs((prev) => ({ ...prev, [sub.id]: !prev[sub.id] }))}
                          className="px-3 py-1 bg-white border rounded hover:bg-gray-50"
                        >{expandedSubs[sub.id] ? 'Hide details' : 'Detailed view'}</button>
                      </div>
                      {expandedSubs[sub.id] && (
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {(planDeliveries[sub.id] || []).slice(0, visibleDaysBySub[sub.id] || 10).map((d) => (
                          <div key={d.day_number} className="bg-white border rounded-lg p-2 text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">Day {d.day_number}</span>
                            </div>
                            <select
                              value={d.status}
                              onChange={(e) => updateDeliveryStatus(sub.id, d.day_number, e.target.value)}
                              className="w-full px-2 py-1 border rounded"
                            >
                              <option value="pending">pending</option>
                              <option value="shipped">shipped</option>
                              <option value="out_for_delivery">out_for_delivery</option>
                              <option value="delivered">delivered</option>
                              <option value="rejected">rejected</option>
                            </select>
                          </div>
                        ))}
                        {((planDeliveries[sub.id] || []).length > (visibleDaysBySub[sub.id] || 10)) && (
                          <button
                            onClick={() => setVisibleDaysBySub((prev) => ({ ...prev, [sub.id]: (prev[sub.id] || 10) + 10 }))}
                            className="col-span-full mt-2 px-3 py-2 bg-white border rounded hover:bg-gray-50"
                          >View more</button>
                        )}
                      </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-green-50 rounded-xl p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{Number(selectedOrder.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee</span>
                  <span>{Number(selectedOrder.delivery_fee) === 0 ? 'FREE' : `₹${selectedOrder.delivery_fee}`}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-green-200">
                  <span>Total</span>
                  <span>₹{Number(selectedOrder.total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedOrder.notes && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Order Notes</h4>
                <p className="text-gray-600 bg-gray-50 rounded-xl p-4">{selectedOrder.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderForm = () => {
    const fields: Record<TabType, { name: string; type: string; required?: boolean }[]> = {
      orders: [],
      products: [
        { name: 'name', type: 'text', required: true },
        { name: 'price', type: 'number', required: true },
        { name: 'description', type: 'textarea' },
        { name: 'image_url', type: 'text' },
        { name: 'category', type: 'text' },
      ],
      reviews: [
        { name: 'name', type: 'text', required: true },
        { name: 'designation', type: 'text' },
        { name: 'image_url', type: 'text' },
        { name: 'review_text', type: 'textarea', required: true },
      ],
      blogs: [
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'textarea', required: true },
        { name: 'image_url', type: 'text' },
        { name: 'video_url', type: 'text' },
      ],
      floating: [
        { name: 'text', type: 'textarea', required: true },
      ],
      contacts: [],
      callbacks: [],
      enquiries: [],
      farmers: [
        { name: 'name', type: 'text', required: true },
        { name: 'image_url', type: 'text' },
        { name: 'content', type: 'textarea' },
        { name: 'phone', type: 'text' },
      ],
      subscribers: [
        { name: 'name', type: 'text', required: true },
        { name: 'image_url', type: 'text' },
        { name: 'content', type: 'textarea' },
        { name: 'phone', type: 'text' },
      ],
      plans: [
        { name: 'title', type: 'text', required: true },
        { name: 'price', type: 'number', required: true },
        { name: 'billingPeriod', type: 'text', required: true },
        { name: 'features', type: 'textarea' },
        { name: 'description', type: 'textarea' },
        { name: 'imageUrl', type: 'text' },
        { name: 'order', type: 'number' },
      ],
      newsletter: [],
      participants: [],
      payments: [],
      paid_orders: [],
      surveys: [
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'textarea' },
        { name: 'questions', type: 'textarea' },
      ],
      staff: [
        { name: 'name', type: 'text' },
        { name: 'username', type: 'text', required: true },
        { name: 'password', type: 'text', required: true },
        { name: 'staffCode', type: 'text', required: true },
      ],
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{editItem ? 'Edit' : 'Add'} {activeTab}</h3>
            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {fields[activeTab].map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                  {field.name.replace('_', ' ')} {field.required && '*'}
                </label>
                {field.name === 'billingPeriod' ? (
                  <select
                    value={formData.billingPeriod || 'monthly'}
                    onChange={(e) => setFormData({ ...formData, billingPeriod: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    <option value="weekly">weekly</option>
                    <option value="monthly">monthly</option>
                    <option value="per_day">per_day</option>
                    <option value="per_serve">per_serve</option>
                    <option value="per_year">per_year</option>
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                ) : (
                  <input
                    type={field.type}
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: field.type === 'number' ? parseFloat(e.target.value) : e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                )}
              </div>
            ))}
            {['products','reviews','blogs','farmers','subscribers'].includes(activeTab) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image (optional)</label>
                <input type="file" accept="image/*" onChange={(e) => setFormData({ ...formData, imageFile: e.target.files?.[0] })} />
                <p className="text-xs text-gray-500 mt-1">You can paste an Image URL or upload a file. If both are provided, the uploaded file will be used.</p>
              </div>
            )}
            {activeTab === 'plans' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                <input type="file" accept="image/*" onChange={(e) => setFormData({ ...formData, imageFile: e.target.files?.[0] })} />
                <div className="mt-3 flex items-center space-x-2">
                  <label className="text-sm text-gray-700">Popular</label>
                  <input type="checkbox" checked={!!formData.popular} onChange={(e) => setFormData({ ...formData, popular: e.target.checked })} />
                </div>
                <p className="text-xs text-gray-500 mt-2">Features: enter as JSON array or comma-separated lines.</p>
              </div>
            )}
            <button
              onClick={handleSave}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center space-x-2"
            >
              <Save className="h-5 w-5" />
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (activeTab === 'transfers') {
      if (loading) {
        return (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        );
      }
      if (data.length === 0) return <div className="text-center py-20 text-gray-500">No transfers found.</div>;
      return (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Decided At</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((t:any) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-green-700 font-medium">{t.orderNumber}</td>
                  <td className="px-4 py-3 text-sm">{t.fromStaff}</td>
                  <td className="px-4 py-3 text-sm">{t.toStaff}</td>
                  <td className="px-4 py-3 text-sm capitalize">{t.status}</td>
                  <td className="px-4 py-3 text-sm">{t.decidedAt ? new Date(t.decidedAt).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 text-sm">{t.createdAt ? new Date(t.createdAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (activeTab === 'surveys') {
      const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
      const loadResponses = async (survey: any) => {
        setShowResponsesFor(survey);
        setResponses([]);
        setResponsesLoading(true);
        try {
          const res = await fetch(`${API_URL}/api/surveys/${survey.id}/responses`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
          const json = await res.json();
          setResponses(Array.isArray(json) ? json : []);
          setSelectedRespondentIdx(null);
        } finally {
          setResponsesLoading(false);
        }
      };

      const saveSurvey = async () => {
        const body = {
          title: newSurvey.title.trim(),
          description: newSurvey.description,
          active: !!newSurvey.active,
          questions: surveyQuestions
            .map((q) => ({ text: String(q.text || '').trim(), required: !!q.required }))
            .filter((q) => q.text),
        };
        if (!body.title) return alert('Title is required');
        if (body.questions.length === 0) return alert('Add at least one question');
        await fetch(`${API_URL}/api/surveys`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(body),
        });
        // reset and switch to Out
        setNewSurvey({ title: '', description: '', active: true });
        setSurveyQuestions([{ text: '', required: false }]);
        setSurveySubtab('out');
        fetchData();
      };

      return (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <button className={`px-4 py-2 rounded-lg ${surveySubtab==='out' ? 'bg-green-600 text-white' : 'bg-gray-100'}`} onClick={() => setSurveySubtab('out')}>Out</button>
            <button className={`px-4 py-2 rounded-lg ${surveySubtab==='in' ? 'bg-green-600 text-white' : 'bg-gray-100'}`} onClick={() => setSurveySubtab('in')}>In</button>
          </div>

          {surveySubtab === 'out' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="overflow-x-auto border rounded-xl">
                {loading ? (
                  <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
                ) : data.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">No surveys found.</div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Title</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Active</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{s.title}</div>
                            {s.description && <div className="text-xs text-gray-500">{s.description}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{s.active ? 'Active' : 'Inactive'}</span>
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button onClick={() => loadResponses(s)} className="px-3 py-1 text-sm bg-white border rounded-lg hover:bg-gray-50">View Responses</button>
                            <button onClick={() => handleDelete(s.id)} className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="border rounded-xl p-4 min-h-[200px]">
                {!showResponsesFor ? (
                  <div className="text-gray-500">Select a survey to view responses.</div>
                ) : responsesLoading ? (
                  <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
                ) : responses.length === 0 ? (
                  <div className="text-gray-500">No responses yet.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1 space-y-2 max-h-[400px] overflow-y-auto">
                      {responses.map((r: any, idx: number) => {
                        const name = r?.meta?.name || r?.meta?.username || '';
                        const phone = r?.meta?.phone || r?.meta?.customer_phone || '';
                        const label = name || phone ? `${name || ''}${name && phone ? ' • ' : ''}${phone || ''}` : `Respondent ${idx + 1}`;
                        return (
                          <button key={r._id || r.id || idx} onClick={() => setSelectedRespondentIdx(idx)} className={`w-full text-left px-3 py-2 rounded-lg border ${selectedRespondentIdx===idx ? 'bg-green-50 border-green-200' : 'bg-white hover:bg-gray-50'}`}>
                            <div className="text-sm font-medium text-gray-900 truncate">{label}</div>
                            <div className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="md:col-span-2">
                      {selectedRespondentIdx == null ? (
                        <div className="text-gray-500">Pick a respondent to view answers.</div>
                      ) : (
                        <div className="space-y-3">
                          {(showResponsesFor.questions || []).map((q: any, i: number) => (
                            <div key={i} className="bg-gray-50 rounded-lg p-3">
                              <div className="text-sm text-gray-600">Q{i+1}. {q.text}</div>
                              <div className="text-base text-gray-900 mt-1">{String(responses[selectedRespondentIdx]?.answers?.[i] ?? '') || '-'}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl">
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title*</label>
                  <input value={newSurvey.title} onChange={(e) => setNewSurvey({ ...newSurvey, title: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={newSurvey.description} onChange={(e) => setNewSurvey({ ...newSurvey, description: e.target.value })} rows={3} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="flex items-center gap-2">
                  <input id="survey-active" type="checkbox" checked={newSurvey.active} onChange={(e) => setNewSurvey({ ...newSurvey, active: e.target.checked })} />
                  <label htmlFor="survey-active" className="text-sm text-gray-700">Active</label>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Questions</label>
                    <button onClick={() => setSurveyQuestions((prev) => [...prev, { text: '', required: false }])} className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">Add Question</button>
                  </div>
                  <div className="space-y-3">
                    {surveyQuestions.map((q, idx) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-gray-500">Q{idx+1}</span>
                          <button onClick={() => setSurveyQuestions((prev) => prev.filter((_, i) => i !== idx))} className="ml-auto text-sm px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">Remove</button>
                        </div>
                        <input
                          value={q.text}
                          onChange={(e) => setSurveyQuestions((prev) => prev.map((it, i) => i===idx ? { ...it, text: e.target.value } : it))}
                          placeholder="Question text"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                        <div className="mt-2 flex items-center gap-2">
                          <input id={`req-${idx}`} type="checkbox" checked={q.required} onChange={(e) => setSurveyQuestions((prev) => prev.map((it, i) => i===idx ? { ...it, required: e.target.checked } : it))} />
                          <label htmlFor={`req-${idx}`} className="text-sm text-gray-700">Required</label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <button onClick={saveSurvey} className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700">Save Survey</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'orders') {
      return renderOrdersTable();
    }

    if (activeTab === 'payments' || activeTab === 'paid_orders') {
      if (loading) {
        return (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        );
      }
      const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
      const approve = async (id: string, orderNumber: string) => {
        await fetch(`${API_URL}/api/payments/${id}/approve`, { method: 'PATCH', headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        // Also set the related order to paid
        await supabase.from('orders').update({ status: 'paid' }).eq('order_number', orderNumber);
        fetchData();
      };
      const reject = async (id: string) => {
        await fetch(`${API_URL}/api/payments/${id}/reject`, { method: 'PATCH', headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        fetchData();
      };

      const rows = activeTab === 'paid_orders' ? (data as any[]).filter((p) => p.status === 'approved') : data;
      const filteredRows = (rows as any[]).filter((p) => {
        const statusOk = paymentsStatusFilter === 'all' ? true : String(p.status) === paymentsStatusFilter;
        const method = String(p.method || 'unknown').toLowerCase();
        const methodOk = paymentsMethodFilter === 'all' ? true : method.includes(paymentsMethodFilter);
        return statusOk && methodOk;
      });
      if (rows.length === 0) {
        return <div className="text-center py-20 text-gray-500">No payments found.</div>;
      }
      return (
        <div className="overflow-x-auto">
          <div className="p-4 flex items-center gap-2">
            <select
              value={paymentsStatusFilter}
              onChange={(e) => setPaymentsStatusFilter(e.target.value as any)}
              className="px-3 py-2 border rounded-lg bg-white"
              title="Filter by payment status"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={paymentsMethodFilter}
              onChange={(e) => setPaymentsMethodFilter(e.target.value as any)}
              className="px-3 py-2 border rounded-lg bg-white"
              title="Filter by payment method"
            >
              <option value="all">All methods</option>
              <option value="qr">QR</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="unknown">Unknown</option>
            </select>
            <button onClick={() => { setPaymentsStatusFilter('all'); setPaymentsMethodFilter('all'); }} className="px-3 py-2 border rounded-lg hover:bg-gray-50">Reset</button>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proof</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRows.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 text-sm font-medium text-green-600">{p.orderNumber}</td>
                  <td className="px-4 py-4 text-sm">{p.customerName || '-'}</td>
                  <td className="px-4 py-4 text-sm">{p.customerPhone || '-'}</td>
                  <td className="px-4 py-4 text-sm">{p.amount ? `₹${Number(p.amount).toFixed(2)}` : '-'}</td>
                  <td className="px-4 py-4 text-sm capitalize">{p.method || '-'}</td>
                  <td className="px-4 py-4 text-sm capitalize">{p.status}</td>
                  <td className="px-4 py-4 text-sm">
                    {p.proofUrl ? (
                      <a href={p.proofUrl} target="_blank" rel="noreferrer">
                        <img src={p.proofUrl} alt="proof" className="h-12 w-12 object-cover rounded" />
                      </a>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-4 text-right space-x-2">
                    {activeTab === 'payments' && (
                      <>
                        <button onClick={() => approve(p.id, p.orderNumber)} className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200" disabled={p.status === 'approved'}>Approve</button>
                        <button onClick={() => reject(p.id)} className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200" disabled={p.status === 'rejected'}>Reject</button>
                        <button onClick={async () => {
                          const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
                          if (!confirm('Delete this payment record?')) return;
                          await fetch(`${API_URL}/api/payments/${p.id}` , { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : undefined });
                          fetchData();
                        }} className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      );
    }

    if (data.length === 0) {
      const canAdd = !['contacts', 'callbacks', 'enquiries', 'orders', 'newsletter', 'participants', 'surveys'].includes(activeTab);
      return (
        <div className="text-center py-20">
          <div className="text-gray-500 mb-4">No data found.</div>
          {canAdd && (
            <button
              onClick={() => openForm()}
              className="inline-flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <Plus className="h-5 w-5" />
              <span>Add New</span>
            </button>
          )}
        </div>
      );
    }

    let columns = Object.keys(data[0]).filter(k => k !== 'id' && k !== 'created_at' && k !== 'password_hash' && k !== 'passwordHash' && k !== 'updated_at');
    // Ensure participants show key fields including phone
    if (activeTab === 'participants') {
      const desired = ['name', 'role', 'email', 'phone', 'message'];
      // keep only desired if present, in that order
      columns = desired.filter((c) => columns.includes(c));
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {(activeTab === 'participants' ? columns : columns.slice(0, 4)).map((col) => (
                <th key={col} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                {(activeTab === 'participants' ? columns : columns.slice(0, 4)).map((col) => (
                  <td key={col} className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {col.includes('image') || col.includes('url') ? (
                      item[col] ? (
                        <img src={item[col]} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : '-'
                    ) : (
                      String(item[col] || '-').substring(0, 50)
                    )}
                  </td>
                ))}
                <td className="px-4 py-4 text-right space-x-2">
                  {!['contacts', 'callbacks', 'enquiries', 'orders'].includes(activeTab) && (
                    <button
                      onClick={() => openForm(item)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-green-800 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform`}>
        <div className="p-6">
          <div className="flex items-center space-x-3 text-white mb-8">
            <Leaf className="h-8 w-8" />
            <div>
              <h1 className="font-bold">Annadata</h1>
              <p className="text-xs text-green-200">Admin Panel</p>
            </div>
          </div>
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabType);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-green-700 text-white'
                    : 'text-green-100 hover:bg-green-700/50'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 hidden lg:block">
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="w-full flex items-center justify-center space-x-2 bg-red-500 text-white py-3 rounded-lg hover:bg-red-600"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        <header className="bg-white shadow-sm sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="h-6 w-6" />
              </button>
              <h2 className="text-xl font-semibold text-gray-800 capitalize">{activeTab.replace(/_/g, ' ')}</h2>
            </div>
            <div className="flex items-center space-x-4">
              <span className="hidden sm:inline text-sm text-gray-500">{adminEmail}</span>
              {/* Mobile Logout in header */}
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="lg:hidden inline-flex items-center space-x-2 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
              {!['contacts', 'callbacks', 'enquiries', 'orders', 'newsletter', 'participants', 'surveys'].includes(activeTab) && (
                <button
                  onClick={() => openForm()}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add New</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="p-6">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {renderTable()}
          </div>
        </div>
      </main>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Form Modal */}
      {showForm && renderForm()}

      {/* Order Details Modal */}
      {renderOrderModal()}
    </div>
  );
};

export default AdminPage;
