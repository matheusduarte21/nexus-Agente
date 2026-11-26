
GRANT SELECT
ON TABLE public.knowledge_chunks
TO nexus_app;

--> statement-breakpoint

GRANT SELECT, INSERT
ON TABLE public.chat_sessions
TO nexus_app;

--> statement-breakpoint

GRANT UPDATE (updated_at)
ON TABLE public.chat_sessions
TO nexus_app;

--> statement-breakpoint

GRANT SELECT, INSERT
ON TABLE public.chat_messages
TO nexus_app;

--> statement-breakpoint

GRANT SELECT, INSERT
ON TABLE public.cancellation_requests
TO nexus_app;

--> statement-breakpoint

GRANT UPDATE (
  status,
  confirmed_at,
  updated_at
)
ON TABLE public.cancellation_requests
TO nexus_app;

--> statement-breakpoint

GRANT INSERT
ON TABLE public.audit_events
TO nexus_app;


--> statement-breakpoint

ALTER TABLE public.chat_sessions
ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint

CREATE POLICY chat_sessions_customer_policy
ON public.chat_sessions
FOR ALL
TO nexus_app
USING (
  customer_id = NULLIF(
    current_setting('nexus.customer_id', true),
    ''
  )
)
WITH CHECK (
  customer_id = NULLIF(
    current_setting('nexus.customer_id', true),
    ''
  )
);

--> statement-breakpoint

ALTER TABLE public.chat_messages
ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint

CREATE POLICY chat_messages_customer_policy
ON public.chat_messages
FOR ALL
TO nexus_app
USING (
  customer_id = NULLIF(
    current_setting('nexus.customer_id', true),
    ''
  )
)
WITH CHECK (
  customer_id = NULLIF(
    current_setting('nexus.customer_id', true),
    ''
  )
);

--> statement-breakpoint

ALTER TABLE public.cancellation_requests
ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint

CREATE POLICY cancellation_customer_policy
ON public.cancellation_requests
FOR ALL
TO nexus_app
USING (
  customer_id = NULLIF(
    current_setting('nexus.customer_id', true),
    ''
  )
)
WITH CHECK (
  customer_id = NULLIF(
    current_setting('nexus.customer_id', true),
    ''
  )
);

--> statement-breakpoint

ALTER TABLE public.audit_events
ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint

CREATE POLICY audit_customer_insert_policy
ON public.audit_events
FOR INSERT
TO nexus_app
WITH CHECK (
  actor_id = NULLIF(
    current_setting('nexus.customer_id', true),
    ''
  )
);
