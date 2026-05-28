# Comprehensive Controller Audit Report

**Date:** May 7, 2026  
**Scope:** All 21 controller files in `backend/src/controllers/`  
**Criteria:** Bugs, missing error handling, incomplete implementations, placeholder code, non-existent DB references, unused imports, hardcoded values, TODO/FIXME comments, parameter validation gaps, stub implementations

---

## 1. authController.js (310 lines)

**Exported Functions:** `register`, `login`, `getProfile`, `updateProfile`, `changePassword`, `resetPassword`

| # | Issue | Severity | Line(s) |
|---|-------|----------|---------|
| 1 | **OTP generated with `Math.random()`** — not cryptographically secure; predictable sequence | HIGH | 42 |
| 2 | **OTP expiry hardcoded** `15 * 60 * 1000` (15 min) — should be configurable via env/DB | MEDIUM | 43 |
| 4 | **Duplicate validation** — `validator.validateRegistration()` is called, then `!email \|\| !password` is checked again manually | LOW | 12-26 |
| 5 | **`error.message` leaked in 500 responses** — exposes internal details to clients (security risk) | HIGH | 96,161,190,217,256,308 |
| 6 | **`uuid` (uuidv4) imported but never used** | LOW | 4 |
| 7 | **No rate limiting on OTP generation/resend** — spam risk | MEDIUM | — |
| 8 | **`resetPassword` uses same OTP table** as registration verification — OTP type collision possible | MEDIUM | 271-297 |
| 9 | **`changePassword` — no validation for new password strength** | MEDIUM | 221-258 |
| 10 | **`updateProfile` — no input validation** (empty strings, max lengths, XSS via firstName/lastName) | MEDIUM | 194-219 |
| 11 | **`login` — JWT_SECRET from env with no fallback/check** — will crash with `undefined` secret if missing | HIGH | 140 |
| 12 | **No account lockout after failed login attempts** | MEDIUM | — |
| 13 | **Emoji characters in API responses** (non-standard, encoding issues possible) | LOW | 24,38,80,86,108,121,209,236,250,267,279,301 |

---

## 2. productController.js (424 lines)

**Exported Functions:** `createProduct`, `getAllProducts`, `getProductById`, `getStoreProducts`, `updateProduct`, `deleteProduct`, `getFeaturedProducts`, `getNewArrivals`, `getDeals`

| # | Issue | Severity | Line(s) |
|---|-------|----------|---------|
| 1 | **`getFeaturedProducts` and `getNewArrivals` are identical** — same query, same logic; no "featured" or "new arrival" differentiation | HIGH | 329-391 |
| 2 | **`error.message` leaked in 500 responses** across all functions | HIGH | 91,145,176,255,298,324,357,389,422 |
| 3 | **`getStoreProducts` queries `vendor_id` column** as fallback — may not exist on products table | MEDIUM | 237 |
| 4 | **`updateProduct` — no authorization check if `check` query returns empty** (returns 403 but error message is generic "Unauthorized") | LOW | 274 |
| 5 | **`deleteProduct` is a soft-delete** (sets `is_active = false`) but called "delete" — misleading | LOW | 319 |
| 6 | **No pagination on `getStoreProducts`** — unbounded result set | MEDIUM | 181-257 |
| 7 | **`getAllProducts` search uses ILIKE on `description`** — performance concern on large tables | LOW | 119 |
| 8 | **`getProductById` increments view_count** — no deduplication (same user/device can inflate) | LOW | 168-171 |
| 9 | **SKU auto-generation uses `Date.now()` + `Math.random()`** — not guaranteed unique under concurrency | MEDIUM | 20 |

---

## 3. categoryController.js (162 lines)

**Exported Functions:** `createCategory`, `getAllCategories`, `updateCategory`, `deleteCategory`, `getCategoryById`, `getCategoryTree`, `getFeaturedCategories`

