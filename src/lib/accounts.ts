export const DEMO_PASSWORD = 'folio-demo'

export type Account = {
  id: string
  email: string
  name: string
  hint: string
}

export const ALEX: Account = {
  id: 'user_alex',
  email: 'alex@ajaia.dev',
  name: 'Alex Rivera',
  hint: 'Owns the Q3 planning note',
}

export const JORDAN: Account = {
  id: 'user_jordan',
  email: 'jordan@ajaia.dev',
  name: 'Jordan Hale',
  hint: 'Can edit the Q3 planning note',
}

export const SAM: Account = {
  id: 'user_sam',
  email: 'sam@ajaia.dev',
  name: 'Sam Okonkwo',
  hint: 'Can view the Q3 planning note',
}

export const ACCOUNTS: Account[] = [ALEX, JORDAN, SAM]
