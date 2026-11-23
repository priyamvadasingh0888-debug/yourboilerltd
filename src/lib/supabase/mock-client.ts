import {
  MOCK_PROFILES,
  MOCK_ENGINEERS,
  MOCK_CUSTOMERS,
  MOCK_PROPERTIES,
  MOCK_JOBS,
  MOCK_CERTIFICATES,
  MOCK_CERTIFICATE_APPLIANCES,
  MOCK_INVOICES,
  MOCK_RECURRING,
  MOCK_INQUIRIES,
} from './mock-data'
import { DEMO_USERS } from '../auth/demo'

const TABLE_DATA: Record<string, any[]> = {
  profiles: MOCK_PROFILES,
  engineers: MOCK_ENGINEERS,
  customers: MOCK_CUSTOMERS,
  properties: MOCK_PROPERTIES,
  jobs: MOCK_JOBS,
  certificates: MOCK_CERTIFICATES,
  certificate_appliances: MOCK_CERTIFICATE_APPLIANCES,
  invoices: MOCK_INVOICES,
  invoice_items: [],
  recurring_templates: MOCK_RECURRING,
  inquiries: MOCK_INQUIRIES,
  job_status_history: [],
}

class MockQueryBuilder {
  private table: string
  private data: any[]
  private isSingle = false
  private pendingUpdate: any = null
  private isDelete = false

  constructor(table: string) {
    this.table = table
    this.data = TABLE_DATA[table] ? [...TABLE_DATA[table]] : []
  }

  select(query?: string, options?: any) {
    if (options?.head) {
      this.data = []
    }
    return this
  }

  is(column: string, value: any) {
    this.data = this.data.filter(item => {
      if (value === null) {
        return item[column] === null || item[column] === undefined
      }
      return item[column] === value
    })
    return this
  }

  eq(column: string, value: any) {
    if (this.pendingUpdate && TABLE_DATA[this.table]) {
      TABLE_DATA[this.table] = TABLE_DATA[this.table].map(item => {
        if (item[column] === value) {
          return { ...item, ...this.pendingUpdate }
        }
        return item
      })
    }
    if (this.isDelete && TABLE_DATA[this.table]) {
      TABLE_DATA[this.table] = TABLE_DATA[this.table].filter(item => item[column] !== value)
    }

    this.data = this.data.filter(item => {
      if (item[column] !== undefined) {
        return item[column] === value
      }
      return true
    })

    if (this.pendingUpdate) {
      this.data = this.data.map(item => ({ ...item, ...this.pendingUpdate }))
    }

    return this
  }

  neq(column: string, value: any) {
    this.data = this.data.filter(item => item[column] !== value)
    return this
  }

  in(column: string, values: any[]) {
    this.data = this.data.filter(item => values.includes(item[column]))
    return this
  }

  gte(column: string, value: any) {
    this.data = this.data.filter(item => {
      if (!item[column]) return false
      return new Date(item[column]).getTime() >= new Date(value).getTime()
    })
    return this
  }

  lte(column: string, value: any) {
    this.data = this.data.filter(item => {
      if (!item[column]) return false
      return new Date(item[column]).getTime() <= new Date(value).getTime()
    })
    return this
  }

  lt(column: string, value: any) {
    this.data = this.data.filter(item => {
      if (!item[column]) return false
      return new Date(item[column]).getTime() < new Date(value).getTime()
    })
    return this
  }

  gt(column: string, value: any) {
    this.data = this.data.filter(item => {
      if (!item[column]) return false
      return new Date(item[column]).getTime() > new Date(value).getTime()
    })
    return this
  }

  not(column: string, operator: string, value: any) {
    if (operator === 'is' && value === null) {
      this.data = this.data.filter(item => item[column] !== null && item[column] !== undefined)
    }
    return this
  }

  or(query: string) {
    return this
  }

  ilike(column: string, pattern: string) {
    const clean = pattern.replace(/%/g, '').toLowerCase()
    this.data = this.data.filter(item => String(item[column] || '').toLowerCase().includes(clean))
    return this
  }

  like(column: string, pattern: string) {
    return this.ilike(column, pattern)
  }

  order(column: string, options?: any) {
    const ascending = options?.ascending !== false
    this.data.sort((a, b) => {
      if (a[column] < b[column]) return ascending ? -1 : 1
      if (a[column] > b[column]) return ascending ? 1 : -1
      return 0
    })
    return this
  }

  range(from: number, to: number) {
    this.data = this.data.slice(from, to + 1)
    return this
  }

  limit(count: number) {
    this.data = this.data.slice(0, count)
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  insert(values: any) {
    const rows = Array.isArray(values) ? values : [values]
    for (const r of rows) {
      const newRow = { id: `mock-${Date.now()}-${Math.random()}`, ...r }
      if (TABLE_DATA[this.table]) {
        TABLE_DATA[this.table].unshift(newRow)
      }
      this.data.unshift(newRow)
    }
    return this
  }

  update(values: any) {
    this.pendingUpdate = values
    return this
  }

  delete() {
    this.isDelete = true
    return this
  }

  // Support awaiting the query builder directly: await supabase.from('jobs').select(...)
  then(resolve: (val: any) => void) {
    const count = this.data.length
    if (this.isSingle) {
      resolve({
        data: this.data[0] ?? null,
        count: count,
        error: null,
      })
    } else {
      resolve({
        data: this.data,
        count: count,
        error: null,
      })
    }
  }
}

export function createMockClient(): any {
  const mockChannel = {
    on: () => mockChannel,
    subscribe: () => mockChannel,
    unsubscribe: () => {},
  }

  return {
    from: (table: string) => new MockQueryBuilder(table),
    channel: () => mockChannel,
    removeChannel: () => {},
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: DEMO_USERS.admin.id,
            email: DEMO_USERS.admin.email,
            user_metadata: { full_name: DEMO_USERS.admin.full_name },
          },
        },
        error: null,
      }),
      getSession: async () => ({
        data: {
          session: {
            user: {
              id: DEMO_USERS.admin.id,
              email: DEMO_USERS.admin.email,
            },
          },
        },
        error: null,
      }),
      signInWithPassword: async () => ({
        data: { user: DEMO_USERS.admin },
        error: null,
      }),
      signOut: async () => ({ error: null }),
    },
  }
}
