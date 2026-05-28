# 🛒 MyMart - Complete Multi-Vendor E-commerce Platform

## 📋 Project Overview

MyMart ek complete multi-vendor e-commerce platform hai jo 3 main parts mein divided hai:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MyMart Architecture                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐        │
│   │  Flutter     │     │   Admin      │     │   Vendor     │        │
│   │  Mobile App  │     │   Dashboard  │     │   Dashboard  │        │
│   │  (Android/   │     │   (HTML/     │     │   (HTML/     │        │
│   │   iOS)       │     │    CSS/JS)   │     │    CSS/JS)   │        │
│   └──────┬───────┘     └──────┬───────┘     └──────┬───────┘        │
│          │                     │                     │                │
│          │                     │                     │                │
│          ▼                     ▼                     ▼                │
│   ┌─────────────────────────────────────────────────────────┐        │
│   │                    Backend API                            │        │
│   │                 (Node.js + Express)                      │        │
│   │                  Port: 5000                              │        │
│   └─────────────────────────┬───────────────────────────────┘        │
│                             │                                         │
│                             ▼                                         │
│   ┌─────────────────────────────────────────────────────────┐        │
│   │                    PostgreSQL Database                   │        │
│   │                  (via Supabase/Standing)                 │        │
│   └─────────────────────────────────────────────────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Project Structure

```
D:\Mymart\
│
├── 📱 mymart_app/              # Flutter Mobile Application
│   ├── lib/
│   │   ├── config/            # App configuration (API URLs, theme)
│   │   ├── models/            # Data models (Product, Store, User, Order)
│   │   ├── providers/         # State management (Provider pattern)
│   │   ├── screens/           # All app screens (Home, Cart, Profile, etc.)
│   │   ├── services/           # API services (Auth, Product, Cart, etc.)
│   │   └── widgets/           # Reusable widgets (ProductCard, StoreCard)
│   │
│   └── assets/images/         # Local images (logo.png, etc.)
│
├── 🌐 admin_dashboard/        # Admin Web Dashboard (HTML/CSS/JS)
│   └── index.html             # Single page admin dashboard
│
├── 🛍️ vendor_dashboard/       # Vendor Web Dashboard (HTML/CSS/JS)
│   └── index.html             # Single page vendor dashboard
│
├── ⚙️ backend/                 # Node.js Backend API
│   ├── src/
│   │   ├── config/            # Database & Supabase config
│   │   ├── controllers/       # Business logic
│   │   ├── middleware/        # Auth & Role middleware
│   │   ├── routes/            # API routes
│   │   └── services/          # Email, SMS, Notification services
│   │
│   ├── server.js              # Main server entry point
│   ├── setup-admin.js         # Admin user setup script
│   └── package.json
│
└── 📦 database/               # Database migrations & schemas
```

---

## 🔗 System Flow & Connections

### 1️⃣ Multi-Vendor Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPLETE MULTI-VENDOR FLOW                        │
└─────────────────────────────────────────────────────────────────────┘

1️⃣ VENDOR REGISTRATION
    │
    ▼
    Vendor Dashboard → Registration Form → Store Name + Personal Info
    │
    ▼
    API Call: POST /api/auth/register (role: 'vendor')
    │
    ▼
    Backend: OTP Email Sent → User Created (is_verified: false)
    │
    ▼
    Backend: Store Created (is_verified: false, pending approval)
    │
    ▼
2️⃣ ADMIN APPROVAL
    │
    ▼
    Admin Dashboard → Vendors Section → Pending Vendors List
    │
    ▼
    Admin clicks "Approve" → API Call: PUT /api/admin/vendors/:id/approve
    │
    ▼
    Backend: Store is_verified = true
    │
    ▼
3️⃣ VENDOR STORE SETUP (After Approval)
    │
    ▼
    Vendor can now login → Access Dashboard
    │
    ▼
    Vendor adds Products → API: POST /api/products
    │
    ▼
    Products visible in Mobile App under that Store
    │
    ▼
4️⃣ CUSTOMER ORDER FLOW
    │
    ▼
    User browses Stores → Selects Products → Adds to Cart
    │
    ▼
    Checkout → Payment → Order Created
    │
    ▼
    API: POST /api/orders
    │
    ▼
