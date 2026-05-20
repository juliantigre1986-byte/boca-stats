import { useState, useEffect } from 'react'

const SHEET_ID = '1vjsjvCQF005MzI9uZ4Sh9_xsVS4Cp2w_EmY8kptlGoM'
const API_KEY  = import.meta.env.VITE_GOOGLE_API_KEY
const YEAR     = '2026_'
const C = { azul:'#001E62', azul2:'#0A2472', amarillo:'#FFC300', blanco:'#FFFFFF', gris:'#F0F2F5', gris2:'#DDE3EE', texto:'#1A1A2E', verde:'#0F6E56', rojo:'#A32D2D' }

async function fetchSheet(range) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`)
  if (!res.ok) throw new Error(`Error ${res.status} leyendo ${range}`)
  const data = await res.json()
  const [headers, ...rows] = data.values || []
  return rows.map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])))
}

function toMin(t) {
  // Format from Sheets is MM:SS (e.g. "40:00" = 40 minutes)
  if (!t || t === '') return 0
  const s = String(t).trim()
  if (s.includes(':')) {
    const p = s.split(':')
    if (p.length === 3) {
      // HH:MM:SS — treat as hours:minutes:seconds
      const h = +p[0], m = +p[1], sec = +p[2]
      // If hours > 2, likely MM:SS:MS format — treat first as minutes
      if (h > 2) return h + m/60
      return h*60 + m + sec/60
    }
    if (p.length === 2) {
      // MM:SS — first part is minutes
      return +p[0] + +p[1]/60
    }
  }
  const n = parseFloat(s)
  if (!isNaN(n) && n > 0 && n < 1) return n * 24 * 60
  return 0
}

function Sec({children}) { return <div style={{fontSize:11,fontWeight:700,color:'#888',marginBottom:10,textTransform:'uppercase',letterSpacing:.5}}>{children}</div> }
function Pill({children,bg,color,style}) { return <span style={{display:'inline-block',padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:600,background:bg,color,...style}}>{children}</span> }

function VidCard({gol}) {
  const isConv = gol.fase==='Ataque'
  return (
    <div onClick={()=>window.open(gol.video,'_blank')} style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',marginBottom:10,overflow:'hidden',cursor:'pointer'}}>
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
          {gol.minuto&&<span>Min {String(gol.minuto).slice(0,5)}</span>}
          {gol.asist&&<span>Asist: {gol.asist.split(' ')[0]}</span>}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [data,setData]=useState(null), [loading,setLoading]=useState(true), [error,setError]=useState(null)
  const [screen,setScreen]=useState('home'), [statsTab,setStatsTab]=useState('Goles')
  const [selPartido,setSelPartido]=useState(null), [selPlayer,setSelPlayer]=useState(null)

  useEffect(()=>{
    async function load(){
      try {
        const [partidos,minutos,goles] = await Promise.all([fetchSheet('Partidos!A:U'),fetchSheet('Minutos!A:Z'),fetchSheet('Goles!A:AB')])
        const p26=partidos.filter(r=>r['Partido']?.startsWith(YEAR))
        const m26=minutos.filter(r=>r['Partido']?.startsWith(YEAR)&&r['Presencia']==='Jugado')
        const allM26=minutos.filter(r=>r['Partido']?.startsWith(YEAR))
        const g26=goles.filter(r=>r['Partido']?.startsWith(YEAR))

        // Include ALL rows (Jugado + Convocado) for full player tracking
        const map={}
        for(const r of allM26){
          const n=r['Apellido y Nombre']?.trim(); if(!n) continue
          const jugado=r['Presencia']==='Jugado'
          if(!map[n]) map[n]={name:n,pj:0,convocado:0,min:0,frec:0,fcom:0,ama:0,roja:0,partidos:[],partidosConv:[]}
          if(jugado){
            map[n].pj++; map[n].min+=toMin(r['Minutos_Total']); map[n].frec+=+r['F. Recibidos']||0
            map[n].fcom+=+r['F. Cometidos']||0; map[n].ama+=+r['Ama']||0; map[n].roja+=+r['Roja']||0
            map[n].partidos.push(r['Partido'])
          } else {
            map[n].convocado++
            map[n].partidosConv.push(r['Partido'])
          }
        }

        const golesConv={},golesRecib={},assists={},golsByPartido={},golsByPlayer={}
        for(const g of g26){
          const j=g['Jugador']?.trim(),a=g['Asistencia']?.trim(),pid=g['Partido']
          if(!golsByPartido[pid]) golsByPartido[pid]={conv:[],recib:[]}
          if(!j) continue
          if(g['Fase']==='Ataque'){
            golesConv[j]=(golesConv[j]||0)+1
            if(a) assists[a]=(assists[a]||0)+1
            golsByPartido[pid].conv.push({jugador:j,asist:a||'',minuto:g['Minuto']||'',video:g['Video']?.trim()||''})
            if(!golsByPlayer[j]) golsByPlayer[j]={}
            golsByPlayer[j][pid]=(golsByPlayer[j][pid]||0)+1
          } else if(g['Fase']==='Defensa'){
            golesRecib[j]=(golesRecib[j]||0)+1
            golsByPartido[pid].recib.push({jugador:j||'Rival',minuto:g['Minuto']||'',video:g['Video']?.trim()||''})
          }
        }

        const players=Object.values(map).map(p=>({...p,min:+p.min.toFixed(1),prom:p.pj>0?+(p.min/p.pj).toFixed(1):0,
          golesConv:golesConv[p.name]||0,golesRecib:golesRecib[p.name]??null,asistencias:assists[p.name]||0,
          golsByMatch:golsByPlayer[p.name]||{}})).sort((a,b)=>b.pj-a.pj)

        const lastMatch=p26[p26.length-1]||{}, lastPid=lastMatch['Partido']||''
        const lastPlayers=m26.filter(r=>r['Partido']===lastPid)
          .map(r=>({name:r['Apellido y Nombre']?.trim(),min:+toMin(r["Minutos_Total"]).toFixed(1),
            goles:+r['Goles']||0,asist:+r['Asistencia']||0,fcom:+r['F. Cometidos']||0,isGK:!!golesRecib[r['Apellido y Nombre']?.trim()]}))
          .sort((a,b)=>b.min-a.min)

        const goalsFeed=g26.filter(g=>g['Video']?.trim()).map(g=>({
          partido:g['Partido'],rival:p26.find(p=>p['Partido']===g['Partido'])?.['Rival']||'',
          fecha:p26.find(p=>p['Partido']===g['Partido'])?.['Fecha']||'',
          fase:g['Fase'],jugador:g['Jugador']?.trim(),asist:g['Asistencia']?.trim()||'',
          minuto:g['Minuto']||'',video:g['Video']?.trim()})).reverse()

        const wins=p26.filter(p=>p['Resultado']==='Ganado').length
        const draws=p26.filter(p=>p['Resultado']==='Empate').length
        const losses=p26.filter(p=>p['Resultado']==='Perdido').length
        const totConv=Object.values(golesConv).reduce((a,b)=>a+b,0)
        const totRecib=Object.values(golesRecib).reduce((a,b)=>a+b,0)
        const totAsist=Object.values(assists).reduce((a,b)=>a+b,0)

        setData({players,goalsFeed,lastPlayers,lastMatch,partidos:p26,m26,allM26,
          nPartidos:p26.length,totConv,totRecib,totAsist,wins,draws,losses,
          golesConv,golesRecib,assists,golsByPartido})
      } catch(e){setError(e.message)} finally{setLoading(false)}
    }
    load()
  },[])

  const NAV=[{id:'home',icon:'ti-home',label:'Inicio'},{id:'partidos',icon:'ti-ball-football',label:'Partidos'},{id:'stats',icon:'ti-chart-bar',label:'Stats'},{id:'videos',icon:'ti-player-play',label:'Videos'}]
  const inNav=['home','partidos','stats','videos'].includes(screen)

  const topTitle={home:'Boca Juniors',partidos:'Partidos',stats:'Estadísticas',videos:'Videos de goles',
    'detalle-partido':`vs ${selPartido?.['Rival']||''}`,
    'perfil-jugador':selPlayer?.name||'Jugador'}[screen]||'Boca Juniors'

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:C.gris,maxWidth:480,margin:'0 auto',fontFamily:'Inter,sans-serif'}}>
      <div style={{background:C.azul,padding:'16px 20px 12px',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {!inNav&&<button onClick={()=>{setSelPartido(null);setSelPlayer(null);setScreen('home')}} style={{background:'none',border:'none',color:C.amarillo,cursor:'pointer',fontSize:22,padding:0}}><i className="ti ti-arrow-left"/></button>}
          <div style={{flex:1}}>
            <div style={{fontSize:17,fontWeight:700,color:C.amarillo}}>{topTitle}</div>
            <div style={{fontSize:12,color:'#8899BB',marginTop:2}}>{data?`Temporada 2026 · ${data.nPartidos} partidos`:'Temporada 2026'}</div>
          </div>
          {screen==='home'&&<button onClick={()=>window.location.reload()} style={{background:'none',border:'none',color:'#8899BB',cursor:'pointer',fontSize:20,padding:0}}><i className="ti ti-refresh"/></button>}
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column'}}>
        {loading&&<div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}><div style={{width:48,height:48,borderRadius:'50%',background:'#FFC300',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:900,color:'#001E62'}}>BJ</div><div style={{color:'#8899BB',fontSize:13}}>Cargando datos del Drive...</div></div>}
        {error&&<div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:24}}><div style={{color:'#A32D2D',fontSize:14,fontWeight:700}}>Error</div><div style={{color:'#888',fontSize:12,wordBreak:'break-all'}}>{error}</div><button onClick={()=>window.location.reload()} style={{padding:'10px 20px',background:'#FFC300',border:'none',borderRadius:8,color:'#001E62',fontWeight:700,cursor:'pointer'}}>Reintentar</button></div>}
        {data&&!loading&&!error&&(
          <>
            {screen==='home'&&<HomeScreen data={data} setSelPartido={setSelPartido} setSelPlayer={setSelPlayer} setScreen={setScreen}/>}
            {screen==='partidos'&&<PartidosScreen data={data} setSelPartido={setSelPartido} setScreen={setScreen}/>}
            {screen==='detalle-partido'&&<DetallePartidoScreen partido={selPartido} data={data}/>}
            {screen==='stats'&&<StatsScreen data={data} tab={statsTab} setTab={setStatsTab} setSelPlayer={setSelPlayer} setScreen={setScreen}/>}
            {screen==='videos'&&<VideosScreen data={data}/>}
            {screen==='perfil-jugador'&&<PerfilScreen player={selPlayer} data={data}/>}
          </>
        )}
      </div>

      {inNav&&data&&(
        <nav style={{background:C.azul,display:'flex',borderTop:'1px solid #0A2472',flexShrink:0}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setScreen(n.id)} style={{flex:1,padding:'10px 4px 8px',border:'none',background:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,fontSize:10,color:screen===n.id?C.amarillo:'#8899BB',fontFamily:'Inter,sans-serif'}}>
              <i className={`ti ${n.icon}`} style={{fontSize:20}}/>{n.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}

function HomeScreen({data,setSelPartido,setSelPlayer,setScreen}){
  const {nPartidos,totConv,totRecib,wins,draws,losses,lastMatch,lastPlayers,goalsFeed,players}=data
  const rival=lastMatch['Rival']||'-', fecha=lastMatch['Fecha']||'-'
  const res=`${lastMatch['Gol Boca']||0}-${lastMatch['Gol Rival']||0}`, resultado=lastMatch['Resultado']||''
  const maxMin=Math.max(...lastPlayers.map(p=>p.min),1)
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
      <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',padding:14,marginBottom:12,cursor:'pointer'}} onClick={()=>{setSelPartido(lastMatch);setScreen('detalle-partido')}}>
        <div style={{display:'flex',alignItems:'center',marginBottom:8}}>
          <div><div style={{fontSize:15,fontWeight:600,color:'#1A1A2E'}}>Boca vs {rival}</div><div style={{fontSize:12,color:'#888',marginTop:2}}>{fecha}</div></div>
          <div style={{fontSize:22,fontWeight:700,marginLeft:'auto',color:resultado==='Ganado'?'#0F6E56':resultado==='Perdido'?'#A32D2D':'#BA7517'}}>{res}</div>
        </div>
        <Pill bg={resultado==='Ganado'?'#EAF3DE':resultado==='Perdido'?'#FCEBEB':'#FAEEDA'} color={resultado==='Ganado'?'#3B6D11':resultado==='Perdido'?'#A32D2D':'#854F0B'}>{resultado}</Pill>
        <span style={{fontSize:11,color:'#888',marginLeft:8}}>Ver detalles →</span>
      </div>
      <Sec>Minutos jugados · último partido</Sec>
      <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',padding:'12px 14px',marginBottom:12}}>
        {lastPlayers.slice(0,8).map((p,i)=>(
          <div key={p.name} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:i<7?'0.5px solid #DDE3EE':'none'}}>
            <div style={{fontSize:12,fontWeight:600,color:'#1A1A2E',width:100,flexShrink:0}}>{p.name?.split(' ').slice(0,2).join(' ')}{p.isGK&&<span style={{fontSize:10,color:'#888',marginLeft:4}}>(arq.)</span>}</div>
            <div style={{flex:1,height:5,background:'#DDE3EE',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.round(p.min/maxMin*100)}%`,background:p.isGK?'#FFC300':'#001E62',borderRadius:3}}/></div>
            <span style={{fontSize:12,fontWeight:600,minWidth:38,textAlign:'right'}}>{p.min} min</span>
          </div>
        ))}
      </div>
      <Sec>Últimos goles · tocá para ver el video</Sec>
      {goalsFeed.slice(0,4).map((g,i)=><VidCard key={i} gol={g}/>)}
      <button onClick={()=>setScreen('videos')} style={{width:'100%',padding:10,background:'none',border:'0.5px solid #DDE3EE',borderRadius:10,fontSize:13,color:'#888',cursor:'pointer',marginBottom:16,fontFamily:'Inter,sans-serif'}}>Ver todos los goles →</button>
      <Sec>Top goleadores</Sec>
      <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',overflow:'hidden',marginBottom:16}}>
        {[...players].sort((a,b)=>b.golesConv-a.golesConv).slice(0,4).map((p,i)=>(
          <div key={p.name} style={{padding:'11px 14px',display:'flex',alignItems:'center',gap:10,borderBottom:i<3?'0.5px solid #DDE3EE':'none',cursor:'pointer'}} onClick={()=>{setSelPlayer(p);setScreen('perfil-jugador')}}>
            <div style={{width:34,height:34,borderRadius:'50%',background:i===0?'#FFC300':'#001E62',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:i===0?'#001E62':'#FFC300',flexShrink:0}}>{i+1}</div>
            <div><div style={{fontSize:13,fontWeight:600,color:'#1A1A2E'}}>{p.name}</div><div style={{fontSize:11,color:'#888'}}>{p.pj} PJ</div></div>
            <span style={{marginLeft:'auto',fontSize:11,padding:'3px 8px',borderRadius:20,fontWeight:700,background:i===0?'#FFC300':'#001E62',color:i===0?'#001E62':'#FFC300'}}>{p.golesConv} goles</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PartidosScreen({data,setSelPartido,setScreen}){
  const {partidos,golsByPartido}=data
  return (
    <div style={{padding:16}}>
      <Sec>{partidos.length} partidos · 2026</Sec>
      {[...partidos].reverse().map((p)=>{
        const gb=golsByPartido[p['Partido']]||{conv:[],recib:[]}
        const resultado=p['Resultado']||'', res=`${p['Gol Boca']||0}-${p['Gol Rival']||0}`
        return (
          <div key={p['Partido']} style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',padding:14,marginBottom:10,cursor:'pointer'}} onClick={()=>{setSelPartido(p);setScreen('detalle-partido')}}>
            <div style={{display:'flex',alignItems:'center',marginBottom:6}}>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:'#1A1A2E'}}>vs {p['Rival']}</div>
                <div style={{fontSize:11,color:'#888',marginTop:2}}>{p['Fecha']} · {p['Instancia']||p['Tipo']||''}</div>
              </div>
              <div style={{fontSize:20,fontWeight:700,marginLeft:'auto',color:resultado==='Ganado'?'#0F6E56':resultado==='Perdido'?'#A32D2D':'#BA7517'}}>{res}</div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              <Pill bg={resultado==='Ganado'?'#EAF3DE':resultado==='Perdido'?'#FCEBEB':'#FAEEDA'} color={resultado==='Ganado'?'#3B6D11':resultado==='Perdido'?'#A32D2D':'#854F0B'}>{resultado}</Pill>
              {gb.conv.length>0&&<span style={{fontSize:11,color:'#0F6E56',fontWeight:600}}>⚽ {gb.conv.length} gol{gb.conv.length!==1?'es':''}</span>}
              {gb.recib.length>0&&<span style={{fontSize:11,color:'#A32D2D',fontWeight:600}}>🧤 {gb.recib.length} recibido{gb.recib.length!==1?'s':''}</span>}
            </div>
          </div>
        )
      })}
      <div style={{height:16}}/>
    </div>
  )
}

function DetallePartidoScreen({partido,data}){
  const [tab,setTab]=useState('minutos')
  if(!partido) return null
  const pid=partido['Partido'], gb=data.golsByPartido[pid]||{conv:[],recib:[]}
  const resultado=partido['Resultado']||'', res=`${partido['Gol Boca']||0}-${partido['Gol Rival']||0}`
  const jugadores=data.m26.filter(r=>r['Partido']===pid)
    .map(r=>({name:r['Apellido y Nombre']?.trim(),min:+toMin(r["Minutos_Total"]).toFixed(1),
      fcom:+r['F. Cometidos']||0,frec:+r['F. Recibidos']||0,ama:+r['Ama']||0,
      isGK:!!data.golesRecib[r['Apellido y Nombre']?.trim()]})).sort((a,b)=>b.min-a.min)
  const maxMin=Math.max(...jugadores.map(j=>j.min),1)
  return (
    <div style={{padding:16}}>
      <div style={{background:'#001E62',borderRadius:12,padding:16,textAlign:'center',marginBottom:16}}>
        <div style={{fontSize:36,fontWeight:700,color:'#fff'}}>{res}</div>
        <div style={{fontSize:12,color:'#8899BB',marginTop:4}}>{partido['Rival']} · {partido['Fecha']} · {partido['Condición']||''}</div>
        <div style={{marginTop:8}}><Pill bg={resultado==='Ganado'?'#EAF3DE':resultado==='Perdido'?'#FCEBEB':'#FAEEDA'} color={resultado==='Ganado'?'#3B6D11':resultado==='Perdido'?'#A32D2D':'#854F0B'}>{resultado}</Pill></div>
      </div>
      <div style={{display:'flex',gap:6,marginBottom:14}}>
        {[['minutos','Minutos'],['goles','Goles'],['faltas','Faltas']].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:'8px 4px',borderRadius:8,border:'0.5px solid #DDE3EE',background:tab===id?'#001E62':'#fff',color:tab===id?'#FFC300':'#888',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>{label}</button>
        ))}
      </div>
      {tab==='minutos'&&(
        <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',padding:'12px 14px',marginBottom:12}}>
          {jugadores.map((j,i)=>(
            <div key={j.name} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:i<jugadores.length-1?'0.5px solid #DDE3EE':'none'}}>
              <div style={{fontSize:12,fontWeight:600,color:'#1A1A2E',width:110,flexShrink:0}}>{j.name?.split(' ').slice(0,2).join(' ')}{j.isGK&&<span style={{fontSize:10,color:'#888',marginLeft:3}}>(arq.)</span>}</div>
              <div style={{flex:1,height:5,background:'#DDE3EE',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.round(j.min/maxMin*100)}%`,background:j.isGK?'#FFC300':'#001E62',borderRadius:3}}/></div>
              <span style={{fontSize:12,fontWeight:600,minWidth:38,textAlign:'right'}}>{j.min} min</span>
            </div>
          ))}
        </div>
      )}
      {tab==='goles'&&(
        <div style={{marginBottom:12}}>
          {gb.conv.length>0&&<>
            <Sec>Goles convertidos ({gb.conv.length})</Sec>
            <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',overflow:'hidden',marginBottom:12}}>
              {gb.conv.map((g,i)=>(
                <div key={i} style={{padding:'11px 14px',display:'flex',alignItems:'center',gap:10,borderBottom:i<gb.conv.length-1?'0.5px solid #DDE3EE':'none'}}>
                  <div style={{width:30,height:30,borderRadius:'50%',background:'#EAF3DE',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:16}}>⚽</div>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'#1A1A2E'}}>{g.jugador}</div>{g.asist&&<div style={{fontSize:11,color:'#888'}}>Asist: {g.asist}</div>}</div>
                  {g.video&&<button onClick={(e)=>{e.stopPropagation();window.open(g.video,'_blank')}} style={{background:'#FFC300',border:'none',borderRadius:8,padding:'4px 10px',fontSize:11,fontWeight:700,color:'#001E62',cursor:'pointer'}}>▶ Video</button>}
                </div>
              ))}
            </div>
          </>}
          {gb.recib.length>0&&<>
            <Sec>Goles recibidos ({gb.recib.length})</Sec>
            <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',overflow:'hidden',marginBottom:12}}>
              {gb.recib.map((g,i)=>(
                <div key={i} style={{padding:'11px 14px',display:'flex',alignItems:'center',gap:10,borderBottom:i<gb.recib.length-1?'0.5px solid #DDE3EE':'none'}}>
                  <div style={{width:30,height:30,borderRadius:'50%',background:'#FCEBEB',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:16}}>🧤</div>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'#A32D2D'}}>{g.jugador}</div></div>
                  {g.video&&<button onClick={(e)=>{e.stopPropagation();window.open(g.video,'_blank')}} style={{background:'#FCEBEB',border:'none',borderRadius:8,padding:'4px 10px',fontSize:11,fontWeight:700,color:'#A32D2D',cursor:'pointer'}}>▶ Video</button>}
                </div>
              ))}
            </div>
          </>}
          {gb.conv.length===0&&gb.recib.length===0&&<div style={{textAlign:'center',color:'#888',padding:24}}>Sin goles registrados</div>}
        </div>
      )}
      {tab==='faltas'&&(
        <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',overflow:'hidden',marginBottom:12}}>
          <div style={{padding:'8px 14px',display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:8,borderBottom:'0.5px solid #DDE3EE'}}>
            {['Jugador','F.Com','F.Rec','Ama'].map(h=><span key={h} style={{fontSize:11,fontWeight:700,color:'#888',textAlign:h==='Jugador'?'left':'center'}}>{h}</span>)}
          </div>
          {jugadores.filter(j=>j.fcom>0||j.frec>0||j.ama>0).map((j,i,arr)=>(
            <div key={j.name} style={{padding:'10px 14px',display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:8,borderBottom:i<arr.length-1?'0.5px solid #DDE3EE':'none',alignItems:'center'}}>
              <span style={{fontSize:13,fontWeight:600,color:'#1A1A2E'}}>{j.name?.split(' ').slice(0,2).join(' ')}</span>
              <span style={{fontSize:13,fontWeight:700,color:'#C0392B',textAlign:'center',minWidth:32}}>{j.fcom}</span>
              <span style={{fontSize:13,fontWeight:700,color:'#1A5276',textAlign:'center',minWidth:32}}>{j.frec}</span>
              <span style={{fontSize:13,fontWeight:700,color:'#BA7517',textAlign:'center',minWidth:32}}>{j.ama||'-'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatsScreen({data,tab,setTab,setSelPlayer,setScreen}){
  const {players,golesConv,golesRecib,assists,lastPlayers,totRecib}=data
  const maxLast=Math.max(...lastPlayers.map(p=>p.min),1), maxTotal=Math.max(...players.map(p=>p.min),1)
  const click=(p)=>{setSelPlayer(p);setScreen('perfil-jugador')}
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
          {Object.entries(golesConv).filter(([n])=>n!=='En contra').sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,g],i,arr)=>{
            const p=players.find(pl=>pl.name===name)
            return (<div key={name} style={{padding:'11px 14px',display:'flex',alignItems:'center',gap:10,borderBottom:i<arr.length-1?'0.5px solid #DDE3EE':'none',cursor:'pointer'}} onClick={()=>p&&click(p)}>
              <div style={{width:28,height:28,borderRadius:'50%',background:i<3?'#FFC300':'#001E62',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:i<3?'#001E62':'#FFC300',flexShrink:0}}>{i+1}</div>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'#1A1A2E'}}>{name}</div><div style={{fontSize:11,color:'#888'}}>{p?.pj||0} PJ</div></div>
              <span style={{fontSize:14,fontWeight:700,color:'#001E62'}}>{g}</span><i className="ti ti-chevron-right" style={{color:'#DDE3EE'}}/>
            </div>)
          })}
        </div>
        <Sec>Asistencias</Sec>
        <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',overflow:'hidden',marginBottom:16}}>
          {Object.entries(assists).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,a],i,arr)=>{
            const p=players.find(pl=>pl.name===name)
            return (<div key={name} style={{padding:'11px 14px',display:'flex',alignItems:'center',gap:10,borderBottom:i<arr.length-1?'0.5px solid #DDE3EE':'none',cursor:'pointer'}} onClick={()=>p&&click(p)}>
              <div style={{width:28,height:28,borderRadius:'50%',background:'#001E62',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#FFC300',flexShrink:0}}>{i+1}</div>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'#1A1A2E'}}>{name}</div></div>
              <span style={{fontSize:14,fontWeight:700,color:'#0F6E56'}}>{a}</span><i className="ti ti-chevron-right" style={{color:'#DDE3EE'}}/>
            </div>)
          })}
        </div>
      </>}
      {tab==='Minutos'&&<>
        <Sec>Minutos · último partido</Sec>
        <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',padding:'12px 14px',marginBottom:12}}>
          {lastPlayers.map((p,i)=>(
            <div key={p.name} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:i<lastPlayers.length-1?'0.5px solid #DDE3EE':'none'}}>
              <div style={{fontSize:12,fontWeight:600,color:'#1A1A2E',width:100,flexShrink:0}}>{p.name?.split(' ').slice(0,2).join(' ')}{p.isGK&&<span style={{fontSize:10,color:'#888',marginLeft:3}}>(arq.)</span>}</div>
              <div style={{flex:1,height:5,background:'#DDE3EE',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.round(p.min/maxLast*100)}%`,background:p.isGK?'#FFC300':'#001E62',borderRadius:3}}/></div>
              <span style={{fontSize:12,fontWeight:600,minWidth:38,textAlign:'right'}}>{p.min} min</span>
            </div>
          ))}
        </div>
        <Sec>Minutos totales · temporada</Sec>
        <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',padding:'12px 14px',marginBottom:16}}>
          {[...players].sort((a,b)=>b.min-a.min).map((p,i)=>(
            <div key={p.name} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:i<players.length-1?'0.5px solid #DDE3EE':'none',cursor:'pointer'}} onClick={()=>click(p)}>
              <div style={{fontSize:12,fontWeight:600,color:'#1A1A2E',width:100,flexShrink:0}}>{p.name?.split(' ').slice(0,2).join(' ')}{p.golesRecib!=null&&<span style={{fontSize:10,color:'#888',marginLeft:3}}>(arq.)</span>}</div>
              <div style={{flex:1,height:5,background:'#DDE3EE',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.round(p.min/maxTotal*100)}%`,background:p.golesRecib!=null?'#FFC300':'#001E62',borderRadius:3}}/></div>
              <span style={{fontSize:12,fontWeight:600,minWidth:45,textAlign:'right'}}>{p.min.toFixed(1)} min</span>
            </div>
          ))}
        </div>
      </>}
      {tab==='Arqueros'&&<>
        <Sec>Goles recibidos</Sec>
        <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',overflow:'hidden',marginBottom:16}}>
          {Object.entries(golesRecib).sort((a,b)=>b[1]-a[1]).map(([name,gr],i,arr)=>{
            const pj=players.find(p=>p.name===name)?.pj||1, p=players.find(pl=>pl.name===name)
            return (<div key={name} style={{padding:'11px 14px',display:'flex',alignItems:'center',gap:10,borderBottom:i<arr.length-1?'0.5px solid #DDE3EE':'none',cursor:'pointer'}} onClick={()=>p&&click(p)}>
              <div style={{width:34,height:34,borderRadius:'50%',background:'#001E62',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#FFC300',flexShrink:0}}>{name.split(' ').map(w=>w[0]).slice(0,2).join('')}</div>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'#1A1A2E'}}>{name}</div><div style={{fontSize:11,color:'#888'}}>{pj} PJ · {(gr/pj).toFixed(1)} rec/PJ</div></div>
              <span style={{fontSize:18,fontWeight:700,color:'#A32D2D'}}>{gr}</span><i className="ti ti-chevron-right" style={{color:'#DDE3EE'}}/>
            </div>)
          })}
        </div>
      </>}
      {tab==='Faltas'&&<>
        <Sec>Más faltas cometidas</Sec>
        <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',overflow:'hidden',marginBottom:12}}>
          {[...players].filter(p=>p.fcom>0).sort((a,b)=>b.fcom-a.fcom).slice(0,8).map((p,i,arr)=>(
            <div key={p.name} style={{padding:'11px 14px',display:'flex',alignItems:'center',gap:10,borderBottom:i<arr.length-1?'0.5px solid #DDE3EE':'none',cursor:'pointer'}} onClick={()=>click(p)}>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'#1A1A2E'}}>{p.name}</div><div style={{fontSize:11,color:'#888'}}>{p.pj} PJ · Ama: {p.ama}</div></div>
              <span style={{fontSize:14,fontWeight:700,color:'#C0392B'}}>{p.fcom}</span>
            </div>
          ))}
        </div>
        <Sec>Más faltas recibidas</Sec>
        <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',overflow:'hidden',marginBottom:16}}>
          {[...players].filter(p=>p.frec>0).sort((a,b)=>b.frec-a.frec).slice(0,8).map((p,i,arr)=>(
            <div key={p.name} style={{padding:'11px 14px',display:'flex',alignItems:'center',gap:10,borderBottom:i<arr.length-1?'0.5px solid #DDE3EE':'none',cursor:'pointer'}} onClick={()=>click(p)}>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'#1A1A2E'}}>{p.name}</div><div style={{fontSize:11,color:'#888'}}>{p.pj} PJ</div></div>
              <span style={{fontSize:14,fontWeight:700,color:'#1A5276'}}>{p.frec}</span>
            </div>
          ))}
        </div>
      </>}
    </div>
  )
}

function PerfilScreen({player,data}){
  if(!player) return null
  const isGK=player.golesRecib!=null
  function downloadPDF(){
    const w=window.open('','_blank')
    w.document.write(`<html><head><title>${player.name}</title><style>
      body{font-family:Arial,sans-serif;padding:40px;color:#1A1A2E}
      h1{color:#001E62;border-bottom:3px solid #FFC300;padding-bottom:10px}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:16px 0}
      .card{background:#F0F2F5;border-radius:8px;padding:16px;text-align:center}
      .num{font-size:28px;font-weight:900;color:#001E62}.lbl{font-size:11px;color:#888;margin-top:4px}
      .badge{display:inline-block;background:#FFC300;color:#001E62;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:16px}
      @media print{button{display:none}}
    </style></head><body>
    <h1>🔵🟡 ${player.name}</h1>
    <span class="badge">${isGK?'ARQUERO':'JUGADOR DE CAMPO'} · Temporada 2026</span>
    <div class="grid">
      <div class="card"><div class="num">${player.pj}</div><div class="lbl">Partidos</div></div>
      <div class="card"><div class="num">${player.min.toFixed(0)}'</div><div class="lbl">Min. Totales</div></div>
      <div class="card"><div class="num">${player.prom.toFixed(1)}</div><div class="lbl">Prom/PJ</div></div>
      ${!isGK?`<div class="card"><div class="num">${player.golesConv}</div><div class="lbl">Goles</div></div><div class="card"><div class="num">${player.asistencias}</div><div class="lbl">Asistencias</div></div>`
      :`<div class="card"><div class="num" style="color:#A32D2D">${player.golesRecib}</div><div class="lbl">G. Recibidos</div></div>`}
      <div class="card"><div class="num">${player.fcom}</div><div class="lbl">F. Cometidas</div></div>
      <div class="card"><div class="num">${player.frec}</div><div class="lbl">F. Recibidas</div></div>
      <div class="card"><div class="num">${player.ama}</div><div class="lbl">Amarillas</div></div>
    </div>
    <p style="font-size:11px;color:#888;margin-top:32px">Boca Juniors Stats App · 2026</p>
    <script>window.onload=()=>window.print()</script></body></html>`)
    w.document.close()
  }
  return (
    <div style={{padding:16}}>
      <div style={{background:'#001E62',borderRadius:12,padding:20,textAlign:'center',marginBottom:16}}>
        <div style={{width:60,height:60,borderRadius:'50%',background:'#FFC300',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:900,color:'#001E62',margin:'0 auto 12px'}}>{player.name.split(' ').map(w=>w[0]).slice(0,2).join('')}</div>
        <div style={{fontSize:18,fontWeight:700,color:'#FFC300'}}>{player.name}</div>
        <div style={{fontSize:12,color:'#8899BB',marginTop:4}}>{isGK?'Arquero':'Jugador de campo'} · 2026</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
        {[
          [player.pj,'Partidos'],[player.min.toFixed(1)+"'",'Min. Tot.'],[player.prom.toFixed(1),'Prom/PJ'],
          ...(!isGK?[[player.golesConv,'Goles'],[player.asistencias,'Asist.']]
                   :[[player.golesRecib,'G. Recib.']]),
          [player.fcom,'F. Com.'],[player.frec,'F. Rec.'],[player.ama,'Amarillas'],
        ].map(([v,l])=>(
          <div key={l} style={{background:'#fff',borderRadius:10,border:'0.5px solid #DDE3EE',padding:'12px 8px',textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:700,color:l==='G. Recib.'?'#A32D2D':'#001E62'}}>{v}</div>
            <div style={{fontSize:10,color:'#888',marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>
      <Sec>Partidos jugados ({player.pj}) · No disponibles ({player.convocado||0})</Sec>
      <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',overflow:'hidden',marginBottom:12}}>
        {player.partidos?.map((pid,i,arr)=>{
          const p=data.partidos.find(p=>p['Partido']===pid)
          const goles=player.golsByMatch?.[pid]||0
          if(!p) return null
          const resultado=p['Resultado']||''
          const rowM=data.allM26?.find(r=>r['Partido']===pid&&r['Apellido y Nombre']?.trim()===player.name)
          const minJug=rowM?+toMin(rowM['Minutos_Total']).toFixed(1):0
          const fc=rowM?+rowM['F. Cometidos']||0:0
          const fr=rowM?+rowM['F. Recibidos']||0:0
          const ama=rowM?+rowM['Ama']||0:0
          return (
            <div key={pid} style={{padding:'10px 14px',borderBottom:i<arr.length-1?'0.5px solid #DDE3EE':'none'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                <Pill bg={resultado==='Ganado'?'#EAF3DE':resultado==='Perdido'?'#FCEBEB':'#FAEEDA'} color={resultado==='Ganado'?'#3B6D11':resultado==='Perdido'?'#A32D2D':'#854F0B'} style={{fontSize:10}}>{resultado[0]}</Pill>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:'#1A1A2E'}}>vs {p['Rival']}</div><div style={{fontSize:11,color:'#888'}}>{p['Fecha']}</div></div>
                {goles>0&&<span style={{fontSize:11,color:'#0F6E56',fontWeight:700}}>⚽ {goles}</span>}
              </div>
              <div style={{display:'flex',gap:12,fontSize:11,color:'#888',paddingLeft:4}}>
                <span>⏱ {minJug} min</span>
                {fc>0&&<span style={{color:'#C0392B'}}>FC: {fc}</span>}
                {fr>0&&<span style={{color:'#1A5276'}}>FR: {fr}</span>}
                {ama>0&&<span style={{color:'#BA7517'}}>🟨 {ama}</span>}
              </div>
            </div>
          )
        })}
      </div>
      {player.partidosConv?.length>0&&<>
        <Sec>No disponibles ({player.partidosConv.length})</Sec>
        <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #DDE3EE',overflow:'hidden',marginBottom:16}}>
          {player.partidosConv?.map((pid,i,arr)=>{
            const p=data.partidos.find(p=>p['Partido']===pid)
            if(!p) return null
            const resultado=p['Resultado']||''
            return (
              <div key={pid} style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:8,borderBottom:i<arr.length-1?'0.5px solid #DDE3EE':'none',opacity:0.6}}>
                <Pill bg='#F0F2F5' color='#888' style={{fontSize:10}}>–</Pill>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:'#888'}}>vs {p['Rival']}</div><div style={{fontSize:11,color:'#aaa'}}>{p['Fecha']}</div></div>
                <span style={{fontSize:10,color:'#888'}}>No disponible</span>
              </div>
            )
          })}
        </div>
      </>}
      <button onClick={downloadPDF} style={{width:'100%',padding:14,background:'#001E62',color:'#FFC300',border:'none',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:'Inter,sans-serif',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
        <i className="ti ti-download"/> Descargar ficha PDF
      </button>
      <div style={{height:16}}/>
    </div>
  )
}

function VideosScreen({data}){
  const [filter,setFilter]=useState('todos'), [search,setSearch]=useState('')
  let list=data.goalsFeed
  if(filter==='ataque') list=list.filter(g=>g.fase==='Ataque')
  if(filter==='defensa') list=list.filter(g=>g.fase==='Defensa')
  if(search) list=list.filter(g=>g.jugador?.toLowerCase().includes(search.toLowerCase())||g.rival?.toLowerCase().includes(search.toLowerCase()))
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
