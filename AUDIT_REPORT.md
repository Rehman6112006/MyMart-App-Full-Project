# MyMart Flutter App — Comprehensive Code Audit Report

**Date:** May 7, 2026  
**Scope:** `mymart_app/lib/` — all Dart files  
**Files Audited:** 47 (config: 2, services: 12, models: 6, providers: 6, screens: 14, widgets: 6, main.dart)

---

## Summary of Findings

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 4 | Will cause runtime errors or security issues |
| **HIGH** | 8 | Functional bugs, data loss risk, or architectural issues |
| **MEDIUM** | 10 | Code quality, maintainability, or consistency issues |
| **LOW** | 7 | Style, deprecation warnings, or minor improvements |

---

## 1. CRITICAL ISSUES

### 1.1 ApiService Double-Wrapping Response
**File:** `services/api_service.dart`  
**Impact:** All API calls return incorrectly nested data

Backend returns `{ "success": true, "data": {...} }`. ApiService wraps this again as `{ "success": true, "data": { "success": true, "data": {...} } }`. This forces downstream services to access `response['data']['data']` in some cases, creating confusion and inconsistency across services.

**Fix:** Remove the outer wrapping in ApiService, or have services consistently unwrap one level.

---

### 1.2 OrderProvider Bypasses ApiService — No Auth Token
**File:** `providers/order_provider.dart`  
**Impact:** API calls fail or return unauthorized; falls back to mock data silently

`OrderProvider` uses raw `http.get(Uri.parse('${ApiConfig.baseUrl}/orders'))` with only `ApiConfig.headers` (which lacks the auth token). It does not use `OrderService` or `ApiService`. On any error, it silently falls back to mock order data, making orders appear to work when they aren't.

**Fix:** Use `OrderService` (which uses `ApiService` with proper auth headers). Remove raw `http` import.

---

### 1.3 AddressProvider Unsafe Type Cast
**File:** `providers/address_provider.dart`  
**Impact:** Runtime crash when adding an address

`addAddress` does `result['address'] as DeliveryAddress` — but the API returns a JSON Map, not a Dart object. This will throw a `TypeError` at runtime.

**Fix:** Use `DeliveryAddress.fromJson(result['address'])` instead of a direct cast.

---

### 1.4 Missing Providers in main.dart
**File:** `main.dart`  
**Impact:** `OrderProvider` and `AddressProvider` are never injected, so any screen trying to `Provider.of` or `context.watch` them will throw a `ProviderNotFoundException`.

**Fix:** Add `OrderProvider` and `AddressProvider` to the `MultiProvider` list in `main.dart`.

---

## 2. HIGH ISSUES

### 2.1 Hardcoded API Base URL — No Environment Configuration
**File:** `config/api_config.dart`  
`baseUrl = 'http://10.248.219.84:5000'` — hardcoded to a physical phone IP. No dev/staging/prod switching. Comment mentions emulator alt `10.0.2.2:5000`. Uses HTTP, not HTTPS.

**Fix:** Use environment variables or `--dart-define` for build-time configuration. Add HTTPS support.

### 2.2 Splash Screen Never Checks Existing Auth
**File:** `screens/splash_screen.dart`  
Always navigates to `LoginScreen`, even if a valid token exists in storage. Users must re-login every app launch.

**Fix:** Check `AuthProvider.isAuthenticated` (or stored token) and navigate to `HomeScreen` if authenticated.

### 2.3 offers_screen.dart — Entirely Mock Data
**File:** `screens/home/offers_screen.dart`  
Contains 6 hardcoded flash sale products and 4 hardcoded coupons. Never calls any service. Users see fake offers.

**Fix:** Integrate with a backend offers/promotions endpoint, or remove the screen.

### 2.4 banner_service.dart — Hardcoded Unsplash Fallback
**File:** `services/banner_service.dart`  
Returns 3 hardcoded banners with Unsplash image URLs when API fails. These are not real app banners.

**Fix:** Return empty list on failure, or show error state. Remove Unsplash fallback data.

### 2.5 store_service.dart — Inconsistent Response Parsing
**File:** `services/store_service.dart`  
`getStoreById` accesses `response['store']` instead of `response['data']` — inconsistent with the ApiService wrapping pattern used by every other service.

