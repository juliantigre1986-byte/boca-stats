import { useState, useEffect } from 'react'

const SHEET_ID = '1vjsjvCQF005MzI9uZ4Sh9_xsVS4Cp2w_EmY8kptlGoM'
const API_KEY  = import.meta.env.VITE_GOOGLE_API_KEY
const YEAR     = '2026_'

const C = {
  azul:'#001E62', azul2:'#0A2472', amarillo:'#FFC300',
  blanco:'#FFFFFF', gris:'#F0F2F5', gris2:'#DDE3EE',
  texto:'#1A1A2E', verde:'#0F6E56', rojo:'#A32D2D',
}

async function fetchSheet(range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Error ${res.status} leyendo ${range}`)
  const data = await res.json()
  const [headers, ...rows] = data.values || []
  return rows.map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])))
}

function toMin(t) {
  if (!t) return 0
  const p = String(t).split(':')
  if (p.length === 3) return +p[0]*60 + +p[1] + +p[2]/60
  if (p.length === 2) return +p[0]*60 + +p[1]
  return 0
}

export default function App() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [screen, setScreen]   = useState('home')
  const [statsTab, setStatsTab] = useState('Goles')

  useEffect(() => {
    async function load() {
      try {
        const [partidos, minutos, goles] = await Promise.all([
          fetchSheet('Partidos!A:U'),
          fetchSheet('Minutos!A:Z'),
          fetchSheet('Goles!A:AB'),
        ])
        const p26 = partidos.filter(r => r['Partido']?.startsWith(YEAR))
        const m26 = minutos.filter(r => r['Partido']?.startsWith(YEAR) && r['Presencia'] === 'Jugado')
        const g26 = goles.filter(r => r['Partido']?.startsWith(YEAR))

        const map = {}
        for (const r of m26) {
          const n = r['Apellido y Nombre']?.trim()
          if (!n) continue
          if (!map[n]) map[n] = { name:n, pj:0, min:0, frec:0, fcom:0, ama:0 }
          map[n].pj++; map[n].min += toMin(r['Minutos_Total'])
          map[n].frec += +r['F. Recibidos']||0; map[n].fcom += +r['F. Cometidos']||0; map[n].ama += +r['Ama']||0
        }

        const golesConv = {}, golesRecib = {}, assists = {}
        for (const g of g26) {
          const j = g['Jugador']?.trim(), a = g['Asistencia']?.trim()
          if (!j) continue
          if (g['Fase'] === 'Ataque') { golesConv[j] = (golesConv[j]||0)+1; if(a) assists[a]=(assists[a]||0)+1 }
          else if (g['Fase'] === 'Defensa') golesRecib[j] = (golesRecib[j]||0)+1
        }

        const players = Object.values(map).map(p => ({
          ...p, min:+p.min.toFixed(1), prom:p.pj>0?+(p.min/p.pj).toFixed(1):0,
          golesConv:golesConv[p.name]||0, golesRecib:golesRecib[p.name]??null, asistencias:assists[p.name]||0,
        })).sort((a,b)=>b.pj-a.pj)

        const lastMatch = p26[p26.length-1]||{}
        const lastPid = lastMatch['Partido']||''
        const lastPlayers = m26.filter(r=>r['Partido']===lastPid)
          .map(r=>({ name:r['Apellido y Nombre']?.trim(), min:+toMin(r['Minutos_Total']).toFixed(0),
            goles:+r['Goles']||0, asist:+r['Asistencia']||0, isGK:!!golesRecib[r['Apellido y Nombre']?.trim()] }))
          .sort((a,b)=>b.min-a.min)

        const goalsFeed = g26.filter(g=>g['Video']?.trim()).map(g=>({
          partido:g['Partido'], rival:p26.find(p=>p['Partido']===g['Partido'])?.['Rival']||'',
          fecha:p26.find(p=>p['Partido']===g['Partido'])?.['Fecha']||'',
          fase:g['Fase'], jugador:g['Jugador']?.trim(), asist:g['Asistencia']?.trim()||'',
          minuto:g['Minuto']||'', video:g['Video']?.trim(),
        })).reverse()

        const wins=p26.filter(p=>p['Resultado']==='Ganado').length
        const draws=p26.filter(p=>p['Resultado']==='Empate').length
        const losses=p26.filter(p=>p['Resultado']==='Perdido').length
        const totConv=Object.values(golesConv).reduce((a,b)=>a+b,0)
        const totRecib=Object.values(golesRecib).reduce((a,b)=>a+b,0)
        const totAsist=Object.values(assists).reduce((a,b)=>a+b,0)

        setData({ players, goalsFeed, lastPlayers, lastMatch, nPartidos:p26.length,
          totConv, totRecib, totAsist, wins, draws, losses, golesConv, golesRecib, assists })
      } catch(e) { setError(e.message) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const NAV = [
    {id:'home', icon:'ti-home', label:'Inicio'},
    {id:'videos', icon:'ti-player-play', label:'Videos'},
    {id:'stats', icon:'ti-chart-bar', label:'Stats'},
    {id:'reporte', icon:'ti-presentation', label:'Reporte'},
  ]

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:C.gris,maxWidth:480,margin:'0 auto',fontFamily:'Inter,sans-serif'}}>
      {/* TopBar */}
      <div style={{background:C.azul,padding:'16px 20px 12px',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {!['home','videos','stats','reporte'].includes(screen) &&
            <button onClick={()=>setScreen('home')} style={{background:'none',border:'none',color:C.amarillo,cursor:'pointer',fontSize:22,padding:0}}>
              <i className="ti ti-arrow-left"/>
            </button>}
          <div style={{flex:1}}>
            <div style={{fontSize:17,fontWeight:700,color:C.amarillo}}>
              {screen==='home'?'Boca Juniors':screen==='videos'?'Videos de goles':screen==='stats'?'Estadísticas':'Generar reporte'}
            </div>
            <div style={{fontSize:12,color:'#8899BB',marginTop:2}}>
              {data?`Temporada 2026 · ${data.nPartidos} partidos`:'Temporada 2026'}
            </div>
          </div>
          {screen==='home'&&<button onClick={()=>window.location.reload()} style={{background:'none',border:'none',color:'#8899BB',cursor:'pointer',fontSize:20,padding:0}}><i className="ti ti-refresh"/></button>}
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column'}}>
        {loading && (
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
            <div style={{width:48,height:48,borderRadius:'50%',background:C.amarillo,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:900,color:C.azul}}>BJ</div>
            <div style={{color:'#8899BB',fontSize:13}}>Cargando datos del Drive...</div>
          </div>
        )}
        {error && (
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:24}}>
            <div style={{color:C.rojo,fontSize:14,fontWeight:700,textAlign:'center'}}>Error cargando datos</div>
            <div style={{color:'#888',fontSize:12,textAlign:'center',wordBreak:'break-all'}}>{error}</div>
            <button onClick={()=>window.location.reload()} style={{padding:'10px 20px',background:C.amarillo,border:'none',borderRadius:8,color:C.azul,fontWeight:700,cursor:'pointer'}}>Reintentar</button>
          </div>
        )}
        {data && !loading && !error && (
          <>
            {screen==='home' && <HomeScreen data={data} setScreen={setScreen}/>}
            {screen==='videos' && <VideosScreen data={data}/>}
            {screen==='stats' && <StatsScreen data={data} tab={statsTab} setTab={setStatsTab}/>}
            {screen==='reporte' && <ReporteScreen data={data}/>}
          </>
        )}
      </div>

      {/* NavBar */}
      {['home','videos','stats','reporte'].includes(screen) && (
        <nav style={{background:C.azul,display:'flex',borderTop:'1px solid #0A2472',flexShrink:0}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setScreen(n.id)}
              style={{flex:1,padding:'10px 4px 8px',border:'none',background:'none',cursor:'pointer',
                display:'flex',flexDirection:'column',alignItems:'center',gap:3,fontSize:10,
                color:screen===n.id?C.amarillo:'#8899BB',fontFamily:'Inter,sans-serif'}}>
              <i className={`ti ${n.icon}`} style={{fontSize:20}}/>
              {n.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}

// ── HOME ────────────────────────────────────────────────────────────────────
function HomeScreen({data, setScreen}) {
  const {nPartidos,totConv,totRecib,wins,draws,losses,lastMatch,lastPlayers,goalsFeed,players} = data
  const rival = lastMatch['Rival']||'-', fecha = lastMatch['Fecha']||'-'
  const res = `${lastMatch['Gol Boca']||0}-${lastMatch['Gol Rival']||0}`
  const resultado = lastMatch['Resultado']||''
  const maxMin = Math.max(...lastPlayers.map(p=>p.min),1)
  return (
    <div style={{padding:16}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
        {[[nPartidos,'Partidos'],[totConv,'Goles conv.'],[totRecib,'Goles recib.'],[`${wins}-${draws}-${losses}`,'G · E · P']].map(([v,l])=>(
          <div key={l} style={{background:'#001E62',borderRadius:12,padding:14,textAlign:'center'}}>
            <div style={{fontSize:24,fontWeight:700,color:'#FFC300'}}>{v}</div>
            <div style={{fontSize:11,color:'#8899BB',marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>
      <Sec>Último partido</Sec>
      <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',padding:14,marginBottom:12,cursor:'pointer'}} onClick={()=>setScreen('videos')}>
        <div style={{display:'flex',alignItems:'center',marginBottom:8}}>
          <div><div style={{fontSize:15,fontWeight:600,color:'#1A1A2E'}}>Boca vs {rival}</div><div style={{fontSize:12,color:'#888',marginTop:2}}>{fecha}</div></div>
          <div style={{fontSize:22,fontWeight:700,marginLeft:'auto',color:resultado==='Ganado'?'#0F6E56':resultado==='Perdido'?'#A32D2D':'#BA7517'}}>{res}</div>
        </div>
        <span style={{display:'inline-block',padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:600,background:resultado==='Ganado'?'#EAF3DE':resultado==='Perdido'?'#FCEBEB':'#FAEEDA',color:resultado==='Ganado'?'#3B6D11':resultado==='Perdido'?'#A32D2D':'#854F0B'}}>{resultado}</span>
      </div>
      <Sec>Minutos jugados · último partido</Sec>
      <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',padding:'12px 14px',marginBottom:12}}>
        {lastPlayers.slice(0,8).map((p,i)=>(
          <div key={p.name} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:i<7?'0.5px solid #DDE3EE':'none'}}>
            <div style={{fontSize:12,fontWeight:600,color:'#1A1A2E',width:100,flexShrink:0}}>{p.name.split(' ').slice(0,2).join(' ')}{p.isGK&&<span style={{fontSize:10,color:'#888',marginLeft:4}}>(arq.)</span>}</div>
            <div style={{flex:1,height:5,background:'#DDE3EE',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.round(p.min/maxMin*100)}%`,background:p.isGK?'#FFC300':'#001E62',borderRadius:3}}/></div>
            <span style={{fontSize:12,fontWeight:600,color:'#1A1A2E',minWidth:38,textAlign:'right'}}>{p.min} min</span>
          </div>
        ))}
      </div>
      <Sec>Últimos goles · tocá para ver el video</Sec>
      {goalsFeed.slice(0,4).map((g,i)=><VidCard key={i} gol={g}/>)}
      <button onClick={()=>setScreen('videos')} style={{width:'100%',padding:10,background:'none',border:'0.5px solid #DDE3EE',borderRadius:10,fontSize:13,color:'#888',cursor:'pointer',marginBottom:16,fontFamily:'Inter,sans-serif'}}>Ver todos los goles →</button>
      <Sec>Top goleadores</Sec>
      <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',overflow:'hidden',marginBottom:16}}>
        {[...players].sort((a,b)=>b.golesConv-a.golesConv).slice(0,4).map((p,i)=>(
          <div key={p.name} style={{padding:'11px 14px',display:'flex',alignItems:'center',gap:10,borderBottom:i<3?'0.5px solid #DDE3EE':'none'}}>
            <div style={{width:34,height:34,borderRadius:'50%',background:i===0?'#FFC300':'#001E62',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:i===0?'#001E62':'#FFC300',flexShrink:0}}>{i+1}</div>
            <div><div style={{fontSize:13,fontWeight:600,color:'#1A1A2E'}}>{p.name}</div><div style={{fontSize:11,color:'#888'}}>{p.pj} PJ</div></div>
            <span style={{marginLeft:'auto',fontSize:11,padding:'3px 8px',borderRadius:20,fontWeight:700,background:i===0?'#FFC300':'#001E62',color:i===0?'#001E62':'#FFC300'}}>{p.golesConv} goles</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── VIDEOS ───────────────────────────────────────────────────────────────────
function VideosScreen({data}) {
  const [filter, setFilter] = useState('todos')
  const [search, setSearch] = useState('')
  let list = data.goalsFeed
  if (filter==='ataque') list=list.filter(g=>g.fase==='Ataque')
  if (filter==='defensa') list=list.filter(g=>g.fase==='Defensa')
  if (search) list=list.filter(g=>g.jugador?.toLowerCase().includes(search.toLowerCase())||g.rival?.toLowerCase().includes(search.toLowerCase()))
  return (
    <div style={{padding:16}}>
      <input type="text" placeholder="Buscar jugador o rival..." value={search} onChange={e=>setSearch(e.target.value)}
        style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'0.5px solid #DDE3EE',fontSize:14,marginBottom:12,fontFamily:'Inter,sans-serif',background:'#fff',color:'#1A1A2E'}}/>
      <div style={{display:'flex',gap:6,marginBottom:14}}>
        {[['todos','Todos'],['ataque','Goles conv.'],['defensa','Goles recib.']].map(([id,label])=>(
          <button key={id} onClick={()=>setFilter(id)} style={{flexShrink:0,padding:'6px 14px',borderRadius:20,border:'0.5px solid #DDE3EE',background:filter===id?'#001E62':'#fff',color:filter===id?'#FFC300':'#888',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>{label}</button>
        ))}
        <span style={{marginLeft:'auto',fontSize:11,color:'#888',alignSelf:'center'}}>{list.length} videos</span>
      </div>
      {list.map((g,i)=><VidCard key={i} gol={g}/>)}
      <div style={{height:16}}/>
    </div>
  )
}

// ── STATS ────────────────────────────────────────────────────────────────────
function StatsScreen({data, tab, setTab}) {
  const {players,golesConv,golesRecib,assists,lastPlayers,totRecib} = data
  const maxLast = Math.max(...lastPlayers.map(p=>p.min),1)
  const maxTotal = Math.max(...players.map(p=>p.min),1)
  return (
    <div style={{padding:16}}>
      <div style={{display:'flex',gap:6,marginBottom:16}}>
        {['Goles','Minutos','Arqueros','Faltas'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'8px 4px',borderRadius:8,border:'0.5px solid #DDE3EE',background:tab===t?'#001E62':'#fff',color:tab===t?'#FFC300':'#888',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>{t}</button>
        ))}
      </div>
      {tab==='Goles'&&<>
        <Sec>Goles convertidos</Sec>
        <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',overflow:'hidden',marginBottom:12}}>
          {Object.entries(golesConv).filter(([n])=>n!=='En contra').sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,g],i,arr)=>(
            <div key={name} style={{padding:'11px 14px',display:'flex',alignItems:'center',gap:10,borderBottom:i<arr.length-1?'0.5px solid #DDE3EE':'none'}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:i<3?'#FFC300':'#001E62',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:i<3?'#001E62':'#FFC300',flexShrink:0}}>{i+1}</div>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'#1A1A2E'}}>{name}</div><div style={{fontSize:11,color:'#888'}}>{players.find(p=>p.name===name)?.pj||0} PJ</div></div>
              <span style={{fontSize:14,fontWeight:700,color:'#001E62'}}>{g}</span>
            </div>
          ))}
        </div>
        <Sec>Asistencias</Sec>
        <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',overflow:'hidden',marginBottom:16}}>
          {Object.entries(assists).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,a],i,arr)=>(
            <div key={name} style={{padding:'11px 14px',display:'flex',alignItems:'center',gap:10,borderBottom:i<arr.length-1?'0.5px solid #DDE3EE':'none'}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:'#001E62',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#FFC300',flexShrink:0}}>{i+1}</div>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'#1A1A2E'}}>{name}</div></div>
              <span style={{fontSize:14,fontWeight:700,color:'#0F6E56'}}>{a}</span>
            </div>
          ))}
        </div>
      </>}
      {tab==='Minutos'&&<>
        <Sec>Minutos · último partido</Sec>
        <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',padding:'12px 14px',marginBottom:12}}>
          {lastPlayers.map((p,i)=>(
            <div key={p.name} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:i<lastPlayers.length-1?'0.5px solid #DDE3EE':'none'}}>
              <div style={{fontSize:12,fontWeight:600,color:'#1A1A2E',width:96,flexShrink:0}}>{p.name.split(' ').slice(0,2).join(' ')}{p.isGK&&<span style={{fontSize:10,color:'#888',marginLeft:3}}>(arq.)</span>}</div>
              <div style={{flex:1,height:5,background:'#DDE3EE',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.round(p.min/maxLast*100)}%`,background:p.isGK?'#FFC300':'#001E62',borderRadius:3}}/></div>
              <span style={{fontSize:12,fontWeight:600,color:'#1A1A2E',minWidth:38,textAlign:'right'}}>{p.min} min</span>
            </div>
          ))}
        </div>
        <Sec>Minutos totales · temporada</Sec>
        <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',padding:'12px 14px',marginBottom:16}}>
          {[...players].sort((a,b)=>b.min-a.min).map((p,i)=>(
            <div key={p.name} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:i<players.length-1?'0.5px solid #DDE3EE':'none'}}>
              <div style={{fontSize:12,fontWeight:600,color:'#1A1A2E',width:96,flexShrink:0}}>{p.name.split(' ').slice(0,2).join(' ')}{p.golesRecib!=null&&<span style={{fontSize:10,color:'#888',marginLeft:3}}>(arq.)</span>}</div>
              <div style={{flex:1,height:5,background:'#DDE3EE',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.round(p.min/maxTotal*100)}%`,background:p.golesRecib!=null?'#FFC300':'#001E62',borderRadius:3}}/></div>
              <span style={{fontSize:12,fontWeight:600,color:'#1A1A2E',minWidth:38,textAlign:'right'}}>{p.min.toFixed(0)} min</span>
            </div>
          ))}
        </div>
      </>}
      {tab==='Arqueros'&&<>
        <Sec>Goles recibidos</Sec>
        <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',overflow:'hidden',marginBottom:16}}>
          {Object.entries(golesRecib).sort((a,b)=>b[1]-a[1]).map(([name,gr],i,arr)=>{
            const pj=players.find(p=>p.name===name)?.pj||1
            return (
              <div key={name} style={{padding:'11px 14px',display:'flex',alignItems:'center',gap:10,borderBottom:i<arr.length-1?'0.5px solid #DDE3EE':'none'}}>
                <div style={{width:34,height:34,borderRadius:'50%',background:'#001E62',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#FFC300',flexShrink:0}}>{name.split(' ').map(w=>w[0]).slice(0,2).join('')}</div>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'#1A1A2E'}}>{name}</div><div style={{fontSize:11,color:'#888'}}>{pj} PJ · {(gr/pj).toFixed(1)} rec/PJ · {Math.round(gr/totRecib*100)}%</div></div>
                <span style={{fontSize:18,fontWeight:700,color:'#A32D2D'}}>{gr}</span>
              </div>
            )
          })}
        </div>
      </>}
      {tab==='Faltas'&&<>
        <Sec>Más faltas cometidas</Sec>
        <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',overflow:'hidden',marginBottom:12}}>
          {[...players].filter(p=>p.fcom>0).sort((a,b)=>b.fcom-a.fcom).slice(0,8).map((p,i,arr)=>(
            <div key={p.name} style={{padding:'11px 14px',display:'flex',alignItems:'center',gap:10,borderBottom:i<arr.length-1?'0.5px solid #DDE3EE':'none'}}>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'#1A1A2E'}}>{p.name}</div><div style={{fontSize:11,color:'#888'}}>{p.pj} PJ · Ama: {p.ama}</div></div>
              <span style={{fontSize:14,fontWeight:700,color:'#C0392B'}}>{p.fcom}</span>
            </div>
          ))}
        </div>
        <Sec>Más faltas recibidas</Sec>
        <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',overflow:'hidden',marginBottom:16}}>
          {[...players].filter(p=>p.frec>0).sort((a,b)=>b.frec-a.frec).slice(0,8).map((p,i,arr)=>(
            <div key={p.name} style={{padding:'11px 14px',display:'flex',alignItems:'center',gap:10,borderBottom:i<arr.length-1?'0.5px solid #DDE3EE':'none'}}>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'#1A1A2E'}}>{p.name}</div><div style={{fontSize:11,color:'#888'}}>{p.pj} PJ</div></div>
              <span style={{fontSize:14,fontWeight:700,color:'#1A5276'}}>{p.frec}</span>
            </div>
          ))}
        </div>
      </>}
    </div>
  )
}