5️⃣ VENDOR ORDER MANAGEMENT
    │
    ▼
    Vendor sees new order in Dashboard
    │
    ▼
    Vendor updates status: Pending → Confirmed → Shipped → Delivered
    │
    ▼
6️⃣ ADMIN MONITORING
    │
    ▼
    Admin monitors all orders, vendors, products, revenue
    │
    ▼
    Admin can manage: Users, Vendors, Products, Categories, Coupons
```

### 2️⃣ API Connection Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        API CONNECTION FLOW                           │
└─────────────────────────────────────────────────────────────────────┘

Flutter App (Mobile)                         Web Dashboards (Admin/Vendor)
        │                                            │
        │                                            │
        ▼                                            ▼
┌───────────────────────┐              ┌───────────────────────┐
│   API Config          │              │   JavaScript API_BASE  │
│   baseUrl:            │              │   = 'http://IP:5000/api'│
│   'http://IP:5000'    │              │                        │
└───────────┬───────────┘              └───────────┬─────────────┘
            │                                      │
            │                                      │
            ▼                                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND API (Express.js)                │
│                      Port: 5000                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Routes:                                                     │
│  ├── /api/auth/*        → Authentication (login, register)   │
│  ├── /api/products/*    → Product management                  │
│  ├── /api/stores/*      → Store management                   │
│  ├── /api/orders/*      → Order management                   │
│  ├── /api/cart/*        → Cart operations                    │
│  ├── /api/categories/*  → Category management                │
│  ├── /api/coupons/*     → Coupon management                  │
│  ├── /api/admin/*       → Admin only endpoints               │
│  └── /api/vendor/*      → Vendor only endpoints              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE (PostgreSQL via Supabase)           │
│                                                              │
│  Tables:                                                     │
│  ├── users          → All users (customers, vendors, admins)  │
│  ├── stores         → Vendor stores                           │
│  ├── products       → All products                            │
│  ├── orders         → Customer orders                         │
│  ├── order_items    → Order line items                        │
│  ├── categories     → Product categories                      │
│  ├── carts          → User carts                              │
│  ├── cart_items     → Cart line items                         │
│  ├── coupons        → Discount coupons                        │
│  └── settlements    → Vendor payouts                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Deployment Guide

### Step 1: Backend Deployment

```bash
# 1. Navigate to backend folder
cd D:\Mymart\backend

# 2. Install dependencies (if not already installed)
npm install

# 3. Setup environment variables (.env file)
#    Required variables:
#    - DATABASE_URL=your_supabase_postgres_url
#    - JWT_SECRET=your_jwt_secret_key
#    - SENDGRID_API_KEY=your_sendgrid_key (for emails)

# 4. Create Admin User
node setup-admin.js
# Output: Admin created - Email: admin@mymart.com, Password: Admin@123

# 5. Start the server
npm start
# OR for development
npm run dev

# Server runs on: http://localhost:5000
```

### Step 2: Frontend Deployment

#### Flutter Mobile App

```bash
# 1. Navigate to app folder
cd D:\Mymart\mymart_app

# 2. Update API URL in lib/config/api_config.dart
#    Change IP address to your server's IP
static const String baseUrl = 'http://YOUR_SERVER_IP:5000';

# 3. Run on device/emulator
flutter run

# For release build (Android APK)
flutter build apk --release
```

#### Admin Dashboard (HTML/CSS/JS)

```bash
# Simply open in browser or host on any web server
# Can be hosted on:
# - Apache/Nginx web server
# - GitHub Pages
# - Netlify
# - Vercel

# Just open: admin_dashboard/index.html
# Or serve with any local server:
python -m http.server 8080 --directory admin_dashboard
```

#### Vendor Dashboard (HTML/CSS/JS)

```bash
# Same as Admin Dashboard
# Open in browser or host anywhere

# URL: vendor_dashboard/index.html
```

### Step 3: Database Setup (Supabase)

```sql
-- Key tables created in Supabase PostgreSQL:

-- Users table (all types: customer, vendor, admin)
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'customer', -- customer, vendor, admin
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Stores table
CREATE TABLE stores (
    id UUID PRIMARY KEY,
    vendor_id UUID REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    logo TEXT, -- URL to logo image
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false, -- Admin approval
    created_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY,
    store_id UUID REFERENCES stores(id),
    category_id UUID REFERENCES categories(id),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    compare_price DECIMAL(10,2),
    image_url TEXT, -- URL to product image in Supabase Storage
    stock_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🖼️ Image Storage with Supabase Storage

### Image Storage Setup

```
┌─────────────────────────────────────────────────────────────────────┐
│                  SUPABASE STORAGE FOR IMAGES                         │
└─────────────────────────────────────────────────────────────────────┘

Supabase Storage Buckets:
│
├── 🖼️ product-images/     # Product images
│   │   └── public/         # Public read access
│   │
├── 🏪 store-logos/         # Store/Vendor logos
│   │   └── public/
│   │
└── 👤 user-avatars/       # User profile pictures
    └── public/
```

### How Image Upload Works

```javascript
// 1. FRONTEND: Upload image to Supabase Storage
async function uploadProductImage(file, productId) {
    const fileName = `${productId}/${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) throw error;

    // 2. Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

    return publicUrl;
}

