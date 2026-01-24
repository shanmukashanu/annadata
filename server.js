import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8080', 'http://127.0.0.1:8080'];
const envOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...envOrigins, ...defaultOrigins])];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow non-browser or same-origin
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Admin-only auth middleware (must be defined before first use)
const authenticateAdmin = (req, res, next) => {
  // Allow static admin key for simple automation
  const key = req.headers['x-admin-key'];
  if (key && process.env.ADMIN_KEY && key === process.env.ADMIN_KEY) return next();

  // Fallback to JWT Bearer with role 'admin'
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    try {
      const token = auth.substring(7);
      const payload = jwt.verify(token, process.env.JWT_SECRET || '');
      if (payload && payload.role === 'admin') return next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
  return res.status(401).json({ error: 'Unauthorized' });
};

// Hoisted auth that allows either admin or staff (avoid TDZ on const defs below)
function authenticateAny(req, res, next) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    try {
      const token = auth.substring(7);
      const payload = jwt.verify(token, process.env.JWT_SECRET || '');
      if (payload && (payload.role === 'admin' || payload.role === 'staff')) return next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

// Staff admin endpoints
app.get('/api/staff', authenticateAdmin, async (req, res) => {
  const items = await Staff.find().sort({ createdAt: -1 });
  res.json(items);
});
app.post('/api/staff', authenticateAdmin, async (req, res) => {
  try {
    const { name, username, password, staffCode, active } = req.body;
    if (!username || !password || !staffCode) return res.status(400).json({ error: 'username, password, staffCode required' });
    const hash = await bcrypt.hash(password, 10);
    const created = await Staff.create({ name, username: String(username).toLowerCase().trim(), passwordHash: hash, staffCode: String(staffCode).toUpperCase().trim(), active: active !== false });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create staff' });
  }
});
app.delete('/api/staff/:id', authenticateAdmin, async (req, res) => {
  await Staff.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Minimal staff list for staff/admin (for transfer UI)
app.get('/api/staff/list', authenticateAny, async (req, res) => {
  const items = await Staff.find({ active: true }).select('name username staffCode active createdAt updatedAt').sort({ createdAt: -1 });
  res.json(items);
});

// Staff login -> JWT with role 'staff'
app.post('/api/staff/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await Staff.findOne({ username: String(username).toLowerCase().trim(), active: true });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    if (!process.env.JWT_SECRET) return res.status(500).json({ error: 'JWT secret not configured' });
    const token = jwt.sign({ sub: String(user._id), role: 'staff', username: user.username, staffCode: user.staffCode, name: user.name || '' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, staffCode: user.staffCode, username: user.username, name: user.name || '' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

const authenticateStaff = (req, res, next) => {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    try {
      const token = auth.substring(7);
      const payload = jwt.verify(token, process.env.JWT_SECRET || '');
      if (payload && payload.role === 'staff') {
        req.staff = payload;
        return next();
      }
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
  return res.status(401).json({ error: 'Unauthorized' });
};

// Allow either admin or staff
const authenticateAdminOrStaff = (req, res, next) => {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    try {
      const token = auth.substring(7);
      const payload = jwt.verify(token, process.env.JWT_SECRET || '');
      if (payload && (payload.role === 'admin' || payload.role === 'staff')) return next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
  return res.status(401).json({ error: 'Unauthorized' });
};

// Staff: record order status change (client will also update order in Supabase)
app.post('/api/staff-actions', authenticateStaff, async (req, res) => {
  try {
    const { orderId, orderNumber, prevStatus, newStatus } = req.body;
    if (!orderNumber || !newStatus) return res.status(400).json({ error: 'orderNumber and newStatus required' });
    const created = await StaffOrderAction.create({ orderId, orderNumber, prevStatus, newStatus, staffCode: req.staff.staffCode });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to record action' });
  }
});

// Admin: get latest staff action per orderNumber list
app.get('/api/staff-actions', authenticateAdminOrStaff, async (req, res) => {
  const list = String(req.query.orderNumbers || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!list.length) return res.json([]);
  const items = await StaffOrderAction.aggregate([
    { $match: { orderNumber: { $in: list } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$orderNumber', latest: { $first: '$$ROOT' } } },
  ]);
  res.json(items.map(i => i.latest));
});

// Staff: accept an order (creates assignment if none exists)
app.post('/api/staff/assign', authenticateStaff, async (req, res) => {
  try {
    const { orderNumber, orderId } = req.body;
    if (!orderNumber) return res.status(400).json({ error: 'orderNumber required' });
    const existing = await StaffAssignment.findOne({ orderNumber, status: 'active' });
    if (existing) return res.status(409).json({ error: 'Order already assigned' });
    const created = await StaffAssignment.create({ orderNumber, orderId, staffCode: req.staff.staffCode, status: 'active' });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to assign' });
  }
});

// Staff: my active assignments
app.get('/api/staff/my-assignments', authenticateStaff, async (req, res) => {
  const items = await StaffAssignment.find({ staffCode: req.staff.staffCode, status: 'active' }).sort({ createdAt: -1 });
  res.json(items);
});

// Staff: my completed assignments
app.get('/api/staff/my-completed', authenticateStaff, async (req, res) => {
  const items = await StaffAssignment.find({ staffCode: req.staff.staffCode, status: 'completed' }).sort({ updatedAt: -1 });
  res.json(items);
});

// Staff: mark assignment completed (typically when delivered)
app.post('/api/staff/complete', authenticateStaff, async (req, res) => {
  try {
    const { orderNumber } = req.body;
    if (!orderNumber) return res.status(400).json({ error: 'orderNumber required' });
    const updated = await StaffAssignment.findOneAndUpdate(
      { orderNumber, staffCode: req.staff.staffCode, status: 'active' },
      { status: 'completed' },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Active assignment not found' });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to complete' });
  }
});

// Staff: create transfer request
app.post('/api/staff/transfers', authenticateStaff, async (req, res) => {
  try {
    const { orderNumber, toStaff } = req.body;
    if (!orderNumber || !toStaff) return res.status(400).json({ error: 'orderNumber and toStaff required' });
    const assignment = await StaffAssignment.findOne({ orderNumber, status: 'active' });
    if (!assignment || assignment.staffCode !== req.staff.staffCode) return res.status(403).json({ error: 'You do not own this assignment' });
    const pending = await TransferRequest.findOne({ orderNumber, status: 'pending' });
    if (pending) return res.status(409).json({ error: 'Transfer already pending' });
    const created = await TransferRequest.create({ orderNumber, fromStaff: req.staff.staffCode, toStaff, status: 'pending' });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create transfer' });
  }
});

// Staff: list transfer requests (incoming for me + outgoing I created)
app.get('/api/staff/transfers', authenticateStaff, async (req, res) => {
  const me = req.staff.staffCode;
  const items = await TransferRequest.find({ $or: [ { toStaff: me }, { fromStaff: me } ] }).sort({ createdAt: -1 });
  res.json(items);
});

// Staff: accept transfer
app.post('/api/staff/transfers/:id/accept', authenticateStaff, async (req, res) => {
  try {
    const tr = await TransferRequest.findById(req.params.id);
    if (!tr) return res.status(404).json({ error: 'Not found' });
    if (tr.status !== 'pending') return res.status(400).json({ error: 'Already decided' });
    if (tr.toStaff !== req.staff.staffCode) return res.status(403).json({ error: 'Not your transfer' });
    const assignment = await StaffAssignment.findOne({ orderNumber: tr.orderNumber, status: 'active' });
    if (!assignment || assignment.staffCode !== tr.fromStaff) return res.status(409).json({ error: 'Assignment no longer valid' });
    assignment.staffCode = tr.toStaff;
    await assignment.save();
    tr.status = 'accepted';
    tr.decidedAt = new Date();
    await tr.save();
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to accept transfer' });
  }
});

// Staff: reject transfer
app.post('/api/staff/transfers/:id/reject', authenticateStaff, async (req, res) => {
  try {
    const tr = await TransferRequest.findById(req.params.id);
    if (!tr) return res.status(404).json({ error: 'Not found' });
    if (tr.status !== 'pending') return res.status(400).json({ error: 'Already decided' });
    if (tr.toStaff !== req.staff.staffCode) return res.status(403).json({ error: 'Not your transfer' });
    tr.status = 'rejected';
    tr.decidedAt = new Date();
    await tr.save();
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to reject transfer' });
  }
});

// Admin: list all transfer requests
app.get('/api/admin/transfers', authenticateAdmin, async (req, res) => {
  const items = await TransferRequest.find().sort({ createdAt: -1 });
  res.json(items);
});

// Survey endpoints
// Admin: create a survey
app.post('/api/surveys', authenticateAdmin, async (req, res) => {
  try {
    const { title, description, questions, active } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const q = Array.isArray(questions) ? questions.map((it) => ({
      text: String(it.text || '').trim(),
      required: !!it.required,
    })).filter((x) => x.text) : [];
    const created = await Survey.create({ title, description, questions: q, active: active !== false });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create survey' });
  }
});

// Admin: list surveys
app.get('/api/surveys', authenticateAdmin, async (req, res) => {
  const items = await Survey.find().sort({ createdAt: -1 });
  res.json(items);
});

// Admin: delete survey
app.delete('/api/surveys/:id', authenticateAdmin, async (req, res) => {
  await Survey.findByIdAndDelete(req.params.id);
  // Also delete responses for this survey
  await SurveyResponse.deleteMany({ surveyId: req.params.id });
  res.json({ success: true });
});

// Public: get latest active survey
app.get('/api/surveys/latest', async (req, res) => {
  const item = await Survey.findOne({ active: true }).sort({ createdAt: -1 });
  res.json(item || null);
});

// Public: submit responses to a survey
app.post('/api/surveys/:id/responses', async (req, res) => {
  try {
    const { answers, meta } = req.body;
    const survey = await Survey.findById(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    const ans = Array.isArray(answers) ? answers.map((a) => String(a ?? '')) : [];
    // Basic validation: ensure required questions are answered (non-empty)
    const requiredCount = (survey.questions || []).filter((q) => q.required).length;
    const providedRequired = (survey.questions || []).reduce((acc, q, idx) => acc + (q.required && (ans[idx] || '').trim() ? 1 : 0), 0);
    if (providedRequired < requiredCount) return res.status(400).json({ error: 'Please answer all required questions' });
    const created = await SurveyResponse.create({ surveyId: survey._id, answers: ans, meta });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to submit response' });
  }
});

// Admin: list responses for a survey
app.get('/api/surveys/:id/responses', authenticateAdmin, async (req, res) => {
  const items = await SurveyResponse.find({ surveyId: req.params.id }).sort({ createdAt: -1 });
  res.json(items);
});

// Use in-memory storage to stream uploads to Cloudinary with compression for faster uploads
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB cap

const uploadToCloudinary = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const folder = process.env.CLOUDINARY_FOLDER || 'site-media';
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: options.resource_type || 'image',
        // Apply sane defaults for faster, smaller uploads
        transformation: options.transformation || [
          { quality: 'auto', fetch_format: 'auto' },
          { width: 1600, crop: 'limit' },
        ],
        // Give Cloudinary a reasonable timeout
        timeout: 60000,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });

await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || undefined });

// Admin model and bootstrap
const AdminSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'admin' },
});
const Admin = mongoose.model('Admin', AdminSchema);

if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
  if (!existing) {
    await Admin.create({ email: process.env.ADMIN_EMAIL, passwordHash: hash, role: 'admin' });
    console.log('Admin user created from env');
  } else {
    // Ensure password matches env on startup (simple bootstrap behavior)
    const same = await bcrypt.compare(process.env.ADMIN_PASSWORD, existing.passwordHash);
    if (!same) {
      existing.passwordHash = hash;
      await existing.save();
      console.log('Admin password updated from env');
    }
  }
} else {
  // Fallback: if no admin exists at all, create a default admin
  const totalAdmins = await Admin.countDocuments();
  if (totalAdmins === 0) {
    const email = 'admin@annadata.com';
    const pwd = process.env.DEFAULT_ADMIN_PASSWORD || 'shannu@6677';
    const hash = await bcrypt.hash(pwd, 10);
    await Admin.create({ email, passwordHash: hash, role: 'admin' });
    console.log(`Default admin created -> ${email} / ${pwd}`);
  }
}

const FloatingTextSchema = new mongoose.Schema({ text: { type: String, required: true } }, { timestamps: true });
const FloatingText = mongoose.model('FloatingText', FloatingTextSchema);

const ReviewSchema = new mongoose.Schema({ name: String, imageUrl: String, text: { type: String, required: true } }, { timestamps: true });
const Review = mongoose.model('Review', ReviewSchema);

const ProductSchema = new mongoose.Schema({ name: { type: String, required: true }, description: String, imageUrl: String, price: Number, videoUrl: String, whatsappNumber: String }, { timestamps: true });
const Product = mongoose.model('Product', ProductSchema);

const BlogSchema = new mongoose.Schema({ title: { type: String, required: true }, content: String, mediaType: { type: String, enum: ['none', 'image', 'video'], default: 'none' }, mediaUrl: String }, { timestamps: true });
const Blog = mongoose.model('Blog', BlogSchema);

const ContactSchema = new mongoose.Schema({ name: String, email: String, phone: String, message: String }, { timestamps: true });
const Contact = mongoose.model('Contact', ContactSchema);

const CallbackSchema = new mongoose.Schema({ name: String, phone: String, message: String }, { timestamps: true });
const Callback = mongoose.model('Callback', CallbackSchema);

const EnquirySchema = new mongoose.Schema({ productName: String, name: String, phone: String, email: String, message: String }, { timestamps: true });
const Enquiry = mongoose.model('Enquiry', EnquirySchema);

const LuckySchema = new mongoose.Schema({ name: { type: String, required: true }, imageUrl: String, content: String, phone: String }, { timestamps: true });
const LuckyFarmer = mongoose.model('LuckyFarmer', LuckySchema);
const LuckySubscriber = mongoose.model('LuckySubscriber', LuckySchema);

// Participants (from Lucky page Participate form)
const ParticipantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    role: { type: String, enum: ['farmer', 'subscriber'], required: true },
    email: { type: String, required: true },
    phone: { type: String },
    message: { type: String },
  },
  { timestamps: true }
);
const Participant = mongoose.model('Participant', ParticipantSchema);

// Newsletter subscribers (footer/insights/lucky "stay updated")
const NewsletterSubscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    sources: { type: [String], default: [] }, // e.g., ['footer','insights','lucky']
  },
  { timestamps: true }
);
const NewsletterSubscriber = mongoose.model('NewsletterSubscriber', NewsletterSubscriberSchema);

