import React, { useState, useEffect } from 'react';
import { Award, Users, Phone, Sparkles, Heart, X, Send, ListChecks } from 'lucide-react';
// Using backend API for data (farmers/subscribers)

interface LuckyFarmer {
  id: string;
  name: string;
  image_url: string;
  content: string;
  phone: string | null;
}

interface LuckySubscriber {
  id: string;
  name: string;
  image_url: string;
  content: string;
  phone: string | null;
}

const LuckyPage: React.FC = () => {
  const [farmers, setFarmers] = useState<LuckyFarmer[]>([]);
  const [subscribers, setSubscribers] = useState<LuckySubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showParticipate, setShowParticipate] = useState(false);
  const [pForm, setPForm] = useState({ name: '', role: 'farmer', email: '', phone: '', message: '' });
  const [pSubmitting, setPSubmitting] = useState(false);
  const [pMsg, setPMsg] = useState<string>('');
  const [activeList, setActiveList] = useState<'farmers' | 'subscribers'>('farmers');

  // Survey dialog
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyLoading, setSurveyLoading] = useState(false);
  const [survey, setSurvey] = useState<any>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [surveyMsg, setSurveyMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
      const [farmersRes, subscribersRes] = await Promise.all([
        fetch(`${API_URL}/api/lucky-farmers`),
        fetch(`${API_URL}/api/lucky-subscribers`),
      ]);
      const [farmersJson, subsJson] = await Promise.all([
        farmersRes.json(), subscribersRes.json()
      ]);
      if (Array.isArray(farmersJson)) {
        setFarmers(
          farmersJson.map((f: any) => ({
            id: f._id || f.id,
            name: f.name || '',
            image_url: f.imageUrl || '',
            content: f.content || '',
            phone: f.phone || null,
          }))
        );
      }
      if (Array.isArray(subsJson)) {
        setSubscribers(
          subsJson.map((s: any) => ({
            id: s._id || s.id,
            name: s.name || '',
            image_url: s.imageUrl || '',
            content: s.content || '',
            phone: s.phone || null,
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const [email, setEmail] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

  const maskPhone = (p?: string | null) => {
    const raw = String(p || '').trim();
    const hasPlus91 = raw.startsWith('+91');
    const digits = raw.replace(/\D/g, '');
    let prefix = '';
    let local = digits;
    if (hasPlus91 && digits.startsWith('91')) {
      prefix = '+91';
      local = digits.slice(2);
    }
    if (local.length >= 4) {
      const start2 = local.slice(0, 2);
      const end2 = local.slice(-2);
      return `${prefix}${start2}xxxxxx${end2}`;
    }
    return raw;
  };

  const onSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubLoading(true);
    setMsg('');
    try {
      const res = await fetch(`${API_URL}/api/subscribers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'lucky' }),
      });
      if (!res.ok) throw new Error('fail');
      setMsg('Subscribed!');
      setEmail('');
    } catch {
      setMsg('Failed to subscribe');
    } finally {
      setSubLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full"></div>
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-white/10 rounded-full"></div>
          <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white/10 rounded-full"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              <span>Lucky Winners</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Our Lucky Stars
            </h1>
            <p className="text-xl text-orange-100 leading-relaxed max-w-2xl mx-auto">
              Celebrating our amazing farmers and loyal subscribers who make Annadata special.
            </p>
          </div>
        </div>
      </section>

      {/* Winners List Section */}
      <section className="py-16 bg-gradient-to-b from-white to-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4">
              <ListChecks className="h-7 w-7 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Winners List</h2>
            <p className="text-gray-600 mt-2">Browse winners and their stories</p>
          </div>

          <div className="flex items-center justify-center gap-3 mb-6">
            <button onClick={() => setActiveList('farmers')} className={`px-5 py-2 rounded-full border ${activeList==='farmers' ? 'bg-green-600 text-white border-green-600' : 'bg-white hover:bg-gray-50'}`}>Farmers</button>
            <button onClick={() => setActiveList('subscribers')} className={`px-5 py-2 rounded-full border ${activeList==='subscribers' ? 'bg-green-600 text-white border-green-600' : 'bg-white hover:bg-gray-50'}`}>Subscribers</button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-3 text-gray-600">Loading...</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-2xl shadow">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Image</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Content</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(activeList==='farmers' ? farmers : subscribers).map((it) => (
                    <tr key={it.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <img className="h-14 w-14 rounded-xl object-cover" src={it.image_url || (activeList==='farmers' ? 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=200' : 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200')} alt={it.name} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{it.name}</div>
                        <div className="text-xs text-gray-500">{activeList==='farmers' ? 'Farmer' : 'Subscriber'}</div>
                      </td>
                      <td className="px-4 py-3 max-w-[500px]">
                        <div className="text-gray-700 line-clamp-2">{it.content}</div>
                      </td>
                      <td className="px-4 py-3">
                        {it.phone && (
                          <span className={`${activeList==='farmers' ? 'text-green-700' : 'text-orange-700'} inline-flex items-center gap-2`}>
                            <Phone className="h-4 w-4" />{maskPhone(it.phone)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {((activeList==='farmers' ? farmers : subscribers).length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                        <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                        No winners yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-green-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Want to Be Our Next Lucky Winner?
          </h2>
          <p className="text-green-100 text-lg mb-8 max-w-2xl mx-auto">
            Subscribe to our newsletter and participate in our monthly lucky draws for a chance to win exciting prizes!
          </p>
          <form className="max-w-md mx-auto flex" onSubmit={onSubscribe}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-6 py-4 rounded-l-full focus:outline-none"
            />
            <button
              type="submit"
              disabled={subLoading}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-r-full font-semibold transition-colors disabled:opacity-50"
            >
              {subLoading ? '...' : 'Join Now'}
            </button>
            {msg && <span className="ml-3 text-white/90">{msg}</span>}
          </form>
          <div className="mt-8">
            <button
              onClick={() => { setShowParticipate(true); setPMsg(''); }}
              className="inline-flex items-center space-x-2 bg-white text-green-700 px-6 py-3 rounded-full font-semibold hover:bg-green-50"
            >
              <Send className="h-4 w-4" />
              <span>Participate Now</span>
            </button>
          </div>
        </div>
      </section>

      {showParticipate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowParticipate(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Participate</h3>
              <button onClick={() => setShowParticipate(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name*</label>
                <input
                  type="text"
                  value={pForm.name}
                  onChange={(e) => setPForm({ ...pForm, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Participate as*</label>
                <select
                  value={pForm.role}
                  onChange={(e) => setPForm({ ...pForm, role: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="farmer">Farmer</option>
                  <option value="subscriber">Subscriber</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email*</label>
                <input
                  type="email"
                  value={pForm.email}
                  onChange={(e) => setPForm({ ...pForm, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={pForm.phone}
                  onChange={(e) => setPForm({ ...pForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  rows={4}
                  value={pForm.message}
                  onChange={(e) => setPForm({ ...pForm, message: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Why do you want to participate?"
                />
              </div>
              <button
                onClick={async () => {
                  setPSubmitting(true);
                  setPMsg('');
                  try {
                    const res = await fetch(`${API_URL}/api/participants`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(pForm),
                    });
                    if (!res.ok) throw new Error('fail');
                    setPMsg('Submitted! We will reach out soon.');
                    setPForm({ name: '', role: 'farmer', email: '', phone: '', message: '' });
                  } catch (e) {
                    setPMsg('Failed to submit. Please try again.');
                  } finally {
                    setPSubmitting(false);
                  }
                }}
                disabled={pSubmitting}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {pSubmitting ? 'Submitting...' : 'Submit'}
              </button>
              {pMsg && <p className="text-sm text-gray-600">{pMsg}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Floating Survey Teaser */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl border p-4 w-72">
          <div className="flex items-center gap-2 mb-2">
            <ListChecks className="h-5 w-5 text-green-600" />
            <h4 className="font-semibold">Quick Survey</h4>
          </div>
          <p className="text-sm text-gray-600 mb-3">Take a 30-second survey and help us improve.</p>
          <button onClick={async () => {
            setShowSurvey(true);
            setSurveyMsg('');
            setSurvey(null);
            setAnswers([]);
            setSurveyLoading(true);
            try {
              const res = await fetch(`${API_URL}/api/surveys/latest`);
              const json = await res.json();
              setSurvey(json);
              setAnswers(Array.from({ length: (json?.questions || []).length }, () => ''));
            } finally {
              setSurveyLoading(false);
            }
          }} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">Take Survey</button>
        </div>
      </div>

      {/* Survey Dialog */}
      {showSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSurvey(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{survey?.title || 'Survey'}</h3>
                {survey?.description && <p className="text-sm text-gray-500">{survey.description}</p>}
              </div>
              <button onClick={() => setShowSurvey(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {surveyLoading ? (
                <div className="text-center py-10 text-gray-500">Loading survey...</div>
              ) : !survey ? (
                <div className="text-center py-10 text-gray-500">No active survey right now.</div>
              ) : (
                <>
                  {(survey.questions || []).map((q: any, idx: number) => (
                    <div key={idx}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Q{idx + 1}. {q.text} {q.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={answers[idx] || ''}
                        onChange={(e) => setAnswers((prev) => prev.map((v, i) => i===idx ? e.target.value : v))}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="Your answer"
                      />
                    </div>
                  ))}
                  <button
                    disabled={!survey || surveyLoading}
                    onClick={async () => {
                      setSurveyMsg('');
                      try {
                        const res = await fetch(`${API_URL}/api/surveys/${survey._id || survey.id}/responses`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ answers, meta: { page: 'lucky' } }),
                        });
                        if (!res.ok) throw new Error('fail');
                        setSurveyMsg('Thanks for your feedback!');
                        setAnswers(Array.from({ length: (survey?.questions || []).length }, () => ''));
                      } catch (e) {
                        setSurveyMsg('Failed to submit. Please try again.');
                      }
                    }}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
                  >Submit</button>
                  {surveyMsg && <p className="text-sm text-gray-600">{surveyMsg}</p>}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LuckyPage;
