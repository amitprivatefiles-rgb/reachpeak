-- ============================================================
-- Chatbot / Automation Builder
-- flows + live execution state + run log
-- ============================================================

-- 1) flows: a no-code automation stored as a node/edge graph
CREATE TABLE IF NOT EXISTS public.flows (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','active','paused')),
  trigger_type  text NOT NULL
                  CHECK (trigger_type IN ('keyword','any_message','new_conversation')),
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  definition    jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  entry_node_id text,
  priority      int  NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flows_owner_all" ON public.flows
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS flows_user_active_idx
  ON public.flows (user_id, priority DESC) WHERE status = 'active';

-- updated_at trigger (reuse existing function if available)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    CREATE FUNCTION public.set_updated_at() RETURNS trigger
      LANGUAGE plpgsql AS $fn$ BEGIN NEW.updated_at = now(); RETURN NEW; END $fn$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS flows_set_updated_at ON public.flows;
CREATE TRIGGER flows_set_updated_at BEFORE UPDATE ON public.flows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 2) flow_executions: live state of one flow running for one conversation
CREATE TABLE IF NOT EXISTS public.flow_executions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flow_id             uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  conversation_id     uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  whatsapp_account_id uuid NOT NULL REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  contact_phone       text NOT NULL,
  current_node_id     text,
  status              text NOT NULL DEFAULT 'running'
                        CHECK (status IN ('running','waiting_input','waiting_delay',
                                          'completed','failed','handed_off')),
  variables           jsonb NOT NULL DEFAULT '{}'::jsonb,
  step_count          int  NOT NULL DEFAULT 0,
  resume_at           timestamptz,
  error               text,
  last_activity_at    timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.flow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flow_exec_owner_all" ON public.flow_executions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Exactly ONE active execution per conversation (prevents overlapping bots)
CREATE UNIQUE INDEX IF NOT EXISTS flow_exec_one_active_per_convo
  ON public.flow_executions (conversation_id)
  WHERE status IN ('running','waiting_input','waiting_delay');

-- Scheduler lookup for delayed resumes
CREATE INDEX IF NOT EXISTS flow_exec_resume_idx
  ON public.flow_executions (resume_at) WHERE status = 'waiting_delay';

DROP TRIGGER IF EXISTS flow_exec_set_updated_at ON public.flow_executions;
CREATE TRIGGER flow_exec_set_updated_at BEFORE UPDATE ON public.flow_executions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 3) flow_run_log: per-node execution log (debug + analytics)
CREATE TABLE IF NOT EXISTS public.flow_run_log (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  execution_id uuid NOT NULL REFERENCES public.flow_executions(id) ON DELETE CASCADE,
  flow_id      uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  node_id      text,
  node_type    text,
  detail       jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.flow_run_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flow_log_owner_all" ON public.flow_run_log
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS flow_log_exec_idx
  ON public.flow_run_log (execution_id, created_at);

-- Service-role needs full access to all three tables (flow-engine runs as service role)
CREATE POLICY "flows_service_role" ON public.flows
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "flow_exec_service_role" ON public.flow_executions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "flow_log_service_role" ON public.flow_run_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);
