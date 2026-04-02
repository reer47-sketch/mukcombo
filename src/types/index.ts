export interface MenuNameEntry {
  ko: string
  en: string
}

export interface OptionChoice {
  ko: string
  en: string
}

export interface MenuOption {
  key: string
  labelKo: string
  labelEn: string
  choices: OptionChoice[]
}

export interface MainMenuItem {
  name: string
  options: Record<string, string>
}

export interface Store {
  id: string
  name: string
  name_en: string
  emoji: string
  address: string
  address_en: string
  map_url: string
  owner_id?: string | null
  categories: Record<string, string[]>
  prices: Record<string, string>
  menu_names: Record<string, MenuNameEntry>
  menu_options: Record<string, MenuOption[]>
  created_at: string
}

export interface Comment {
  id: string
  post_id: string
  user_name: string
  avatar: string
  text: string
  text_lang: string
  created_at: string
}

export interface Post {
  id: string
  store_id: string
  user_name: string
  avatar: string
  items: MainMenuItem[]
  side_items: string[]
  review: string
  review_lang: string
  photo_url: string | null
  likes: number
  created_at: string
  comments: Comment[]
}
