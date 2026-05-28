-- Phase 13: Notifications System
-- SMS, Email, WhatsApp notifications with queue management
-- PostgreSQL (Supabase)

-- Notification Templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL UNIQUE,
    template_type VARCHAR(20) NOT NULL CHECK (template_type IN ('email', 'sms', 'whatsapp')),
    subject VARCHAR(255),
    template_body TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL UNIQUE,
    subject VARCHAR(255) NOT NULL,
    html_body TEXT,
    text_body TEXT,
    variables JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMS Templates
CREATE TABLE IF NOT EXISTS sms_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL UNIQUE,
    message_body VARCHAR(500) NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- WhatsApp Templates
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL UNIQUE,
    header_type VARCHAR(20) DEFAULT 'none' CHECK (header_type IN ('none', 'text', 'image', 'video', 'document')),
    header_content VARCHAR(255),
    message_body TEXT NOT NULL,
    footer_text VARCHAR(100),
    buttons JSONB,
    variables JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification Queue
CREATE TABLE IF NOT EXISTS notification_queue (
    id SERIAL PRIMARY KEY,
    notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('email', 'sms', 'whatsapp', 'push')),
    recipient_id INTEGER,
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    template_name VARCHAR(100),
    subject VARCHAR(255),
    message_body TEXT,
    variables JSONB DEFAULT '{}'::jsonb,
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    failed_at TIMESTAMP,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_scheduled ON notification_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_queue_recipient ON notification_queue(recipient_id, notification_type);

-- Notification Logs
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('email', 'sms', 'whatsapp', 'push')),
    recipient_id INTEGER,
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    template_name VARCHAR(100),
    subject VARCHAR(255),
    message_body TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'bounced')),
    provider_response JSONB,
    external_id VARCHAR(255),
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    cost DECIMAL(10, 4),
    currency VARCHAR(3) DEFAULT 'INR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_recipient_created ON notification_logs(recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_logs_template ON notification_logs(template_name);
CREATE INDEX IF NOT EXISTS idx_logs_status_created ON notification_logs(status, created_at);

-- User Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('email', 'sms', 'whatsapp', 'push')),
    category VARCHAR(30) NOT NULL CHECK (category IN ('order', 'promotional', 'system', 'security', 'newsletter')),
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, notification_type, category)
);

-- Push Notifications
CREATE TABLE IF NOT EXISTS push_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    device_token VARCHAR(500) NOT NULL UNIQUE,
    device_type VARCHAR(10) NOT NULL CHECK (device_type IN ('ios', 'android', 'web')),
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_user_active ON push_tokens(user_id, is_active);

-- Push Notification History
CREATE TABLE IF NOT EXISTS push_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
    external_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_history_user ON push_notifications(user_id, created_at);

-- Insert Default Email Templates
INSERT INTO email_templates (template_name, subject, html_body, text_body, variables, is_active) VALUES
('order_confirmation', 'Order Confirmation - {{order_number}}', 
'<h1>Order Confirmed!</h1><p>Dear {{customer_name}},</p><p>Your order #{{order_number}} has been confirmed.</p><p>Total: {{total_amount}}</p><p>Thank you for shopping with us!</p>',
'Dear {{customer_name}}, Your order #{{order_number}} has been confirmed. Total: {{total_amount}}. Thank you!',
'["customer_name", "order_number", "total_amount"]'::jsonb, TRUE)
ON CONFLICT (template_name) DO NOTHING;

INSERT INTO email_templates (template_name, subject, html_body, text_body, variables, is_active) VALUES
('order_shipped', 'Your Order Has Been Shipped - {{order_number}}',
'<h1>Order Shipped!</h1><p>Dear {{customer_name}},</p><p>Your order #{{order_number}} is on its way!</p><p>Tracking: {{tracking_number}}</p>',
'Dear {{customer_name}}, Your order #{{order_number}} has shipped. Tracking: {{tracking_number}}',
'["customer_name", "order_number", "tracking_number", "carrier"]'::jsonb, TRUE)
ON CONFLICT (template_name) DO NOTHING;

INSERT INTO email_templates (template_name, subject, html_body, text_body, variables, is_active) VALUES
('order_delivered', 'Order Delivered - {{order_number}}',
'<h1>Order Delivered!</h1><p>Dear {{customer_name}},</p><p>Great news! Your order #{{order_number}} has been delivered.</p><p>We hope you love your purchase!</p>',
'Dear {{customer_name}}, Your order #{{order_number}} has been delivered. Enjoy!',
'["customer_name", "order_number"]'::jsonb, TRUE)
ON CONFLICT (template_name) DO NOTHING;

INSERT INTO email_templates (template_name, subject, html_body, text_body, variables, is_active) VALUES
('password_reset', 'Password Reset Request',
'<h1>Reset Your Password</h1><p>Dear {{user_name}},</p><p>Click the link below to reset your password:</p><p><a href="{{reset_link}}">Reset Password</a></p><p>This link expires in 24 hours.</p>',
'Dear {{user_name}}, Reset your password using this link: {{reset_link}}. Expires in 24 hours.',
'["user_name", "reset_link"]'::jsonb, TRUE)
ON CONFLICT (template_name) DO NOTHING;

