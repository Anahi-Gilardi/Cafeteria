-- Script SQL dinámico tolerante a fallos para Supabase
-- Habilita permisos de lectura/escritura y ejecución en tablas y funciones RPC

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

-- 3. Configurar funciones RPC con SECURITY DEFINER (para permitir invocación por anon)
DO $$
BEGIN
    ALTER FUNCTION public.persist_order_transaction SECURITY DEFINER;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Función persist_order_transaction no requiere cambios o no existe';
END $$;

DO $$
BEGIN
    ALTER FUNCTION public.archive_order SECURITY DEFINER;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Función archive_order no requiere cambios o no existe';
END $$;
