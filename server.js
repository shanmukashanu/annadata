import express from 'express';
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

// Admin auth: allow either x-admin-key or Bearer JWT
const authenticateAdmin = (req, res, next) => {
  const key = req.headers['x-admin-key'];
  if (key && process.env.ADMIN_KEY && key === process.env.ADMIN_KEY) return next();

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

app.get('/api/health', (req, res) => res.json({ ok: true }));

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

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log('Allowed CORS origins:', allowedOrigins);
});