// Plans (for home page slider)
const PlanSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    price: { type: Number, required: true },
    billingPeriod: { type: String, enum: ['weekly', 'monthly', 'per_day', 'per_serve', 'per_year'], required: true },
    features: { type: [String], default: [] },
    description: { type: String },
    imageUrl: { type: String },
    popular: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);
const Plan = mongoose.model('Plan', PlanSchema);

// Surveys
const SurveyQuestionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    required: { type: Boolean, default: false },
  },
  { _id: false }
);
const SurveySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    questions: { type: [SurveyQuestionSchema], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
const Survey = mongoose.model('Survey', SurveySchema);

const SurveyResponseSchema = new mongoose.Schema(
  {
    surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', required: true },
    answers: { type: [String], default: [] },
    meta: { type: Object },
  },
  { timestamps: true }
);
const SurveyResponse = mongoose.model('SurveyResponse', SurveyResponseSchema);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Payments (user-uploaded payment receipts)
const PaymentSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true },
    customerName: { type: String },
    customerPhone: { type: String },
    amount: { type: Number },
    method: { type: String, enum: ['qr', 'upi', 'card', 'unknown'], default: 'unknown' },
    proofUrl: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);
const Payment = mongoose.model('Payment', PaymentSchema);

// Staff accounts
const StaffSchema = new mongoose.Schema(
  {
    name: { type: String },
    username: { type: String, unique: true, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    staffCode: { type: String, unique: true, required: true, uppercase: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
const Staff = mongoose.model('Staff', StaffSchema);

// Record of staff order status changes (audit)
const StaffOrderActionSchema = new mongoose.Schema(
  {
    orderId: { type: String },
    orderNumber: { type: String, required: true },
    prevStatus: { type: String },
    newStatus: { type: String, required: true },
    staffCode: { type: String, required: true },
  },
  { timestamps: true }
);
const StaffOrderAction = mongoose.model('StaffOrderAction', StaffOrderActionSchema);

// Staff order assignments (ownership of an order by a staff)
const StaffAssignmentSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    orderId: { type: String },
    staffCode: { type: String, required: true },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
  },
  { timestamps: true }
);
const StaffAssignment = mongoose.model('StaffAssignment', StaffAssignmentSchema);

// Requests to transfer an assignment from one staff to another
const TransferRequestSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true },
    fromStaff: { type: String, required: true },
    toStaff: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    decidedAt: { type: Date },
  },
  { timestamps: true }
);
const TransferRequest = mongoose.model('TransferRequest', TransferRequestSchema);