| # | Issue | Severity | Line(s) |
|---|-------|----------|---------|
| 1 | **`createCategory` — no input validation** (name can be empty, null, or duplicate) | HIGH | 5-26 |
| 2 | **Slug generation may produce collisions** — `name.toLowerCase().replace(...)` without timestamp/UUID | MEDIUM | 8 |
| 3 | **`updateCategory` — no check if category exists before update** — silent no-op if ID invalid | MEDIUM | 50-70 |
| 4 | **`deleteCategory` — no check if category has products** — soft-deletes even if products reference it | MEDIUM | 73-87 |
| 5 | **`getCategoryTree` — comment says "if parent_id doesn't exist"** — confirms hierarchical categories not implemented | MEDIUM | 117-136 |
| 6 | **`error.message` leaked in 500 responses** | HIGH | 24,45,68,85,112,134,160 |
| 7 | **Hardcoded defaults** — icon `'📦'`, color `'#6366F1'` | LOW | 14 |

---

## 4. cartController.js (171 lines)

**Exported Functions:** `addToCart`, `getCart`, `updateCartItem`, `removeFromCart`, `clearCart`

| # | Issue | Severity | Line(s) |
|---|-------|----------|---------|
| 1 | **Single-store enforcement silently clears cart** without user confirmation | HIGH | 39-46 |
| 2 | **No upper bound on quantity** — can add more than stock or absurdly large quantities | MEDIUM | 7 |
| 3 | **`removeFromCart` — no check if delete actually affected rows** — always returns success | MEDIUM | 145-159 |
| 4 | **`error.message` leaked in 500 responses** | HIGH | 79,113,140,159,169 |
| 5 | **No `uuid` import but uses `uuidv4()`** — actually it IS imported on line 2, OK | — | — |

---

## 5. orderController.js (971 lines)

**Exported Functions:** `getAddresses`, `addAddress`, `updateAddress`, `deleteAddress`, `getDeliverySettings`, `getDeliverySlots`, `createOrder`, `getUserOrders`, `getOrder`, `cancelOrder`, `getVendorOrders`, `updateVendorOrderStatus`, `getAllOrders`, `updateOrderStatus`, `updateDeliverySettings`, `getDeliveryPersons`, `addDeliveryPerson`, `deleteDeliveryPerson`, `assignDeliveryPerson`, `getOrderStats`

| # | Issue | Severity | Line(s) |
|---|-------|----------|---------|
| 1 | **SQL Injection in `getDeliverySlots`** — string interpolation of `currentHour` into query | CRITICAL | 138 |
| 2 | **`createOrder` uses `customer_id` column** but other places use `user_id` — column name inconsistency | HIGH | 12,176 |
| 3 | **`createOrder` queries `p.image` and `p.price`** — these columns may not exist (product uses `base_price`, `image_url`) | HIGH | 177 |
| 4 | **`createOrder` clears cart using `user_id`** but cart table uses `customer_id` — possible mismatch | HIGH | 346 |
| 5 | **Tax rate hardcoded at 18%** — should be configurable | MEDIUM | 271 |
| 6 | **Delivery charge defaults hardcoded** (50, 500, 30) — should use delivery_settings properly | MEDIUM | 230-232 |
| 7 | **N+1 query problem** — `getUserOrders`, `getVendorOrders`, `getAllOrders` each query items/history per order in a loop | HIGH | 391-401,537-547,705-738 |
| 8 | **`cancelOrder` — cancellation_reason hardcoded as `'cancelled'`** instead of using the `reason` variable | BUG | 477 |
| 9 | **`updateOrderStatus` — status column in `order_status_history` uses `updated_by`** but `cancelOrder`/`updateVendorOrderStatus` use `changed_by` — inconsistent column name | MEDIUM | 780 vs 341/651 |
| 10 | **`getAllOrders` references `da.full_address`, `da.state`, `da.pincode`** — may not exist on delivery_addresses table | MEDIUM | 675 |
| 11 | **`assignDeliveryPerson` — inserts status 'out_for_delivery'** even if order is in wrong state | MEDIUM | 910 |
| 12 | **`error.message` leaked in 500 responses** across all functions | HIGH | — |
| 13 | **`getDeliverySlots` — no parameterized query** (builds query with string concat) | MEDIUM | 131-144 |
| 14 | **`addAddress` — no validation** for required fields (name, phone, address_line1, city) | MEDIUM | 28-50 |
| 15 | **`updateDeliverySettings` — no authentication check** (anyone could call it) | MEDIUM | 791 |
| 16 | **`addDeliveryPerson` — minimal validation** (only name/phone required, no email format check) | LOW | 829-848 |