// 3. Save URL to database
await fetch('/api/products', {
    method: 'POST',
    body: JSON.stringify({
        name: 'Product Name',
        price: 99.99,
        image_url: publicUrl  // Store Supabase URL
    })
});
```

### Storage Rules (Supabase Dashboard)

```javascript
// Bucket Policies:
// 1. product-images: Public read, Authenticated write
// 2. store-logos: Public read, Authenticated write
// 3. user-avatars: Public read, Owner write only
```

---

## ✅ Current Status - What's Done

### Completed ✅

| Component | Status | Details |
|-----------|--------|---------|
| Backend API | ✅ Done | Full REST API with Express.js |
| Database Schema | ✅ Done | All tables created in Supabase |
| Admin Dashboard | ✅ Done | HTML/CSS/JS with full functionality |
| Vendor Dashboard | ✅ Done | HTML/CSS/JS with full functionality |
| Flutter App | ✅ Done | Mobile app with all core features |
| Authentication | ✅ Done | JWT-based login/register/OTP |
| Product Management | ✅ Done | CRUD operations |
| Store Management | ✅ Done | Multi-vendor stores |
| Order Management | ✅ Done | Full order flow |
| Cart System | ✅ Done | Add/update/remove items |
| Checkout | ✅ Done | Address & payment |
| Categories | ✅ Done | Category tree & filtering |
| Coupons | ✅ Done | Discount system |
| Admin Approval | ✅ Done | Vendor approval system |
| Multi-Vendor Flow | ✅ Done | Complete vendor→customer→admin flow |
| Stores in App | ✅ Done | Featured stores section |
| Vendor Products in App | ✅ Done | Products by store |

### Remaining Tasks ⏳

| Task | Priority | Status |
|------|----------|--------|
| Real-time Notifications | Medium | Not done |
| Push Notifications (FCM) | Medium | Not done |
| Admin Panel - Reports Page | Low | Basic done |
| Analytics Dashboard | Medium | Basic done |
| Payment Gateway Integration | High | Stripe basic |
| Store Logo Upload | High | API done, UI done |
| Admin Settings Page | Medium | Not done |
| Email Templates | Low | Basic |
| SMS Notifications | Low | API exists |

---

## 🐛 Known Bugs & Issues

### 1. ✅ Image Upload UI Implemented
```javascript
// Status: FIXED
// Added image upload functionality to Vendor and Admin dashboards
// Product images can now be uploaded via file picker
```

### 2. ✅ IP Address Consistency Fixed
```javascript
// Status: FIXED
// All dashboards now use same IP: http://10.194.228.114:5000
// Admin Dashboard: http://10.194.228.114:5000/api
// Vendor Dashboard: http://10.194.228.114:5000/api
// Flutter App: http://10.194.228.114.114:5000
```

### 3. ✅ Error Handling for Broken Images
```javascript
// Status: FIXED
// Added NetworkImageWithError widget in Flutter
// ProductImage and StoreLogo widgets handle loading/error states
```

### 4. CORS Issues in Development
```javascript
// Problem: May get CORS errors if backend not configured properly
// Solution: Already configured in server.js
app.use(cors()); // Allows all origins
```

### 5. ✅ Password Validation Implemented
```javascript
// Status: FIXED
// Added validator middleware with password strength validation
// Minimum 6 characters required
```

---

## 🔐 Security Considerations

### Current Implementation
- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Role-based middleware (customer, vendor, admin)
- ✅ Protected API routes
- ✅ Rate limiting (100 requests per 15 min, 20 for auth)
- ✅ Input validation middleware
- ✅ Request body size limit (10mb)
- ✅ CORS enabled for all origins

### Recommendations
- ⚠️ Enable SSL/HTTPS in production
- ⚠️ Add CSRF protection
- ⚠️ Implement 2FA for admin accounts
- ⚠️ Add request sanitization for SQL injection

---

## 📊 Database Schema Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DATABASE RELATIONSHIPS                        │
└─────────────────────────────────────────────────────────────────────┘

users (1)─────< (N) stores
  │                │
  │                │
  │                └─────< (N) products
  │                             │
orders (N)───────< (N) order_items
  │
  │
  └─────< (N) cart_items

categories (1)─────< (N) products

coupons (1)─────< (N) orders
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| Mobile App | Flutter + Provider |
| Web Dashboards | HTML5 + CSS3 + Vanilla JS |
| Backend | Node.js + Express.js |
| Database | PostgreSQL (Supabase) |
| Authentication | JWT + bcrypt |
| File Storage | Supabase Storage |
| Email | SendGrid |
| SMS | Twilio (configured) |
| Payments | Stripe (configured) |

---

## 📱 How to Test the Complete Flow

### 1. Start Backend
```bash
cd D:\Mymart\backend
npm start
```

### 2. Create Admin
```bash
cd D:\Mymart\backend
node setup-admin.js
# Login: admin@mymart.com / Admin@123
```

### 3. Open Admin Dashboard
```
File: D:\Mymart\admin_dashboard\index.html
Browser: Double click to open
```

### 4. Open Vendor Dashboard
```
File: D:\Mymart\vendor_dashboard\index.html
Browser: Double click to open
```

### 5. Run Flutter App
```bash
cd D:\Mymart\mymart_app
flutter run
```

### 6. Test Complete Flow
```
1. Vendor registers on Vendor Dashboard
2. Admin approves vendor in Admin Dashboard
3. Vendor adds products
4. User browses stores in Flutter App
5. User adds products to cart
6. User places order
7. Vendor sees order in Dashboard
8. Admin monitors everything
```

---

## 🎯 Quick Reference - API Endpoints

### Authentication
- `POST /api/auth/register` - Register user/vendor
- `POST /api/auth/login` - Login
- `POST /api/supabase-auth/send-otp` - Send OTP
- `POST /api/supabase-auth/verify-otp` - Verify OTP

### Products
- `GET /api/products` - List products
- `GET /api/products/featured` - Featured products
- `POST /api/products` - Create product (vendor)
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Stores
- `GET /api/stores` - List all stores
- `GET /api/stores/:id` - Store details
- `GET /api/stores/:id/products` - Store products
- `POST /api/stores` - Create store

### Orders
- `GET /api/orders` - All orders (admin)
- `GET /api/orders/my` - My orders (customer)
- `POST /api/orders` - Create order
- `PUT /api/orders/:id/status` - Update status

### Admin Only
- `GET /api/admin/dashboard/stats` - Dashboard stats
- `GET /api/admin/vendors` - All vendors
- `PUT /api/admin/vendors/:id/approve` - Approve vendor

### Vendor Only
- `GET /api/vendor/dashboard/dashboard` - Vendor stats
- `GET /api/vendor/dashboard/reports/sales` - Sales report
- `GET /api/settlements/vendor/wallet` - Vendor wallet

---

## 📞 Support & Troubleshooting

### Common Issues

**1. Login not working**
- Check backend is running on correct port
- Verify API URL in frontend matches backend
- Check browser console for CORS errors

**2. Admin login fails**
- Run `node setup-admin.js` to create admin user
- Check database connection

**3. Products not showing in app**
- Verify products have `is_active: true`
- Check vendor store has `is_verified: true`

**4. Images not loading**
- Check Supabase Storage bucket exists
- Verify RLS policies allow public read
- Check image URLs are correct

---

## 📄 License

This project is proprietary for MyMart E-commerce Platform.

---

**Last Updated: May 3, 2026**
