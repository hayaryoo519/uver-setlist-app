import { useToast } from '../contexts/ToastContext'
import { ApiError } from '../lib/apiClient'

export const useApiError = () => {
  const { showToast } = useToast()

  return (error) => {
    if (!(error instanceof ApiError)) {
      console.error('Unexpected error:', error)
      showToast('予期しないエラーが発生しました', 'error')
      return
    }

    // 401/403 は AuthContext の window.fetch インターセプターが処理する
    if (error.status === 401 || error.status === 403) return

    if (error.status === 429) {
      showToast('操作が速すぎます。しばらく待ってから再試行してください。', 'warning')
      return
    }

    if (error.status >= 500) {
      showToast('サーバーエラーが発生しました。時間をおいて再試行してください。', 'error')
      return
    }

    showToast(error.data?.message ?? 'エラーが発生しました', 'error')
  }
}
