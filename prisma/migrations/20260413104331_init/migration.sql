-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "auth_provider" TEXT,
    "display_name" TEXT NOT NULL,
    "country" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "role" TEXT NOT NULL DEFAULT 'buyer',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payout_status" TEXT,
    "kyc_status" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "bio" TEXT,
    "avatar_url" TEXT,
    "public_profile_slug" TEXT,
    "payout_provider_account_id" TEXT,
    "revenue_share_percent" DOUBLE PRECISION NOT NULL DEFAULT 65.0,

    CONSTRAINT "creator_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voices" (
    "id" TEXT NOT NULL,
    "creator_user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "category" TEXT,
    "tags" TEXT[],
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "price_type" TEXT,
    "subscription_price" DOUBLE PRECISION,
    "usage_price_unit" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "model_version" TEXT,
    "preview_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "voices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_ownership_consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "voice_id" TEXT NOT NULL,
    "consent_text" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "consented_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_ownership_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_training_jobs" (
    "id" TEXT NOT NULL,
    "voice_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source_audio_url" TEXT NOT NULL,
    "script_type" TEXT,
    "preprocessing_status" TEXT NOT NULL DEFAULT 'pending',
    "training_status" TEXT NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "failure_reason" TEXT,

    CONSTRAINT "voice_training_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_samples" (
    "id" TEXT NOT NULL,
    "voice_id" TEXT NOT NULL,
    "sample_text" TEXT NOT NULL,
    "sample_audio_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "voice_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "featured_rank" INTEGER,
    "moderation_status" TEXT NOT NULL DEFAULT 'pending',
    "report_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "buyer_user_id" TEXT NOT NULL,
    "voice_id" TEXT NOT NULL,
    "billing_provider_subscription_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceled_at" TIMESTAMP(3),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_events" (
    "id" TEXT NOT NULL,
    "buyer_user_id" TEXT NOT NULL,
    "voice_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "usage_amount" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'preview',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "creator_user_id" TEXT NOT NULL,
    "amount_gross" DOUBLE PRECISION NOT NULL,
    "platform_fee" DOUBLE PRECISION NOT NULL,
    "creator_net" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SEK',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "payout_date" TIMESTAMP(3),

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporter_user_id" TEXT NOT NULL,
    "target_voice_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_user_id_key" ON "creator_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_public_profile_slug_key" ON "creator_profiles"("public_profile_slug");

-- CreateIndex
CREATE UNIQUE INDEX "listings_voice_id_key" ON "listings"("voice_id");

-- CreateIndex
CREATE INDEX "usage_events_voice_id_timestamp_idx" ON "usage_events"("voice_id", "timestamp");

-- CreateIndex
CREATE INDEX "usage_events_buyer_user_id_timestamp_idx" ON "usage_events"("buyer_user_id", "timestamp");

-- AddForeignKey
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voices" ADD CONSTRAINT "voices_creator_user_id_fkey" FOREIGN KEY ("creator_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_ownership_consents" ADD CONSTRAINT "voice_ownership_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_ownership_consents" ADD CONSTRAINT "voice_ownership_consents_voice_id_fkey" FOREIGN KEY ("voice_id") REFERENCES "voices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_training_jobs" ADD CONSTRAINT "voice_training_jobs_voice_id_fkey" FOREIGN KEY ("voice_id") REFERENCES "voices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_training_jobs" ADD CONSTRAINT "voice_training_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_samples" ADD CONSTRAINT "voice_samples_voice_id_fkey" FOREIGN KEY ("voice_id") REFERENCES "voices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_voice_id_fkey" FOREIGN KEY ("voice_id") REFERENCES "voices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_voice_id_fkey" FOREIGN KEY ("voice_id") REFERENCES "voices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_voice_id_fkey" FOREIGN KEY ("voice_id") REFERENCES "voices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_creator_user_id_fkey" FOREIGN KEY ("creator_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_target_voice_id_fkey" FOREIGN KEY ("target_voice_id") REFERENCES "voices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
