-- Migration: Tabla 'fichajes' para Castaño Resto Bar
CREATE TABLE IF NOT EXISTS fichajes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  empleado_id VARCHAR(255) NOT NULL,
  nombre_completo VARCHAR(255) NOT NULL,
  tipo VARCHAR(10) CHECK (tipo IN ('INGRESO', 'EGRESO')) NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  latitud NUMERIC(10, 8),
  longitud NUMERIC(11, 8),
  precision_metros NUMERIC,
  dentro_de_rango BOOLEAN DEFAULT false,
  distancia_sucursal_metros NUMERIC,
  direccion_texto TEXT,
  user_agent TEXT
);

-- Índices de alto rendimiento para filtros por empleado, fecha y tipo
CREATE INDEX IF NOT EXISTS idx_fichajes_empleado_id ON fichajes(empleado_id);
CREATE INDEX IF NOT EXISTS idx_fichajes_fecha ON fichajes(fecha);
CREATE INDEX IF NOT EXISTS idx_fichajes_tipo ON fichajes(tipo);
