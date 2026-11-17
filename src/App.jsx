import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Heart, LayoutDashboard, ListTodo, ShoppingBasket, WalletCards, CalendarDays,
  Settings2, Plus, Bell, Search, ChevronRight, ChevronLeft, Check,
  LockKeyhole, LogOut, Menu, X, Sparkles, Repeat2, CircleCheck, Clock3,
  UsersRound, House, ArrowUpRight, Trash2, Pencil, Eye, EyeOff, ShieldCheck,
  Copy, Mail, CheckCircle2, AlertCircle, Leaf, Coffee, ChevronDown
} from 'lucide-react'
import { configured, supabase } from './supabase'
import {
  demoUser,demoFamily,demoPeople,loadDemo,saveDemo,resetDemo,
  loadHousehold,loadRemote,createFamily,joinFamily,inviteFamily,
  upsertRemote,deleteRemote,setRemoteCompletion
} from './store'
import { isoDate,addDays,dateLabel,fullDate,money,shortName,isTaskDue,taskOccurrence,billOccurrence,uid } from './utils'
import './styles.css'

const today = isoDate()
const EMPTY={tasks:[],task_completions:[],groceries:[],bills:[],bill_payments:[],events:[]}
const SECTIONS=[
  {key:'today',title:'Overview',caption:'Everything that matters today',icon:LayoutDashboard},
  {key:'tasks',title:'Shared Tasks',caption:'A little progress every day',icon:ListTodo},
  {key:'groceries',title:'Groceries',caption:'One list, shared across your home',icon:ShoppingBasket},
  {key:'bills',title:'Bills & Money',caption:'Never miss a due date',icon:WalletCards},
  {key:'calendar',title:'Calendar',caption:'The moments that matter',icon:CalendarDays},
  {key:'settings',title:'Settings',caption:'Your home, your people',icon:Settings2}
]
const LABELS={tasks:'Task',groceries:'Grocery item',bills:'Bill',events:'Event'}
const FORM_DEFAULT={
  tasks:{title:'',description:'',due_on:today,time:'',repeat:'none',priority:'medium',category:'Home',assigned_to:''},
  groceries:{name:'',quantity:'',checked:false},
  bills:{title:'',amount:'',category:'Utilities',due_on:today,repeat:'monthly'},
  events:{title:'',event_date:today,time:'',category:'Family'}
}
const greet=()=>{const h=new Date().getHours();return h<12?'Good morning':h<17?'Good afternoon':'Good evening'}
const doneFor=(table,id,date,rows)=>rows.some(r=>r[table==='tasks'?'task_id':'bill_id']===id && r.occurrence_on===date)
const priorityLabel={low:'Low priority',medium:'Medium priority',high:'High priority'}
function initials(name='M'){return name.trim().split(/\s+/).slice(0,2).map(p=>p[0]?.toUpperCase()).join('')||'M'}
function IconButton({onClick,icon:Icon,title,className=''}){return <button type="button" className={`icon-btn ${className}`} onClick={onClick} title={title} aria-label={title}><Icon size={19}/></button>}
function Logo(){return <div className="brandmark"><div className="brand-icon"><Heart size={22} strokeWidth={2.8} fill="currentColor"/></div><div><div className="brand-name">mana<span>life</span></div><div className="brand-tagline">life, together.</div></div></div>}
function EmptyState({icon:Icon=Leaf,heading,body,action}) {return <div className="empty"><div className="empty-icon"><Icon size={25}/></div><h3>{heading}</h3><p>{body}</p>{action}</div>}
function SectionHeader({eyebrow,title,description,right}) {return <div className="section-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="subhead">{description}</p></div>{right&&<div>{right}</div>}</div>}
function StatusPill({children,variant='neutral'}) {return <span className={`status-pill ${variant}`}>{children}</span>}
function ProtectedLabel(){return <span className="visibility"><UsersRound size={12}/> Household</span>}
function Field({label,children}) {return <label className="field"><span>{label}</span>{children}</label>}
function TaskRow({task,checked,onToggle,onEdit,onDelete,people,compact=false}){
  const who=people.find(p=>p.id===task.assigned_to)?.display_name
  return <div className={`task-row ${checked?'is-done':''}`}>
    <button className={`round-check ${checked?'checked':''}`} aria-label={checked?'Mark not done':'Mark done'} onClick={onToggle}>{checked&&<Check size={15} strokeWidth={3}/>}</button>
    <div className="task-row-content"><div className="task-row-title">{task.title}</div><div className="task-row-meta"><span><Clock3 size={12}/>{task.time||dateLabel(task.due_on)}</span>{!compact&&<><span>{task.category}</span>{task.repeat!=='none'&&<span><Repeat2 size={12}/>{task.repeat}</span>}</>}{who&&<span>For {shortName(who)}</span>}</div></div>
    {task.priority==='high' && <span className="priority-dot" title="High priority"/>}
    {!compact&&<div className="item-actions"><IconButton icon={Pencil} title="Edit task" onClick={onEdit}/><IconButton icon={Trash2} title="Delete task" onClick={onDelete}/></div>}
  </div>
}

function App(){
  const [demo,setDemo]=useState(false)
  const [session,setSession]=useState(null)
  const [booting,setBooting]=useState(true)
  const [loading,setLoading]=useState(false)
  const [familyInfo,setFamilyInfo]=useState(null)
  const [rows,setRows]=useState(EMPTY)
  const [section,setSection]=useState('today')
  const [modal,setModal]=useState(null)
  const [notice,setNotice]=useState(null)
  const [sidebarOpen,setSidebarOpen]=useState(false)
  const [filter,setFilter]=useState('today')
  const [calMonth,setCalMonth]=useState(()=>new Date(today+'T12:00:00'))
  const user=demo?demoUser:session?.user
  const home=demo?demoFamily:familyInfo?.household
  const people=demo?demoPeople:familyInfo?.people||[]
  const role=demo?'owner':familyInfo?.role
  const isOwner=role==='owner'
  const userName=people.find(p=>p.id===user?.id)?.display_name||user?.user_metadata?.display_name||user?.email?.split('@')[0]||'You'

  const alert=(message,kind='ok')=>{setNotice({message,kind});window.setTimeout(()=>setNotice(null),5500)}
  const refresh=useCallback(async(userId, demoMode=demo)=>{
    if(demoMode){setRows(loadDemo());return}
    if(!userId||!configured){setFamilyInfo(null);setRows(EMPTY);return}
    const family=await loadHousehold(userId)
    setFamilyInfo(family)
    if(family?.household){setRows(await loadRemote(family.household.id))}else setRows(EMPTY)
  },[demo])

  useEffect(()=>{
    if(!configured){setBooting(false);return}
    let live=true
    supabase.auth.getSession().then(({data,error})=>{if(live){if(error)setNotice({message:error.message,kind:'error'});setSession(data.session);setBooting(false)}})
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>{if(live)setSession(s)})
    return()=>{live=false;subscription.unsubscribe()}
  },[])
  useEffect(()=>{
    if(demo){refresh(null,true);return}
    if(!session?.user?.id){setFamilyInfo(null);setRows(EMPTY);return}
    let active=true
    setLoading(true)
    refresh(session.user.id,false).catch(e=>{if(active)alert(e.message,'error')}).finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[session?.user?.id,demo,refresh])

  // Refresh visible shared data while both members have the app open.
  // Does not rely on an always-on background server or push notification service.
  useEffect(()=>{
    if(demo || !configured || !session?.user?.id || !familyInfo?.household?.id) return
    let running=false
    const poll=async()=>{
      if(running || document.visibilityState==='hidden') return
      running=true
      try{setRows(await loadRemote(familyInfo.household.id))}catch(e){console.warn('Sync retry pending:',e.message)}
      finally{running=false}
    }
    const handleFocus=()=>{if(document.visibilityState==='visible')poll()}
    const timer=window.setInterval(poll,20000)
    document.addEventListener('visibilitychange',handleFocus)
    return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',handleFocus)}
  },[demo,session?.user?.id,familyInfo?.household?.id])

  async function mutate(fn){
    setLoading(true)
    try{await fn();if(!demo)await refresh(user.id,false);alert('Saved successfully')}
    catch(e){alert(e.message||'Something went wrong','error');throw e}
    finally{setLoading(false)}
  }
  async function saveItem(table,item,editingId){
    const payload={...item}
    if(table==='tasks'){
      payload.assigned_to=payload.assigned_to||null
    }
    if(table==='bills')payload.amount=Number(payload.amount)||0
    if(!editingId){
      payload.household_id=home.id
      if(table==='tasks'||table==='bills'||table==='events')payload.owner_id=user.id
      if(table==='groceries')payload.added_by=user.id
    }
    await mutate(async()=>{
      if(demo){const next={...rows,[table]:editingId?rows[table].map(x=>x.id===editingId?{...x,...payload}:x):[{...payload,id:uid()},...rows[table]]};setRows(next);saveDemo(next)}
      else await upsertRemote(table,payload,editingId)
    })
    setModal(null)
  }
  async function deleteItem(table,id){
    if(!window.confirm(`Delete this ${LABELS[table]?.toLowerCase()||'item'}?`))return
    await mutate(async()=>{
      if(demo){const next={...rows,[table]:rows[table].filter(r=>r.id!==id)};setRows(next);saveDemo(next)}
      else await deleteRemote(table,id)
    })
  }
  async function toggleCheck(table,item,checked,occurrence=null){
    const dataTable=table==='tasks'?'task_completions':'bill_payments'
    const date=occurrence||(table==='tasks'?taskOccurrence(item):billOccurrence(item))
    await mutate(async()=>{
      if(demo){const fk=table==='tasks'?'task_id':'bill_id';const list=checked?[...rows[dataTable],{id:uid(),[fk]:item.id,occurrence_on:date,completed_by:user.id}]:rows[dataTable].filter(c=>!(c[fk]===item.id&&c.occurrence_on===date));const next={...rows,[dataTable]:list};setRows(next);saveDemo(next)}
      else await setRemoteCompletion(dataTable,item.id,date,checked,user.id)
    })
  }
  async function toggleGrocery(item){
    await mutate(async()=>{
      if(demo){const next={...rows,groceries:rows.groceries.map(x=>x.id===item.id?{...x,checked:!x.checked}:x)};setRows(next);saveDemo(next)}
      else await upsertRemote('groceries',{checked:!item.checked},item.id)
    })
  }
  const openModal=(table,row)=>setModal({table,row:row||null})
  const navigate=(next)=>{setSection(next);setSidebarOpen(false)}
  const dueTasks=useMemo(()=>rows.tasks.filter(t=>isTaskDue(t,today)).sort((a,b)=>(a.time||'').localeCompare(b.time||'')),[rows.tasks])
  const completedToday=dueTasks.filter(t=>doneFor('tasks',t.id,taskOccurrence(t),rows.task_completions)).length
  const progress=dueTasks.length?Math.round(completedToday/dueTasks.length*100):0
  const upcomingBills=useMemo(()=>rows.bills.map(b=>({...b,occurrence:billOccurrence(b)})).sort((a,b)=>a.occurrence.localeCompare(b.occurrence)),[rows.bills])
  const upcomingEvents=useMemo(()=>rows.events.filter(e=>e.event_date>=today).slice().sort((a,b)=>a.event_date.localeCompare(b.event_date)),[rows.events])
  const openGroceries=rows.groceries.filter(x=>!x.checked).length

  if(booting)return <div className="full-center"><div className="loading-icon"><Heart fill="currentColor"/></div><p>Bringing your home together...</p></div>
  if(!configured&&!demo) return <div className="welcome-shell"><div className="welcome-card"><Logo/><div className="auth-art"><House size={44}/><Heart size={18} fill="currentColor"/></div><h1>Welcome to your<br/><em>shared happy place.</em></h1><p>ManaLife keeps your daily tasks, groceries, bills, and family moments together — in one private home.</p><div className="callout"><LockKeyhole size={18}/> Secure household login needs Supabase configuration. See <code>README.md</code> in the project.</div>{import.meta.env.DEV&&<button className="primary-btn full" onClick={()=>setDemo(true)}>Explore the local demo <ChevronRight size={18}/></button>}<small>The local demo uses sample data only. Production access always requires authorized sign-in.</small></div></div>
  if(!demo&&!user) return <AuthScreen alert={alert} notice={notice}/>
  if(!demo&&loading&&!familyInfo)return <div className="full-center"><div className="loading-icon"><Heart fill="currentColor"/></div><p>Loading your private household...</p></div>
  if(!home)return <Onboarding user={user} onComplete={()=>refresh(user.id,false)} notify={alert} notice={notice}/>

  const titleMap=Object.fromEntries(SECTIONS.map(s=>[s.key,s]))
  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen?'open':''}`}>
      <div className="side-inner"><div className="side-brand"><Logo/><IconButton icon={X} title="Close navigation" className="close-sidebar" onClick={()=>setSidebarOpen(false)}/></div>
      <div className="side-caption">WORKSPACE</div>
      <div className="home-card"><div className="home-avatar"><House size={19}/></div><div><strong>{home.name}</strong><small><span className="online-dot"/> Private household</small></div><ChevronDown size={15}/></div>
      <div className="side-caption">MENU</div>
      <nav className="side-nav" aria-label="Main navigation">{SECTIONS.map(({key,title,icon:Icon})=><button key={key} onClick={()=>navigate(key)} className={`nav-link ${section===key?'active':''}`}><Icon size={19}/><span>{title}</span>{key==='groceries'&&openGroceries>0&&<b className="nav-count">{openGroceries}</b>}</button>)}</nav>
      <div className="side-bottom"><div className="privacy-tile"><ShieldCheck size={18}/><div><b>Just your family</b><small>Private, secure & shared</small></div></div><button className="profile-line" onClick={()=>navigate('settings')}><span className="avatar small">{initials(userName)}</span><span className="profile-names"><strong>{userName}</strong><small>{isOwner?'Household owner':'Household member'}</small></span><ChevronRight size={16}/></button></div></div>
    </aside>
    {sidebarOpen&&<button className="scrim" onClick={()=>setSidebarOpen(false)} aria-label="Close sidebar"/>}
    <div className="main-area">
      <header className="topbar"><div className="topbar-left"><IconButton icon={Menu} title="Open menu" className="hamburger" onClick={()=>setSidebarOpen(true)}/><span className="breadcrumb">Your space</span><ChevronRight size={15}/><strong>{titleMap[section]?.title}</strong></div><div className="topbar-right"><span className="secure-note"><ShieldCheck size={14}/> Household only</span><IconButton icon={Bell} title="Reminder notifications are coming in a future version" onClick={()=>alert('Push reminders are planned for V2. They are not enabled yet.','info')}/><button className="avatar top-avatar" onClick={()=>navigate('settings')} title="Your profile">{initials(userName)}</button></div></header>
      <main className="main-content">
        {section==='today'&&<>
          <div className="greeting"><div><p className="eyebrow">{dateLabel(today,{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</p><h1>{greet()}, {shortName(userName)} <span className="sun-emoji">✳</span></h1><p>Small steps make a beautiful life together.</p></div><button className="primary-btn" onClick={()=>openModal('tasks')}><Plus size={18}/> New task</button></div>
          <div className="hero-card"><div className="hero-copy"><div className="hero-kicker"><Sparkles size={15}/> YOUR DAILY RHYTHM</div><h2>Make today a little<br/><i>more wonderful.</i></h2><p>One shared space for the things you need to do and the moments you don't want to miss.</p><div className="hero-members">{people.map((p,i)=><span key={p.id} className={`person-bubble person-${i}`}>{initials(p.display_name)}</span>)}<span>{people.length} of 2 members joined</span></div></div><div className="hero-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-center"><Heart fill="currentColor" size={64}/></div><div className="art-star star-a">✦</div><div className="art-star star-b">✳</div><div className="art-star star-c">✦</div></div></div>
          <div className="metrics-grid"><div className="metric"><div className="metric-icon mint"><ListTodo size={21}/></div><p>Tasks for today</p><h2>{dueTasks.length}<small> tasks</small></h2><span>{completedToday} completed</span></div><div className="metric"><div className="metric-icon peach"><ShoppingBasket size={21}/></div><p>Shopping list</p><h2>{openGroceries}<small> items</small></h2><span>Waiting to buy</span></div><div className="metric"><div className="metric-icon lavender"><WalletCards size={21}/></div><p>Upcoming bills</p><h2>{upcomingBills.length}<small> bills</small></h2><span>Stay ahead together</span></div><div className="metric"><div className="metric-icon yellow"><CalendarDays size={21}/></div><p>Future events</p><h2>{upcomingEvents.length}<small> plans</small></h2><span>Moments ahead</span></div></div>
          <div className="content-grid"><div className="content-main"><div className="panel"><div className="panel-heading"><div><h3>Today's to-dos</h3><p>Keep the momentum going</p></div><button className="text-link" onClick={()=>navigate('tasks')}>View all <ArrowUpRight size={15}/></button></div><div className="progress-row"><div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}}/></div><b>{progress}% done</b></div>{dueTasks.length?dueTasks.slice(0,6).map(t=><TaskRow key={t.id} task={t} people={people} checked={doneFor('tasks',t.id,taskOccurrence(t),rows.task_completions)} onToggle={()=>toggleCheck('tasks',t,!doneFor('tasks',t.id,taskOccurrence(t),rows.task_completions))} compact/>):<EmptyState icon={CircleCheck} heading="You're all caught up!" body="Add a task to start your shared routine." action={<button className="outline-btn" onClick={()=>openModal('tasks')}><Plus size={16}/> Add your first task</button>}/>}<button className="add-inline" onClick={()=>openModal('tasks')}><Plus size={16}/> Add a task</button></div></div><div className="content-side"><div className="panel"><div className="panel-heading"><div><h3>Coming up</h3><p>Don't miss what matters</p></div><CalendarDays size={18} className="muted-icon"/></div>{upcomingEvents.length?upcomingEvents.slice(0,3).map(e=><div className="upcoming-item" key={e.id}><span className="date-chip"><strong>{dateLabel(e.event_date,{day:'numeric'})}</strong><small>{dateLabel(e.event_date,{month:'short'})}</small></span><div><b>{e.title}</b><small>{e.time||'All day'} · {e.category}</small></div></div>):<p className="muted-text">No upcoming plans yet.</p>}<button className="text-link bottom-link" onClick={()=>navigate('calendar')}>Open calendar <ArrowUpRight size={15}/></button></div><div className="gentle-card"><div className="gentle-icon"><Coffee size={23}/></div><h3>More time for what matters.</h3><p>Less remembering. More living, laughing, and doing things together.</p><span>♥ Made for your home</span></div></div></div>
        </>}
        {section==='tasks'&&<><SectionHeader eyebrow="YOUR ROUTINE" title="Tasks & habits" description="Keep every little promise to yourself and each other." right={<button className="primary-btn" onClick={()=>openModal('tasks')}><Plus size={17}/> Add task</button>}/><div className="tabs">{[['today','Today'],['all','All tasks'],['mine','Assigned to me']].map(([v,t])=><button key={v} className={filter===v?'selected':''} onClick={()=>setFilter(v)}>{t}</button>)}</div><div className="panel list-panel">{(()=>{const list=rows.tasks.filter(t=>filter==='today'?isTaskDue(t):filter==='mine'?t.assigned_to===user.id:true).sort((a,b)=>(a.due_on||'').localeCompare(b.due_on||''));return list.length?list.map(t=><TaskRow key={t.id} task={t} people={people} checked={doneFor('tasks',t.id,taskOccurrence(t),rows.task_completions)} onToggle={()=>toggleCheck('tasks',t,!doneFor('tasks',t.id,taskOccurrence(t),rows.task_completions))} onEdit={()=>openModal('tasks',t)} onDelete={()=>deleteItem('tasks',t.id)}/>):<EmptyState heading="Nothing here yet" body="Start with a morning routine, a chore or a personal goal." action={<button className="primary-btn" onClick={()=>openModal('tasks')}><Plus size={16}/> Add a task</button>}/>})()}</div><p className="footnote"><Repeat2 size={14}/> Daily, weekly and monthly tasks automatically appear on their scheduled days. Checkmarks reset for the next occurrence.</p></>}
        {section==='groceries'&&<><SectionHeader eyebrow="SHOPPING TOGETHER" title="Grocery list" description="Add it once. Both of you can see and tick it off." right={<button className="primary-btn" onClick={()=>openModal('groceries')}><Plus size={17}/> Add item</button>}/><div className="stats-banner"><ShoppingBasket size={22}/><div><b>{openGroceries} things to pick up</b><span>{rows.groceries.filter(g=>g.checked).length} items checked off</span></div></div><div className="panel list-panel grocery-list">{rows.groceries.length?rows.groceries.slice().sort((a,b)=>Number(a.checked)-Number(b.checked)).map(g=><div className={`grocery-row ${g.checked?'is-done':''}`} key={g.id}><button className={`round-check ${g.checked?'checked':''}`} onClick={()=>toggleGrocery(g)} aria-label={`Toggle ${g.name}`}>{g.checked&&<Check size={15}/>}</button><div className="grocery-text"><b>{g.name}</b><small>{g.quantity||'1 item'}</small></div><div className="item-actions"><IconButton icon={Pencil} title="Edit grocery" onClick={()=>openModal('groceries',g)}/><IconButton icon={Trash2} title="Delete grocery" onClick={()=>deleteItem('groceries',g.id)}/></div></div>):<EmptyState icon={ShoppingBasket} heading="Your basket is empty" body="Add groceries you need to buy."/>}<button className="add-inline" onClick={()=>openModal('groceries')}><Plus size={16}/> Add to shopping list</button></div></>}
        {section==='bills'&&<><SectionHeader eyebrow="A LITTLE PEACE OF MIND" title="Bills & payments" description="Track due dates without last-minute surprises." right={<button className="primary-btn" onClick={()=>openModal('bills')}><Plus size={17}/> Add bill</button>}/><div className="stats-banner bills-banner"><WalletCards size={22}/><div><b>{money(upcomingBills.reduce((n,b)=>n+Number(b.amount||0),0))} in tracked bills</b><span>Recurring bills show their next due date · Not a bank connection</span></div></div><div className="cards-grid">{upcomingBills.length?upcomingBills.map(b=>{const paid=doneFor('bills',b.id,b.occurrence,rows.bill_payments);return <div className="bill-card" key={b.id}><div className="bill-header"><div className="bill-icon"><WalletCards size={21}/></div><StatusPill variant={paid?'success':'neutral'}>{paid?'Paid':'Upcoming'}</StatusPill></div><h3>{b.title}</h3><p className="bill-money">{money(b.amount)}</p><div className="bill-details"><span><CalendarDays size={14}/> {dateLabel(b.occurrence)}</span><span><Repeat2 size={14}/> {b.repeat}</span><ProtectedLabel/></div><div className="bill-actions"><button className={paid?'outline-btn':'primary-btn'} onClick={()=>toggleCheck('bills',b,!paid,b.occurrence)}>{paid?<><Check size={15}/> Paid — Undo</>:<><CheckCircle2 size={15}/> Mark paid</>}</button><IconButton icon={Pencil} title="Edit bill" onClick={()=>openModal('bills',b)}/><IconButton icon={Trash2} title="Delete bill" onClick={()=>deleteItem('bills',b.id)}/></div></div>}):<div className="panel"><EmptyState icon={WalletCards} heading="No bills yet" body="Add monthly bills and track their due dates." action={<button className="primary-btn" onClick={()=>openModal('bills')}>Add a bill</button>}/></div>}</div></>}
        {section==='calendar'&&<><SectionHeader eyebrow="OUR PLANS" title="Family calendar" description="Celebrate the little and big moments together." right={<button className="primary-btn" onClick={()=>openModal('events')}><Plus size={17}/> New event</button>}/><div className="content-grid calendar-layout"><div className="panel calendar-panel"><div className="calendar-top"><h3>{calMonth.toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</h3><div><IconButton icon={ChevronLeft} title="Previous month" onClick={()=>setCalMonth(new Date(calMonth.getFullYear(),calMonth.getMonth()-1,1))}/><IconButton icon={ChevronRight} title="Next month" onClick={()=>setCalMonth(new Date(calMonth.getFullYear(),calMonth.getMonth()+1,1))}/></div></div><CalendarGrid month={calMonth} events={rows.events}/></div><div className="panel"><div className="panel-heading"><div><h3>Upcoming events</h3><p>Make room for memories</p></div></div>{upcomingEvents.length?upcomingEvents.map(e=><div className="event-row" key={e.id}><div className="date-chip"><strong>{dateLabel(e.event_date,{day:'numeric'})}</strong><small>{dateLabel(e.event_date,{month:'short'})}</small></div><div><b>{e.title}</b><small>{e.time||'All day'} · {e.category}</small><ProtectedLabel/></div><div className="item-actions"><IconButton icon={Pencil} title="Edit event" onClick={()=>openModal('events',e)}/><IconButton icon={Trash2} title="Delete event" onClick={()=>deleteItem('events',e.id)}/></div></div>):<EmptyState icon={CalendarDays} heading="No upcoming events" body="Add an anniversary, appointment or family plan."/>}</div></div></>}
        {section==='settings'&&<><SectionHeader eyebrow="YOUR SPACE" title="Household settings" description="Every item is shared with household members only."/><div className="settings-grid"><div className="panel settings-panel"><h3><House size={19}/> Our household</h3><div className="setting-detail"><small>Household name</small><strong>{home.name}</strong></div><div className="setting-detail"><small>Privacy</small><strong><ShieldCheck size={16} color="#557a67"/> Members only</strong></div><div className="setting-detail"><small>Members ({people.length}/2)</small><div className="member-list">{people.map(p=><div className="member-item" key={p.id}><span className="avatar">{initials(p.display_name)}</span><div><b>{p.display_name}</b><small>{p.id===user.id?'You':'Your partner'}</small></div></div>)}</div></div></div><div className="panel settings-panel"><h3><LockKeyhole size={19}/> Secure access</h3><p className="settings-description">Every task, grocery item, bill, and event is visible to everyone in this household. Members outside this household cannot access them.</p>{isOwner&&people.length<2?<InvitePanel demo={demo} notify={alert}/>:<div className="callout"><CheckCircle2 size={18}/> {people.length===2?'Both household members are connected.':'Only your household owner can generate an invitation.'}</div>}<div className="settings-description small-print">Invites expire in 48 hours, work once, and are tied to the invited email. Login is required.</div></div><div className="panel settings-panel"><h3><Bell size={19}/> Notifications</h3><p className="settings-description">Recurring tasks appear when they are due. Background push notifications and automated reminder emails are planned for a later release and are <strong>not enabled in V1.</strong></p><div className="callout muted"><AlertCircle size={17}/> Manual tracking is active; automated push delivery is not.</div></div><div className="panel settings-panel"><h3><UsersRound size={19}/> Your account</h3><div className="setting-detail"><small>Signed in as</small><strong>{user.email}</strong></div>{demo?<button className="outline-btn" onClick={()=>{setRows(resetDemo());alert('Sample data restored')}}>Reset demo data</button>:<button className="outline-btn" onClick={async()=>{await supabase.auth.signOut();setFamilyInfo(null);setRows(EMPTY);navigate('today')}}><LogOut size={16}/> Sign out</button>}</div></div></>}
      </main>
      <div className="footer-line">Made with <Heart size={12} fill="currentColor"/> for the everyday moments</div>
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation">{SECTIONS.filter(s=>s.key!=='settings').map(({key,title,icon:Icon})=><button key={key} className={section===key?'active':''} onClick={()=>navigate(key)}><Icon size={21}/><span>{key==='today'?'Home':key==='groceries'?'Shop':key==='bills'?'Bills':title}</span></button>)}</nav>
    {modal&&<EditModal key={`${modal.table}-${modal.row?.id||'new'}`} modal={modal} people={people} user={user} close={()=>setModal(null)} save={saveItem} disabled={loading}/>}
    {notice&&<div className={`toast ${notice.kind}`} role="status">{notice.kind==='error'?<AlertCircle size={18}/>:<CheckCircle2 size={18}/>}<span>{notice.message}</span><IconButton icon={X} title="Dismiss" onClick={()=>setNotice(null)}/></div>}
    {loading&&<div className="saving-indicator">Saving…</div>}
  </div>
}

function CalendarGrid({month,events}) {
  const year=month.getFullYear(), m=month.getMonth(), days=new Date(year,m+1,0).getDate(), shift=(new Date(year,m,1).getDay()+6)%7
  const cells=Array.from({length:Math.ceil((days+shift)/7)*7},(_,i)=>{const day=i-shift+1;return day>=1&&day<=days?day:null})
  return <div className="cal-grid">{['M','T','W','T','F','S','S'].map((x,i)=><div key={i} className="cal-weekday">{x}</div>)}{cells.map((day,i)=>{const date=day?isoDate(new Date(year,m,day,12)):'';const marked=events.filter(e=>e.event_date===date);return <div key={i} className={`cal-day ${!day?'outside':''} ${date===today?'today':''} ${marked.length?'marked':''}`} title={marked.map(e=>e.title).join(', ')}>{day||''}{marked.length>0&&<span className="cal-dot"/>}</div>})}</div>
}

function EditModal({modal,people,user,close,save,disabled}){
  const {table,row}=modal
  const [form,setForm]=useState(()=>({...FORM_DEFAULT[table],...(row||{})}))
  const update=(key,value)=>setForm(p=>({...p,[key]:value}))
  const submit=(e)=>{e.preventDefault();const fields=Object.keys(FORM_DEFAULT[table]);const clean=Object.fromEntries(fields.map(k=>[k,form[k]]));save(table,clean,row?.id).catch(()=>{})}
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><div className="modal-card" role="dialog" aria-modal="true" aria-label={`${row?'Edit':'New'} ${LABELS[table]}`}><div className="modal-heading"><div><p className="eyebrow">{row?'MAKE A CHANGE':'CREATE SOMETHING NEW'}</p><h2>{row?'Edit':'Add'} {LABELS[table]?.toLowerCase()}</h2></div><IconButton icon={X} title="Close" onClick={close}/></div><form onSubmit={submit} className="edit-form">
    {table==='groceries'?<><Field label="Item name"><input required maxLength={150} autoFocus placeholder="e.g. Milk, rice, tomatoes" value={form.name} onChange={e=>update('name',e.target.value)}/></Field><Field label="Quantity"><input maxLength={60} placeholder="e.g. 2 litres" value={form.quantity} onChange={e=>update('quantity',e.target.value)}/></Field></>:<>
      <Field label={table==='tasks'?'Task name':table==='bills'?'Bill name':'Event name'}><input required maxLength={180} autoFocus placeholder={table==='tasks'?'e.g. Water the plants':table==='bills'?'e.g. Electricity bill':'e.g. Family dinner'} value={form.title} onChange={e=>update('title',e.target.value)}/></Field>
      {table==='tasks'&&<Field label="Notes (optional)"><textarea rows={2} maxLength={1000} placeholder="Add a few details..." value={form.description} onChange={e=>update('description',e.target.value)}/></Field>}
      {table==='bills'&&<Field label="Amount (₹)"><input type="number" min="0" step="0.01" required value={form.amount} onChange={e=>update('amount',e.target.value)}/></Field>}
      <div className="form-pair"><Field label={table==='events'?'Event date':'Start / due date'}><input type="date" required value={table==='events'?form.event_date:form.due_on} onChange={e=>update(table==='events'?'event_date':'due_on',e.target.value)}/></Field>{table==='bills'?<Field label="Repeat"><select value={form.repeat} onChange={e=>update('repeat',e.target.value)}><option value="none">One time</option><option value="monthly">Monthly</option></select></Field>:<Field label={table==='events'?'Time (optional)':'Time (optional)'}><input type="time" value={form.time||''} onChange={e=>update('time',e.target.value)}/></Field>}</div>
      <div className="form-pair"><Field label="Category"><select value={form.category} onChange={e=>update('category',e.target.value)}>{(table==='tasks'?['Home','Personal','Work','Health','Wellness','Family','Other']:table==='bills'?['Utilities','Rent','Internet','Subscription','Loan','Other']:['Family','Birthday','Anniversary','Appointment','Planning','Other']).map(x=><option key={x}>{x}</option>)}</select></Field>{table==='tasks'?<Field label="Repeat"><select value={form.repeat} onChange={e=>update('repeat',e.target.value)}><option value="none">One time</option><option value="daily">Every day</option><option value="weekly">Every week</option><option value="monthly">Every month</option></select></Field>:null}</div>
      {table==='tasks'&&<><div className="form-pair"><Field label="Assign to"><select value={form.assigned_to||''} onChange={e=>update('assigned_to',e.target.value)}><option value="">Anyone</option>{people.map(p=><option value={p.id} key={p.id}>{p.display_name}</option>)}</select></Field><Field label="Priority"><select value={form.priority} onChange={e=>update('priority',e.target.value)}>{Object.entries(priorityLabel).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></Field></div><p className="fineprint"><UsersRound size={14}/> All tasks are visible to your household, no matter who is assigned.</p></>}
    </>}
    <div className="modal-actions"><button type="button" className="outline-btn" onClick={close}>Cancel</button><button type="submit" className="primary-btn" disabled={disabled}>{row?'Save changes':'Add '+LABELS[table]?.toLowerCase()} <Check size={17}/></button></div>
  </form></div></div>
}

function AuthScreen({alert,notice}){
  const [tab,setTab]=useState('login')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [name,setName]=useState('')
  const [busy,setBusy]=useState(false)
  async function submit(e){e.preventDefault();setBusy(true);try{
    if(tab==='login'){const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error}
    else{const {data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name:name.trim()}}});if(error)throw error;alert(data.session?'Account created. Welcome!':'Check your email to verify your new account.','info')}
  }catch(e){alert(e.message,'error')}finally{setBusy(false)}}
  return <div className="auth-shell"><div className="auth-left"><Logo/><div className="auth-illustration"><div className="illustration-circle"><House size={95} strokeWidth={1.1}/><Heart className="illustration-heart" size={43} fill="currentColor"/></div><div className="floating-badge badge-one"><CheckCircle2 size={19}/> Tasks, sorted!</div><div className="floating-badge badge-two"><ShoppingBasket size={19}/> Shared shopping</div></div><div className="auth-hero-copy"><h1>Build a beautiful<br/><i>everyday life.</i></h1><p>A calmer way to handle everything, together.</p><div className="auth-private"><ShieldCheck size={18}/> An invitation-only private home</div></div></div><div className="auth-right"><div className="auth-card"><div className="mobile-brand"><Logo/></div><p className="eyebrow">WELCOME TO MANALIFE</p><h2>{tab==='login'?'Hello again!':'Join your home.'}</h2><p className="subhead">{tab==='login'?'Sign in to your private family space.':'Create your account, then enter your private invite code.'}</p><div className="auth-tabs"><button className={tab==='login'?'active':''} onClick={()=>setTab('login')}>Sign in</button><button className={tab==='register'?'active':''} onClick={()=>setTab('register')}>Create account</button></div><form className="edit-form" onSubmit={submit}>{tab==='register'&&<Field label="Your name"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Your first name" maxLength={70}/></Field>}<Field label="Email address"><input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></Field><Field label="Password"><input type="password" autoComplete={tab==='login'?'current-password':'new-password'} required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></Field><button disabled={busy} type="submit" className="primary-btn full">{busy?'Please wait...':tab==='login'?'Sign in securely':'Create account'} <ArrowUpRight size={17}/></button></form><div className="auth-note"><LockKeyhole size={17}/><span>Creating an account does not grant household access. Only an approved owner or a verified invited email can join.</span></div>{notice&&<p className={`inline-message ${notice.kind}`}>{notice.message}</p>}</div></div></div>
}

function Onboarding({user,onComplete,notify,notice}){
  const [tab,setTab]=useState('join'),[name,setName]=useState('Our Home'),[code,setCode]=useState(''),[busy,setBusy]=useState(false)
  async function submit(e){e.preventDefault();setBusy(true);try{if(tab==='join')await joinFamily(code);else await createFamily(name);notify('Your household is ready!');await onComplete()}catch(e){notify(e.message,'error')}finally{setBusy(false)}}
  return <div className="welcome-shell"><div className="welcome-card"><Logo/><div className="setup-icon"><House size={37}/></div><p className="eyebrow">ONE PRIVATE HOME</p><h1>Let's bring your<br/><em>people together.</em></h1><p>Welcome, {user.user_metadata?.display_name||user.email}. Your account is verified when you confirm your email. A household invite is still required.</p><div className="auth-tabs"><button className={tab==='join'?'active':''} onClick={()=>setTab('join')}>Join with invite</button><button className={tab==='create'?'active':''} onClick={()=>setTab('create')}>Create household</button></div><form onSubmit={submit} className="edit-form">{tab==='join'?<><Field label="Your invitation code"><input required value={code} onChange={e=>setCode(e.target.value)} placeholder="Paste your private code"/></Field><p className="fineprint">Ask the household owner for a code generated specifically for your email address.</p></>:<><Field label="Household name"><input required value={name} onChange={e=>setName(e.target.value)} maxLength={100}/></Field><p className="fineprint">Only the owner email pre-approved in the Supabase database can create the household.</p></>}<button className="primary-btn full" disabled={busy}>{busy?'Checking...':tab==='join'?'Join household':'Create my home'} <ChevronRight size={16}/></button></form><button className="text-link signout-link" onClick={()=>supabase.auth.signOut()}>Use a different account <LogOut size={15}/></button>{notice&&<p className={`inline-message ${notice.kind}`}>{notice.message}</p>}</div></div>
}

function InvitePanel({demo,notify}){
  const [email,setEmail]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false)
  async function create(e){e.preventDefault();setBusy(true);try{if(demo){setCode('DEMO-CODE-NOT-VALID');notify('Preview invite only. Use configured Supabase to invite for real.','info')}else{const result=await inviteFamily(email);setCode(result);notify('Private invitation created. Share it securely with the matching email.')}}catch(e){notify(e.message,'error')}finally{setBusy(false)}}
  return <form className="invite-form" onSubmit={create}><Field label="Invite your partner by email"><input required type="email" placeholder="partner@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></Field><button className="primary-btn" disabled={busy}><Mail size={16}/> {busy?'Creating...':'Generate private invite'}</button>{code&&<div className="invite-code"><small>One-time invite code — expires after 48 hours</small><code>{code}</code><button type="button" className="outline-btn" onClick={async()=>{try{await navigator.clipboard.writeText(code);notify('Code copied!')}catch{notify('Please select and copy the code manually','info')}}}><Copy size={15}/> Copy code</button></div>}</form>
}

export default App