**Fix:** Use `response['data']` consistently, accounting for the double-wrapping issue.

### 2.6 Duplicate OTP Login Code
**File:** `screens/auth/login_screen.dart` + `screens/auth/otp_login_screen.dart`  
OTP login logic exists in both files. Code duplication leads to divergent behavior.

**Fix:** Extract shared OTP logic into a reusable widget or mixin; have `login_screen.dart` navigate to `otp_login_screen.dart`.

### 2.7 Missing Routes
**File:** `main.dart`  
`OtpLoginScreen` and `WishlistScreen` are not registered in the route table. Navigation to these screens will fail unless using `MaterialPageRoute` directly.

**Fix:** Add named routes for all screens.

### 2.8 product_card.dart — Dynamic Product Type
**File:** `widgets/product_card.dart`  
Uses `dynamic product` — accepts both `Product` objects and `Map<String, dynamic>`. This is error-prone; property access differs between the two (`.name` vs `['name']`).

**Fix:** Standardize on `Product` type. Convert Maps to `Product` objects before passing to widget.

---

## 3. MEDIUM ISSUES

### 3.1 Duplicate Retry Constants Across Services
**Files:** `services/order_service.dart`, `services/api_service.dart`, `services/retry_service.dart`  
`_maxRetries=3` and `_timeout=30s` are defined independently in multiple services. Changing retry behavior requires editing multiple files.

**Fix:** Centralize retry/timeout config in `RetryService` or `ApiConfig`.

### 3.2 Debug print() Statements in AuthProvider
**File:** `providers/auth_provider.dart`  
`print()` calls in login/register methods leak potentially sensitive info to console logs.

**Fix:** Remove all `print()` calls. Use a proper logging package or remove entirely in production.

### 3.3 print() in store_service.dart
**File:** `services/store_service.dart`  
Uses `print()` for error logging instead of a structured logger.

**Fix:** Replace with `debugPrint()` or a logging package.

### 3.4 wishlist_provider.dart — Fragile firstWhere Fallback
**File:** `providers/wishlist_provider.dart:45`  
`orElse: () => {}` — returns an empty `Map` literal as fallback for `firstWhere`. Subsequent `item.isNotEmpty` check on a Map may not behave as expected. `removeFromWishlist` uses `item['id']` which may not exist on the empty fallback map.

**Fix:** Use a typed nullable return with `firstWhereOrNull` (from `collection` package), or return `null` and handle explicitly.

### 3.5 search_service.dart — String-Interpolated Endpoint
**File:** `services/search_service.dart`  
`getHistory()` uses `'${ApiConfig.search}/history'` instead of a defined constant. No `clearHistory()` method though the endpoint likely exists.

**Fix:** Add endpoint constants to `ApiConfig`. Add `clearHistory()` method.

### 3.6 product_provider.dart — Future.wait All-or-Nothing
**File:** `providers/product_provider.dart`  
`loadHomeData` uses `Future.wait` — if any sub-call fails, all fail. No individual error handling.

**Fix:** Use `Future.wait([...], eagerError: false)` with individual try/catch, or call endpoints sequentially with independent error handling.

### 3.7 Missing Model toJson() Methods
**Files:** `models/category.dart`, `models/store.dart`, `models/cart_item.dart`  
These models have `fromJson()` but no `toJson()`. If any sync/update API needs to send these objects as JSON, it will fail.

**Fix:** Add `toJson()` methods to all three models.

### 3.8 User.toJson() Missing Token Field
**File:** `models/user.dart`  
`toJson()` does not include the `token` field. If the User object is serialized and deserialized, the token is lost.

**Fix:** Add `token` to `toJson()` output.

### 3.9 Hardcoded Colors in Screens/Widgets Instead of AppTheme
**Files:** Multiple  
`Color(0xFF22C55E)` and other hardcoded colors appear in `store_detail_screen.dart`, `animated_loader.dart`, `store_card.dart`, etc. These should reference `AppTheme` constants from `config/theme.dart`.

**Fix:** Replace hardcoded colors with `AppTheme` references.

