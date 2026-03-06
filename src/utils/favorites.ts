import message from './message'

export interface FavoriteItem {
  id: string
  name: string
  file_id: string
  drive_id: string
  original_name: string
  added_time: number
}

export class FavoritesManager {
  private static readonly STORAGE_KEY = 'user_favorites'

  static getAllFavorites(): FavoriteItem[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('读取收藏夹失败:', error)
      return []
    }
  }

  static addFavorite(favorite: Omit<FavoriteItem, 'id' | 'added_time'>): string {
    try {
      const favorites = this.getAllFavorites()
      const id = this.generateId()
      const newFavorite: FavoriteItem = {
        ...favorite,
        id,
        added_time: Date.now()
      }

      favorites.push(newFavorite)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites))
      return id
    } catch (error) {
      console.error('添加收藏失败:', error)
      message.error('添加收藏失败')
      return ''
    }
  }

  static updateFavoriteName(id: string, name: string): boolean {
    try {
      const favorites = this.getAllFavorites()
      const index = favorites.findIndex(item => item.id === id)
      if (index !== -1) {
        favorites[index].name = name
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites))
        return true
      }
      return false
    } catch (error) {
      console.error('更新收藏名称失败:', error)
      message.error('更新收藏名称失败')
      return false
    }
  }

  static removeFavorite(id: string): boolean {
    try {
      const favorites = this.getAllFavorites()
      const index = favorites.findIndex(item => item.id === id)
      if (index !== -1) {
        favorites.splice(index, 1)
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites))
        return true
      }
      return false
    } catch (error) {
      console.error('删除收藏失败:', error)
      message.error('删除收藏失败')
      return false
    }
  }

  static isFavorited(file_id: string, drive_id: string): boolean {
    const favorites = this.getAllFavorites()
    return favorites.some(item => item.file_id === file_id && item.drive_id === drive_id)
  }

  static getFavoriteById(id: string): FavoriteItem | undefined {
    const favorites = this.getAllFavorites()
    return favorites.find(item => item.id === id)
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}