import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, CreditCard, ShoppingCart, LogOut, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Full status flow (forward-only). Staff can skip forward but cannot go backward
const StatusFlow = [
  'pending',
  'admin_rejected',
  'out_of_stock',
  'paid',
  'confirmed',
  'shipped',
  'out_for_delivery',
  'customer_rejected',
  'delivered',
] as const;

type StaffAuth = { token: string; staffCode: string; username: string; name?: string } | null;

const StaffDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [auth, setAuth] = useState<StaffAuth>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'my_tasks' | 'completed' | 'transfers' | 'products' | 'plans' | 'payments'>('orders');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc'>('date_desc');
  const [latestStaffStatusByOrder, setLatestStaffStatusByOrder] = useState<Record<string, string>>({});
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [myCompleted, setMyCompleted] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [showTransferFor, setShowTransferFor] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('staffAuth');
    if (!raw) {
      navigate('/staff-login');
      return;
    }
    setAuth(JSON.parse(raw));
  }, [navigate]);

  useEffect(() => {
    if (!auth) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
      if (activeTab === 'orders' || activeTab === 'my_tasks' || activeTab === 'completed') {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
        setOrders(data || []);
        // Fetch latest staff action per order; use it to compute current progress
        try {
          const orderNumbers = (data || []).map((r:any)=>r.order_number).filter(Boolean).join(',');
          if (orderNumbers) {
            const res = await fetch(`${API_URL}/api/staff-actions?orderNumbers=${encodeURIComponent(orderNumbers)}`, { headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : undefined });
            const list = await res.json();
            const latestMap: Record<string, string> = {};
            (list || []).forEach((it: any) => { latestMap[it.orderNumber] = it.newStatus; });
            setLatestStaffStatusByOrder(latestMap);
          } else {
            setLatestStaffStatusByOrder({});
          }
        } catch {}
        if (activeTab === 'my_tasks') {
          try {
            const res = await fetch(`${API_URL}/api/staff/my-assignments`, { headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : undefined });
            setMyAssignments(await res.json());
          } catch {}
          try {
            const res2 = await fetch(`${API_URL}/api/staff/list`, { headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : undefined });
            setStaffList(await res2.json());
          } catch {}
        }
        if (activeTab === 'completed') {
          try {
            const res = await fetch(`${API_URL}/api/staff/my-completed`, { headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : undefined });
            setMyCompleted(await res.json());
          } catch {}
        }
        // Build payments cache to control visibility
        try {
          const resPay = await fetch(`${API_URL}/api/payments`, { headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : undefined });
          setPayments(await resPay.json());
        } catch {}
      } else if (activeTab === 'transfers') {
        try {
          const res = await fetch(`${API_URL}/api/staff/transfers`, { headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : undefined });
          setTransfers(await res.json());
        } catch {}
        try {
          const res2 = await fetch(`${API_URL}/api/staff/list`, { headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : undefined });
          setStaffList(await res2.json());
        } catch {}
      } else if (activeTab === 'products') {
        const res = await fetch(`${API_URL}/api/products`);
        setProducts(await res.json());
      } else if (activeTab === 'plans') {
        const res = await fetch(`${API_URL}/api/plans`);
        setPlans(await res.json());
      } else if (activeTab === 'payments') {
        const res = await fetch(`${API_URL}/api/payments`, { headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : undefined });
        setPayments(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  const canMoveTo = (order: any, to: string) => {
    // Only allow forward moves within defined flow; skipping forward allowed
    const flow = StatusFlow as unknown as string[];
    const toIdx = flow.indexOf(to);
    if (toIdx === -1) return false;
    const current = String(order.status || '');
    const lastStaff = latestStaffStatusByOrder[order.order_number];
    const curIdx = flow.indexOf(current);
    const staffIdx = lastStaff ? flow.indexOf(lastStaff) : -1;
    const progressIdx = Math.max(curIdx, staffIdx);
    // Disallow moving to the same status (no-op) or backwards
    return toIdx > progressIdx;
  };

  const updateOrderStatus = async (order: any, newStatus: string) => {
    if (!auth) return;
    if (!canMoveTo(order, newStatus)) return;
    await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', order.id);
    try {
      const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
      await fetch(`${API_URL}/api/staff-actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ orderId: order.id, orderNumber: order.order_number, prevStatus: order.status, newStatus }),
      });
      if (newStatus === 'delivered') {
        await fetch(`${API_URL}/api/staff/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
          body: JSON.stringify({ orderNumber: order.order_number }),
        });
      }
    } catch {}
    fetchData();
  };

  const acceptOrder = async (order: any) => {
    if (!auth) return;
    const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
    try {
      const res = await fetch(`${API_URL}/api/staff/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ orderNumber: order.order_number, orderId: order.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({error:'Failed'}));
        alert(err.error || 'Failed to accept');
        return;
      }
      setActiveTab('my_tasks');
      fetchData();
    } catch {
      alert('Failed to accept');
    }
  };

  const paymentsMap = useMemo(() => {
    const map: Record<string, { status: string; _ts: number }> = {} as any;
    (payments || []).forEach((p:any) => {
      const key = String(p.orderNumber || '').trim();
      const ts = new Date(p.createdAt).getTime();
      if (!map[key] || (map[key] as any)._ts < ts) {
        (map[key] as any) = { status: p.status, _ts: ts } as any;
      }
    });
    return Object.fromEntries(Object.entries(map).map(([k,v]: any) => [k, v.status])) as Record<string, string>;
  }, [payments]);

  const visibleOrders = useMemo(() => {
    return orders.filter((o:any) => {
      const latest = paymentsMap[o.order_number];
      // COD (no payment record) OR approved payments
      return !latest || latest === 'approved';
    });
  }, [orders, paymentsMap]);

  const orderByNumber = useMemo(() => {
    const map: Record<string, any> = {};
    orders.forEach((o:any)=> { map[o.order_number] = o; });
    return map;
  }, [orders]);

  const sortedOrders = useMemo(() => {
    const arr = [...orders];
    arr.sort((a: any, b: any) => sortBy === 'date_desc' ? (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
    return arr;
  }, [orders, sortBy]);

  if (!auth) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-green-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-6 w-6" />
            <div>
              <div className="font-semibold">Staff Panel</div>
              <div className="text-xs text-green-100">{auth.name || auth.username} • {auth.staffCode}</div>
            </div>
          </div>
          <button
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded"
            onClick={() => { localStorage.removeItem('staffAuth'); navigate('/staff-login'); }}
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <button className={`px-3 py-2 rounded ${activeTab==='orders'?'bg-green-600 text-white':'bg-white border'}`} onClick={() => setActiveTab('orders')}><ShoppingCart className="inline h-4 w-4 mr-1"/>Orders</button>
          <button className={`px-3 py-2 rounded ${activeTab==='my_tasks'?'bg-green-600 text-white':'bg-white border'}`} onClick={() => setActiveTab('my_tasks')}><Package className="inline h-4 w-4 mr-1"/>My Tasks</button>
          <button className={`px-3 py-2 rounded ${activeTab==='completed'?'bg-green-600 text-white':'bg-white border'}`} onClick={() => setActiveTab('completed')}><Package className="inline h-4 w-4 mr-1"/>Completed</button>
          <button className={`px-3 py-2 rounded ${activeTab==='transfers'?'bg-green-600 text-white':'bg-white border'}`} onClick={() => setActiveTab('transfers')}><Package className="inline h-4 w-4 mr-1"/>Transfers</button>
          <button className={`px-3 py-2 rounded ${activeTab==='products'?'bg-green-600 text-white':'bg-white border'}`} onClick={() => setActiveTab('products')}><Package className="inline h-4 w-4 mr-1"/>Products</button>
          <button className={`px-3 py-2 rounded ${activeTab==='plans'?'bg-green-600 text-white':'bg-white border'}`} onClick={() => setActiveTab('plans')}><Package className="inline h-4 w-4 mr-1"/>Plans</button>
          <button className={`px-3 py-2 rounded ${activeTab==='payments'?'bg-green-600 text-white':'bg-white border'}`} onClick={() => setActiveTab('payments')}><CreditCard className="inline h-4 w-4 mr-1"/>Payments</button>
        </div>

        {loading ? (
          <div className="py-20 flex items-center justify-center text-gray-600"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : activeTab === 'orders' ? (
          <div className="overflow-x-auto bg-white rounded-xl shadow">
            <div className="p-3 flex items-center gap-2">
              <label className="text-sm text-gray-600">Sort</label>
              <select value={sortBy} onChange={(e)=>setSortBy(e.target.value as any)} className="px-3 py-2 border rounded bg-white">
                <option value="date_desc">Newest</option>
                <option value="date_asc">Oldest</option>
              </select>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Accept</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {visibleOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-green-700 font-medium">{o.order_number}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{o.customer_name}</div>
                      <div className="text-xs text-gray-500">{o.customer_phone}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold">₹{Number(o.total).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">{o.shipping_address || o.address || '-'}</td>
                    <td className="px-4 py-3 text-sm capitalize">{o.status}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        disabled={!['pending','paid'].includes(String(o.status))}
                        onClick={() => acceptOrder(o)}
                        className={`px-3 py-1 rounded border ${['pending','paid'].includes(String(o.status)) ? 'bg-white hover:bg-gray-50' : 'opacity-40 cursor-not-allowed'}`}
                      >Accept</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'my_tasks' ? (
          <div className="overflow-x-auto bg-white rounded-xl shadow">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {myAssignments.map((a:any) => {
                  const o = orderByNumber[a.orderNumber];
                  if (!o) return null;
                  return (
                    <tr key={a._id || a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-green-700 font-medium">{o.order_number}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{o.customer_name}</div>
                        <div className="text-xs text-gray-500">{o.customer_phone}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold">₹{Number(o.total).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">{o.shipping_address || o.address || '-'}</td>
                      <td className="px-4 py-3 text-sm capitalize">{o.status}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          {(StatusFlow as unknown as string[]).map((s) => (
                            <button
                              key={s}
                              disabled={!canMoveTo(o, s)}
                              onClick={() => updateOrderStatus(o, s)}
                              className={`px-3 py-1 rounded border ${canMoveTo(o, s) ? 'bg-white hover:bg-gray-50' : 'opacity-40 cursor-not-allowed'}`}
                            >
                              {String(s).replace(/_/g,' ')}
                            </button>
                          ))}
                          <button onClick={() => setShowTransferFor(o.order_number)} className="px-3 py-1 rounded border bg-white hover:bg-gray-50">Transfer</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {showTransferFor && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50" onClick={() => setShowTransferFor(null)}></div>
                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
                  <div className="p-4 border-b font-semibold">Transfer Order {showTransferFor}</div>
                  <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                    {staffList.filter((s)=>s.staffCode!==auth?.staffCode).map((s:any)=>(
                      <button key={s.staffCode} className="w-full text-left px-3 py-2 rounded border bg-white hover:bg-gray-50" onClick={async ()=>{
                        const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
                        await fetch(`${API_URL}/api/staff/transfers`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth?.token}` }, body: JSON.stringify({ orderNumber: showTransferFor, toStaff: s.staffCode })});
                        setShowTransferFor(null);
                        setActiveTab('transfers');
                        fetchData();
                      }}>
                        <div className="font-medium">{s.name || s.username}</div>
                        <div className="text-xs text-gray-500">{s.staffCode}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'completed' ? (
          <div className="overflow-x-auto bg-white rounded-xl shadow">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {myCompleted.map((a:any)=>{
                  const o = orderByNumber[a.orderNumber];
                  if (!o) return null;
                  return (
                    <tr key={a._id || a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-green-700 font-medium">{o.order_number}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{o.customer_name}</div>
                        <div className="text-xs text-gray-500">{o.customer_phone}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold">₹{Number(o.total).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">{new Date(a.updatedAt || a.createdAt).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'transfers' ? (
          <div className="overflow-x-auto bg-white rounded-xl shadow">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transfers.map((t:any)=> (
                  <tr key={t._id || t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-green-700 font-medium">{t.orderNumber}</td>
                    <td className="px-4 py-3 text-sm">{t.fromStaff}</td>
                    <td className="px-4 py-3 text-sm">{t.toStaff}</td>
                    <td className="px-4 py-3 text-sm capitalize">{t.status}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {t.status==='pending' && t.toStaff===auth?.staffCode && (
                        <>
                          <button className="px-3 py-1 rounded border bg-white hover:bg-gray-50" onClick={async()=>{
                            const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
                            await fetch(`${API_URL}/api/staff/transfers/${t._id || t.id}/accept`, { method: 'POST', headers: { Authorization: `Bearer ${auth?.token}` } });
                            fetchData();
                          }}>Accept</button>
                          <button className="px-3 py-1 rounded border bg-white hover:bg-gray-50" onClick={async()=>{
                            const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
                            await fetch(`${API_URL}/api/staff/transfers/${t._id || t.id}/reject`, { method: 'POST', headers: { Authorization: `Bearer ${auth?.token}` } });
                            fetchData();
                          }}>Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'products' ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p:any) => (
              <div key={p._id || p.id} className="bg-white rounded-xl shadow p-4">
                <img src={p.imageUrl} alt="" className="h-40 w-full object-cover rounded"/>
                <div className="font-semibold mt-2">{p.name}</div>
                <div className="text-sm text-gray-600">₹{p.price}</div>
              </div>
            ))}
          </div>
        ) : activeTab === 'plans' ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((p:any) => (
              <div key={p._id || p.id} className="bg-white rounded-xl shadow p-4">
                <img src={p.imageUrl} alt="" className="h-40 w-full object-cover rounded"/>
                <div className="font-semibold mt-2">{p.title}</div>
                <div className="text-sm text-gray-600">₹{p.price} / {p.billingPeriod}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-xl shadow">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((p:any) => (
                  <tr key={p._id || p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm font-medium text-green-600">{p.orderNumber}</td>
                    <td className="px-4 py-4 text-sm">{p.customerName || '-'}</td>
                    <td className="px-4 py-4 text-sm">{p.customerPhone || '-'}</td>
                    <td className="px-4 py-4 text-sm">{p.amount ? `₹${Number(p.amount).toFixed(2)}` : '-'}</td>
                    <td className="px-4 py-4 text-sm capitalize">{p.method || '-'}</td>
                    <td className="px-4 py-4 text-sm capitalize">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboardPage;
