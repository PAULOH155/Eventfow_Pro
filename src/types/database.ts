export type OrganizationRole = 'owner' | 'admin' | 'event_manager' | 'finance' | 'ticket_operator' | 'bar_operator' | 'stock_operator' | 'entry_inspector'
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed'
export interface Organization { id: string; name: string; slug: string; created_at: string }
export interface OrganizationMembership { organization_id: string; user_id: string; role: OrganizationRole; created_at: string }
export interface EventRecord { id: string; organization_id: string; name: string; description: string | null; venue: string | null; starts_at: string | null; ends_at: string | null; status: EventStatus; created_at: string; updated_at: string }