// Admin login -> JWT
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await Admin.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    if (!process.env.JWT_SECRET) return res.status(500).json({ error: 'JWT secret not configured' });
    const token = jwt.sign({ sub: String(user._id), role: 'admin', email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/floating-text', async (req, res) => {
  const item = await FloatingText.findOne().sort({ createdAt: -1 });
  res.json(item || null);
});
app.post('/api/floating-text', authenticateAdmin, async (req, res) => {
  const { text } = req.body;
  const created = await FloatingText.create({ text });
  res.status(201).json(created);
});
app.delete('/api/floating-text/:id', authenticateAdmin, async (req, res) => {
  await FloatingText.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.get('/api/reviews', async (req, res) => {
  const items = await Review.find().sort({ createdAt: -1 });
  res.json(items);
});
app.post('/api/reviews', authenticateAdmin, upload.single('image'), async (req, res) => {
  const { name, text, imageUrl: imageUrlBody } = req.body;
  try {
    let imageUrl = imageUrlBody;
    if (req.file?.buffer) {
      const uploaded = await uploadToCloudinary(req.file.buffer);
      imageUrl = uploaded.secure_url;
    }
    const created = await Review.create({ name, text, imageUrl });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Upload failed' });
  }
});
app.delete('/api/reviews/:id', authenticateAdmin, async (req, res) => {
  await Review.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.get('/api/products', async (req, res) => {
  const items = await Product.find().sort({ createdAt: -1 });
  res.json(items);
});
app.post('/api/products', authenticateAdmin, upload.single('image'), async (req, res) => {
  const { name, description, price, videoUrl, whatsappNumber, imageUrl: imageUrlBody } = req.body;
  try {
    let imageUrl = imageUrlBody;
    if (req.file?.buffer) {
      const uploaded = await uploadToCloudinary(req.file.buffer);
      imageUrl = uploaded.secure_url;
    }
    const created = await Product.create({ name, description, price, videoUrl, whatsappNumber, imageUrl });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Upload failed' });
  }
});
app.delete('/api/products/:id', authenticateAdmin, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.get('/api/blogs', async (req, res) => {
  const items = await Blog.find().sort({ createdAt: -1 });
  res.json(items);
});
app.post('/api/blogs', authenticateAdmin, upload.single('media'), async (req, res) => {
  const { title, content, mediaType, mediaUrl: mediaUrlBody } = req.body;
  try {
    let mediaUrl = mediaUrlBody;
    let finalType = (mediaType || '').toLowerCase();
    if (req.file?.buffer) {
      // Detect by provided type hint; default to image
      const isVideo = finalType === 'video' || (req.file.mimetype || '').startsWith('video/');
      const uploaded = await uploadToCloudinary(req.file.buffer, {
        resource_type: isVideo ? 'video' : 'image',
        transformation: isVideo ? undefined : [
          { quality: 'auto', fetch_format: 'auto' },
          { width: 1600, crop: 'limit' },
        ],
      });
      mediaUrl = uploaded.secure_url;
      finalType = isVideo ? 'video' : 'image';
    }
    const created = await Blog.create({ title, content, mediaType: finalType || (mediaUrl ? 'image' : 'none'), mediaUrl });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Upload failed' });
  }
});
app.delete('/api/blogs/:id', authenticateAdmin, async (req, res) => {
  await Blog.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// User uploads a payment proof (screenshot). No auth required.
app.post('/api/payments', upload.single('proof'), async (req, res) => {
  try {
    const { orderNumber, customerName, customerPhone, amount, method } = req.body;
    if (!orderNumber) return res.status(400).json({ error: 'orderNumber is required' });
    if (!req.file?.buffer) return res.status(400).json({ error: 'No proof uploaded' });
    const uploaded = await uploadToCloudinary(req.file.buffer);
    const created = await Payment.create({
      orderNumber,
      customerName,
      customerPhone,
      amount: amount ? Number(amount) : undefined,
      method: (method || 'unknown').toLowerCase(),
      proofUrl: uploaded.secure_url,
      status: 'pending',
    });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Payment upload failed' });
  }
});

// Admin endpoints to view/moderate payments
app.get('/api/payments', authenticateAdminOrStaff, async (req, res) => {
  const items = await Payment.find().sort({ createdAt: -1 });
  res.json(items);
});
app.patch('/api/payments/:id/approve', authenticateAdmin, async (req, res) => {
  const updated = await Payment.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
  res.json(updated);
});
app.patch('/api/payments/:id/reject', authenticateAdmin, async (req, res) => {
  const updated = await Payment.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
  res.json(updated);
});

// Admin: delete a payment record
app.delete('/api/payments/:id', authenticateAdmin, async (req, res) => {
  await Payment.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.post('/api/contact', async (req, res) => {
  const created = await Contact.create(req.body);
  res.status(201).json(created);
});
app.get('/api/contact', authenticateAdmin, async (req, res) => {
  const items = await Contact.find().sort({ createdAt: -1 });
  res.json(items);
});
app.delete('/api/contact/:id', authenticateAdmin, async (req, res) => {
  await Contact.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.post('/api/callbacks', async (req, res) => {
  const created = await Callback.create(req.body);
  res.status(201).json(created);
});
app.get('/api/callbacks', authenticateAdmin, async (req, res) => {
  const items = await Callback.find().sort({ createdAt: -1 });
  res.json(items);
});
app.delete('/api/callbacks/:id', authenticateAdmin, async (req, res) => {
  await Callback.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.post('/api/enquiries', async (req, res) => {
  const created = await Enquiry.create(req.body);
  res.status(201).json(created);
});
app.get('/api/enquiries', authenticateAdmin, async (req, res) => {
  const items = await Enquiry.find().sort({ createdAt: -1 });
  res.json(items);
});
app.delete('/api/enquiries/:id', authenticateAdmin, async (req, res) => {
  await Enquiry.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.get('/api/lucky-farmers', async (req, res) => {
  const items = await LuckyFarmer.find().sort({ createdAt: -1 });
  res.json(items);
});
app.post('/api/lucky-farmers', authenticateAdmin, upload.single('image'), async (req, res) => {
  const { name, content, phone, imageUrl: imageUrlBody } = req.body;
  try {
    let imageUrl = imageUrlBody;
    if (req.file?.buffer) {
      const uploaded = await uploadToCloudinary(req.file.buffer);
      imageUrl = uploaded.secure_url;
    }
    const created = await LuckyFarmer.create({ name, content, phone, imageUrl });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Upload failed' });
  }
});
app.delete('/api/lucky-farmers/:id', authenticateAdmin, async (req, res) => {
  await LuckyFarmer.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.get('/api/lucky-subscribers', async (req, res) => {
  const items = await LuckySubscriber.find().sort({ createdAt: -1 });
  res.json(items);
});
app.post('/api/lucky-subscribers', authenticateAdmin, upload.single('image'), async (req, res) => {
  const { name, content, phone, imageUrl: imageUrlBody } = req.body;
  try {
    let imageUrl = imageUrlBody;
    if (req.file?.buffer) {
      const uploaded = await uploadToCloudinary(req.file.buffer);
      imageUrl = uploaded.secure_url;
    }
    const created = await LuckySubscriber.create({ name, content, phone, imageUrl });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Upload failed' });
  }
});
app.delete('/api/lucky-subscribers/:id', authenticateAdmin, async (req, res) => {
  await LuckySubscriber.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Admin image upload helper (returns Cloudinary URL)
app.post('/api/upload-image', authenticateAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ error: 'No image uploaded' });
    const uploaded = await uploadToCloudinary(req.file.buffer);
    res.status(201).json({ url: uploaded.secure_url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Participants endpoints
app.post('/api/participants', async (req, res) => {
  try {
    const { name, role, email, phone, message } = req.body;
    if (!name || !role || !email) return res.status(400).json({ error: 'name, role and email are required' });
    const created = await Participant.create({ name, role, email, phone, message });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to submit participation' });
  }
});
app.get('/api/participants', authenticateAdmin, async (req, res) => {
  const items = await Participant.find().sort({ createdAt: -1 });
  res.json(items);
});
app.delete('/api/participants/:id', authenticateAdmin, async (req, res) => {
  await Participant.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Newsletter subscription endpoints
app.post('/api/subscribers', async (req, res) => {
  try {
    const { email, source } = req.body; // source optional: 'footer' | 'insights' | 'lucky'
    if (!email) return res.status(400).json({ error: 'Email required' });
    const src = (source || 'footer').toLowerCase();
    const updated = await NewsletterSubscriber.findOneAndUpdate(
      { email: String(email).toLowerCase().trim() },
      { $addToSet: { sources: src } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(updated);
  } catch (e) {
    if (e.code === 11000) {
      // Duplicate key race; fetch and return
      const doc = await NewsletterSubscriber.findOne({ email: String(req.body.email).toLowerCase().trim() });
      return res.status(200).json(doc);
    }
    console.error(e);
    res.status(500).json({ error: 'Subscription failed' });
  }
});
app.get('/api/subscribers', authenticateAdmin, async (req, res) => {
  const items = await NewsletterSubscriber.find().sort({ createdAt: -1 });
  res.json(items);
});
app.delete('/api/subscribers/:id', authenticateAdmin, async (req, res) => {
  await NewsletterSubscriber.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Plans endpoints
app.get('/api/plans', async (req, res) => {
  const items = await Plan.find().sort({ order: 1, createdAt: -1 });
  res.json(items);
});
app.post('/api/plans', authenticateAdmin, upload.single('image'), async (req, res) => {
  const { title, price, billingPeriod, description, features, popular, order, imageUrl: imageUrlBody } = req.body;
  try {
    let imageUrl = imageUrlBody;
    if (req.file?.buffer) {
      const uploaded = await uploadToCloudinary(req.file.buffer);
      imageUrl = uploaded.secure_url;
    }
    // features can come as JSON array or comma-separated string
    let feats = [];
    if (Array.isArray(features)) feats = features;
    else if (typeof features === 'string') {
      try { feats = JSON.parse(features); } catch { feats = features.split(',').map(s => s.trim()).filter(Boolean); }
    }
    const created = await Plan.create({ title, price, billingPeriod, description, features: feats, imageUrl, popular: popular === 'true' || popular === true, order: Number(order) || 0 });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Upload failed' });
  }
});
app.delete('/api/plans/:id', authenticateAdmin, async (req, res) => {
  await Plan.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

// Serve frontend static files (Vite build) and SPA fallback (for single-service hosting)
const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));
app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log('Allowed CORS origins:', allowedOrigins);
});
