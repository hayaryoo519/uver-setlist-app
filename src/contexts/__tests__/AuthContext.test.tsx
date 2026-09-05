import { describe, expect, it } from 'vitest'
import { isSessionExpiredResponse } from '../AuthContext'

describe('isSessionExpiredResponse', () => {
  it('401 はセッション切れとして扱う', async () => {
    const response = new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })

    await expect(isSessionExpiredResponse(response)).resolves.toBe(true)
  })

  it('認証エラーの 403 はセッション切れとして扱う', async () => {
    const response = Response.json(
      { message: '認証されていません：無効なトークンです' },
      { status: 403 },
    )

    await expect(isSessionExpiredResponse(response)).resolves.toBe(true)
  })

  it('業務ルールの 403 はセッション切れとして扱わない', async () => {
    const response = Response.json(
      { message: 'バックアップは本番環境でのみ実行できます' },
      { status: 403 },
    )

    await expect(isSessionExpiredResponse(response)).resolves.toBe(false)
  })
})
