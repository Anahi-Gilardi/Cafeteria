-- =========================================================================
-- SCRIPT SQL: Creación de Tabla registros_fichaje en Supabase PostgreSQL
-- Castaño Resto Bar & Cafetería (Constitución 944, Río Cuarto, Córdoba)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.registros_fichaje (
    id_fichaje BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_empleado TEXT NOT NULL,
    nombre_empleado TEXT NOT NULL,
    tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN ('INGRESO', 'EGRESO')),
    timestamp_servidor TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitud NUMERIC(10, 7) NOT NULL,
    longitud NUMERIC(10, 7) NOT NULL,
    precision_gps NUMERIC(8, 2) NOT NULL,
    distancia_metros NUMERIC(8, 2) NOT NULL,
    dentro_de_rango BOOLEAN NOT NULL DEFAULT true,
    dispositivo_info TEXT DEFAULT '',
    direccion_aproximada TEXT DEFAULT '',
    observaciones TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de alto rendimiento para consultas y reportes de fichaje
CREATE INDEX IF NOT EXISTS idx_fichaje_empleado_fecha 
ON public.registros_fichaje (id_empleado, timestamp_servidor DESC);

CREATE INDEX IF NOT EXISTS idx_fichaje_fecha 
ON public.registros_fichaje (timestamp_servidor DESC);

-- Inhabilitar Row Level Security para evitar errores 42501 en clientes anónimos/autenticados
ALTER TABLE public.registros_fichaje DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.registros_fichaje TO anon, authenticated, service_role;
