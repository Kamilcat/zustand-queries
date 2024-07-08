import { vi } from 'vitest'

export const mockQuery = {
	success: vi.fn((integer: number) => Promise.resolve(integer * 2)),
	error: vi.fn().mockRejectedValue('something went wrong'),
	errorThenSuccess: vi
		.fn()
		.mockRejectedValueOnce('error happend on first try')
		.mockResolvedValue(1000),
	successThenError: vi
		.fn()
		.mockResolvedValueOnce('post title')
		.mockRejectedValue('500 server error'),
	successInvalidate: vi.fn().mockResolvedValueOnce(17).mockResolvedValue(27),
	waitForSuccess: vi.fn(() => new Promise((resolve) => setTimeout(() => resolve(12), 3000)))
}
