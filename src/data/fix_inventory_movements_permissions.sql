-- Script SQL completo y tolerante a fallos para Supabase
-- Soluciona permisos RLS (42501) y restricciones de funciones RPC ('billing role required')

DO $$ 
DECLARE 
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
            'inventory_movements', 
            'inventory_audits', 
            'inventory_items', 
            'waiter_calls', 
            'staff_attendance', 
            'orders', 
            'cash_ledger',
            'users_accounts'
        )
    LOOP
        EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO anon, authenticated, service_role;', tbl.table_name);
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', tbl.table_name);
        RAISE NOTICE 'Permisos de tabla otorgados para: %', tbl.table_name;
    END LOOP;
END $$;

-- 1. Otorgar permisos de ejecución de funciones RPC
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 2. Otorgar uso sobre las secuencias de base de datos
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. Configurar funciones RPC como SECURITY DEFINER (para permitir cobros y comandas desde cualquier rol)
DO $$ BEGIN ALTER FUNCTION public.record_order_payment SECURITY DEFINER; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.record_order_payment_batch SECURITY DEFINER; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.persist_order_transaction SECURITY DEFINER; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.archive_order SECURITY DEFINER; EXCEPTION WHEN OTHERS THEN NULL; END $$;