---

## 6. storeController.js (183 lines)

**Exported Functions:** `createStore`, `getMyStore`, `getStoreById`, `updateStore`, `getAllStores`, `approveStore`

| # | Issue | Severity | Line(s) |
|---|-------|----------|---------|
| 1 | **`createStore` — minimal validation** (only storeName required; email/phone not validated) | MEDIUM | 10-15 |
| 2 | **`updateStore` — no check if update affected any rows** before returning success | MEDIUM | 107-134 |
| 3 | **`approveStore` — no authorization check** in controller (relies on route middleware) | LOW | 158-183 |
| 4 | **`error.message` leaked in 500 responses** | HIGH | 48,78,102,132,154,181 |
| 5 | **No admin-only store management endpoints** (list all stores, suspend, etc.) | LOW | — |

---

## 7. reviewController.js (672 lines)

**Exported Functions:** `addReview`, `addComment`, `getReviewComments`, `reportReview`, `voteReview`, `getProductReviews`, `getStoreRating`, `vendorResponse`, `getVendorReviews`, `getAllReviews`, `approveReview`, `toggleFeatured`, `getReportedReviews`, `resolveReport`, `deleteReview`, `getReviewAnalytics`

| # | Issue | Severity | Line(s) |
|---|-------|----------|---------|
| 1 | **`addReview` queries `order_status`** but orderController uses `status` — column name inconsistency | HIGH | 37 |
| 2 | **`addReview` — `orderId` verification queries `customer_id`** on orders but other controllers use `user_id` | MEDIUM | 36 |
| 3 | **`notificationService.notifyVendorReview()`** — unverified if this method exists on notificationService | MEDIUM | 65 |
| 4 | **`checkAndAwardBadge` — references `user_badges` table** — may not exist in schema | MEDIUM | 55 |
| 5 | **`getProductReviews` — sort parameter interpolated directly into query** — potential SQL injection | HIGH | 246-259 |
| 6 | **`voteReview` — column name interpolated into SQL** (`helpful_count` or `unhelpful_count`) — safe in this case but risky pattern | LOW | 216-217 |
| 7 | **`error.message` leaked in 500 responses** | HIGH | — |
| 8 | **`addReview` — images stored as JSON string** but no file upload handling or URL validation | LOW | 48 |

---

## 8. paymentController.js (94 lines)

**Exported Functions:** `createPayment`, `getPaymentByOrder`, `getAllPayments`

| # | Issue | Severity | Line(s) |
|---|-------|----------|---------|
| 1 | **No validation for `orderId`, `paymentMethod`, `transactionId`** before DB operations | HIGH | 7-8 |
| 2 | **Payment status hardcoded as `'completed'`** — no actual payment gateway verification | CRITICAL | 27 |
| 3 | **`orders.customer_id` used** but other controllers use `user_id` — column name inconsistency | HIGH | 12,57 |
| 4 | **`getAllPayments` — joins `orders.customer_id`** — inconsistency risk | MEDIUM | 85 |
| 5 | **`error.message` leaked in 500 responses** | HIGH | 45,73,93 |
| 6 | **No idempotency protection** — duplicate payment records possible | MEDIUM | — |

---

## 9. wishlistController.js (734 lines)

