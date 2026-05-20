function toMin(t) {
  if (!t) return 0
  const p = String(t).split(':')
  if (p.length === 3) return +p[0]*60 + +p[1] + +p[2]/60
  if (p.length === 2) return +p[0]*60 + +p[1]
  return 0
}