// ── REPORTE ───────────────────────────────────────────────────────────────────
function ReporteScreen({data}) {
  const [status, setStatus] = useState('idle')
  const {nPartidos,totConv,totRecib,totAsist,wins,draws,losses} = data
  async function handleGenerate() {
    setStatus('loading')
    try {
      const { generatePPTX } = await import('./pptx.js')
      await generatePPTX(data)
      setStatus('done')
    } catch(e) { setStatus('error') }
  }
  return (
    <div style={{padding:16}}>
      <div style={{background:'#001E62',borderRadius:12,padding:16,marginBottom:14,display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:44,height:44,borderRadius:8,background:'#FFC300',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><i className="ti ti-presentation" style={{fontSize:24,color:'#001E62'}}/></div>
        <div><div style={{fontSize:14,fontWeight:700,color:'#FFC300'}}>Boca Stats 2026</div><div style={{fontSize:12,color:'#8899BB',marginTop:2}}>{nPartidos} partidos · {totConv} goles conv. · {totRecib} recibidos</div></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
        {[[nPartidos,'Partidos'],[totConv,'Goles Conv.'],[totRecib,'Goles Recib.'],[totAsist,'Asistencias']].map(([v,l])=>(
          <div key={l} style={{background:'#fff',borderRadius:10,border:'0.5px solid #DDE3EE',padding:12,textAlign:'center'}}>
            <div style={{fontSize:26,fontWeight:700,color:'#001E62'}}>{v}</div>
            <div style={{fontSize:11,color:'#888',marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>
      <button onClick={handleGenerate} disabled={status==='loading'}
        style={{width:'100%',padding:14,background:status==='loading'?'#888':'#FFC300',color:'#001E62',border:'none',borderRadius:10,fontSize:15,fontWeight:700,cursor:status==='loading'?'not-allowed':'pointer',fontFamily:'Inter,sans-serif'}}>
        {status==='loading'?'⏳  Generando...':status==='done'?'🔄  Regenerar PPTX':'⬇️  Generar PPTX'}
      </button>
      {status==='done'&&<div style={{marginTop:10,padding:12,background:'#EAF3DE',borderRadius:8,fontSize:13,color:'#3B6D11',textAlign:'center',fontWeight:600}}>✅ PPTX descargado correctamente</div>}
      <div style={{marginTop:16,fontSize:12,fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:.5,marginBottom:10}}>Compartir</div>
      <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',overflow:'hidden',marginBottom:16}}>
        <div style={{padding:'11px 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',borderBottom:'0.5px solid #DDE3EE'}}
          onClick={()=>window.open(`https://wa.me/?text=${encodeURIComponent(`🔵🟡 Boca Juniors 2026\n⚽ ${totConv} goles · 🧤 ${totRecib} recibidos\n📊 ${wins}G-${draws}E-${losses}P`)}`)}>
          <i className="ti ti-brand-whatsapp" style={{fontSize:20,color:'#0F6E56'}}/>
          <span style={{fontSize:14,fontWeight:600,color:'#1A1A2E'}}>WhatsApp</span>
          <i className="ti ti-chevron-right" style={{marginLeft:'auto',color:'#888'}}/>
        </div>
        <div style={{padding:'11px 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}
          onClick={()=>window.open(`mailto:?subject=Boca Stats 2026&body=Temporada 2026 — ${nPartidos} partidos`)}>
          <i className="ti ti-mail" style={{fontSize:20,color:'#001E62'}}/>
          <span style={{fontSize:14,fontWeight:600,color:'#1A1A2E'}}>Email</span>
          <i className="ti ti-chevron-right" style={{marginLeft:'auto',color:'#888'}}/>
        </div>
      </div>
    </div>
  )
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function Sec({children}) {
  return <div style={{fontSize:11,fontWeight:700,color:'#888',marginBottom:10,textTransform:'uppercase',letterSpacing:.5}}>{children}</div>
}

function VidCard({gol}) {
  const isConv = gol.fase==='Ataque'
  return (
    <div onClick={()=>window.open(gol.video,'_blank')}
      style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',marginBottom:10,overflow:'hidden',cursor:'pointer'}}>
      <div style={{height:70,display:'flex',alignItems:'center',justifyContent:'center',background:isConv?'linear-gradient(135deg,#001E62,#0A2472)':'linear-gradient(135deg,#3A0A0A,#6B1A1A)'}}>
        <div style={{width:38,height:38,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:isConv?'#FFC300':'#FCEBEB'}}>
          <i className="ti ti-player-play" style={{fontSize:18,color:isConv?'#001E62':'#A32D2D'}}/>
        </div>
      </div>
      <div style={{padding:'10px 12px'}}>
        <div style={{fontSize:13,fontWeight:600,color:'#1A1A2E',marginBottom:4}}>{isConv?`Gol ${gol.jugador}`:`Gol recibido — ${gol.jugador||'Rival'}`}</div>
        <div style={{display:'flex',gap:8,fontSize:11,color:'#888',flexWrap:'wrap'}}>
          <span style={{padding:'1px 6px',borderRadius:10,background:isConv?'#EAF3DE':'#FCEBEB',color:isConv?'#3B6D11':'#A32D2D',fontWeight:600}}>{isConv?'Gol conv.':'Gol recib.'}</span>
          {gol.rival&&<span>vs {gol.rival}</span>}
          {gol.minuto&&<span>Min {gol.minuto.slice(0,5)}</span>}
          {gol.asist&&<span>Asist: {gol.asist.split(' ')[0]}</span>}
        </div>
      </div>
    </div>
  )
}