**Exported Functions:** `createList`, `getMyLists`, `updateList`, `deleteList`, `getSharedList`, `addToWishlist`, `getMyWishlist`, `removeFromWishlist`, `checkWishlist`, `moveToCart`, `moveAllToCart`, `clearWishlist`, `setPriceAlert`, `getAlerts`, `getPriceDrops`, `getAnalytics`, `addFromShared`

| # | Issue | Severity | Line(s) |
|---|-------|----------|---------|
| 1 | **`crypto` imported and used** — OK for share tokens; **`uuid` (uuidv4) imported and used** — OK | — | — |
| 2 | ~~`uuid` unused~~ — actually used throughout; initial observation was wrong | — | — |
| 3 | **`moveToCart` / `moveAllToCart` — no store-check enforcement** unlike `addToCart` which enforces single-store | HIGH | 374-478 |
| 4 | **`moveAllToCart` — N+1 loop** (queries/inserts per item) | MEDIUM | 443-461 |
| 5 | **`setPriceAlert` — references `wishlist_alerts` table** — may not exist | MEDIUM | 530-535 |
| 6 | **`getAlerts` — references `wishlist_stock_alerts` table** — may not exist | MEDIUM | 559-565 |
| 7 | **`error.message` leaked in 500 responses** | HIGH | — |

---

## 10. returnController.js (315 lines)

**Exported Functions:** `createReturn`, `getMyReturns`, `getReturnDetail`, `getAllReturns`, `updateReturnStatus`, `cancelReturn`, `getVendorReturns`

| # | Issue | Severity | Line(s) |
|---|-------|----------|---------|
| 1 | **Imports `notifyAdminReturn`, `notifyVendorReturn` from notificationController — THESE FUNCTIONS DO NOT EXIST** | CRITICAL | 4 |
| 2 | **`order_status` used** but orders table likely has `status` — column name mismatch | HIGH | 27 |
| 3 | **Vendor query uses `oi.store_id`** on order_items — may not exist | MEDIUM | 72-78 |
| 4 | **`notificationService.notifyRefundProcessed()`** — unverified if method exists | MEDIUM | 226-230 |
| 5 | **`error.message` leaked in 500 responses** | HIGH | — |
| 6 | **`cancelReturn` — DELETE instead of status update** — data loss; no audit trail | MEDIUM | 266 |

---

## 11. disputeController.js (354 lines)

**Exported Functions:** `createDispute`, `getMyDisputes`, `getDisputeDetail`, `getAllDisputes`, `updateDispute`, `addDisputeResponse`, `vendorResponse`, `getVendorDisputes`

| # | Issue | Severity | Line(s) |
|---|-------|----------|---------|
| 1 | **Imports `notifyAdminDispute`, `notifyCustomerDispute` from notificationController — THESE FUNCTIONS DO NOT EXIST** | CRITICAL | 4 |
| 2 | **`createDispute` calls `createNotification()`** — this function is not defined or imported anywhere in this file | BUG | 72 |
| 3 | **`error.message` leaked in 500 responses** | HIGH | — |
| 4 | **Vendor query uses `oi.store_id`** on order_items — may not exist | MEDIUM | 64-69 |
| 5 | **`notifyCustomerDispute` imported but never called** — dead import | LOW | 4 |

---

## 12. shippingController.js (376 lines)

**Exported Functions:** `getShippingProviders`, `createShipment`, `getShipmentByOrder`, `getMyShipments`, `getAllShipments`, `updateShipmentStatus`, `trackShipment`, `addTrackingUpdate`, `calculateShipping`

