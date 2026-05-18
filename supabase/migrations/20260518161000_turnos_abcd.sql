-- Padroniza turnos para A, B, C e D (remove formato antigo com horário no texto)
UPDATE public.relatorios
SET turno = CASE
  WHEN turno ~* 'Turno\s*A' THEN 'Turno A'
  WHEN turno ~* 'Turno\s*B' THEN 'Turno B'
  WHEN turno ~* 'Turno\s*C' THEN 'Turno C'
  WHEN turno ~* 'Turno\s*D' THEN 'Turno D'
  ELSE turno
END
WHERE turno IS NOT NULL;

UPDATE public.operadores
SET turno = CASE
  WHEN turno ~* 'Turno\s*A' THEN 'Turno A'
  WHEN turno ~* 'Turno\s*B' THEN 'Turno B'
  WHEN turno ~* 'Turno\s*C' THEN 'Turno C'
  WHEN turno ~* 'Turno\s*D' THEN 'Turno D'
  ELSE turno
END
WHERE turno IS NOT NULL;
