-- Escala 4x4: padroniza campo turno para formato 4x4|trabalho|dia ou 4x4|folga|dia
UPDATE public.relatorios
SET turno = '4x4|trabalho|1'
WHERE turno IS NULL OR turno NOT LIKE '4x4|%';

UPDATE public.operadores
SET turno = '4x4|trabalho|1'
WHERE turno IS NULL OR turno NOT LIKE '4x4|%';