| # | Issue | Severity | Line(s) |
|---|-------|----------|---------|
| 1 | **All shipping providers hardcoded as array** — DHL, FedEx, UPS, USPS, TCS, DTEX with hardcoded tracking URLs | HIGH | 8-15 |
| 2 | **`calculateShipping` — base rates hardcoded** (50, 100, 200) — should be in DB/config | MEDIUM | 339-343 |
| 3 | **`calculateShipping` — metro cities list hardcoded** | MEDIUM | 349 |
| 4 | **`calculateShipping` — variable shadowing bug**: `city` parameter shadows the `city` from destructuring in `.some(city => city.toLowerCase()...)` | BUG | 350 |
| 5 | **`notificationService.notifyOrderShipped()`** — unverified if method exists | MEDIUM | 86-90 |
| 6 | **`notificationService.notifyOrderDelivered()`** — unverified if method exists | MEDIUM | 248 |
| 7 | **Tracking number generation uses `Date.now()` + `Math.random()`** — not guaranteed unique | MEDIUM | 65 |
| 8 | **`error.message` leaked in 500 responses** | HIGH | — |
| 9 | **`createShipment` updates `order_status = 'shipped'`** but other controllers use different status column/values | MEDIUM | 79 |

---

## 13. notificationController.js (681 lines)

**Exported Functions:** `getNotifications`, `markAllRead`, `getTemplates`, `createTemplate`, `sendNotification`, `sendEmailNotification`, `sendSMSNotification`, `sendWhatsAppNotification`, `getLogs`, `getQueueStatus`, `getPreferences`, `updatePreferences`, `registerPushToken`, `sendPushNotification`, `sendOrderConfirmation`, `sendOrderShipped`

