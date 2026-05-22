import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getServiceRoleClient } from '@/lib/service-role'

vi.mock('@/lib/service-role', () => ({
  getServiceRoleClient: vi.fn(),
}))

import { uploadPreparedAvatar } from '@/lib/avatar-storage'

describe('uploadPreparedAvatar', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns public URL on success', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null })
    const getPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://example.com/avatars/x.jpg' },
    })
    vi.mocked(getServiceRoleClient).mockReturnValue({
      storage: {
        from: () => ({ upload, getPublicUrl }),
      },
    } as never)

    const result = await uploadPreparedAvatar(
      'x.jpg',
      Buffer.from('abc'),
      'image/jpeg'
    )

    expect(result).toEqual({ ok: true, publicUrl: 'https://example.com/avatars/x.jpg' })
    expect(upload).toHaveBeenCalledWith(
      'x.jpg',
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'image/jpeg' })
    )
  })

  it('returns error when storage upload fails', async () => {
    vi.mocked(getServiceRoleClient).mockReturnValue({
      storage: {
        from: () => ({
          upload: vi.fn().mockResolvedValue({ error: { message: 'RLS denied' } }),
          getPublicUrl: vi.fn(),
        }),
      },
    } as never)

    const result = await uploadPreparedAvatar(
      'x.jpg',
      Buffer.from('abc'),
      'image/jpeg'
    )

    expect(result).toEqual({ ok: false, error: 'RLS denied' })
  })
})