### 3.10 categories_screen.dart — Hardcoded Fallback Categories
**File:** `screens/home/categories_screen.dart`  
Falls back to hardcoded default categories with emoji icons when API fails. Misleading to users.

**Fix:** Show error state instead of fake categories.

---

## 4. LOW ISSUES

### 4.1 category_chip.dart — Deprecated withOpacity()
**File:** `widgets/category_chip.dart`  
Uses `withOpacity()` which is deprecated in newer Flutter versions.

**Fix:** Replace with `withValues(alpha: ...)` or `Color.fromARGB()`.

### 4.2 network_image.dart — Hardcoded Grey Color
**File:** `widgets/network_image.dart`  
Uses `Colors.grey[200]` as placeholder color. Should use AppTheme.

**Fix:** Replace with theme-based color.

### 4.3 animated_loader.dart — Hardcoded Default Color
**File:** `widgets/animated_loader.dart`  
Default color is hardcoded `Color(0xFF22C55E)`.

**Fix:** Use `AppTheme.primaryColor` as default.

### 4.4 Extremely Large Screen Files
**Files:** `screens/profile/profile_screen.dart` (~57K), `screens/home/home_screen.dart` (~43K)  
These files are far too large for maintainability. Should be split into sub-widgets.

**Fix:** Extract sections into separate widget files.

### 4.5 NetworkService Stream Never Cancelled
**File:** `services/network_service.dart`  
`_connectivity.onConnectivityChanged.listen` stream subscription is never cancelled. Acceptable for app lifecycle, but technically a memory leak.

**Fix:** Override `dispose()` to cancel the subscription (if provider is ever removed).

### 4.6 No HTTPS Support
**File:** `config/api_config.dart`  
All API calls use HTTP. No HTTPS option available.

**Fix:** Add HTTPS base URL option. Enforce HTTPS in production builds.

### 4.7 store_detail_screen.dart — Duplicated Color List
**File:** `screens/store/store_detail_screen.dart`  
Hardcoded color list duplicated from `store_card.dart`.

**Fix:** Extract to a shared constant or AppTheme.

---

## 5. ARCHITECTURAL OBSERVATIONS

| Area | Observation |
|------|-------------|
| **Service Layer** | `ApiService` double-wrapping creates confusion; some services work around it, others don't. Needs a single consistent pattern. |
| **Provider Layer** | `OrderProvider` completely bypasses the service layer — architectural violation. Should use `OrderService`. |
| **Mock Data** | Multiple screens/services fall back to hardcoded mock data (`offers_screen`, `banner_service`, `categories_screen`, `order_provider`). This masks real failures from users. |
| **Error Handling** | Inconsistent: some services throw, some return null, some return mock data. No unified error strategy. |
| **Environment Config** | No dev/staging/prod configuration. Hardcoded IP address requires code changes to switch environments. |
| **Type Safety** | `product_card.dart` uses `dynamic`; `wishlist_provider` uses raw Maps; `address_provider` has unsafe cast. Dart's type system is underutilized. |
| **Code Duplication** | OTP login logic, retry constants, color lists, and response-parsing patterns are duplicated across files. |

---

## 6. RECOMMENDED PRIORITY FIX ORDER

1. **Fix ApiService double-wrapping** (1.1) — This is the root cause of inconsistency across all services
2. **Add missing providers to main.dart** (1.4) — App crashes on order/address screens
3. **Fix AddressProvider unsafe cast** (1.3) — Runtime crash
4. **Fix OrderProvider to use OrderService** (1.2) — Auth failures + mock data masking
5. **Add auth check in splash_screen** (2.2) — Users re-login every launch
6. **Environment-based API config** (2.1 + 4.6) — Can't deploy to different environments
7. **Remove/flag mock fallbacks** (2.3, 2.4, 3.10) — Users see fake data
8. **Standardize product_card type** (2.8) — Potential runtime errors
9. **Add missing toJson() methods** (3.7, 3.8) — Data loss on serialization
10. **Replace hardcoded colors with AppTheme** (3.9, 4.1–4.3, 4.7) — Maintainability

---

*No TODO/FIXME/HACK/XXX/TEMP/WORKAROUND comments were found in the codebase.*
