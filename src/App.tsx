import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, Check, ChevronRight, CircleDollarSign, Clock3, LayoutDashboard, LogOut, Menu, Plus, ShieldCheck, Ticket, Users, X } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { EventRecord, Organization, OrganizationRole } from './types/database'

type View = 'dashboard' | 'events' | 'team' | 'payments'
type EventForm = { name: string; description: string; venue: string; starts_at: string; ends_at: string }
const emptyEvent: EventForm = { name: '', description: '', venue: '', starts_at: '', ends_at: '' }

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authMessage, setAuthMessage] = useState('')
  const [view, setView] = useState<View>('dashboard')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null)
  const [role, setRole] = useState<OrganizationRole | null>(null)
  const [events, setEvents] = useState<EventRecord[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [dataError, setDataError] = useState('')
  const [showEventForm, setShowEventForm] = useState(false)
  const [eventForm, setEventForm] = useState<EventForm>(emptyEvent)
  const [savingEvent, setSavingEvent] = useState(false)
  const canManageEvents = role !== null && ['owner', 'admin', 'event_manager'].includes(role)

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return }
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session || !supabase) {
      setOrganizations([]); setActiveOrganization(null); setRole(null); setEvents([])
      return
    }
    let alive = true
    void (async () => {
      setLoadingData(true); setDataError('')
      const { data, error } = await supabase!.from('organization_members')
        .select('role, organizations(id,name,slug,created_at)').eq('user_id', session.user.id)
      if (!alive) return
      if (error) {
        setDataError('Não foi possível carregar organizações. Confira se a migração do Supabase foi aplicada.')
        setLoadingData(false); return
      }
      const rows = (data ?? []) as unknown as Array<{ role: OrganizationRole; organizations: Organization | Organization[] | null }>
      const mapped = rows.flatMap((row) => {
        const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations
        return org ? [{ org, role: row.role }] : []
      })
      const nextOrganizations = mapped.map((item) => item.org)
      setOrganizations(nextOrganizations)
      setActiveOrganization((current) => mapped.find((item) => item.org.id === current?.id)?.org ?? mapped[0]?.org ?? null)
      setRole(mapped.find((item) => item.org.id === activeOrganization?.id)?.role ?? mapped[0]?.role ?? null)
      setLoadingData(false)
    })()
    return () => { alive = false }
  }, [session])

  useEffect(() => {
    if (!session || !activeOrganization || !supabase) { setEvents([]); return }
    let alive = true
    void (async () => {
      const { data, error } = await supabase!.from('events').select('*')
        .eq('organization_id', activeOrganization.id).order('starts_at', { ascending: true, nullsFirst: false })
      if (!alive) return
      if (error) setDataError('Não foi possível carregar os eventos desta organização.')
      else setEvents((data ?? []) as EventRecord[])
    })()
    return () => { alive = false }
  }, [session, activeOrganization])

  const stats = useMemo(() => ({
    total: events.length,
    upcoming: events.filter((event) => event.status !== 'cancelled' && event.starts_at && new Date(event.starts_at).getTime() >= Date.now()).length,
    published: events.filter((event) => event.status === 'published').length,
  }), [events])

  async function handleAuth(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setAuthMessage('')
    const result = authMode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    if (result.error) setAuthMessage(result.error.message)
    else if (authMode === 'signup' && !result.data.session) setAuthMessage('Cadastro iniciado. Confira seu e-mail para confirmar a conta.')
  }

  async function createOrganization(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    const form = new FormData(event.currentTarget as HTMLFormElement)
    const name = String(form.get('organizationName') ?? '').trim()
    if (!name) return
    setLoadingData(true); setDataError('')
    const { data: id, error } = await supabase.rpc('create_organization', { organization_name: name })
    if (error) setDataError('Não foi possível criar a organização. Confira se a migração inicial foi aplicada.')
    else {
      const { data: org, error: fetchError } = await supabase.from('organizations').select('*').eq('id', id).single()
      if (fetchError) setDataError('Organização criada, mas não foi possível atualizar a tela. Recarregue a página.')
      else if (org) {
        setOrganizations((current) => [...current, org as Organization])
        setActiveOrganization(org as Organization); setRole('owner')
      }
    }
    setLoadingData(false)
  }

  async function saveEvent(event: FormEvent) {
    event.preventDefault()
    if (!supabase || !activeOrganization || !canManageEvents) return
    setSavingEvent(true); setDataError('')
    const payload = {
      organization_id: activeOrganization.id, name: eventForm.name.trim(),
      description: eventForm.description.trim() || null, venue: eventForm.venue.trim() || null,
      starts_at: eventForm.starts_at ? new Date(eventForm.starts_at).toISOString() : null,
      ends_at: eventForm.ends_at ? new Date(eventForm.ends_at).toISOString() : null, status: 'draft' as const,
    }
    const { data, error } = await supabase.from('events').insert(payload).select('*').single()
    if (error) setDataError('Não foi possível salvar o evento. Verifique permissões e migrações.')
    else {
      setEvents((current) => [...current, data as EventRecord].sort((a, b) => (a.starts_at ?? '').localeCompare(b.starts_at ?? '')))
      setEventForm(emptyEvent); setShowEventForm(false)
    }
    setSavingEvent(false)
  }

  async function signOut() { if (supabase) await supabase.auth.signOut() }

  if (authLoading) return <main className="center-screen"><div className="loader" /><span>Carregando EventFlow Pro…</span></main>
  if (!isSupabaseConfigured) return <main className="setup-screen"><section className="setup-card"><div className="brand-mark large">EF</div><p className="eyebrow">CONFIGURAÇÃO INICIAL</p><h1>Conecte seu ambiente</h1><p>O frontend está preparado, mas a URL e a chave pública do Supabase ainda não foram configuradas. Nenhum dado fictício será exibido como real.</p><ol><li>Crie ou selecione um projeto Supabase.</li><li>Configure <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> no ambiente.</li><li>Aplique a migração em <code>supabase/migrations</code>.</li></ol><div className="notice"><ShieldCheck size={18}/> A chave de serviço nunca deve ser usada no navegador.</div></section></main>
  if (!session) return <main className="auth-screen"><section className="auth-aside"><div className="brand-lockup"><div className="brand-mark">EF</div><span>EventFlow <b>Pro</b></span></div><div className="auth-pitch"><p className="eyebrow">OPERAÇÃO DE EVENTOS, EM UM SÓ LUGAR</p><h1>Seu próximo grande evento começa aqui.</h1><p>Organize sua operação com visibilidade, controle e segurança em cada etapa.</p></div><div className="auth-footer">Gestão profissional. Operação inteligente.</div></section><section className="auth-main"><form className="auth-form" onSubmit={handleAuth}><p className="eyebrow">{authMode === 'login' ? 'BEM-VINDO DE VOLTA' : 'COMECE POR AQUI'}</p><h2>{authMode === 'login' ? 'Acesse sua conta' : 'Crie sua conta'}</h2><p className="muted">Use seu e-mail para continuar.</p><label>E-mail<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label>Senha<input type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>{authMessage && <p className="inline-message" role="status">{authMessage}</p>}<button className="primary-button full" type="submit">{authMode === 'login' ? 'Entrar na plataforma' : 'Criar conta'}</button><p className="switch-auth">{authMode === 'login' ? 'Ainda não tem conta?' : 'Já possui uma conta?'} <button type="button" className="text-button" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthMessage('') }}>{authMode === 'login' ? 'Criar conta' : 'Entrar'}</button></p></form></section></main>

  const navItems = [
    { id: 'dashboard' as const, label: 'Visão geral', icon: LayoutDashboard },
    { id: 'events' as const, label: 'Eventos', icon: CalendarDays },
    { id: 'team' as const, label: 'Equipe e acessos', icon: Users },
    { id: 'payments' as const, label: 'Pagamentos', icon: CircleDollarSign },
  ]
  const title = navItems.find((item) => item.id === view)?.label ?? 'Visão geral'

  return <div className="app-shell">
    {mobileNavOpen && <button className="mobile-backdrop" aria-label="Fechar menu" onClick={() => setMobileNavOpen(false)} />}
    <aside className={'sidebar ' + (mobileNavOpen ? 'sidebar-open' : '')}>
      <div className="brand-lockup"><div className="brand-mark">EF</div><span>EventFlow <b>Pro</b></span><button className="icon-button close-mobile" onClick={() => setMobileNavOpen(false)} aria-label="Fechar menu"><X size={18}/></button></div>
      <div className="workspace-label">ESPAÇO DE TRABALHO</div>
      {activeOrganization ? <div className="org-switch"><div className="org-avatar">{activeOrganization.name.slice(0,1).toUpperCase()}</div><div className="org-details"><strong>{activeOrganization.name}</strong><small>{role ?? 'membro'}</small></div></div> : <div className="org-empty">Nenhuma organização criada</div>}
      <nav className="side-nav">{navItems.map((item) => <button key={item.id} className={'nav-item ' + (view === item.id ? 'active' : '')} onClick={() => { setView(item.id); setMobileNavOpen(false) }}><item.icon size={19}/><span>{item.label}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="secure-note"><ShieldCheck size={17}/><div><strong>Ambiente protegido</strong><span>Acesso por permissões</span></div></div><button className="nav-item logout" onClick={signOut}><LogOut size={18}/><span>Sair da conta</span></button><div className="user-chip"><div className="user-avatar">{(session.user.email ?? 'U').slice(0,1).toUpperCase()}</div><div className="user-details"><strong>{session.user.email}</strong><span>Conta autenticada</span></div></div></div>
    </aside>
    <main className="main-area"><header className="topbar"><button className="icon-button open-mobile" onClick={() => setMobileNavOpen(true)} aria-label="Abrir menu"><Menu size={21}/></button><div className="breadcrumb">EventFlow Pro <span>/</span> <strong>{title}</strong></div><div className="topbar-right"><span className="status-dot"/> Sessão autenticada</div></header>
      <div className="page-content"><div className="page-heading"><div><p className="eyebrow">PAINEL DE CONTROLE</p><h1>{view === 'dashboard' ? 'Visão geral' : title}</h1><p className="muted">{view === 'dashboard' ? 'Acompanhe a estrutura e os próximos passos da sua operação.' : view === 'events' ? 'Gerencie eventos vinculados à sua organização.' : view === 'team' ? 'Organizações e permissões de acesso.' : 'Camada de pagamentos e integrações.'}</p></div>{view === 'events' && activeOrganization && canManageEvents && <button className="primary-button" onClick={() => setShowEventForm(true)}><Plus size={18}/> Novo evento</button>}</div>
        {dataError && <div className="error-banner" role="alert">{dataError}</div>}
        {loadingData && <div className="loading-line"><div className="loader small"/> Carregando dados reais…</div>}
        {!activeOrganization && !loadingData && <section className="panel create-org-panel"><div className="panel-icon"><Users size={22}/></div><div className="panel-copy"><h3>Crie seu espaço de trabalho</h3><p>Cadastre a organização responsável pelos eventos. Você será o proprietário inicial.</p><form className="inline-form" onSubmit={createOrganization}><input name="organizationName" placeholder="Nome da produtora ou empresa" required maxLength={100}/><button className="primary-button" type="submit">Criar organização</button></form></div></section>}
        {view === 'dashboard' && <><section className="stats-grid"><article className="stat-card"><div className="stat-top"><span>Eventos cadastrados</span><CalendarDays size={18}/></div><strong>{stats.total}</strong><small>Total na organização</small></article><article className="stat-card"><div className="stat-top"><span>Próximos eventos</span><Clock3 size={18}/></div><strong>{stats.upcoming}</strong><small>Com data futura</small></article><article className="stat-card"><div className="stat-top"><span>Eventos publicados</span><Ticket size={18}/></div><strong>{stats.published}</strong><small>Conforme o banco de dados</small></article></section><section className="panel"><div className="panel-header"><div><h2>Próximos eventos</h2><p>Eventos desta organização</p></div><button className="subtle-button" onClick={() => setView('events')}>Ver eventos <ChevronRight size={15}/></button></div>{events.length ? <EventList events={events.slice(0,5)}/> : <EmptyEvents canCreate={canManageEvents && Boolean(activeOrganization)} onCreate={() => { setView('events'); setShowEventForm(true) }}/>}</section><section className="phase-note"><div className="phase-icon"><Check size={18}/></div><div><strong>Fundação da plataforma</strong><p>Autenticação, organizações e gestão inicial de eventos são o escopo desta fase. Ingressos, PDV e operações financeiras virão em etapas próprias.</p></div></section></>}
        {view === 'events' && <section className="panel"><div className="panel-header"><div><h2>Todos os eventos</h2><p>{events.length} registro(s) nesta organização</p></div></div>{events.length ? <EventList events={events}/> : <EmptyEvents canCreate={canManageEvents && Boolean(activeOrganization)} onCreate={() => setShowEventForm(true)}/>}</section>}
        {view === 'team' && <section className="panel"><div className="panel-header"><div><h2>Equipe e permissões</h2><p>O controle de acesso é aplicado no banco de dados.</p></div></div><div className="role-list">{[['owner','Proprietário','Controle total da organização'],['admin','Administrador','Gestão e configuração'],['event_manager','Gerente de eventos','Criar e gerenciar eventos'],['finance','Financeiro','Acesso financeiro futuro'],['ticket_operator','Operador de ingressos','Operação de ingressos futura'],['bar_operator','Operador de bar','Operação de bar futura'],['stock_operator','Estoque','Gestão de estoque futura'],['entry_inspector','Fiscal de entrada','Check-in futuro']].map(([key,label,description]) => <div className="role-row" key={key}><div className="role-icon"><ShieldCheck size={17}/></div><div><strong>{label}</strong><p>{description}</p></div>{role === key && <span className="you-tag">Seu papel</span>}</div>)}</div><p className="muted small-note">Convites e alteração de membros ainda não estão habilitados nesta fase.</p></section>}
        {view === 'payments' && <section className="panel payment-panel"><div className="payment-symbol"><CircleDollarSign size={26}/></div><div><span className="status-pill pending">Estrutura preparada</span><h2>Mercado Pago</h2><p>O contrato do adaptador foi definido. Cobranças, webhooks, conciliação e reembolsos ainda não estão ativados.</p><div className="payment-checks"><span><Check size={15}/> Arquitetura independente do provedor</span><span><Check size={15}/> Segredos reservados ao backend</span><span><Clock3 size={15}/> Integração real em fase posterior</span></div></div></section>}
      </div>
    </main>
    {showEventForm && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowEventForm(false) }}><form className="event-modal" onSubmit={saveEvent}><div className="modal-heading"><div><p className="eyebrow">NOVO REGISTRO</p><h2>Cadastrar evento</h2></div><button type="button" className="icon-button" onClick={() => setShowEventForm(false)} aria-label="Fechar"><X size={20}/></button></div><label>Nome do evento *<input value={eventForm.name} onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })} required maxLength={160} placeholder="Ex.: Festival de Verão"/></label><label>Descrição<textarea value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} maxLength={2000} rows={3} placeholder="Descreva brevemente o evento"/></label><label>Local<input value={eventForm.venue} onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })} maxLength={200} placeholder="Nome do local"/></label><div className="field-grid"><label>Início<input type="datetime-local" value={eventForm.starts_at} onChange={(e) => setEventForm({ ...eventForm, starts_at: e.target.value })}/></label><label>Encerramento<input type="datetime-local" value={eventForm.ends_at} onChange={(e) => setEventForm({ ...eventForm, ends_at: e.target.value })}/></label></div><div className="modal-actions"><button type="button" className="subtle-button" onClick={() => setShowEventForm(false)}>Cancelar</button><button className="primary-button" type="submit" disabled={savingEvent || !activeOrganization}>{savingEvent ? 'Salvando…' : 'Salvar evento'}</button></div></form></div>}
  </div>
}

function EventList({ events }: { events: EventRecord[] }) {
  return <div className="event-list">{events.map((event) => <article className="event-row" key={event.id}><div className="event-date">{event.starts_at ? new Date(event.starts_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}) : '—'}</div><div className="event-row-main"><strong>{event.name}</strong><span>{event.venue || 'Local não informado'}{event.starts_at ? ' · ' + new Date(event.starts_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : ''}</span></div><span className={'status-pill ' + event.status}>{event.status === 'draft' ? 'Rascunho' : event.status === 'published' ? 'Publicado' : event.status === 'cancelled' ? 'Cancelado' : 'Concluído'}</span></article>)}</div>
}

function EmptyEvents({ onCreate, canCreate }: { onCreate: () => void; canCreate: boolean }) {
  return <div className="empty-state"><div className="empty-icon"><CalendarDays size={23}/></div><h3>Nenhum evento por aqui</h3><p>Quando cadastrar um evento, ele aparecerá nesta área.</p>{canCreate && <button className="subtle-button" onClick={onCreate}><Plus size={16}/> Cadastrar primeiro evento</button>}</div>
}
