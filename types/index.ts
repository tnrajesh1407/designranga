// types/index.ts

export type Festival =
  | 'diwali' | 'holi' | 'ugadi' | 'sankranti'
  | 'navratri' | 'dasara' | 'ganesh_chaturthi'
  | 'raksha_bandhan' | 'christmas' | 'new_year'
  | 'seemantham' | 'annaprashana' | 'upanayanam'
  | 'gruhapravesha' | 'shop_inauguration'
  | 'wedding_anniversary' | 'birthday'
  | 'biker_developer' | 'general'

export type Language =
  | 'telugu' | 'hindi' | 'tamil'
  | 'kannada' | 'english' | 'multilingual'

export type Style =
  | 'wishes' | 'biker' | 'developer'
  | 'humor' | 'typography' | 'vintage'
  | 'neon' | 'pixel' | 'minimalist'

export type Category =
  | 'festival-wishes' | 'biker-developer'
  | 'life-events' | 'business'
  | 'developer-humor'

export interface ProductDetails {
  festival: Festival
  language: Language
  style: Style
  category: Category
  price: string
  imageFile: File | null
  imageBase64: string
  imageName: string
}

export interface GeneratedCopy {
  title: string
  shortDescription: string
  fullDescription: string
  metaDescription: string
  slug: string
  tags: string[]
  altText: string
  focusKeyword: string
}

export interface ProcessedImages {
  previewBase64: string      // watermarked 1200x1200
  previewFileName: string
  zipBase64: string          // clean bundle ZIP
  zipFileName: string
}

export interface UploadResult {
  productId: number
  productUrl: string
  editUrl: string
  success: boolean
  error?: string
}

export type UploadStep =
  | 'idle'
  | 'processing-image'
  | 'generating-copy'
  | 'uploading-preview'
  | 'creating-product'
  | 'attaching-zip'
  | 'done'
  | 'error'
