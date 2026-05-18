-- Padroniza turnos para 7x19 (diurno) e 19x7 (noturno)
UPDATE public.relatorios
SET turno = CASE
  WHEN turno ~* '7.*19|07.*19|diurno|turno[[:space:]]*[ab]' THEN 'Turno 7x19'
  WHEN turno ~* '19.*7|19.*07|noturno|turno[[:space:]]*[cd]' THEN 'Turno 19x7'
  ELSE turno
END
WHERE turno IS NOT NULL;

UPDATE public.operadores
SET turno = CASE
  WHEN turno ~* '7.*19|07.*19|diurno|turno[[:space:]]*[ab]' THEN 'Turno 7x19'
  WHEN turno ~* '19.*7|19.*07|noturno|turno[[:space:]]*[cd]' THEN 'Turno 19x7'
  ELSE turno
END
WHERE turno IS NOT NULL;
