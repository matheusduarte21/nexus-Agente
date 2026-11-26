\set ON_ERROR_STOP on

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles
    WHERE rolname = 'nexus_ingestor'
  ) THEN
    CREATE ROLE nexus_ingestor
      WITH LOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
  END IF;
END
$$;

GRANT CONNECT
ON DATABASE nexus
TO nexus_ingestor;

GRANT USAGE
ON SCHEMA public
TO nexus_ingestor;

GRANT SELECT, INSERT
ON TABLE public.knowledge_documents
TO nexus_ingestor;

GRANT UPDATE (is_active)
ON TABLE public.knowledge_documents
TO nexus_ingestor;

GRANT SELECT, INSERT
ON TABLE public.knowledge_chunks
TO nexus_ingestor;

COMMIT;