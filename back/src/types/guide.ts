export interface Guide {
  id: number
  title: string
  game: string
  content: string
  difficulty: string
  created_at: string
}

export interface CreateGuideInput {
  title: string
  game: string
  content: string
  difficulty: string
}
