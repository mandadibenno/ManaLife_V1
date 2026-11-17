import { supabase } from './supabase'
import { isoDate, addDays, uid } from './utils'

const KEY='manalife-demo-v1'
const today=isoDate()
export const demoUser={id:'demo-me',email:'you@example.com',user_metadata:{display_name:'You'}}
export const demoFamily={id:'demo-home',name:'Our Home',invite_code:'DEMO-ONLY'}
export const demoPeople=[{id:'demo-me',display_name:'You'},{id:'demo-partner',display_name:'Your Partner'}]
const seed=()=>({
  tasks:[
    {id:uid(),title:'Morning walk together',description:'A little fresh air, every morning.',category:'Wellness',priority:'medium',assigned_to:null,repeat:'daily',due_on:addDays(today,-10),time:'06:30',owner_id:'demo-me'},
    {id:uid(),title:'Water the plants',description:'Balcony and living-room plants',category:'Home',priority:'low',assigned_to:'demo-partner',repeat:'daily',due_on:addDays(today,-7),time:'08:00',owner_id:'demo-me'},
    {id:uid(),title:'Plan this week’s meals',description:'Check what is already in the fridge.',category:'Home',priority:'medium',assigned_to:null,repeat:'weekly',due_on:today,time:'18:00',owner_id:'demo-me'},
    {id:uid(),title:'Finish personal reading',description:'20 minutes of focused reading',category:'Personal',priority:'low',assigned_to:'demo-me',repeat:'daily',due_on:addDays(today,-1),time:'21:00',owner_id:'demo-me'},
    {id:uid(),title:'Book a home maintenance visit',description:'Check convenient slot together',category:'Home',priority:'high',assigned_to:'demo-me',repeat:'none',due_on:addDays(today,1),time:'11:00',owner_id:'demo-me'}
  ],
  task_completions:[],
  groceries:[
    {id:uid(),name:'Milk',quantity:'2 litres',checked:false,added_by:'demo-me'},
    {id:uid(),name:'Tomatoes',quantity:'1 kg',checked:false,added_by:'demo-partner'},
    {id:uid(),name:'Rice',quantity:'5 kg',checked:true,added_by:'demo-me'},
    {id:uid(),name:'Eggs',quantity:'12 pcs',checked:false,added_by:'demo-me'}
  ],
  bills:[
    {id:uid(),title:'Electricity bill',amount:1450,due_on:addDays(today,3),repeat:'monthly',category:'Utilities',owner_id:'demo-me'},
    {id:uid(),title:'Internet bill',amount:799,due_on:addDays(today,7),repeat:'monthly',category:'Utilities',owner_id:'demo-me'}
  ],
  bill_payments:[],
  events:[
    {id:uid(),title:'Weekend family catch-up',event_date:addDays(today,4),time:'17:00',category:'Family',owner_id:'demo-me'},
    {id:uid(),title:'Monthly home review',event_date:addDays(today,11),time:'19:00',category:'Planning',owner_id:'demo-me'}
  ]
})
export function loadDemo() {
  try {
    const raw=localStorage.getItem(KEY)
    if(raw) return JSON.parse(raw)
  } catch {}
  const data=seed(); saveDemo(data); return data
}
export function saveDemo(data) {localStorage.setItem(KEY,JSON.stringify(data))}
export function resetDemo() {const data=seed();saveDemo(data);return data}

function rowsOrThrow(result) {if(result.error) throw result.error;return result.data||[]}
export async function loadHousehold(userId) {
  const membership=rowsOrThrow(await supabase.from('household_members').select('household_id,role').eq('user_id',userId).maybeSingle())
  if(!membership?.household_id) return null
  const household=rowsOrThrow(await supabase.from('households').select('id,name,created_by').eq('id',membership.household_id).single())
  const members=rowsOrThrow(await supabase.from('household_members').select('user_id').eq('household_id',household.id))
  const ids=members.map(m=>m.user_id)
  const profiles=ids.length?rowsOrThrow(await supabase.from('profiles').select('id,display_name').in('id',ids)):[]
  return {household,role:membership.role,people:profiles.length?profiles:ids.map(id=>({id,display_name:'Member'}))}
}
export async function createFamily(name) {
  const {error}=await supabase.rpc('create_household',{p_name:name.trim()})
  if(error) throw error
}
export async function joinFamily(code) {
  const {error}=await supabase.rpc('accept_invite',{p_code:code.trim()})
  if(error) throw error
}
export async function inviteFamily(email) {
  const {data,error}=await supabase.rpc('create_invite',{p_email:email.trim()})
  if(error) throw error
  return data
}
export async function loadRemote(householdId) {
  const names=['tasks','task_completions','groceries','bills','bill_payments','events']
  const results=await Promise.all(names.map(async name=>{
    let query=supabase.from(name).select('*')
    if(!['task_completions','bill_payments'].includes(name)) query=query.eq('household_id',householdId)
    const {data,error}=await query
    if(error) throw error
    return [name,data||[]]
  }))
  return Object.fromEntries(results)
}
export async function upsertRemote(table,row,editing) {
  const query=editing?supabase.from(table).update(row).eq('id',editing).select().single():supabase.from(table).insert(row).select().single()
  const {data,error}=await query
  if(error) throw error
  return data
}
export async function deleteRemote(table,id) {
  const {error}=await supabase.from(table).delete().eq('id',id)
  if(error) throw error
}
export async function setRemoteCompletion(table,entityId,occurrence,on,userId) {
  const idColumn=table==='task_completions'?'task_id':'bill_id'
  if(on) {
    const {error}=await supabase.from(table).insert({[idColumn]:entityId,occurrence_on:occurrence,completed_by:userId})
    if(error && error.code!=='23505') throw error
  } else {
    const {error}=await supabase.from(table).delete().eq(idColumn,entityId).eq('occurrence_on',occurrence)
    if(error) throw error
  }
}
