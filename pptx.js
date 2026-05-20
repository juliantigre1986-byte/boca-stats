export async function generatePPTX(stats) {
  const PptxGenJS = (await import('pptxgenjs')).default
  const pres = new PptxGenJS()
  pres.layout = 'LAYOUT_16x9'

  const AZ = '001E62', AZ2 = '0A2472', AM = 'FFC300'
  const BL = 'FFFFFF', GR = 'F0F4FA', GR2 = 'DDE3EE', TX = '1A1A2E'

  const { players, golesConv, golesRecib, asistMap,
          nPartidos, totConv, totRecib, totAsist } = stats

  const hdr = (s, title) => {
    s.addShape(pres.ShapeType.rect, { x:0,y:0,w:10,h:0.72, fill:{color:AZ}, line:{color:AZ} })
    s.addText(title, { x:0.4,y:0,w:9.2,h:0.72, fontSize:19, bold:true, color:AM, fontFace:'Arial Black', valign:'middle' })
    s.addShape(pres.ShapeType.rect, { x:0,y:5.5,w:10,h:0.125, fill:{color:AM}, line:{color:AM} })
    s.addText(`Boca Juniors · Temporada 2026 · ${nPartidos} Partidos`, { x:0.4,y:5.5,w:9.2,h:0.125, fontSize:7, color:AZ, fontFace:'Arial', valign:'middle' })
  }

  // S1 Portada
  { const s = pres.addSlide(); s.background = { color: AZ }
    s.addShape(pres.ShapeType.rect, {x:0,y:0,w:10,h:0.1, fill:{color:AM}, line:{color:AM}})
    s.addShape(pres.ShapeType.rect, {x:0,y:5.525,w:10,h:0.1, fill:{color:AM}, line:{color:AM}})
    s.addText('BOCA JUNIORS', {x:0.5,y:0.9,w:9,h:0.9, fontSize:48, bold:true, color:AM, fontFace:'Arial Black', align:'center', charSpacing:6})
    s.addText('Estadísticas Individuales', {x:0.5,y:1.85,w:9,h:0.65, fontSize:28, color:BL, fontFace:'Arial', align:'center'})
    s.addText('TEMPORADA 2026', {x:3.2,y:2.75,w:3.6,h:0.65, fontSize:18, bold:true, color:AZ, fontFace:'Arial Black', align:'center', valign:'middle', fill:{color:AM}, shape:pres.ShapeType.rect})
    [[String(nPartidos),'Partidos'],[String(totConv),'Goles Conv.'],[String(totRecib),'Goles Recib.']].forEach(([v,l],i) => {
      const x = 0.9 + i*3
      s.addShape(pres.ShapeType.rect, {x,y:3.7,w:2.5,h:1.3, fill:{color:'071A52'}, line:{color:'1A3A8E'}})
      s.addText(v, {x,y:3.72,w:2.5,h:0.82, fontSize:42, bold:true, color:AM, fontFace:'Arial Black', align:'center', valign:'middle', margin:0})
      s.addText(l, {x,y:4.52,w:2.5,h:0.38, fontSize:12, color:GR2, fontFace:'Arial', align:'center', valign:'middle', margin:0})
    })
  }

  // S2 Tabla completa
  { const s = pres.addSlide(); s.background = { color: GR }; hdr(s, '📋  ESTADÍSTICAS COMPLETAS · 2026')
    const H = ['Jugador','PJ','Min.Tot.','Prom/PJ','G.Conv.','G.Recib.','Asist.','F.Rec.','F.Com.','Ama.']
    const W = [2.7,0.42,0.7,0.68,0.62,0.68,0.62,0.58,0.62,0.5]
    let cx = 0.12
    H.forEach((h,i) => {
      s.addShape(pres.ShapeType.rect, {x:cx,y:0.85,w:W[i],h:0.32, fill:{color:AZ}, line:{color:AZ}})
      s.addText(h, {x:cx,y:0.85,w:W[i],h:0.32, fontSize:8.5, bold:true, color:AM, fontFace:'Arial Black', align:'center', valign:'middle', margin:0})
      cx += W[i]
    })
    players.forEach((p,ri) => {
      const y = 1.17 + ri*0.238, bg = ri%2===0 ? BL : GR2
      cx = 0.12
      const gr = p.golesRecib != null ? p.golesRecib : '-'
      const vals = [p.name, p.pj, p.min.toFixed(1), p.prom.toFixed(1), p.golesConv, gr, p.asistencias, p.frec, p.fcom, p.ama]
      vals.forEach((v,ci) => {
        const isGR = ci===5 && v!=='-' && Number(v)>0
        s.addShape(pres.ShapeType.rect, {x:cx,y,w:W[ci],h:0.238, fill:{color:isGR?'FDECEA':bg}, line:{color:GR2,width:0.5}})
        s.addText(String(v), {x:cx,y,w:W[ci],h:0.238, fontSize:8.5, color:isGR?'C0392B':TX, fontFace:'Arial', bold:ci===0||isGR, align:ci===0?'left':'center', valign:'middle', margin:ci===0?3:0})
        cx += W[ci]
      })
    })
  }

  // S3 Goles convertidos
  { const s = pres.addSlide(); s.background = { color: BL }; hdr(s, `⚽  GOLES CONVERTIDOS · 2026  (${totConv} en total)`)
    const sorted = Object.entries(golesConv).filter(([n])=>n!=='En contra').sort((a,b)=>b[1]-a[1]).slice(0,10)
    const maxG = sorted[0]?.[1] || 1
    const RC = ['FFD700','C0C0C0','CD7F32','3A5A8A','3A5A8A','3A5A8A','3A5A8A','3A5A8A','3A5A8A','3A5A8A']
    sorted.forEach(([nm,g],i) => {
      const y = 0.82+i*0.46, bw = Math.max(0.15, 5.5*(g/maxG))
      s.addShape(pres.ShapeType.oval, {x:0.18,y:y+0.06,w:0.34,h:0.34, fill:{color:RC[i]}, line:{color:RC[i]}})
      s.addText(String(i+1), {x:0.18,y:y+0.06,w:0.34,h:0.34, fontSize:10, bold:true, color:i<3?AZ:BL, align:'center', valign:'middle', margin:0})
      s.addText(nm, {x:0.6,y,w:2.9,h:0.44, fontSize:12, bold:i<3, color:TX, fontFace:'Arial', valign:'middle'})
      s.addShape(pres.ShapeType.rect, {x:3.6,y:y+0.08,w:bw,h:0.26, fill:{color:i===0?AM:AZ}, line:{color:i===0?AM:AZ}})
      s.addText(String(g), {x:3.6+bw+0.1,y:y+0.04,w:0.5,h:0.38, fontSize:15, bold:true, color:AZ, fontFace:'Arial Black', valign:'middle'})
    })
    if (golesConv['En contra']) s.addText(`* ${golesConv['En contra']} gol(es) en contra`, {x:0.5,y:5.28,w:9,h:0.2, fontSize:8, color:'888888', fontFace:'Arial', italic:true})
  }

  // S4 Arqueros
  { const s = pres.addSlide(); s.background = { color: GR }; hdr(s, `🧤  GOLES RECIBIDOS · ARQUEROS · 2026  (${totRecib} en total)`)
    const gks = Object.entries(golesRecib).sort((a,b)=>b[1]-a[1])
    const GKC = [AZ, AZ2, '1A4A8A']
    gks.forEach(([nm,gr],i) => {
      const x = 0.4+i*4.8, cw = 4.3, pj = stats.players.find(p=>p.name===nm)?.pj||1
      const pct = Math.round(gr/totRecib*100), hw = (cw-0.25)/2
      s.addShape(pres.ShapeType.rect, {x,y:0.95,w:cw,h:3.9, fill:{color:GKC[i]||AZ}, line:{color:GKC[i]||AZ}})
      s.addText(nm, {x,y:1.05,w:cw,h:0.55, fontSize:17, bold:true, color:AM, fontFace:'Arial Black', align:'center', valign:'middle', margin:0})
      s.addText(String(gr), {x,y:1.65,w:cw,h:1.3, fontSize:72, bold:true, color:BL, fontFace:'Arial Black', align:'center', valign:'middle', margin:0})
      s.addText('goles recibidos', {x,y:2.95,w:cw,h:0.4, fontSize:13, color:GR2, fontFace:'Arial', align:'center', valign:'middle', margin:0})
      s.addShape(pres.ShapeType.rect, {x:x+0.1,y:3.45,w:hw,h:0.8, fill:{color:'071A52'}, line:{color:'1A3A8E'}})
      s.addText(`${pj} PJ`, {x:x+0.1,y:3.47,w:hw,h:0.4, fontSize:13, bold:true, color:BL, fontFace:'Arial', align:'center', valign:'middle', margin:0})
      s.addText('partidos', {x:x+0.1,y:3.85,w:hw,h:0.35, fontSize:9, color:GR2, fontFace:'Arial', align:'center', valign:'middle', margin:0})
      s.addShape(pres.ShapeType.rect, {x:x+0.15+hw,y:3.45,w:hw,h:0.8, fill:{color:'071A52'}, line:{color:'1A3A8E'}})
      s.addText((gr/pj).toFixed(1), {x:x+0.15+hw,y:3.47,w:hw,h:0.4, fontSize:13, bold:true, color:BL, fontFace:'Arial', align:'center', valign:'middle', margin:0})
      s.addText('prom/PJ', {x:x+0.15+hw,y:3.85,w:hw,h:0.35, fontSize:9, color:GR2, fontFace:'Arial', align:'center', valign:'middle', margin:0})
      s.addText(`${pct}% de los goles recibidos`, {x,y:4.92,w:cw,h:0.25, fontSize:9, color:GR2, fontFace:'Arial', align:'center'})
    })
    s.addChart('pie', [{name:'Arqueros', labels:gks.map(([n,v])=>`${n} (${v})`), values:gks.map(([,v])=>v)}], {
      x:3.9,y:0.85,w:2.2,h:2.2, chartColors:[AM,'6E8EC1'],
      showPercent:true, dataLabelFontSize:11, dataLabelColor:AZ, showLegend:false,
      chartArea:{ fill:{color:GR}, roundedCorners:false }
    })
  }

  // S5 Asistencias
  { const s = pres.addSlide(); s.background = { color: BL }; hdr(s, `🅰️  ASISTENCIAS · 2026  (${totAsist} en total)`)
    const sorted = Object.entries(asistMap).sort((a,b)=>b[1]-a[1]).slice(0,10)
    const maxA = sorted[0]?.[1] || 1
    const RC = ['FFD700','C0C0C0','CD7F32','3A5A8A','3A5A8A','3A5A8A','3A5A8A','3A5A8A','3A5A8A','3A5A8A']
    sorted.forEach(([nm,a],i) => {
      const y = 0.82+i*0.46, bw = Math.max(0.15,5.5*(a/maxA))
      s.addShape(pres.ShapeType.oval, {x:0.18,y:y+0.06,w:0.34,h:0.34, fill:{color:RC[i]}, line:{color:RC[i]}})
      s.addText(String(i+1), {x:0.18,y:y+0.06,w:0.34,h:0.34, fontSize:10, bold:true, color:i<3?AZ:BL, align:'center', valign:'middle', margin:0})
      s.addText(nm, {x:0.6,y,w:2.9,h:0.44, fontSize:12, bold:i<3, color:TX, fontFace:'Arial', valign:'middle'})
      s.addShape(pres.ShapeType.rect, {x:3.6,y:y+0.08,w:bw,h:0.26, fill:{color:i===0?'00A86B':'1A6B3A'}, line:{color:i===0?'00A86B':'1A6B3A'}})
      s.addText(String(a), {x:3.6+bw+0.1,y:y+0.04,w:0.5,h:0.38, fontSize:15, bold:true, color:AZ, fontFace:'Arial Black', valign:'middle'})
    })
  }

  // S6 Minutos
  { const s = pres.addSlide(); s.background = { color: GR }; hdr(s, '⏱️  MINUTOS EN CANCHA · 2026')
    const byM = [...players].sort((a,b)=>b.min-a.min).slice(0,10), maxM = byM[0]?.min||1
    byM.forEach((p,i) => {
      const y = 0.82+i*0.47, bw = Math.max(0.15,5.8*(p.min/maxM))
      s.addText(p.name, {x:0.2,y,w:2.9,h:0.42, fontSize:11, bold:i<3, color:TX, fontFace:'Arial', valign:'middle'})
      s.addShape(pres.ShapeType.rect, {x:3.2,y:y+0.06,w:bw,h:0.28, fill:{color:i<3?AM:AZ}, line:{color:i<3?AM:AZ}})
      s.addText(`${p.min.toFixed(0)} min`, {x:3.2+bw+0.1,y:y+0.04,w:1.1,h:0.34, fontSize:10, bold:true, color:AZ, fontFace:'Arial', valign:'middle'})
      s.addText(`~${p.prom}/PJ`, {x:8.7,y:y+0.06,w:1.1,h:0.28, fontSize:8, color:'888888', fontFace:'Arial', align:'right', valign:'middle'})
    })
  }

  // S7 Faltas
  { const s = pres.addSlide(); s.background = { color: BL }; hdr(s, '🟨  FALTAS Y DISCIPLINA · 2026')
    const bFC = [...players].filter(p=>p.fcom>0).sort((a,b)=>b.fcom-a.fcom).slice(0,7), mFC = bFC[0]?.fcom||1
    s.addShape(pres.ShapeType.rect, {x:0.18,y:0.85,w:4.5,h:0.32, fill:{color:AZ2}, line:{color:AZ2}})
    s.addText('MÁS FALTAS COMETIDAS', {x:0.18,y:0.85,w:4.5,h:0.32, fontSize:9, bold:true, color:AM, fontFace:'Arial Black', align:'center', valign:'middle', margin:0})
    bFC.forEach((p,i) => {
      const y = 1.25+i*0.54, bw = Math.max(0.08,1.1*(p.fcom/mFC))
      s.addText(`${i+1}. ${p.name}`, {x:0.25,y,w:2.8,h:0.5, fontSize:10.5, bold:i<3, color:TX, fontFace:'Arial', valign:'middle'})
      s.addShape(pres.ShapeType.rect, {x:3.15,y:y+0.1,w:bw,h:0.28, fill:{color:'E74C3C'}, line:{color:'E74C3C'}})
      s.addText(String(p.fcom), {x:3.15+bw+0.06,y:y+0.06,w:0.5,h:0.36, fontSize:13, bold:true, color:'C0392B', fontFace:'Arial Black', valign:'middle'})
    })
    const bFR = [...players].filter(p=>p.frec>0).sort((a,b)=>b.frec-a.frec).slice(0,7), mFR = bFR[0]?.frec||1
    s.addShape(pres.ShapeType.rect, {x:5.25,y:0.85,w:4.5,h:0.32, fill:{color:AZ2}, line:{color:AZ2}})
    s.addText('MÁS FALTAS RECIBIDAS', {x:5.25,y:0.85,w:4.5,h:0.32, fontSize:9, bold:true, color:AM, fontFace:'Arial Black', align:'center', valign:'middle', margin:0})
    bFR.forEach((p,i) => {
      const y = 1.25+i*0.54, bw = Math.max(0.08,1.1*(p.frec/mFR))
      s.addText(`${i+1}. ${p.name}`, {x:5.32,y,w:2.8,h:0.5, fontSize:10.5, bold:i<3, color:TX, fontFace:'Arial', valign:'middle'})
      s.addShape(pres.ShapeType.rect, {x:8.2,y:y+0.1,w:bw,h:0.28, fill:{color:'2980B9'}, line:{color:'2980B9'}})
      s.addText(String(p.frec), {x:8.2+bw+0.06,y:y+0.06,w:0.5,h:0.36, fontSize:13, bold:true, color:'1A5276', fontFace:'Arial Black', valign:'middle'})
    })
  }

  // S8 Gráfico
  { const s = pres.addSlide(); s.background = { color: GR }; hdr(s, '📊  GOLES CONVERTIDOS + ASISTENCIAS · 2026')
    const combined = Object.entries(golesConv).filter(([n])=>n!=='En contra')
      .map(([name,g]) => ({name:name.split(' ')[0], goles:g, asist:asistMap[name]||0}))
      .sort((a,b)=>(b.goles+b.asist)-(a.goles+a.asist)).slice(0,10)
    s.addChart('bar', [
      {name:'Goles Conv.', labels:combined.map(p=>p.name), values:combined.map(p=>p.goles)},
      {name:'Asistencias', labels:combined.map(p=>p.name), values:combined.map(p=>p.asist)},
    ], {
      x:0.3,y:0.82,w:9.4,h:4.55, barDir:'col', barGrouping:'stacked', chartColors:[AM,AZ],
      chartArea:{fill:{color:GR},roundedCorners:false}, catAxisLabelColor:'444444', valAxisLabelColor:'444444',
      valGridLine:{color:'E2E8F0',size:0.5}, catGridLine:{style:'none'},
      showValue:true, dataLabelColor:'1E293B', dataLabelFontSize:9, showLegend:true, legendPos:'b', legendFontSize:10
    })
  }

  // S9 Cierre
  { const s = pres.addSlide(); s.background = { color: AZ }
    s.addShape(pres.ShapeType.rect, {x:0,y:0,w:10,h:0.1, fill:{color:AM}, line:{color:AM}})
    s.addShape(pres.ShapeType.rect, {x:0,y:5.525,w:10,h:0.1, fill:{color:AM}, line:{color:AM}})
    s.addText('BOCA JUNIORS', {x:0.5,y:0.9,w:9,h:0.9, fontSize:42, bold:true, color:AM, fontFace:'Arial Black', align:'center', charSpacing:6})
    s.addText(`Temporada 2026 — ${stats.nPartidos} Partidos`, {x:0.5,y:1.9,w:9,h:0.5, fontSize:20, color:BL, fontFace:'Arial', align:'center'})
    const gks = Object.entries(golesRecib).sort((a,b)=>b[1]-a[1])
    const summary = [[String(totConv),'Goles Conv.'],[String(totRecib),'Goles Recib.'],[String(totAsist),'Asistencias'],...gks.map(([n,g])=>[String(g),n.split(' ')[0]+' (GK)'])].slice(0,5)
    summary.forEach(([v,l],i) => {
      const x = 0.35+i*1.88
      s.addShape(pres.ShapeType.rect, {x,y:2.7,w:1.7,h:1.4, fill:{color:'071A52'}, line:{color:'1A3A8E'}})
      s.addText(v, {x,y:2.72,w:1.7,h:0.82, fontSize:34, bold:true, color:AM, fontFace:'Arial Black', align:'center', valign:'middle', margin:0})
      s.addText(l, {x,y:3.52,w:1.7,h:0.45, fontSize:9, color:GR2, fontFace:'Arial', align:'center', valign:'middle', margin:0})
    })
    s.addText('* Goles recibidos por arquero', {x:0.5,y:4.25,w:9,h:0.25, fontSize:9, color:'8899BB', fontFace:'Arial', italic:true, align:'center'})
  }

  const date = new Date().toISOString().slice(0,10)
  return pres.writeFile({ fileName: `Boca_Stats_2026_${date}.pptx` })
}