| # | Issue | Severity | Line(s) |
|---|-------|----------|---------|
| 1 | **Imports `sendEmail` from `../services/emailService` — FILE/EXPORT DOES NOT EXIST** | CRITICAL | 2 |
| 2 | **Imports `sendSMS` from `../services/smsService` — FILE/EXPORT DOES NOT EXIST** | CRITICAL | 3 |
| 3 | **Imports `sendWhatsApp` from `../services/whatsappService` — FILE/EXPORT DOES NOT EXIST** | CRITICAL | 4 |
| 4 | **`sendPush()` is a stub/placeholder** — just console.logs, returns fake ID | HIGH | 521-524 |
| 5 | **`processQueueItem()` calls `sendEmail`/`sendSMS`/`sendWhatsApp`** — all broken due to #1-3 | CRITICAL | 559-571 |
| 6 | **`sendOrderConfirmation` and `sendOrderShipped` call `exports.sendNotification`** by constructing fake req/res objects — fragile hack | HIGH | 611-630,653-676 |
| 7 | **`sendNotification` uses `pool.connect()`** — client not released on all error paths | MEDIUM | 117-152 |
| 8 | **`error.message` leaked in 500 responses** | HIGH | — |
| 9 | **`getPreferences` — no auth check** (any user can read other users' preferences via `user_id` param) | MEDIUM | 388-405 |
| 10 | **`updatePreferences` — no auth check** (any user can update other users' preferences) | MEDIUM | 408-446 |

---

## 14. couponController.js (566 lines)

**Exported Functions:** `getAvailableCoupons`, `validateCoupon`, `getMyCouponHistory`, `createCoupon`, `getAllCoupons`, `getCouponById`, `updateCoupon`, `deleteCoupon`, `toggleCouponStatus`, `getCouponAnalytics`, `applyCouponToOrder`

| # | Issue | Severity | Line(s) |
|---|-------|----------|---------|
| 1 | **Redundant WHERE clause** in `validateCoupon`: `code = $1 AND UPPER(code) = UPPER($1)` — second condition is always true if first matches | LOW | 46 |
| 2 | **`free_shipping` discount hardcoded at 200** — should be dynamic | MEDIUM | 111,535 |
| 3 | **`error.message` leaked in 500 responses** | HIGH | — |
| 4 | **`applyCouponToOrder` is a helper function** but exported — not a route handler; called internally with different signature | LOW | 491 |
| 5 | **Currency symbol `₹` hardcoded** in error messages — not localized | LOW | 90,522 |

---

## 15. vendorDashboardController.js (676 lines)

**Exported Functions:** `getDashboard`, `getSalesReport`, `getProductPerformance`, `getOrderReport`, `getCustomerInsights`, `getRevenueBreakdown`, `exportSalesReport`, `getComparisonReport`

| # | Issue | Severity | Line(s) |
|---|-------|----------|---------|
| 1 | **`getOrderReport` — SQL injection via `status` parameter** — string interpolation: `AND o.order_status = '${status}'` | CRITICAL | 320 |
| 2 | **`getDashboard` — `order_status` used** but orders table likely uses `status` | HIGH | 29-31 |
| 3 | **CSV export — no escaping of commas/quotes in data** — malformed CSV possible | MEDIUM | 573-586 |
| 4 | **`error.message` leaked in 500 responses** | HIGH | — |
| 5 | **Low stock threshold hardcoded at `< 10`** — should be configurable per product | LOW | 72 |

---

## 16. searchController.js (513 lines)

**Exported Functions:** `searchProducts`, `getSearchSuggestions`, `getTrendingSearches`, `getSearchHistory`, `clearSearchHistory`, `getFilterOptions`, `adminGetSuggestions`, `adminToggleTrending`, `adminDeleteSuggestion`, `adminAddSuggestion`, `adminGetSearchAnalytics`

| # | Issue | Severity | Line(s) |
|---|-------|----------|---------|
| 1 | **Saves every search query to DB on each request** — no dedup/throttle; table bloat | MEDIUM | 24-28 |
| 2 | **References `search_history` and `search_suggestions` tables** — may not exist in schema | MEDIUM | 26,32 |
| 3 | **Count query duplicates filter logic** — maintenance risk; could use CTE or window function | LOW | 129-171 |
| 4 | **`adminGetSearchAnalytics` — `period` parameter passed directly to SQL INTERVAL** — potential injection | MEDIUM | 474,480,488 |
| 5 | **Error responses don't leak `error.message`** — returns generic strings (good!) | OK | 187,246,270,295,313,349 |

---

## 17. adminDashboardController.js (653 lines)

**Exported Functions:** `getDashboardStats`, `getAllUsers`, `updateUserStatus`, `getUserDetails`, `getAllVendors`, `approveVendor`, `suspendVendor`, `reactivateVendor`, `getCommissionSummary`, `processPayout`, `generateReport`, `getReports`, `getSettings`, `updateSetting`, `getSalesAnalytics`, `getTopProducts`

| # | Issue | Severity | Line(s) |
|---|-------|----------|---------|
| 1 | **SQL injection in `getDashboardStats`** — `period` interpolated directly into INTERVAL string: `INTERVAL '${period} days'` | CRITICAL | 69-70 |
| 2 | **`getAllVendors` references `s.total_products`, `s.total_orders`, `s.total_revenue`, `s.avg_rating`** — may not exist on stores table | HIGH | 256-257 |
| 3 | **`getCommissionSummary` is a stub** — returns hardcoded zeros and "Phase 13" message | HIGH | 367-382 |
| 4 | **`getAllUsers` — count query params not pushed correctly** (`countParams` is empty) | BUG | 163-167 |
| 5 | **`error.message` leaked in 500 responses** | HIGH | — |
| 6 | **`console.log('✅ Admin Dashboard Controller Loaded')`** — left in production code | LOW | 653 |

---

## 18. stripePaymentController.js (497 lines)

**Exported Functions:** `getPublishableKey`, `createPaymentIntent`, `confirmPayment`, `paymentSuccess`, `cancelPayment`, `processRefund`, `getSavedCards`, `createSetupIntent`, `stripeWebhook`

| # | Issue | Severity | Line(s) |
|---|-------|----------|---------|
| 1 | **Placeholder check for env var** `pk_test_your_publishable_key_here` — indicates incomplete setup | MEDIUM | 14 |
| 2 | **Currency defaults to `'usd'`** — hardcoded; should be configurable | MEDIUM | 36 |
| 3 | **Webhook handler has stub implementations** — only console.logs for payment events | HIGH | 466-487 |
| 4 | **`processRefund` — refund amount defaults to `order.total_amount`** if not specified — full refund by default is dangerous | MEDIUM | 300-301 |
| 5 | **`paymentSuccess` — updates order payment_status without verifying order belongs to user** | MEDIUM | 164-172 |
| 6 | **`notificationService.sendEmail()`** — may not exist (same broken import issue) | HIGH | 197,337 |
| 7 | **`error.message` leaked in 500 responses** | HIGH | — |
| 8 | **`console.log('✅ Stripe Payment Controller Loaded')`** — left in production code | LOW | 497 |

---

## 19. settlementController.js (546 lines)

**Exported Functions:** `getCommissionConfigs`, `setGlobalCommission`, `setVendorCommission`, `setCategoryCommission`, `getMyWallet`, `getMyEarningsSummary`, `getMyTransactions`, `addPayoutMethod`, `getMyPayoutMethods`, `createPayoutRequest`, `getMyPayoutRequests`, `generateSettlement`, `getAllSettlements`, `updateSettlementStatus`, `getAllPayoutRequests`, `processPayoutRequest`, `getAdminStats`, `calculateCommission`

| # | Issue | Severity | Line(s) |
|---|-------|----------|---------|
| 1 | **Most logic delegated to `settlementService`** — controller is thin wrapper; bugs may live in service | INFO | — |
| 2 | **`getMyTransactions` uses direct `pool.query`** while other methods use service — inconsistent pattern | LOW | 167-192 |
| 3 | **`error.message` leaked in 500 responses** | HIGH | — |
| 4 | **`console.log('✅ Settlement Controller Loaded')`** — left in production code | LOW | 546 |

---

## 20. staffController.js (197 lines)

**Exported Functions:** `getRoles`, `createRole`, `inviteStaff`, `acceptInvitation`, `getStoreStaff`, `updateStaffRole`, `removeStaff`, `getActivityLog`, `getPendingInvitations`, `cancelInvitation`, `checkMyPermissions`

| # | Issue | Severity | Line(s) |
|---|-------|----------|---------|
| 1 | **Mixed patterns** — some methods use `staffService`, some use direct `pool.query` (inviteStaff) | MEDIUM | 41-48 |
| 2 | **`inviteStaff` — `req.protocol` and `req.get('host')` used** — can be spoofed; invite link may be incorrect behind proxy | MEDIUM | 58 |
| 3 | **`error.message` leaked in 500 responses** | HIGH | — |
| 4 | **`console.log('✅ Staff Controller Loaded')`** — left in production code | LOW | 197 |

---

## 21. bulkController.js (218 lines)

**Exported Functions:** `importProducts`, `updateProductsBulk`, `deleteProductsBulk`, `updateInventoryBulk`, `exportProducts`, `exportOrders`, `getImportJobs`, `getExportJobs`, `getProductsTemplate`

| # | Issue | Severity | Line(s) |
|---|-------|----------|---------|
| 1 | **No size limit on `csvData`** or `updates` array — DoS risk with large payloads | HIGH | 9,35 |
| 2 | **No `storeId` validation** in `importProducts` — vendor could import to another store | HIGH | 9 |
| 3 | **`error.message` leaked in 500 responses** | HIGH | — |
| 4 | **`console.log('✅ Bulk Controller Loaded')`** — left in production code | LOW | 218 |

---

## Cross-Cutting Issues Summary

### CRITICAL (Will cause crashes or security vulnerabilities)
| # | Issue | Files Affected |
|---|-------|---------------|
| 1 | **Broken imports** — `emailService`, `smsService`, `whatsappService` don't exist | notificationController.js |
| 2 | **Broken imports** — `notifyAdminReturn`, `notifyVendorReturn`, `notifyAdminDispute`, `notifyCustomerDispute` don't exist | returnController.js, disputeController.js |
| 3 | **Undefined function call** — `createNotification()` not defined/imported in disputeController | disputeController.js:72 |
| 4 | **SQL injection** — string interpolation of user input into queries | orderController.js:138, vendorDashboardController.js:320, adminDashboardController.js:69 |
| 5 | **Payment status hardcoded 'completed'** — no gateway verification | paymentController.js:27 |

### HIGH (Security, data integrity, or major functional issues)
| # | Issue | Files Affected |
|---|-------|---------------|
| 1 | **`error.message` leaked in 500 responses** — ALL 21 controllers | ALL |
| 2 | **Column name inconsistency** — `status` vs `order_status`, `user_id` vs `customer_id` | orderController, paymentController, reviewController, returnController, shippingController, vendorDashboardController |
| 3 | **OTP not cryptographically secure** | authController.js:42 |
| 4 | **JWT_SECRET unchecked** — crashes if env var missing | authController.js:140 |
| 5 | **Identical functions** — `getFeaturedProducts` = `getNewArrivals` | productController.js |
| 6 | **Wishlist move-to-cart bypasses single-store check** | wishlistController.js |
| 7 | **Stub implementations** — `sendPush()`, webhook handlers, `getCommissionSummary()` | notificationController, stripePaymentController, adminDashboardController |
| 8 | **No input validation** on many create/update endpoints | categoryController, storeController, cartController, orderController/addAddress, paymentController |
| 9 | **No payload size limits** on bulk operations | bulkController.js |
| 10 | **Store columns may not exist** — `total_products`, `total_revenue`, etc. | adminDashboardController.js:256-257 |

### MEDIUM (Configurability, maintainability, performance)
| # | Issue | Files Affected |
|---|-------|---------------|
| 1 | **Hardcoded values** — tax rate (18%), delivery charges, shipping rates, metro cities, currency (USD), coupon free_shipping (200), low stock threshold (10) | orderController, shippingController, stripePaymentController, couponController, vendorDashboardController |
| 2 | **N+1 query problems** — per-order item queries in loops | orderController, wishlistController |
| 3 | **No rate limiting** on OTP, login, search | authController, searchController |
| 4 | **No auth checks on user preference endpoints** | notificationController.js |
| 5 | **Search history saved every request** — no throttle | searchController.js |
| 6 | **Slug collision risk** — no timestamp in category slugs | categoryController.js |
| 7 | **CSV export — no escaping** | vendorDashboardController.js |

### LOW (Code quality, style)
| # | Issue | Files Affected |
|---|-------|---------------|
| 1 | **Emoji characters in API response messages** | authController, and most others |
| 2 | **`console.log('✅ ... Controller Loaded')`** left in production | adminDashboard, stripePayment, settlement, staff, bulk |
| 3 | **Hardcoded defaults** — icon 📦, color #6366F1 | categoryController.js |
| 4 | **Currency symbol ₹ hardcoded** | couponController.js |
| 5 | **Redundant WHERE clause** | couponController.js:46 |

### TODO/FIXME/HACK Comments
**None found** in any controller file (verified).

---

## Recommended Priority Fixes

1. **Fix broken imports** in notificationController, returnController, disputeController — app will crash on any notification-related operation
2. **Fix SQL injection** vulnerabilities in orderController, vendorDashboardController, adminDashboardController
3. **Standardize column names** — `status` vs `order_status`, `user_id` vs `customer_id` across all controllers and DB schema
4. **Replace `error.message` with generic error responses** in all 500 handlers
5. **Add payment gateway verification** before marking payments as 'completed'
6. **Use `crypto.randomInt()` instead of `Math.random()`** for OTP generation
7. **Add JWT_SECRET existence check** at startup
8. **Add input validation** to all create/update endpoints
9. **Move hardcoded configurable values** to DB settings table or env vars
10. **Fix N+1 queries** in order listing endpoints