INSERT INTO email_templates (template_name, subject, html_body, text_body, variables, is_active) VALUES
('vendor_approval', 'Your Store Has Been Approved!',
'<h1>Congratulations {{vendor_name}}!</h1><p>Your store "{{store_name}}" has been approved.</p><p>You can now start adding products and selling!</p>',
'Congratulations {{vendor_name}}! Your store "{{store_name}}" has been approved. Start selling now!',
'["vendor_name", "store_name"]'::jsonb, TRUE)
ON CONFLICT (template_name) DO NOTHING;

INSERT INTO email_templates (template_name, subject, html_body, text_body, variables, is_active) VALUES
('commission_settled', 'Commission Settlement - {{amount}}',
'<h1>Commission Settled</h1><p>Dear {{vendor_name}},</p><p>Your commission of {{amount}} has been processed.</p><p>Order Period: {{period}}</p><p>Reference: {{reference_id}}</p>',
'Dear {{vendor_name}}, Your commission of {{amount}} has been settled. Period: {{period}}. Ref: {{reference_id}}',
'["vendor_name", "amount", "period", "reference_id"]'::jsonb, TRUE)
ON CONFLICT (template_name) DO NOTHING;

-- Insert Default SMS Templates
INSERT INTO sms_templates (template_name, message_body, variables, is_active) VALUES
('order_placed', 'Your order #{{order_number}} of Rs.{{total}} has been placed successfully. Track at: {{track_url}}', 
'["order_number", "total", "track_url"]'::jsonb, TRUE)
ON CONFLICT (template_name) DO NOTHING;

INSERT INTO sms_templates (template_name, message_body, variables, is_active) VALUES
('order_shipped', 'Your order #{{order_number}} has been shipped via {{carrier}}. Tracking: {{tracking}}', 
'["order_number", "carrier", "tracking"]'::jsonb, TRUE)
ON CONFLICT (template_name) DO NOTHING;

INSERT INTO sms_templates (template_name, message_body, variables, is_active) VALUES
('order_delivered', 'Your order #{{order_number}} has been delivered. Thanks for shopping with us!', 
'["order_number"]'::jsonb, TRUE)
ON CONFLICT (template_name) DO NOTHING;

INSERT INTO sms_templates (template_name, message_body, variables, is_active) VALUES
('otp_verification', 'Your OTP is {{otp}}. Valid for 10 minutes. Do not share with anyone.', 
'["otp"]'::jsonb, TRUE)
ON CONFLICT (template_name) DO NOTHING;

INSERT INTO sms_templates (template_name, message_body, variables, is_active) VALUES
('password_reset', 'Password reset OTP: {{otp}}. Valid for 10 minutes. If not requested, ignore.', 
'["otp"]'::jsonb, TRUE)
ON CONFLICT (template_name) DO NOTHING;

INSERT INTO sms_templates (template_name, message_body, variables, is_active) VALUES
('promotional', 'Hey {{user_name}}! {{message}}. Shop now at {{store_url}}', 
'["user_name", "message", "store_url"]'::jsonb, TRUE)
ON CONFLICT (template_name) DO NOTHING;

-- Insert Default WhatsApp Templates
INSERT INTO whatsapp_templates (template_name, header_type, header_content, message_body, footer_text, variables, is_active) VALUES
('order_confirmation', 'text', 'Order Confirmed!', 
'Dear {{customer_name}},

Your order #{{order_number}} has been confirmed!

Items: {{items}}
Total: {{total}}

Thank you for shopping with us!',
'Reply STOP to unsubscribe',
'["customer_name", "order_number", "items", "total"]'::jsonb, TRUE)
ON CONFLICT (template_name) DO NOTHING;

INSERT INTO whatsapp_templates (template_name, header_type, header_content, message_body, footer_text, variables, is_active) VALUES
('shipping_update', 'text', 'Shipping Update', 
'Hi {{customer_name}},

Great news! Your order #{{order_number}} has been shipped.

Carrier: {{carrier}}
Tracking: {{tracking}}

Expected Delivery: {{delivery_date}}

Track your order: {{track_url}}', 
'Reply STOP to unsubscribe',
'["customer_name", "order_number", "carrier", "tracking", "delivery_date", "track_url"]'::jsonb, TRUE)
ON CONFLICT (template_name) DO NOTHING;

INSERT INTO whatsapp_templates (template_name, header_type, header_content, message_body, footer_text, variables, is_active) VALUES
('delivery_confirmation', 'image', '{{product_image}}', 
'Hi {{customer_name}},

Your order has been delivered!

Order #{{order_number}}
Delivered at: {{delivery_time}}

We hope you love your purchase! Please leave a review.

Rate us: {{review_url}}', 
'Thanks for shopping!',
'["product_image", "customer_name", "order_number", "delivery_time", "review_url"]'::jsonb, TRUE)
ON CONFLICT (template_name) DO NOTHING;
