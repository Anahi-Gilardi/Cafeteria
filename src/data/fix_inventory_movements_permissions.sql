-- Script SQL tolerante a fallos para Supabase
-- Aplica permisos automáticamente SOLO a las tablas que existen actualmente en el esquema public.

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
        RAISE NOTICE 'Permisos otorgados exitosamente para: %', tbl.table_name;
    END LOOP;
END $$;

-- Otorgar uso sobre las secuencias de base de datos
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
