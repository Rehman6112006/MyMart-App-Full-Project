-- ==================== PHASE 8: ENHANCED REVIEWS ====================

-- Review comments/replies
CREATE TABLE IF NOT EXISTS review_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Review reports
CREATE TABLE IF NOT EXISTS review_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES users(id),
    reason VARCHAR(50) NOT NULL CHECK (reason IN (
        'spam', 'inappropriate', 'fake', 'harassment', 'off_topic', 'other'
    )),
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by UUID REFERENCES users(id)
);

-- User review badges/achievements
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    badge_type VARCHAR(50) NOT NULL,
    badge_name VARCHAR(100) NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, badge_type)
);

-- Review analytics per product (cached)
CREATE TABLE IF NOT EXISTS product_review_summary (
    product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    total_reviews INTEGER DEFAULT 0,
    avg_rating NUMERIC(2,1) DEFAULT 0,
    five_star INTEGER DEFAULT 0,
    four_star INTEGER DEFAULT 0,
    three_star INTEGER DEFAULT 0,
    two_star INTEGER DEFAULT 0,
    one_star INTEGER DEFAULT 0,
    positive_percentage INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Review helpful votes (if not exists)
CREATE TABLE IF NOT EXISTS review_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('helpful', 'unhelpful')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(review_id, user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_review_comments_review ON review_comments(review_id);
CREATE INDEX IF NOT EXISTS idx_review_reports_status ON review_reports(status);
CREATE INDEX IF NOT EXISTS idx_review_reports_review ON review_reports(review_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

-- Update reviews table for featured reviews
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'is_featured') THEN
        ALTER TABLE reviews ADD COLUMN is_featured BOOLEAN DEFAULT false;
        ALTER TABLE reviews ADD COLUMN report_count INTEGER DEFAULT 0;
        ALTER TABLE reviews ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

COMMENT ON TABLE review_comments IS 'User comments/replies on reviews';
COMMENT ON TABLE review_reports IS 'User reports for inappropriate reviews';
COMMENT ON TABLE user_badges IS 'User achievements like Top Reviewer, Verified Buyer';
COMMENT ON COLUMN review_reports.reason IS 'Report reasons: spam, inappropriate, fake, harassment, off_topic, other';
