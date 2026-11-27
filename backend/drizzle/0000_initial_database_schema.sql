CREATE TABLE "knowledge_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_key" text NOT NULL,
	"title" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"content_hash" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_document_version_unique" UNIQUE("source_key","version"),
	CONSTRAINT "knowledge_document_version_positive" CHECK ("knowledge_documents"."version" > 0),
	CONSTRAINT "knowledge_document_hash_format" CHECK ("knowledge_documents"."content_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "knowledge_document_active_requires_hash" CHECK (NOT "knowledge_documents"."is_active"
        OR "knowledge_documents"."content_hash" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"embedding_model" text NOT NULL,
	"section" text,
	"page_number" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_chunk_position_unique" UNIQUE("document_id","chunk_index"),
	CONSTRAINT "knowledge_chunk_index_nonnegative" CHECK ("knowledge_chunks"."chunk_index" >= 0),
	CONSTRAINT "knowledge_chunk_content_not_empty" CHECK (length(btrim("knowledge_chunks"."content")) > 0),
	CONSTRAINT "knowledge_chunk_page_positive" CHECK ("knowledge_chunks"."page_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" varchar(128) NOT NULL,
	"last_order_id" varchar(64),
	"customer_id" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_sessions_pk" PRIMARY KEY("customer_id","id")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar(128) NOT NULL,
	"session_id" varchar(128) NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_message_role_valid" CHECK ("chat_messages"."role" IN ('user', 'assistant')),
	CONSTRAINT "chat_message_content_not_empty" CHECK (length(btrim("chat_messages"."content")) > 0)
);
--> statement-breakpoint
CREATE TABLE "cancellation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar(128) NOT NULL,
	"session_id" varchar(128) NOT NULL,
	"order_id" varchar(64) NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"status" text DEFAULT 'awaiting_confirmation' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cancellation_idempotency_unique" UNIQUE("customer_id","idempotency_key"),
	CONSTRAINT "cancellation_status_valid" CHECK ("cancellation_requests"."status" IN (
        'awaiting_confirmation',
        'confirmed',
        'processing',
        'requested',
        'rejected',
        'expired',
        'failed'
      )),
	CONSTRAINT "cancellation_expiration_valid" CHECK ("cancellation_requests"."expires_at" > "cancellation_requests"."created_at"),
	CONSTRAINT "cancellation_confirmation_required" CHECK ((
        "cancellation_requests"."status" IN (
            'confirmed',
            'processing',
            'requested',
            'failed'
        )
        AND "cancellation_requests"."confirmed_at" IS NOT NULL
        ) OR (
            "cancellation_requests"."status" IN (
            'awaiting_confirmation',
            'rejected',
            'expired'
            )
            AND "cancellation_requests"."confirmed_at" IS NULL
        )),
	CONSTRAINT "cancellation_confirmation_time_valid" CHECK ("cancellation_requests"."confirmed_at" >= "cancellation_requests"."created_at"
        AND "cancellation_requests"."confirmed_at" <= "cancellation_requests"."expires_at")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" varchar(128) NOT NULL,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(100) NOT NULL,
	"resource_id" varchar(128) NOT NULL,
	"outcome" text NOT NULL,
	"correlation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_outcome_valid" CHECK ("audit_events"."outcome" IN (
        'success',
        'denied',
        'failure'
      ))
);
--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_fk" FOREIGN KEY ("customer_id","session_id") REFERENCES "public"."chat_sessions"("customer_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cancellation_requests" ADD CONSTRAINT "cancellation_session_fk" FOREIGN KEY ("customer_id","session_id") REFERENCES "public"."chat_sessions"("customer_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_document_active_unique" ON "knowledge_documents" USING btree ("source_key") WHERE "knowledge_documents"."is_active" = true;--> statement-breakpoint
CREATE INDEX "chat_messages_history_idx" ON "chat_messages" USING btree ("customer_id","session_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cancellation_active_session_unique" ON "cancellation_requests" USING btree ("customer_id","session_id") WHERE "cancellation_requests"."status" IN (
                'awaiting_confirmation',
                'confirmed',
                'processing'
            );--> statement-breakpoint
CREATE UNIQUE INDEX "cancellation_active_order_unique" ON "cancellation_requests" USING btree ("customer_id","order_id") WHERE "cancellation_requests"."status" IN (
                'awaiting_confirmation',
                'confirmed',
                'processing',
                'requested'
            );--> statement-breakpoint
CREATE INDEX "cancellation_session_idx" ON "cancellation_requests" USING btree ("customer_id","session_id");--> statement-breakpoint
CREATE INDEX "cancellation_order_idx" ON "cancellation_requests" USING btree ("customer_id","order_id");--> statement-breakpoint
CREATE INDEX "audit_actor_created_idx" ON "audit_events" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_correlation_idx" ON "audit_events" USING btree ("correlation_id");