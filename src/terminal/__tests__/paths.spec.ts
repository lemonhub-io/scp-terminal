import { describe, expect, it } from 'vitest'
import { normalizeParts, resolvePath, splitParent } from '../fs/paths'

describe('paths', () => {
  it('normalizes absolute and relative paths', () => {
    expect(normalizeParts('/home/user', '/')).toEqual([])
    expect(normalizeParts('/home/user', '/tmp')).toEqual(['tmp'])
    expect(normalizeParts('/home/user', '.')).toEqual(['home', 'user'])
    expect(normalizeParts('/home/user', '..')).toEqual(['home'])
    expect(normalizeParts('/home/user', '../../home/user')).toEqual(['home', 'user'])
    expect(normalizeParts('/home/user', 'a//b/./c')).toEqual(['home', 'user', 'a', 'b', 'c'])
  })

  it('keeps .. at the root boundary', () => {
    expect(normalizeParts('/', '..')).toEqual([])
    expect(normalizeParts('/', '../../..')).toEqual([])
  })

  it('resolvePath aliases normalizeParts', () => {
    expect(resolvePath('/home/user', 'notes.txt')).toEqual(['home', 'user', 'notes.txt'])
  })

  it('splitParent separates the last segment', () => {
    expect(splitParent('/home/user', 'projects')).toEqual({
      parts: ['home', 'user'],
      name: 'projects',
    })
    expect(splitParent('/', 'a/b/c')).toEqual({ parts: ['a', 'b'], name: 'c' })
  })

  it('splitParent rejects root paths', () => {
    expect(() => splitParent('/home/user', '/')).toThrow(/Invalid path/)
    expect(() => splitParent('/', '/')).toThrow(/Invalid path/)
  })
})
